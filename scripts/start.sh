#!/bin/bash

# 🎬 LiveStream App - Start Script

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

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker is running"
}

# Stop any existing containers
stop_existing() {
    log_info "Stopping existing containers..."
    
    # Try docker-compose first, then docker compose
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Neither docker-compose nor docker compose found. Please install Docker Compose."
        exit 1
    fi
    
    $COMPOSE_CMD -f docker/docker-compose.yml down >/dev/null 2>&1 || true
    log_success "Existing containers stopped"
}

# Start services
start_services() {
    log_info "Starting LiveStream App services..."
    
    # Try docker-compose first, then docker compose
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Neither docker-compose nor docker compose found. Please install Docker Compose."
        exit 1
    fi
    
    $COMPOSE_CMD -f docker/docker-compose.yml up -d
    
    log_success "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for web interface
    for i in {1..30}; do
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            log_success "Web interface is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo ""
}

# Show status
show_status() {
    log_info "Service Status:"
    docker-compose -f docker/docker-compose.yml ps
    
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
    echo "  ./scripts/stream.sh"
    echo ""
    echo "🛑 Stop services:"
    echo "  ./scripts/stop.sh"
    echo ""
}

# Main function
main() {
    echo "🎬 LiveStream App - Starting Services"
    echo "===================================="
    
    check_docker
    stop_existing
    start_services
    wait_for_services
    show_status
}

# Run main function
main "$@"
