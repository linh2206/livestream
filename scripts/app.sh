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
        log_warning "Docker is not running. Some commands may fail."
        return 1
    fi
    return 0
}

# Install dependencies
install() {
    log_info "Installing dependencies..."
    if check_docker; then
        log_info "Building services..."
        docker-compose build
        log_success "Dependencies installed"
    else
        log_error "Cannot install without Docker. Please start Docker first."
        exit 1
    fi
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
