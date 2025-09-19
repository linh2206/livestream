#!/bin/bash

# LiveStream App Control Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Install Docker
install_docker() {
    log_info "Installing Docker on Ubuntu..."
    
    # Check if apt is available
    if ! command -v apt >/dev/null 2>&1; then
        log_error "This script requires Ubuntu with apt package manager"
        exit 1
    fi
    
    # Update package list
    log_info "Updating package list..."
    if [ "$(id -u)" = "0" ]; then
        apt update
    else
        sudo apt update
    fi
    
    # Install Docker
    log_info "Installing Docker..."
    if [ "$(id -u)" = "0" ]; then
        apt install -y docker.io docker-compose
    else
        sudo apt install -y docker.io docker-compose
    fi
    
    # Install latest docker-compose
    log_info "Installing latest docker-compose..."
    COMPOSE_VERSION="v2.23.0"
    if [ "$(id -u)" = "0" ]; then
        curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        # Create symlink for docker compose (new syntax)
        ln -sf /usr/local/bin/docker-compose /usr/local/bin/docker-compose-v2
    else
        sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        # Create symlink for docker compose (new syntax)
        sudo ln -sf /usr/local/bin/docker-compose /usr/local/bin/docker-compose-v2
    fi
    log_success "Docker Compose ${COMPOSE_VERSION} installed"
    
    # Start Docker service
    log_info "Starting Docker service..."
    if [ "$(id -u)" = "0" ]; then
        systemctl start docker
        systemctl enable docker
    else
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    # Add user to docker group
    if [ "$(id -u)" != "0" ]; then
        log_info "Adding user to docker group..."
        sudo usermod -aG docker $USER
        log_warning "Please logout and login again, or run: newgrp docker"
    fi
    
    log_success "Docker installed successfully!"
}

# Check if Docker is running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed."
        echo ""
        echo "To install Docker on Ubuntu:"
        echo "1. sudo apt update"
        echo "2. sudo apt install -y docker.io docker-compose"
        echo "3. sudo systemctl start docker"
        echo "4. sudo systemctl enable docker"
        echo "5. sudo usermod -aG docker \$USER"
        echo "6. Logout and login again"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running."
        echo ""
        echo "To start Docker:"
        echo "1. sudo systemctl start docker"
        echo "2. sudo systemctl enable docker"
        exit 1
    fi
    return 0
}

# Install dependencies
install() {
    log_info "Installing dependencies..."
    
    # Check if Docker is installed
    if ! command -v docker >/dev/null 2>&1; then
        log_info "Docker not found. Installing Docker..."
        install_docker
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_info "Starting Docker service..."
        if [ "$(id -u)" = "0" ]; then
            systemctl start docker
            systemctl enable docker
        else
            sudo systemctl start docker
            sudo systemctl enable docker
        fi
    fi
    
    log_info "Building services..."
    docker-compose build
    log_success "Dependencies installed"
}

# Start services
start() {
    log_info "Starting LiveStream App..."
    if check_docker; then
        docker-compose up -d
        log_success "Services started"
        log_info "Frontend: http://localhost:3000"
        log_info "Backend: http://localhost:9000"
        log_info "Web Interface: http://localhost:8080"
    else
        log_error "Cannot start without Docker. Please start Docker first."
        exit 1
    fi
}

# Stop services
stop() {
    log_info "Stopping LiveStream App..."
    if check_docker; then
        docker-compose down
        log_success "Services stopped"
    else
        log_warning "Docker not running, nothing to stop"
    fi
}

# Show status
status() {
    log_info "Service Status:"
    if check_docker; then
        docker-compose ps
    else
        log_warning "Docker not running, cannot show status"
    fi
}

# Show logs
logs() {
    log_info "Showing service logs..."
    if check_docker; then
        docker-compose logs -f
    else
        log_error "Cannot show logs without Docker. Please start Docker first."
        exit 1
    fi
}

# Clean up
clean() {
    log_info "Cleaning up..."
    if check_docker; then
        docker-compose down -v
        docker system prune -f
        log_success "Cleanup complete"
    else
        log_warning "Docker not running, nothing to clean"
    fi
}

# Build services
build() {
    log_info "Building services..."
    if check_docker; then
        docker-compose build
        log_success "Build complete"
    else
        log_error "Cannot build without Docker. Please start Docker first."
        exit 1
    fi
}

# Main function
main() {
    case "$1" in
        install) install ;;
        start) start ;;
        stop) stop ;;
        status) status ;;
        logs) logs ;;
        clean) clean ;;
        build) build ;;
        *) 
            echo "Usage: $0 {install|start|stop|status|logs|clean|build}"
            exit 1
            ;;
    esac
}

main "$@"
