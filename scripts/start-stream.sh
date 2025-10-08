#!/bin/bash

# ===========================================
# FFmpeg Live Streaming Script
# Livestream Platform - Interactive Stream Starter
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SERVER="192.168.150.249"
RTMP_PORT="1935"
STREAM_KEY="stream"
RTMP_URL="rtmp://${SERVER}:${RTMP_PORT}/live/${STREAM_KEY}"

# Optimized default settings
QUALITY="medium"
RESOLUTION="1280x720"
FRAMERATE="30"
VIDEO_BITRATE="2500k"  # Increased for better quality
AUDIO_BITRATE="160k"   # Increased for better audio
PRESET="medium"        # Better quality/performance balance
SOURCE=""
FILE_PATH=""
WITH_OVERLAY=false
LOGO_PATH=""
FIX_PERMISSIONS=false
CUSTOM_LINK=""
AUTO_RECONNECT=true
MONITOR_STREAM=true
DETECT_DEVICES=true

# Function to print colored output
print_header() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}🎬 FFmpeg Live Streaming Script v2.0${NC}"
    echo -e "${CYAN}   Optimized for Performance & Quality${NC}"
    echo -e "${CYAN}============================================${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Progress indicator
show_progress() {
    local pid=$1
    local message=$2
    while kill -0 $pid 2>/dev/null; do
        echo -ne "\r${BLUE}[PROGRESS]${NC} $message... ⏳"
        sleep 1
    done
    echo -ne "\r${GREEN}[COMPLETE]${NC} $message... ✅\n"
}

# Function to check dependencies
check_dependencies() {
    print_step "Checking dependencies..."
    
    if ! command -v ffmpeg &> /dev/null; then
        print_error "FFmpeg is not installed!"
        print_info "Please install FFmpeg first:"
        print_info "  sudo apt update && sudo apt install ffmpeg"
        exit 1
    fi
    
    print_success "FFmpeg is installed: $(ffmpeg -version | head -1)"
}

# Function to fix HLS permissions
check_hls_manager() {
    print_step "Checking HLS manager status..."
    
    # Check if we're in a Docker environment
    if [[ -f "/.dockerenv" ]] || [[ -n "$DOCKER_CONTAINER" ]]; then
        print_info "Running in Docker environment - HLS manager should handle permissions"
        return 0
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose not found. Cannot check HLS manager."
        return 1
    fi
    
    print_info "Running on host system"
    
    # Check if HLS manager is running
    if docker-compose ps hls-manager | grep -q "Up"; then
        print_success "HLS manager is running - permissions automatically managed"
        
        # Check if HLS directory is accessible
        if docker-compose exec -T hls-manager ls /app/hls/stream &>/dev/null; then
            print_success "HLS directory is ready"
        else
            print_warning "HLS directory not accessible, restarting HLS manager..."
            docker-compose restart hls-manager
            sleep 5
        fi
    else
        print_warning "HLS manager is not running, starting it..."
        docker-compose up -d hls-manager
        sleep 10
        print_success "HLS manager started"
    fi
}

# Function to test RTMP connection
test_rtmp_connection() {
    print_step "Testing RTMP connection..."
    
    # Test with a short stream
    timeout 10s ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=1 \
      -c:v libx264 -preset ultrafast -f flv \
      "${RTMP_URL}_test" 2>/dev/null || {
        print_warning "RTMP connection test failed, but continuing..."
        return 1
    }
    
    print_success "RTMP connection test passed"
    return 0
}

# Function to show usage
show_usage() {
    print_header
    echo -e "${YELLOW}Usage:${NC} $0 [OPTIONS] [SOURCE]"
    echo ""
    echo -e "${YELLOW}Interactive Mode:${NC}"
    echo "  $0                    # Interactive mode with menu selection"
    echo ""
    echo -e "${YELLOW}Sources:${NC}"
    echo "  test        - Stream test pattern"
    echo "  webcam      - Stream from webcam (/dev/video0)"
    echo "  desktop     - Stream desktop/screen"
    echo "  file <path> - Stream video file"
    echo "  mic         - Stream audio only"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  -q, --quality <level>     Video quality: ultrafast,fast,medium,slow (default: medium)"
    echo "  -r, --resolution <size>   Video resolution (default: 1280x720)"
    echo "  -f, --framerate <fps>     Video framerate (default: 30)"
    echo "  -b, --bitrate <rate>      Video bitrate (default: 2000k)"
    echo "  -a, --audio-bitrate <rate> Audio bitrate (default: 128k)"
    echo "  -k, --key <stream_key>    Stream key (default: stream)"
    echo "  -s, --server <ip>         Server IP (default: 192.168.150.249)"
    echo "  --with-overlay            Add text overlay"
    echo "  --with-logo <path>        Add logo overlay"
    echo "  --fix-permissions         Auto-fix HLS permissions before streaming"
    echo "  --link <url>              Custom RTMP URL (overrides server/key)"
    echo "  -h, --help               Show this help"
    echo ""
    echo -e "${YELLOW}Stream will be available at:${NC}"
    echo "  Frontend: http://${SERVER}:3000"
    echo "  API: http://${SERVER}:9000/api/v1/hls/${STREAM_KEY}"
}

# Function to show interactive menu
show_interactive_menu() {
    print_header
    echo -e "${CYAN}🎬 Choose your streaming source:${NC}"
    echo ""
    echo "1) 🎭 Test Pattern (Color bars and test signal)"
    echo "2) 📹 Webcam Stream (Camera + Microphone)"
    echo "3) 🖥️  Desktop Stream (Screen capture + Audio)"
    echo "4) 📁 Video File Stream (Stream from file)"
    echo "5) 🎤 Audio Only Stream (Microphone only)"
    echo "6) ⚙️  Advanced Options"
    echo "7) 🔧 Check HLS Manager"
    echo "8) ❌ Exit"
    echo ""
}

# Function to configure advanced options
configure_advanced_options() {
    print_step "Advanced Configuration"
    echo ""
    
    # Quality selection
    echo -e "${YELLOW}Select video quality:${NC}"
    echo "1) ultrafast (lowest CPU, larger file)"
    echo "2) fast (good balance)"
    echo "3) medium (better quality, more CPU)"
    echo "4) slow (best quality, highest CPU)"
    echo "5) Keep current: $QUALITY"
    read -p "Choose (1-5): " choice
    case $choice in
        1) QUALITY="ultrafast" ;;
        2) QUALITY="fast" ;;
        3) QUALITY="medium" ;;
        4) QUALITY="slow" ;;
        5) ;;
        *) print_warning "Invalid choice, keeping current: $QUALITY" ;;
    esac
    
    # Resolution selection
    echo ""
    echo -e "${YELLOW}Select resolution:${NC}"
    echo "1) 1920x1080 (Full HD)"
    echo "2) 1280x720 (HD)"
    echo "3) 854x480 (480p)"
    echo "4) 640x360 (360p)"
    echo "5) Custom"
    echo "6) Keep current: $RESOLUTION"
    read -p "Choose (1-6): " choice
    case $choice in
        1) RESOLUTION="1920x1080" ;;
        2) RESOLUTION="1280x720" ;;
        3) RESOLUTION="854x480" ;;
        4) RESOLUTION="640x360" ;;
        5) 
            read -p "Enter custom resolution (e.g., 1920x1080): " RESOLUTION
            ;;
        6) ;;
        *) print_warning "Invalid choice, keeping current: $RESOLUTION" ;;
    esac
    
    # Framerate selection
    echo ""
    echo -e "${YELLOW}Select framerate:${NC}"
    echo "1) 60 FPS (Smooth)"
    echo "2) 30 FPS (Standard)"
    echo "3) 25 FPS (PAL)"
    echo "4) 24 FPS (Cinema)"
    echo "5) Custom"
    echo "6) Keep current: $FRAMERATE"
    read -p "Choose (1-6): " choice
    case $choice in
        1) FRAMERATE="60" ;;
        2) FRAMERATE="30" ;;
        3) FRAMERATE="25" ;;
        4) FRAMERATE="24" ;;
        5) 
            read -p "Enter custom framerate: " FRAMERATE
            ;;
        6) ;;
        *) print_warning "Invalid choice, keeping current: $FRAMERATE" ;;
    esac
    
    # Bitrate selection
    echo ""
    echo -e "${YELLOW}Select video bitrate:${NC}"
    echo "1) 5000k (High quality)"
    echo "2) 2000k (Good quality)"
    echo "3) 1000k (Medium quality)"
    echo "4) 500k (Low quality)"
    echo "5) Custom"
    echo "6) Keep current: $VIDEO_BITRATE"
    read -p "Choose (1-6): " choice
    case $choice in
        1) VIDEO_BITRATE="5000k" ;;
        2) VIDEO_BITRATE="2000k" ;;
        3) VIDEO_BITRATE="1000k" ;;
        4) VIDEO_BITRATE="500k" ;;
        5) 
            read -p "Enter custom bitrate (e.g., 1500k): " VIDEO_BITRATE
            ;;
        6) ;;
        *) print_warning "Invalid choice, keeping current: $VIDEO_BITRATE" ;;
    esac
    
    # Audio bitrate
    echo ""
    echo -e "${YELLOW}Select audio bitrate:${NC}"
    echo "1) 192k (High quality)"
    echo "2) 128k (Good quality)"
    echo "3) 96k (Medium quality)"
    echo "4) 64k (Low quality)"
    echo "5) Custom"
    echo "6) Keep current: $AUDIO_BITRATE"
    read -p "Choose (1-6): " choice
    case $choice in
        1) AUDIO_BITRATE="192k" ;;
        2) AUDIO_BITRATE="128k" ;;
        3) AUDIO_BITRATE="96k" ;;
        4) AUDIO_BITRATE="64k" ;;
        5) 
            read -p "Enter custom bitrate (e.g., 160k): " AUDIO_BITRATE
            ;;
        6) ;;
        *) print_warning "Invalid choice, keeping current: $AUDIO_BITRATE" ;;
    esac
    
    # Stream key
    echo ""
    read -p "Enter stream key (current: $STREAM_KEY): " input_key
    if [[ -n "$input_key" ]]; then
        STREAM_KEY="$input_key"
        RTMP_URL="rtmp://${SERVER}:${RTMP_PORT}/live/${STREAM_KEY}"
    fi
    
    # Server IP
    echo ""
    read -p "Enter server IP (current: $SERVER): " input_server
    if [[ -n "$input_server" ]]; then
        SERVER="$input_server"
        RTMP_URL="rtmp://${SERVER}:${RTMP_PORT}/live/${STREAM_KEY}"
    fi
    
    # Overlay options
    echo ""
    read -p "Add text overlay? (y/N): " overlay_choice
    if [[ "$overlay_choice" =~ ^[Yy]$ ]]; then
        WITH_OVERLAY=true
    fi
    
    echo ""
    read -p "Add logo overlay? (y/N): " logo_choice
    if [[ "$logo_choice" =~ ^[Yy]$ ]]; then
        read -p "Enter logo file path: " LOGO_PATH
        if [[ ! -f "$LOGO_PATH" ]]; then
            print_warning "Logo file not found: $LOGO_PATH"
            LOGO_PATH=""
        fi
    fi
}

# Function to handle interactive source selection
handle_interactive_selection() {
    while true; do
        show_interactive_menu
        read -p "Enter your choice (1-8): " choice
        
        case $choice in
            1)
                SOURCE="test"
                break
                ;;
            2)
                SOURCE="webcam"
                break
                ;;
            3)
                SOURCE="desktop"
                break
                ;;
            4)
                SOURCE="file"
                while true; do
                    read -p "Enter video file path: " FILE_PATH
                    if [[ -f "$FILE_PATH" ]]; then
                        break
                    else
                        print_error "File not found: $FILE_PATH"
                        read -p "Try again? (y/N): " retry
                        if [[ ! "$retry" =~ ^[Yy]$ ]]; then
                            return 1
                        fi
                    fi
                done
                break
                ;;
            5)
                SOURCE="mic"
                break
                ;;
            6)
                configure_advanced_options
                ;;
            7)
                check_hls_manager
                ;;
            8)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please select 1-8."
                ;;
        esac
    done
}

# Function to parse command line arguments
parse_arguments() {
    SOURCE=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -q|--quality)
                QUALITY="$2"
                shift 2
                ;;
            -r|--resolution)
                RESOLUTION="$2"
                shift 2
                ;;
            -f|--framerate)
                FRAMERATE="$2"
                shift 2
                ;;
            -b|--bitrate)
                VIDEO_BITRATE="$2"
                shift 2
                ;;
            -a|--audio-bitrate)
                AUDIO_BITRATE="$2"
                shift 2
                ;;
            -k|--key)
                STREAM_KEY="$2"
                RTMP_URL="rtmp://${SERVER}:${RTMP_PORT}/live/${STREAM_KEY}"
                shift 2
                ;;
            -s|--server)
                SERVER="$2"
                RTMP_URL="rtmp://${SERVER}:${RTMP_PORT}/live/${STREAM_KEY}"
                shift 2
                ;;
            --with-overlay)
                WITH_OVERLAY=true
                shift
                ;;
            --with-logo)
                LOGO_PATH="$2"
                shift 2
                ;;
            --fix-permissions)
                FIX_PERMISSIONS=true
                shift
                ;;
            --link)
                CUSTOM_LINK="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            test|webcam|desktop|mic)
                SOURCE="$1"
                shift
                ;;
            file)
                SOURCE="file"
                if [[ $# -lt 2 ]]; then
                    print_error "File path required for 'file' source"
                    exit 1
                fi
                FILE_PATH="$2"
                shift 2
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$SOURCE" ]]; then
        print_error "Source is required!"
        show_usage
        exit 1
    fi
}

# Function to build FFmpeg command
build_ffmpeg_command() {
    local cmd="ffmpeg"
    local video_filters=""
    
    case $SOURCE in
        "test")
            cmd="$cmd -f lavfi -i testsrc=duration=0:size=${RESOLUTION}:rate=${FRAMERATE}"
            ;;
        "webcam")
            cmd="$cmd -f v4l2 -i /dev/video0"
            if [[ -n "$AUDIO_BITRATE" ]]; then
                cmd="$cmd -f alsa -i default"
            fi
            ;;
        "desktop")
            cmd="$cmd -f x11grab -framerate ${FRAMERATE} -i :0.0"
            if [[ -n "$AUDIO_BITRATE" ]]; then
                cmd="$cmd -f alsa -i default"
            fi
            ;;
        "file")
            if [[ ! -f "$FILE_PATH" ]]; then
                print_error "File not found: $FILE_PATH"
                exit 1
            fi
            cmd="$cmd -re -i \"$FILE_PATH\""
            ;;
        "mic")
            cmd="$cmd -f alsa -i default"
            VIDEO_BITRATE=""
            ;;
    esac
    
    # Add video filters
    if [[ "$SOURCE" != "mic" ]]; then
        if [[ "$WITH_OVERLAY" == "true" ]]; then
            video_filters="${video_filters}drawtext=text='Live Stream':fontsize=24:fontcolor=white:x=10:y=10,"
        fi
        
        if [[ -n "$LOGO_PATH" && -f "$LOGO_PATH" ]]; then
            video_filters="${video_filters}[0:v][1:v]overlay=10:10;"
            cmd="$cmd -i \"$LOGO_PATH\" -filter_complex \"$video_filters\""
        elif [[ -n "$video_filters" ]]; then
            video_filters="${video_filters%,}"  # Remove trailing comma
            cmd="$cmd -vf \"$video_filters\""
        fi
        
        # Video encoding
        cmd="$cmd -c:v libx264 -preset $PRESET"
        if [[ -n "$VIDEO_BITRATE" ]]; then
            cmd="$cmd -b:v $VIDEO_BITRATE"
        else
            cmd="$cmd -crf 23"
        fi
    fi
    
    # Audio encoding
    if [[ -n "$AUDIO_BITRATE" ]]; then
        cmd="$cmd -c:a aac -b:a $AUDIO_BITRATE"
    fi
    
    # Output
    cmd="$cmd -f flv \"$RTMP_URL\""
    
    echo "$cmd"
}

# Function to start streaming
start_streaming() {
    print_step "Starting stream..."
    print_info "Source: $SOURCE"
    print_info "Quality: $QUALITY"
    print_info "Resolution: $RESOLUTION"
    print_info "Framerate: $FRAMERATE"
    print_info "Video Bitrate: $VIDEO_BITRATE"
    print_info "Audio Bitrate: $AUDIO_BITRATE"
    print_info "Stream Key: $STREAM_KEY"
    print_info "RTMP URL: $RTMP_URL"
    echo ""
    
    # Build and execute FFmpeg command
    local ffmpeg_cmd=$(build_ffmpeg_command)
    
    print_info "FFmpeg command: $ffmpeg_cmd"
    echo ""
    print_success "Starting stream... Press Ctrl+C to stop"
    echo ""
    
    # Execute FFmpeg
    eval $ffmpeg_cmd
}

# Function to show stream info
show_stream_info() {
    echo ""
    print_success "Stream started successfully!"
    echo ""
    echo -e "${CYAN}📺 Stream Information:${NC}"
    echo "  RTMP URL: $RTMP_URL"
    echo "  HLS URL: http://${SERVER}:9000/api/v1/hls/${STREAM_KEY}"
    echo "  Frontend: http://${SERVER}:3000"
    echo ""
    echo -e "${CYAN}🔗 View Stream:${NC}"
    echo "  1. Open browser: http://${SERVER}:3000"
    echo "  2. Login with your account"
    echo "  3. Find stream with key: ${STREAM_KEY}"
    echo ""
    echo -e "${CYAN}🛠️  Troubleshooting:${NC}"
    echo "  - Check RTMP server: nc -zv ${SERVER} ${RTMP_PORT}"
    echo "  - Check HLS endpoint: curl -I http://${SERVER}:9000/api/v1/hls/${STREAM_KEY}"
    echo "  - Check logs: docker-compose logs nginx backend"
}

# Main function
main() {
    print_header
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Check dependencies
    check_dependencies
    
    # Check HLS manager if requested
    if [[ "$FIX_PERMISSIONS" == "true" ]]; then
        check_hls_manager
    fi
    
    # Test RTMP connection (optional)
    test_rtmp_connection
    
    # Set preset based on quality
    case $QUALITY in
        "ultrafast") PRESET="ultrafast" ;;
        "fast") PRESET="fast" ;;
        "medium") PRESET="medium" ;;
        "slow") PRESET="slow" ;;
        *) PRESET="fast" ;;
    esac
    
    # Use custom link if provided
    if [[ -n "$CUSTOM_LINK" ]]; then
        RTMP_URL="$CUSTOM_LINK"
        print_info "Using custom RTMP URL: $RTMP_URL"
    fi
    
    # Start streaming
    start_streaming
}

# Handle Ctrl+C gracefully
trap 'echo ""; print_warning "Stream stopped by user"; exit 0' INT

# Run main function
main "$@"
