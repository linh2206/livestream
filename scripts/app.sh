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

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Install dependencies
install() {
    log_info "Installing dependencies..."
    check_docker
    log_info "Building services..."
    docker-compose build
    log_success "Dependencies installed"
}

# Start services
start() {
    log_info "Starting LiveStream App..."
    check_docker
    docker-compose up -d
    log_success "Services started"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend: http://localhost:9000"
    log_info "Web Interface: http://localhost:8080"
}

# Stop services
stop() {
    log_info "Stopping LiveStream App..."
    docker-compose down
    log_success "Services stopped"
}

# Show status
status() {
    log_info "Service Status:"
    docker-compose ps
}

# Show logs
logs() {
    docker-compose logs -f
}

# Clean up
clean() {
    log_info "Cleaning up..."
    docker-compose down -v
    docker system prune -f
    log_success "Cleanup complete"
}

# Build services
build() {
    log_info "Building services..."
    check_docker
    docker-compose build
    log_success "Build complete"
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
