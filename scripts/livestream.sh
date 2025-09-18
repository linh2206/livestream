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

# Check network connectivity
check_network() {
    log_info "Checking network connectivity..."
    
    if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log_error "No internet connection. Please check your network."
        exit 1
    fi
    
    if ! nslookup archive.ubuntu.com >/dev/null 2>&1; then
        log_warning "DNS resolution failed. Trying to fix DNS..."
        
        # Try to fix DNS
        echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf >/dev/null
        echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf >/dev/null
        
        # Wait a moment
        sleep 2
        
        if ! nslookup archive.ubuntu.com >/dev/null 2>&1; then
            log_error "DNS still not working. Please check your network configuration."
            exit 1
        fi
    fi
    
    log_success "Network connectivity OK"
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
        # Check network first
        check_network
        
        log_info "Updating package lists..."
        sudo apt update --fix-missing || {
            log_error "Failed to update package lists. Please check your internet connection."
            exit 1
        }
        
        log_info "Installing prerequisites..."
        sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release --fix-missing || {
            log_error "Failed to install prerequisites. Please check your internet connection."
            exit 1
        }
        
        log_info "Adding Docker GPG key..."
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg || {
            log_error "Failed to add Docker GPG key. Please check your internet connection."
            exit 1
        }
        
        log_info "Adding Docker repository..."
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        log_info "Updating package lists again..."
        sudo apt update --fix-missing || {
            log_error "Failed to update package lists after adding Docker repo. Please check your internet connection."
            exit 1
        }
        
        log_info "Installing Docker..."
        sudo apt install -y docker-ce docker-ce-cli containerd.io --fix-missing || {
            log_error "Failed to install Docker. Please check your internet connection."
            exit 1
        }
        
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
            sudo apt install -y docker-compose-plugin --fix-missing
        fi
    fi
    
    log_success "Docker Compose installed successfully"
}

# Install FFmpeg - Simple and effective
install_ffmpeg() {
    log_info "Installing FFmpeg..."
    
    if [[ "$OS" == "macos" ]]; then
        if command -v brew >/dev/null 2>&1; then
            brew install ffmpeg || {
                log_error "Failed to install FFmpeg via Homebrew"
                exit 1
            }
        else
            log_error "Homebrew not found. Please install Homebrew first."
            exit 1
        fi
    elif [[ "$OS" == "ubuntu" ]]; then
        # Ubuntu FFmpeg installation - simple approach
        log_info "Installing FFmpeg on Ubuntu..."
        
        # Try snap first (most reliable)
        if sudo snap install ffmpeg; then
            log_success "FFmpeg installed via snap"
        elif sudo apt update && sudo apt install -y ffmpeg; then
            log_success "FFmpeg installed via apt"
        else
            log_error "Failed to install FFmpeg. Please install manually:"
            echo "  sudo snap install ffmpeg"
            echo "  sudo apt install ffmpeg"
            exit 1
        fi
    else
        log_error "Unsupported OS: $OS. Please install FFmpeg manually."
        exit 1
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

# Fix network issues
fix_network() {
    log_info "Attempting to fix network issues..."
    
    # Try different DNS servers
    log_info "Setting up alternative DNS servers..."
    echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf >/dev/null
    echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf >/dev/null
    echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf >/dev/null
    
    # Restart networking
    sudo systemctl restart systemd-resolved 2>/dev/null || true
    
    # Wait for DNS to work
    sleep 3
    
    # Test again
    if nslookup archive.ubuntu.com >/dev/null 2>&1; then
        log_success "Network fixed!"
        return 0
    else
        log_error "Network still not working. Please check your server configuration."
        return 1
    fi
}

# Install function
install_app() {
    echo "🎬 LiveStream App - Universal Installer"
    echo "======================================"
    
    detect_os
    
    # Check network first
    if [[ "$OS" == "ubuntu" ]]; then
        if ! nslookup archive.ubuntu.com >/dev/null 2>&1; then
            log_warning "Network issues detected. Attempting to fix..."
            if ! fix_network; then
                log_error "Cannot fix network issues. Please check your server configuration:"
                echo ""
                echo "1. Check internet connection"
                echo "2. Check DNS settings"
                echo "3. Check firewall settings"
                echo "4. Try: sudo systemctl restart networking"
                echo ""
                exit 1
            fi
        fi
    fi
    
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

# Check for active streaming processes
check_streaming_processes() {
    log_info "Checking for active streaming processes..."
    
    # Check for FFmpeg processes
    ffmpeg_processes=$(pgrep -f "ffmpeg" 2>/dev/null || true)
    if [[ -n "$ffmpeg_processes" ]]; then
        log_warning "Found active FFmpeg processes:"
        ps -p $ffmpeg_processes -o pid,cmd 2>/dev/null || true
        echo ""
    fi
    
    # Check for OBS processes
    obs_processes=$(pgrep -f "obs" 2>/dev/null || true)
    if [[ -n "$obs_processes" ]]; then
        log_warning "Found active OBS processes:"
        ps -p $obs_processes -o pid,cmd 2>/dev/null || true
        echo ""
    fi
    
    # Check for processes using streaming ports
    for port in 8080 1935 3000 5432 6379; do
        port_processes=$(lsof -ti:$port 2>/dev/null || true)
        if [[ -n "$port_processes" ]]; then
            log_warning "Found processes using port $port:"
            ps -p $port_processes -o pid,cmd 2>/dev/null || true
            echo ""
        fi
    done
}

# Kill all processes (ultra clean - only protect SSH)
kill_all_processes() {
    log_info "Killing all processes (ultra clean - only protecting SSH)..."
    
    # Kill ALL livestream related processes
    pkill -f "livestream" 2>/dev/null || true
    pkill -f "stream" 2>/dev/null || true
    pkill -f "nginx.*livestream" 2>/dev/null || true
    pkill -f "node.*livestream" 2>/dev/null || true
    pkill -f "ffmpeg.*livestream" 2>/dev/null || true
    pkill -f "ffmpeg.*stream" 2>/dev/null || true
    
    # Kill processes by port (all livestream ports, only protect SSH port 22)
    for port in 8080 1935 3000 5432 6379; do
        if command -v lsof >/dev/null 2>&1; then
            processes=$(lsof -ti:$port 2>/dev/null || true)
            if [[ -n "$processes" ]]; then
                for pid in $processes; do
                    # Only protect SSH processes
                    cmd=$(ps -p $pid -o cmd= 2>/dev/null || true)
                    if ! echo "$cmd" | grep -q -i "ssh\|sshd"; then
                        kill -9 $pid 2>/dev/null || true
                    fi
                done
            fi
        fi
    done
    
    # PROTECT ONLY SSH port 22
    log_info "Protecting ONLY SSH port 22..."
    
    # Wait for processes to terminate
    sleep 2
    
    log_success "All processes killed (only SSH protected)"
}

# Remove Docker completely (ultra clean)
remove_docker_completely() {
    log_info "Removing Docker completely (ultra clean)..."
    
    cd "$PROJECT_ROOT"
    
    # Try docker-compose first, then docker compose
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        log_warning "Docker Compose not found, skipping container removal"
        return
    fi
    
    # Stop ALL containers (not just livestream)
    docker stop $(docker ps -aq) 2>/dev/null || true
    
    # Remove ALL containers
    docker rm -f $(docker ps -aq) 2>/dev/null || true
    
    # Remove ALL images
    docker rmi -f $(docker images -q) 2>/dev/null || true
    
    # Remove ALL volumes
    docker volume rm -f $(docker volume ls -q) 2>/dev/null || true
    
    # Remove ALL networks (except default)
    docker network ls --format "{{.Name}}" | grep -v -E "^(bridge|host|none)$" | xargs -r docker network rm 2>/dev/null || true
    
    # Clean up Docker system completely
    docker system prune -a -f --volumes 2>/dev/null || true
    
    log_success "Docker completely removed (ultra clean)"
}

# Remove system configurations (Linux only - ultra clean)
remove_system_configs() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_info "Removing system configurations (ultra clean)..."
        
        # Stop and disable ALL livestream related services
        for service in livestream-app livestream livestream-backend livestream-nginx livestream-postgres livestream-redis livestream-websocket; do
            sudo systemctl stop "$service" 2>/dev/null || true
            sudo systemctl disable "$service" 2>/dev/null || true
            sudo rm -f "/etc/systemd/system/${service}.service" 2>/dev/null || true
            sudo rm -f "/lib/systemd/system/${service}.service" 2>/dev/null || true
            sudo rm -f "/usr/lib/systemd/system/${service}.service" 2>/dev/null || true
        done
        
        # Remove ALL firewall rules (protect SSH port 22)
        sudo ufw delete allow 8080 2>/dev/null || true
        sudo ufw delete allow 1935 2>/dev/null || true
        sudo ufw delete allow 3000 2>/dev/null || true
        sudo ufw delete allow 5432 2>/dev/null || true
        sudo ufw delete allow 6379 2>/dev/null || true
        
        # iptables rules - remove ALL livestream related ports (protect SSH port 22)
        sudo iptables -D INPUT -p tcp --dport 8080 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 1935 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 5432 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 6379 -j ACCEPT 2>/dev/null || true
        
        # Reload systemd
        sudo systemctl daemon-reload 2>/dev/null || true
        sudo systemctl reset-failed 2>/dev/null || true
        
        log_success "System configurations removed (ultra clean)"
    else
        log_info "Skipping system configurations (not Linux)"
    fi
}

# Clean up logs and temporary files (ultra clean)
cleanup_logs_and_temp() {
    log_info "Cleaning up logs and temporary files (ultra clean)..."
    
    # Remove ALL livestream related log files
    sudo rm -rf /var/log/livestream* 2>/dev/null || true
    sudo rm -rf /var/log/stream* 2>/dev/null || true
    
    # Remove ALL livestream related temporary files
    sudo rm -rf /tmp/livestream* 2>/dev/null || true
    sudo rm -rf /tmp/stream* 2>/dev/null || true
    sudo rm -rf /tmp/hls* 2>/dev/null || true
    
    # Remove ALL livestream related cache files
    sudo rm -rf /var/cache/livestream* 2>/dev/null || true
    sudo rm -rf /var/cache/stream* 2>/dev/null || true
    
    # Clean up journal logs completely
    sudo journalctl --vacuum-time=1d 2>/dev/null || true
    
    # Remove any remaining livestream directories
    sudo rm -rf /opt/livestream* 2>/dev/null || true
    sudo rm -rf /usr/local/bin/livestream* 2>/dev/null || true
    
    log_success "All logs and temporary files cleaned (ultra clean)"
}

# Clean up system packages (optional - ultra clean)
cleanup_packages() {
    log_info "Cleaning up system packages (ultra clean)..."
    
    # Remove Docker packages
    sudo apt-get remove -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
    sudo apt-get remove -y docker-compose 2>/dev/null || true
    
    # Remove FFmpeg
    sudo apt-get remove -y ffmpeg 2>/dev/null || true
    
    # Clean up package cache
    sudo apt-get autoremove -y 2>/dev/null || true
    sudo apt-get autoclean 2>/dev/null || true
    
    log_success "System packages cleaned (ultra clean)"
}

# Clean function (keep code)
clean_app() {
    echo "🧹 LiveStream App - Clean (Keep Code)"
    echo "===================================="
    echo ""
    
    # Check for active streaming processes first
    check_streaming_processes
    
    log_warning "This will clean LiveStream App but KEEP the code:"
    echo ""
    echo "  • Kill ALL livestream/stream processes"
    echo "  • Remove ALL Docker containers, images, volumes, networks"
    echo "  • Remove ALL systemd services"
    echo "  • Remove ALL firewall rules"
    echo "  • Remove ALL logs and temporary files"
    echo "  • KEEP project files and code"
    echo ""
    echo "✅ ONLY PROTECTED:"
    echo "  • SSH connection (port 22)"
    echo "  • Project code and files"
    echo ""
    log_error "⚠️  WARNING: This will clean everything except SSH and code!"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Clean cancelled."
        return
    fi
    
    kill_all_processes
    remove_docker_completely
    remove_system_configs
    cleanup_logs_and_temp
    
    echo ""
    log_success "🧹 LiveStream App cleaned (code preserved)!"
    echo ""
    echo "📋 What was cleaned:"
    echo "  • ALL livestream/stream processes"
    echo "  • ALL Docker containers, images, volumes, networks"
    echo "  • ALL systemd services"
    echo "  • ALL firewall rules"
    echo "  • ALL logs and temporary files"
    echo ""
    echo "✅ PRESERVED:"
    echo "  • SSH connection (port 22)"
    echo "  • Project code and files"
    echo ""
    echo "🔄 To start fresh:"
    echo "  ./scripts/livestream.sh start"
    echo ""
}

# Uninstall function (remove everything)
uninstall_app() {
    echo "🗑️  LiveStream App - Ultra Clean Uninstall"
    echo "=========================================="
    echo ""
    
    # Check for active streaming processes first
    check_streaming_processes
    
    log_warning "This will ULTRA CLEAN remove LiveStream App and ALL related components:"
    echo ""
    echo "  • Kill ALL livestream/stream processes"
    echo "  • Remove ALL Docker containers, images, volumes, networks"
    echo "  • Remove ALL systemd services"
    echo "  • Remove ALL firewall rules"
    echo "  • Remove ALL logs and temporary files"
    echo "  • Remove project files and directories (optional)"
    echo "  • Remove system packages (optional)"
    echo ""
    echo "✅ ONLY PROTECTED:"
    echo "  • SSH connection (port 22)"
    echo ""
    log_error "⚠️  WARNING: This will ULTRA CLEAN everything except SSH!"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Uninstall cancelled."
        return
    fi
    
    kill_all_processes
    remove_docker_completely
    remove_system_configs
    cleanup_logs_and_temp
    
    echo ""
    read -p "Remove project files and code? (y/n): " remove_code
    if [[ "$remove_code" == "y" || "$remove_code" == "Y" ]]; then
        log_info "Removing project files..."
        cd "$(dirname "$PROJECT_ROOT")"
        rm -rf "$(basename "$PROJECT_ROOT")"
        log_success "Project files removed"
    else
        log_info "Keeping project files and code"
    fi
    
    echo ""
    read -p "Remove system packages (Docker, FFmpeg)? (y/n): " remove_packages
    if [[ "$remove_packages" == "y" || "$remove_packages" == "Y" ]]; then
        cleanup_packages
    fi
    
    echo ""
    log_success "🎬 LiveStream App ULTRA CLEAN removed!"
    echo ""
    echo "📋 What was removed:"
    echo "  • ALL livestream/stream processes"
    echo "  • ALL Docker containers, images, volumes, networks"
    echo "  • ALL systemd services"
    echo "  • ALL firewall rules"
    echo "  • ALL logs and temporary files"
    echo "  • Project files (if selected)"
    echo "  • System packages (if selected)"
    echo ""
    echo "✅ ONLY PROTECTED:"
    echo "  • SSH connection (port 22)"
    echo ""
    echo "🔄 Server is now ULTRA CLEAN - ready for fresh installation!"
    echo ""
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
    echo "6. 🧹 Clean (Keep Code)"
    echo "7. 🗑️  Ultra Clean Uninstall"
    echo "8. ❓ Help"
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
    echo "  ./scripts/livestream.sh clean     - Clean (keep code)"
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
        "start"|"single")
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
        "clean")
            clean_app
            ;;
        "uninstall")
            uninstall_app
            ;;
        "multi")
            deploy_multi
            ;;
        "help")
            help_info
            ;;
        "menu"|"")
            show_main_menu
            read -p "Enter your choice (1-8): " choice
            
            case $choice in
                1) install_app ;;
                2) start_app ;;
                3) stop_app ;;
                4) show_status ;;
                5) stream_app ;;
                6) clean_app ;;
                7) uninstall_app ;;
                8) help_info ;;
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
