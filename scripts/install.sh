#!/bin/bash

# 🎬 LiveStream App - Universal Installer
# Supports macOS and Ubuntu

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

# Main installation function
main() {
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
    echo "1. Start the application: ./scripts/start.sh"
    echo "2. Access web interface: http://localhost:8080"
    echo "3. Start streaming: ./scripts/stream.sh"
    echo ""
}

# Run main function
main "$@"
