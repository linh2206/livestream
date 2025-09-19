#!/bin/bash

# Reset All Script - Xóa toàn bộ nhưng giữ lại SSH và code
# Usage: ./scripts/reset-all.sh

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

# Check if running as root
if [ "$(id -u)" = "0" ]; then
    log_warning "Running as root. This is not recommended for security reasons."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled."
        exit 1
    fi
fi

log_info "Starting complete system reset (keeping SSH and code)..."

# Function to check if Docker is running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    if ! docker info >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Stop and remove all containers
log_info "Stopping and removing all containers..."
if check_docker; then
    # Try new syntax first, fallback to old syntax
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        docker compose down -v --remove-orphans 2>/dev/null || true
    else
        docker-compose down -v --remove-orphans 2>/dev/null || true
    fi
    
    # Stop all running containers
    docker stop $(docker ps -aq) 2>/dev/null || true
    docker rm $(docker ps -aq) 2>/dev/null || true
    log_success "All containers stopped and removed"
else
    log_warning "Docker not running, skipping container cleanup"
fi

# Remove all Docker images
log_info "Removing all Docker images..."
if check_docker; then
    docker rmi $(docker images -aq) 2>/dev/null || true
    log_success "All Docker images removed"
else
    log_warning "Docker not running, skipping image cleanup"
fi

# Remove all Docker volumes
log_info "Removing all Docker volumes..."
if check_docker; then
    docker volume rm $(docker volume ls -q) 2>/dev/null || true
    log_success "All Docker volumes removed"
else
    log_warning "Docker not running, skipping volume cleanup"
fi

# Remove all Docker networks (except default)
log_info "Removing custom Docker networks..."
if check_docker; then
    docker network rm $(docker network ls -q --filter type=custom) 2>/dev/null || true
    log_success "Custom Docker networks removed"
else
    log_warning "Docker not running, skipping network cleanup"
fi

# Clean up Docker system
log_info "Cleaning up Docker system..."
if check_docker; then
    docker system prune -af --volumes 2>/dev/null || true
    log_success "Docker system cleaned"
else
    log_warning "Docker not running, skipping system cleanup"
fi

# Remove project-specific data directories
log_info "Removing project data directories..."
rm -rf hls/ 2>/dev/null || true
rm -rf docker-data/ 2>/dev/null || true
rm -rf logs/ 2>/dev/null || true
rm -rf tmp/ 2>/dev/null || true
log_success "Project data directories removed"

# Remove node_modules and build artifacts
log_info "Removing build artifacts..."
rm -rf services/api/node_modules/ 2>/dev/null || true
rm -rf services/api/dist/ 2>/dev/null || true
rm -rf services/frontend/node_modules/ 2>/dev/null || true
rm -rf services/frontend/.next/ 2>/dev/null || true
rm -rf services/frontend/out/ 2>/dev/null || true
log_success "Build artifacts removed"

# Remove temporary files
log_info "Removing temporary files..."
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name "Thumbs.db" -type f -delete 2>/dev/null || true
log_success "Temporary files removed"

# Clear package manager caches
log_info "Clearing package manager caches..."
if command -v npm >/dev/null 2>&1; then
    npm cache clean --force 2>/dev/null || true
fi
if command -v yarn >/dev/null 2>&1; then
    yarn cache clean 2>/dev/null || true
fi
log_success "Package manager caches cleared"

# Reset file permissions
log_info "Resetting file permissions..."
chmod +x scripts/*.sh 2>/dev/null || true
log_success "File permissions reset"

# Show what was preserved
log_info "The following were preserved:"
echo "  ✓ Source code (all .ts, .tsx, .js, .jsx files)"
echo "  ✓ Configuration files (.json, .yml, .yaml, .conf)"
echo "  ✓ Documentation files (.md, .txt)"
echo "  ✓ SSH configuration and keys"
echo "  ✓ Git repository and history"
echo "  ✓ Makefile and scripts"

# Show next steps
log_success "Reset complete!"
echo ""
log_info "Next steps:"
echo "  1. Run 'make install' to reinstall dependencies"
echo "  2. Run 'make start' to start services"
echo "  3. Or run 'make setup' for quick setup"
echo ""
log_info "Your SSH configuration and source code are intact."
