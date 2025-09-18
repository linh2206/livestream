#!/bin/bash
set -euo pipefail

# FFmpeg Test Stream - Universal Script
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info() { echo -e "${BLUE}==> $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Check if app is running
if ! curl -s http://localhost:8080/health >/dev/null 2>&1; then
    log_error "LiveStream app not running. Start it first with ./start.sh"
    exit 1
fi

# Show streaming options
show_options() {
    echo ""
    echo "🎬 LiveStream - Streaming Options"
    echo "================================="
    echo ""
    echo "📺 RTMP Server: rtmp://localhost:1935/live"
    echo "🔑 Stream Key:  stream"
    echo ""
    echo "Choose streaming method:"
    echo "1) Test stream (color bars + audio)"
    echo "2) Webcam stream (macOS)"
    echo "3) Webcam stream (Linux)"
    echo "4) Screen capture (macOS)"
    echo "5) Screen capture (Linux)"
    echo "6) Custom FFmpeg command"
    echo "7) Show OBS Studio setup"
    echo ""
}

# Test stream with color bars
test_stream() {
    log_info "Starting test stream with color bars..."
    log_info "Press Ctrl+C to stop"
    echo ""
    
    ffmpeg -hide_banner -loglevel info \
        -f lavfi -re -i testsrc=size=1280x720:rate=30 \
        -f lavfi -re -i sine=frequency=1000:sample_rate=48000 \
        -c:v libx264 -preset veryfast -tune zerolatency \
        -b:v 2500k -maxrate 2500k -bufsize 5000k \
        -c:a aac -b:a 128k -ac 2 -ar 48000 \
        -f flv rtmp://localhost:1935/live/stream
}

# Webcam stream (macOS)
webcam_macos() {
    log_info "Starting webcam stream (macOS)..."
    log_info "Press Ctrl+C to stop"
    echo ""
    
    ffmpeg -hide_banner -loglevel info \
        -f avfoundation -i "0:0" \
        -c:v libx264 -preset veryfast -tune zerolatency \
        -b:v 2500k -maxrate 2500k -bufsize 5000k \
        -c:a aac -b:a 128k -ac 2 -ar 48000 \
        -f flv rtmp://localhost:1935/live/stream
}

# Webcam stream (Linux)
webcam_linux() {
    log_info "Starting webcam stream (Linux)..."
    log_info "Press Ctrl+C to stop"
    echo ""
    
    ffmpeg -hide_banner -loglevel info \
        -f v4l2 -i /dev/video0 \
        -f alsa -i default \
        -c:v libx264 -preset veryfast -tune zerolatency \
        -b:v 2500k -maxrate 2500k -bufsize 5000k \
        -c:a aac -b:a 128k -ac 2 -ar 48000 \
        -f flv rtmp://localhost:1935/live/stream
}

# Screen capture (macOS)
screen_macos() {
    log_info "Starting screen capture (macOS)..."
    log_info "Press Ctrl+C to stop"
    echo ""
    
    ffmpeg -hide_banner -loglevel info \
        -f avfoundation -i "1:0" \
        -c:v libx264 -preset veryfast -tune zerolatency \
        -b:v 2500k -maxrate 2500k -bufsize 5000k \
        -c:a aac -b:a 128k -ac 2 -ar 48000 \
        -f flv rtmp://localhost:1935/live/stream
}

# Screen capture (Linux)
screen_linux() {
    log_info "Starting screen capture (Linux)..."
    log_info "Press Ctrl+C to stop"
    echo ""
    
    ffmpeg -hide_banner -loglevel info \
        -f x11grab -i :0.0 \
        -f alsa -i default \
        -c:v libx264 -preset veryfast -tune zerolatency \
        -b:v 2500k -maxrate 2500k -bufsize 5000k \
        -c:a aac -b:a 128k -ac 2 -ar 48000 \
        -f flv rtmp://localhost:1935/live/stream
}

# Custom FFmpeg command
custom_command() {
    echo ""
    log_info "Custom FFmpeg command examples:"
    echo ""
    echo "📹 Webcam + Audio:"
    echo "ffmpeg -f avfoundation -i \"0:0\" -c:v libx264 -preset veryfast -c:a aac -f flv rtmp://localhost:1935/live/stream"
    echo ""
    echo "🖥️  Screen + Audio:"
    echo "ffmpeg -f avfoundation -i \"1:0\" -c:v libx264 -preset veryfast -c:a aac -f flv rtmp://localhost:1935/live/stream"
    echo ""
    echo "📁 File + Audio:"
    echo "ffmpeg -i input.mp4 -c:v libx264 -preset veryfast -c:a aac -f flv rtmp://localhost:1935/live/stream"
    echo ""
    echo "🎵 Audio only:"
    echo "ffmpeg -f avfoundation -i \":0\" -c:a aac -b:a 128k -f flv rtmp://localhost:1935/live/stream"
    echo ""
}

# OBS Studio setup
obs_setup() {
    echo ""
    log_info "OBS Studio Setup:"
    echo ""
    echo "1. Open OBS Studio"
    echo "2. Go to Settings → Stream"
    echo "3. Set Service to 'Custom...'"
    echo "4. Server: rtmp://localhost:1935/live"
    echo "5. Stream Key: stream"
    echo "6. Click 'Start Streaming'"
    echo ""
    echo "📺 Your stream will be available at:"
    echo "   http://localhost:8080"
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

# Check if FFmpeg is available
if ! command -v ffmpeg >/dev/null 2>&1; then
    log_error "FFmpeg is not installed. Please install it first:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg"
    exit 1
fi

main
