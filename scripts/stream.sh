#!/bin/bash

# 🎬 LiveStream App - Streaming Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Streaming options
show_options() {
    echo "🎬 LiveStream App - Streaming Options"
    echo "===================================="
    echo ""
    echo "Choose your streaming method:"
    echo ""
    echo "1. 🎨 Test Stream (Color Bars)"
    echo "2. 📹 Webcam Stream (macOS)"
    echo "3. 📹 Webcam Stream (Linux)"
    echo "4. 🖥️  Screen Capture (macOS)"
    echo "5. 🖥️  Screen Capture (Linux)"
    echo "6. ⚙️  Custom FFmpeg Command"
    echo "7. 📖 OBS Studio Setup Guide"
    echo ""
}

# Test stream with color bars
test_stream() {
    log_info "Starting test stream with color bars..."
    
    ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 \
           -f lavfi -i sine=frequency=1000:sample_rate=48000 \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

# Webcam stream for macOS
webcam_macos() {
    log_info "Starting webcam stream (macOS)..."
    log_info "Available video devices:"
    ffmpeg -f avfoundation -list_devices true -i ""
    
    echo ""
    read -p "Enter video device number (default: 0): " video_device
    video_device=${video_device:-0}
    
    read -p "Enter audio device number (default: 0): " audio_device
    audio_device=${audio_device:-0}
    
    log_info "Starting stream with video device $video_device and audio device $audio_device..."
    
    ffmpeg -f avfoundation -i "$video_device:$audio_device" \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

# Webcam stream for Linux
webcam_linux() {
    log_info "Starting webcam stream (Linux)..."
    log_info "Available video devices:"
    ls /dev/video*
    
    echo ""
    read -p "Enter video device (default: /dev/video0): " video_device
    video_device=${video_device:-/dev/video0}
    
    log_info "Starting stream with device $video_device..."
    
    ffmpeg -f v4l2 -i "$video_device" \
           -f alsa -i default \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

# Screen capture for macOS
screen_macos() {
    log_info "Starting screen capture (macOS)..."
    
    ffmpeg -f avfoundation -i "1:0" \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

# Screen capture for Linux
screen_linux() {
    log_info "Starting screen capture (Linux)..."
    
    ffmpeg -f x11grab -i :0.0 \
           -f alsa -i default \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

# Custom FFmpeg command
custom_command() {
    echo ""
    log_info "Custom FFmpeg Command"
    echo "======================="
    echo ""
    echo "RTMP URL: rtmp://localhost:1935/live/stream"
    echo ""
    echo "Example commands:"
    echo "  ffmpeg -i input.mp4 -c copy -f flv rtmp://localhost:1935/live/stream"
    echo "  ffmpeg -f avfoundation -i 0:0 -c:v libx264 -preset veryfast -f flv rtmp://localhost:1935/live/stream"
    echo ""
    echo "Enter your custom FFmpeg command:"
    read -p "ffmpeg " custom_cmd
    
    if [ -n "$custom_cmd" ]; then
        log_info "Executing: ffmpeg $custom_cmd"
        ffmpeg $custom_cmd
    else
        log_warning "No command entered"
    fi
}

# OBS Studio setup guide
obs_setup() {
    echo ""
    log_info "OBS Studio Setup Guide"
    echo "========================"
    echo ""
    echo "1. Download and install OBS Studio:"
    echo "   https://obsproject.com/"
    echo ""
    echo "2. Open OBS Studio and go to Settings → Stream"
    echo ""
    echo "3. Configure streaming settings:"
    echo "   Service: Custom..."
    echo "   Server: rtmp://localhost:1935/live"
    echo "   Stream Key: stream"
    echo ""
    echo "4. Click 'OK' to save settings"
    echo ""
    echo "5. Click 'Start Streaming' to begin"
    echo ""
    echo "6. Access your stream at: http://localhost:8080"
    echo ""
    echo "📝 Tips:"
    echo "  - Make sure LiveStream App is running (./scripts/start.sh)"
    echo "  - Check your internet connection"
    echo "  - Adjust bitrate based on your upload speed"
    echo ""
}

# Main menu
main() {
    show_options
    
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1) test_stream ;;
        2) webcam_macos ;;
        3) webcam_linux ;;
        4) screen_macos ;;
        5) screen_linux ;;
        6) custom_command ;;
        7) obs_setup ;;
        *) log_error "Invalid choice. Please run the script again." ;;
    esac
}

# Check if FFmpeg is installed
if ! command -v ffmpeg >/dev/null 2>&1; then
    log_error "FFmpeg is not installed. Please run ./scripts/install.sh first."
    exit 1
fi

# Check if services are running
if ! curl -f http://localhost:8080/health >/dev/null 2>&1; then
    log_warning "LiveStream App services are not running."
    log_info "Please start the services first: ./scripts/start.sh"
    exit 1
fi

# Run main function
main "$@"
