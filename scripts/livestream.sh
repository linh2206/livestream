#!/bin/bash

# 🎬 LiveStream App - Main Control Script
# All-in-one script for managing LiveStream App

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

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Common functions
get_compose_cmd() {
    if command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        log_error "Neither docker-compose nor docker compose found. Please install Docker Compose."
        exit 1
    fi
}

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker is running"
}

check_services() {
    if ! curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log_warning "LiveStream App services are not running."
        return 1
    fi
    return 0
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt >/dev/null 2>&1; then
            OS="ubuntu"
        else
            OS="linux"
        fi
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    log_info "Detected OS: $OS"
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."
    
    if [[ "$OS" == "macos" ]]; then
        if ! command -v brew >/dev/null 2>&1; then
            log_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        if ! command -v docker >/dev/null 2>&1; then
            brew install --cask docker
            log_warning "Please start Docker Desktop from Applications and try again."
            exit 1
        fi
    elif [[ "$OS" == "ubuntu" ]]; then
        sudo apt update
        sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
        
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        sudo apt update
        sudo apt install -y docker-ce docker-ce-cli containerd.io
        
        sudo usermod -aG docker $USER
        log_warning "Please log out and log back in for Docker group changes to take effect."
    fi
    
    log_success "Docker installed successfully"
}

# Install Docker Compose
install_docker_compose() {
    log_info "Installing Docker Compose..."
    
    # Try docker-compose first, then docker compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        if [[ "$OS" == "macos" ]]; then
            brew install docker-compose
        elif [[ "$OS" == "ubuntu" ]]; then
            sudo apt install -y docker-compose-plugin
        fi
    fi
    
    log_success "Docker Compose installed successfully"
}

# Install FFmpeg
install_ffmpeg() {
    log_info "Installing FFmpeg..."
    
    if [[ "$OS" == "macos" ]]; then
        brew install ffmpeg
    elif [[ "$OS" == "ubuntu" ]]; then
        sudo apt update
        sudo apt install -y ffmpeg
    fi
    
    log_success "FFmpeg installed successfully"
}

# Verify installations
verify_installations() {
    log_info "Verifying installations..."
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        log_success "Docker: $(docker --version)"
    else
        log_error "Docker not found"
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        log_success "Docker Compose: $(docker-compose --version)"
    elif docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose: $(docker compose version)"
    else
        log_error "Docker Compose not found"
        exit 1
    fi
    
    # Check FFmpeg
    if command -v ffmpeg >/dev/null 2>&1; then
        log_success "FFmpeg: $(ffmpeg -version | head -n1)"
    else
        log_error "FFmpeg not found"
        exit 1
    fi
}

# Setup project
setup_project() {
    log_info "Setting up project..."
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Create necessary directories
    mkdir -p hls
    
    # Set permissions
    chmod 755 hls
    
    log_success "Project setup completed"
}

# Install function
install_app() {
    echo "🎬 LiveStream App - Universal Installer"
    echo "======================================"
    
    detect_os
    install_docker
    install_docker_compose
    install_ffmpeg
    verify_installations
    setup_project
    
    echo ""
    log_success "🎬 LiveStream App installation completed!"
    echo ""
    echo "Next steps:"
    echo "1. Start the application: ./scripts/livestream.sh start"
    echo "2. Access web interface: http://localhost:8080"
    echo "3. Start streaming: ./scripts/livestream.sh stream"
    echo ""
    echo "Or use the main control script:"
    echo "  ./scripts/livestream.sh"
    echo ""
}

# Start function
start_app() {
    echo "🎬 LiveStream App - Starting Services"
    echo "===================================="
    
    check_docker
    
    log_info "Stopping existing containers..."
    COMPOSE_CMD=$(get_compose_cmd)
    $COMPOSE_CMD -f docker/docker-compose.yml down >/dev/null 2>&1 || true
    
    log_info "Starting LiveStream App services..."
    $COMPOSE_CMD -f docker/docker-compose.yml up -d
    
    log_info "Waiting for services to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            log_success "Web interface is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    
    log_info "Service Status:"
    $COMPOSE_CMD -f docker/docker-compose.yml ps
    
    echo ""
    log_success "🎬 LiveStream App is running!"
    echo ""
    echo "📱 Access URLs:"
    echo "  Web Interface: http://localhost:8080"
    echo "  RTMP Input:    rtmp://localhost:1935/live"
    echo "  Stream Key:    stream"
    echo "  HLS Output:    http://localhost:8080/hls/stream.m3u8"
    echo ""
    echo "🎮 Start streaming:"
    echo "  ./scripts/livestream.sh stream"
    echo ""
    echo "🛑 Stop services:"
    echo "  ./scripts/livestream.sh stop"
    echo ""
}

# Stop function
stop_app() {
    echo "🎬 LiveStream App - Stopping Services"
    echo "===================================="
    
    check_docker
    
    log_info "Stopping LiveStream App services..."
    COMPOSE_CMD=$(get_compose_cmd)
    
    # Stop and remove containers with volumes
    $COMPOSE_CMD -f docker/docker-compose.yml down -v --remove-orphans
    
    # Force remove any remaining containers with livestream in name
    docker ps -a --filter "name=livestream" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
    
    log_info "Checking remaining containers..."
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q livestream; then
        log_warning "Some containers are still running:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep livestream
    else
        log_success "All LiveStream App containers stopped"
    fi
    
    echo ""
    log_success "🎬 LiveStream App stopped!"
    echo ""
    echo "🚀 To start again:"
    echo "  ./scripts/livestream.sh start"
    echo ""
}

# Status function
show_status() {
    echo "🎬 LiveStream App - Status"
    echo "========================="
    echo ""
    
    if check_services; then
        log_success "LiveStream App is running!"
        echo ""
        echo "📱 Access URLs:"
        echo "  Web Interface: http://localhost:8080"
        echo "  RTMP Input:    rtmp://localhost:1935/live"
        echo "  Stream Key:    stream"
        echo "  HLS Output:    http://localhost:8080/hls/stream.m3u8"
        echo ""
        
        COMPOSE_CMD=$(get_compose_cmd)
        log_info "Service Status:"
        $COMPOSE_CMD -f docker/docker-compose.yml ps
    else
        log_warning "LiveStream App is not running."
        echo ""
        echo "🚀 To start:"
        echo "  ./scripts/livestream.sh start"
    fi
    echo ""
}

# Streaming functions
show_streaming_options() {
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

test_stream() {
    log_info "Starting test stream with color bars..."
    
    ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 \
           -f lavfi -i sine=frequency=1000:sample_rate=48000 \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

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

screen_macos() {
    log_info "Starting screen capture (macOS)..."
    
    ffmpeg -f avfoundation -i "1:0" \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

screen_linux() {
    log_info "Starting screen capture (Linux)..."
    
    ffmpeg -f x11grab -i :0.0 \
           -f alsa -i default \
           -c:v libx264 -preset veryfast -tune zerolatency \
           -c:a aac -ar 48000 -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream
}

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
    echo "  - Make sure LiveStream App is running (./scripts/livestream.sh start)"
    echo "  - Check your internet connection"
    echo "  - Adjust bitrate based on your upload speed"
    echo ""
}

stream_app() {
    if ! command -v ffmpeg >/dev/null 2>&1; then
        log_error "FFmpeg is not installed. Please run ./scripts/install.sh first."
        exit 1
    fi
    
    if ! check_services; then
        log_warning "LiveStream App services are not running."
        log_info "Please start the services first: ./scripts/livestream.sh start"
        exit 1
    fi
    
    show_streaming_options
    
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

# Main menu
show_main_menu() {
    echo "🎬 LiveStream App - Main Control"
    echo "==============================="
    echo ""
    echo "Choose an action:"
    echo ""
    echo "1. 🔧 Install/Setup"
    echo "2. 🚀 Start Services"
    echo "3. 🛑 Stop Services"
    echo "4. 📊 Show Status"
    echo "5. 🎮 Start Streaming"
    echo "6. 🧹 Ultra Clean Uninstall"
    echo "7. ❓ Help"
    echo ""
}

help_info() {
    echo ""
    log_info "LiveStream App - Help"
    echo "======================="
    echo ""
    echo "Available commands:"
    echo "  ./scripts/livestream.sh install   - Install Docker, FFmpeg, setup project"
    echo "  ./scripts/livestream.sh start     - Start all services"
    echo "  ./scripts/livestream.sh stop      - Stop all services"
    echo "  ./scripts/livestream.sh status    - Show service status"
    echo "  ./scripts/livestream.sh stream    - Start streaming"
    echo "  ./scripts/livestream.sh uninstall - Ultra clean uninstall"
    echo "  ./scripts/livestream.sh help      - Show this help"
    echo ""
    echo "Quick start:"
    echo "  1. ./scripts/livestream.sh install"
    echo "  2. ./scripts/livestream.sh start"
    echo "  3. Open http://localhost:8080"
    echo "  4. ./scripts/livestream.sh stream"
    echo ""
    echo "Access URLs:"
    echo "  Web Interface: http://localhost:8080"
    echo "  RTMP Input:    rtmp://localhost:1935/live"
    echo "  Stream Key:    stream"
    echo "  HLS Output:    http://localhost:8080/hls/stream.m3u8"
    echo ""
}

# Main function
main() {
    case "${1:-menu}" in
        "install")
            install_app
            ;;
        "start")
            start_app
            ;;
        "stop")
            stop_app
            ;;
        "status")
            show_status
            ;;
        "stream")
            stream_app
            ;;
        "uninstall")
            log_info "Running ultra clean uninstall..."
            ./uninstall.sh
            ;;
        "help")
            help_info
            ;;
        "menu"|"")
            show_main_menu
            read -p "Enter your choice (1-7): " choice
            
            case $choice in
                1) install_app ;;
                2) start_app ;;
                3) stop_app ;;
                4) show_status ;;
                5) stream_app ;;
                6) 
                    log_info "Running ultra clean uninstall..."
                    ./uninstall.sh
                    ;;
                7) help_info ;;
                *) log_error "Invalid choice. Please run the script again." ;;
            esac
            ;;
        *)
            log_error "Unknown command: $1"
            help_info
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
