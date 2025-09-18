#!/bin/bash
set -euo pipefail

# LiveStream App - Universal Start Script
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info() { echo -e "${BLUE}==> $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check Docker
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker not running. Please start Docker first."
        exit 1
    fi
}

# Start services
start_services() {
    log_info "Starting LiveStream services..."
    
    cd "$DOCKER_DIR"
    docker-compose down >/dev/null 2>&1 || true
    docker-compose up -d
    
    # Wait for services
    log_info "Waiting for services to be ready..."
    sleep 10
    
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
        log_success "LiveStream App is running!"
        echo ""
        echo "🌐 Web Interface: http://localhost:8080"
        echo "📡 RTMP Input:    rtmp://localhost:1935/live"
        echo "🔑 Stream Key:    stream"
        echo "🛑 Stop:          ./stop.sh"
    else
        log_error "Failed to start services"
        exit 1
    fi
}

main() {
    check_docker
    start_services
}

main "$@"
