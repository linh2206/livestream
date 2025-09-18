#!/bin/bash

# 🎬 LiveStream App - Complete Uninstall Script

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
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Confirmation prompt
confirm_uninstall() {
    echo "🗑️  LiveStream App - Complete Uninstall"
    echo "======================================"
    echo ""
    log_warning "This will completely remove LiveStream App and all its components:"
    echo ""
    echo "  • Docker containers and images"
    echo "  • Project files and directories"
    echo "  • System configurations (Linux only)"
    echo "  • All data and settings"
    echo ""
    log_error "⚠️  WARNING: This action cannot be undone!"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Uninstall cancelled."
        exit 0
    fi
}

# Stop and remove Docker containers
remove_docker_containers() {
    log_info "Stopping and removing Docker containers..."
    
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
    
    # Stop and remove containers
    $COMPOSE_CMD -f docker/docker-compose.yml down -v 2>/dev/null || true
    
    # Remove images
    docker rmi livestream-app_nginx livestream-app_backend livestream-app_postgres livestream-app_redis 2>/dev/null || true
    
    # Remove volumes
    docker volume rm livestream-app_postgres_data livestream-app_redis_data 2>/dev/null || true
    
    # Remove networks
    docker network rm livestream-app_default 2>/dev/null || true
    
    log_success "Docker containers and images removed"
}

# Remove system configurations (Linux only)
remove_system_configs() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_info "Removing system configurations..."
        
        # Stop systemd service if exists
        sudo systemctl stop livestream-app 2>/dev/null || true
        sudo systemctl disable livestream-app 2>/dev/null || true
        sudo rm -f /etc/systemd/system/livestream-app.service 2>/dev/null || true
        
        # Remove firewall rules
        sudo ufw delete allow 8080 2>/dev/null || true
        sudo ufw delete allow 1935 2>/dev/null || true
        
        # Reload systemd
        sudo systemctl daemon-reload 2>/dev/null || true
        
        log_success "System configurations removed"
    else
        log_info "Skipping system configurations (not Linux)"
    fi
}

# Remove project files
remove_project_files() {
    log_info "Removing project files..."
    
    # Remove the entire project directory
    cd "$(dirname "$PROJECT_ROOT")"
    rm -rf "$(basename "$PROJECT_ROOT")"
    
    log_success "Project files removed"
}

# Clean up Docker system
cleanup_docker() {
    log_info "Cleaning up Docker system..."
    
    # Remove unused images
    docker image prune -f 2>/dev/null || true
    
    # Remove unused volumes
    docker volume prune -f 2>/dev/null || true
    
    # Remove unused networks
    docker network prune -f 2>/dev/null || true
    
    log_success "Docker system cleaned up"
}

# Main uninstall function
main() {
    confirm_uninstall
    
    remove_docker_containers
    remove_system_configs
    remove_project_files
    cleanup_docker
    
    echo ""
    log_success "🎬 LiveStream App completely removed!"
    echo ""
    echo "📋 What was removed:"
    echo "  • All Docker containers and images"
    echo "  • Project files and directories"
    echo "  • System configurations"
    echo "  • All data and settings"
    echo ""
    echo "🔄 To reinstall:"
    echo "  git clone <repository-url>"
    echo "  cd livestream-app"
    echo "  ./scripts/install.sh"
    echo ""
}

# Run main function
main "$@"
