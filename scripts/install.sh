#!/bin/bash
set -euo pipefail

# LiveStream App - Universal Installation Script
# Supports macOS and Ubuntu with auto-detection

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info() { echo -e "${BLUE}==> $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

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
        log_error "Unsupported OS: $OSTYPE"
        exit 1
    fi
    log_success "Detected OS: $OS"
}

# Install dependencies based on OS
install_dependencies() {
    case $OS in
        "macos")
            if ! command -v brew >/dev/null 2>&1; then
                log_info "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            if ! command -v docker >/dev/null 2>&1; then
                log_info "Installing Docker Desktop..."
                brew install --cask docker
            fi
            ;;
        "ubuntu")
            log_info "Updating system packages..."
            sudo apt update && sudo apt upgrade -y
            
            if ! command -v docker >/dev/null 2>&1; then
                log_info "Installing Docker..."
                curl -fsSL https://get.docker.com -o get-docker.sh
                sudo sh get-docker.sh
                sudo usermod -aG docker $USER
                rm get-docker.sh
            fi
            ;;
    esac
}

# Setup project
setup_project() {
    local project_dir="/home/$USER/livestream-app"
    if [[ $OS == "macos" ]]; then
        project_dir="/Users/$USER/livestream-app"
    fi
    
    log_info "Setting up project at $project_dir..."
    
    if [ -d "$project_dir" ]; then
        sudo mv "$project_dir" "${project_dir}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    sudo cp -r "$(pwd)" "$project_dir"
    sudo chown -R $USER:$USER "$project_dir"
    
    echo "$project_dir"
}

# Create system service
create_service() {
    local project_dir="$1"
    
    if [[ $OS == "ubuntu" ]]; then
        sudo tee /etc/systemd/system/livestream-app.service > /dev/null <<EOF
[Unit]
Description=LiveStream Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$project_dir
ExecStart=/usr/bin/docker-compose -f docker/docker-compose.yml up -d
ExecStop=/usr/bin/docker-compose -f docker/docker-compose.yml down
TimeoutStartSec=0
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable livestream-app.service
    fi
}

# Main installation
main() {
    echo "🎬 LiveStream App - Universal Installer"
    echo "======================================="
    
    detect_os
    install_dependencies
    
    local project_dir=$(setup_project)
    create_service "$project_dir"
    
    echo ""
    echo "🎉 Installation completed!"
    echo "📁 Project: $project_dir"
    echo "🚀 Start: cd $project_dir && ./start.sh"
    echo "🌐 Access: http://localhost:8080"
    echo ""
}

main "$@"
