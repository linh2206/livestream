#!/bin/bash

# 🎬 LiveStream App - Stop Script

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

# Stop services
stop_services() {
    log_info "Stopping LiveStream App services..."
    
    # Try docker-compose first, then docker compose
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Neither docker-compose nor docker compose found. Please install Docker Compose."
        exit 1
    fi
    
    # Stop and remove containers with volumes
    $COMPOSE_CMD -f docker/docker-compose.yml down -v --remove-orphans
    
    # Force remove any remaining containers with livestream in name
    docker ps -a --filter "name=livestream" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
    
    log_success "Services stopped successfully"
}

# Show status
show_status() {
    log_info "Checking remaining containers..."
    
    # Check if any containers are still running
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q livestream; then
        log_warning "Some containers are still running:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep livestream
    else
        log_success "All LiveStream App containers stopped"
    fi
}

# Main function
main() {
    echo "🎬 LiveStream App - Stopping Services"
    echo "===================================="
    
    stop_services
    show_status
    
    echo ""
    log_success "🎬 LiveStream App stopped!"
    echo ""
    echo "🚀 To start again:"
    echo "  ./scripts/start.sh"
    echo ""
}

# Run main function
main "$@"
