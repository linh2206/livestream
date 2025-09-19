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

# Function to check if Docker is running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed. Please install Docker first."
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_warning "Docker is not running. Please start Docker first."
        return 1
    fi
    
    return 0
}

# Function to get Docker Compose command
get_compose_cmd() {
    # Check for new docker compose (v2) first - this is the modern way
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    # Fallback to docker-compose binary
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        log_error "Docker Compose not found. Please run 'make install' first."
        exit 1
    fi
}

# Function to wait for service health
wait_for_health() {
    local service=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    log_info "Waiting for $service to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps --filter "name=$service" --filter "health=healthy" | grep -q "$service"; then
            log_success "$service is healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service failed to become healthy after $max_attempts attempts"
    return 1
}

# Install Docker
install_docker() {
    log_info "Installing Docker on Ubuntu..."
    
    # Check if apt is available
    if ! command -v apt >/dev/null 2>&1; then
        log_error "This script requires Ubuntu with apt package manager"
        exit 1
    fi
    
    # Check if running as root
    if [ "$(id -u)" = "0" ]; then
        SUDO=""
    else
        SUDO="sudo"
    fi
    
    # Remove old Docker installations
    log_info "Removing old Docker installations..."
    $SUDO apt-get remove -y docker docker-engine docker.io containerd runc docker-compose || true
    
    # Update package index
    log_info "Updating package index..."
    $SUDO apt-get update
    
    # Install prerequisites
    log_info "Installing prerequisites..."
    $SUDO apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    log_info "Adding Docker's official GPG key..."
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    log_info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index again
    log_info "Updating package index..."
    $SUDO apt-get update
    
    # Install Docker Engine
    log_info "Installing Docker Engine..."
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    log_info "Starting Docker service..."
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    
    # Add user to docker group
    if [ "$(id -u)" != "0" ]; then
        log_info "Adding user to docker group..."
        $SUDO usermod -aG docker $USER
        log_warning "Please logout and login again, or run: newgrp docker"
    fi
    
    # Verify installation
    log_info "Verifying Docker installation..."
    if docker --version >/dev/null 2>&1; then
        log_success "Docker installed successfully:"
        docker --version
    else
        log_error "Docker installation failed"
        exit 1
    fi
    
    # Verify Docker Compose installation
    log_info "Verifying Docker Compose installation..."
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose installed successfully:"
        docker compose version
    else
        log_error "Docker Compose installation failed"
        exit 1
    fi
    
    log_success "Docker and Docker Compose installation completed!"
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
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        log_info "Creating .env file..."
        if [ -f "env.example" ]; then
            cp env.example .env
            log_success ".env file created from env.example"
        else
            # Create basic .env file
            cat > .env << 'EOF'
# LiveStream App Environment Variables
JWT_SECRET=your-secret-key-change-this-in-production

# Database credentials
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=livestream

# Database URLs
MONGODB_URI=mongodb://admin:password@mongodb:27017/livestream?authSource=admin
REDIS_URL=redis://redis:6379

# Frontend URLs
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_WS_URL=ws://localhost:9000

# Streaming URLs
RTMP_URL=rtmp://localhost:1935/live
HLS_URL=http://localhost:8080/hls

# Development
NODE_ENV=production
EOF
            log_success ".env file created with default values"
        fi
    else
        log_info ".env file already exists"
    fi

    log_info "Building services..."
    COMPOSE_CMD=$(get_compose_cmd)
    $COMPOSE_CMD build
    log_success "Dependencies installed"
}

# Start services
start() {
    log_info "Starting LiveStream App..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD up -d
        
        # Wait for critical services to be healthy
        wait_for_health "livestream-mongodb" 30
        wait_for_health "livestream-redis" 20
        wait_for_health "livestream-api" 40
        wait_for_health "livestream-frontend" 30
        
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
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD down
        log_success "Services stopped"
    else
        log_warning "Docker not running, nothing to stop"
    fi
}

# Show status
status() {
    log_info "Service Status:"
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD ps
    else
        log_warning "Docker not running, cannot show status"
    fi
}

# Show logs
logs() {
    log_info "Showing service logs..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD logs -f
    else
        log_error "Cannot show logs without Docker. Please start Docker first."
        exit 1
    fi
}

# Clean up
clean() {
    log_info "Cleaning up..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD down -v
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
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD build
        log_success "Build complete"
    else
        log_error "Cannot build without Docker. Please start Docker first."
        exit 1
    fi
}

# Reset everything (keep SSH and code)
reset_all() {
    log_warning "⚠️  WARNING: This will DELETE EVERYTHING except SSH and source code!"
    log_warning "This includes: Docker, databases, logs, caches, and all data!"
    echo ""
    read -p "Are you absolutely sure you want to continue? Type 'YES' to confirm: " confirm
    if [ "$confirm" != "YES" ]; then
        log_info "Operation cancelled."
        exit 1
    fi
    
    log_info "Starting complete system reset..."
    
    # Check if running as root
    if [ "$(id -u)" = "0" ]; then
        SUDO=""
    else
        SUDO="sudo"
    fi
    
    # Stop all services
    log_info "Stopping all services..."
    $SUDO systemctl stop docker mongodb redis nginx 2>/dev/null || true
    
    # Remove Docker completely
    log_info "Removing Docker completely..."
    if command -v docker >/dev/null 2>&1; then
        # Stop all containers
        docker stop $(docker ps -aq) 2>/dev/null || true
        docker rm $(docker ps -aq) 2>/dev/null || true
        
        # Remove all images, volumes, networks
        docker rmi $(docker images -aq) 2>/dev/null || true
        docker volume rm $(docker volume ls -q) 2>/dev/null || true
        docker network rm $(docker network ls -q) 2>/dev/null || true
        
        # Remove Docker packages
        $SUDO apt-get remove -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
        $SUDO apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
        
        # Remove Docker directories
        $SUDO rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
        
        log_success "Docker completely removed"
    fi
    
    # Remove Node.js and npm
    log_info "Removing Node.js and npm..."
    $SUDO apt-get remove -y nodejs npm 2>/dev/null || true
    $SUDO apt-get purge -y nodejs npm 2>/dev/null || true
    $SUDO rm -rf /usr/local/bin/npm /usr/local/bin/node /usr/local/lib/node_modules /usr/local/include/node 2>/dev/null || true
    $SUDO rm -rf ~/.npm ~/.node-gyp 2>/dev/null || true
    log_success "Node.js and npm removed"
    
    # Remove MongoDB
    log_info "Removing MongoDB..."
    $SUDO systemctl stop mongod 2>/dev/null || true
    $SUDO apt-get remove -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
    $SUDO apt-get purge -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
    $SUDO rm -rf /var/lib/mongodb /var/log/mongodb /etc/mongod.conf 2>/dev/null || true
    log_success "MongoDB removed"
    
    # Remove Redis
    log_info "Removing Redis..."
    $SUDO systemctl stop redis 2>/dev/null || true
    $SUDO apt-get remove -y redis-server redis-tools 2>/dev/null || true
    $SUDO apt-get purge -y redis-server redis-tools 2>/dev/null || true
    $SUDO rm -rf /var/lib/redis /var/log/redis /etc/redis 2>/dev/null || true
    log_success "Redis removed"
    
    # Remove Nginx
    log_info "Removing Nginx..."
    $SUDO systemctl stop nginx 2>/dev/null || true
    $SUDO apt-get remove -y nginx nginx-common nginx-core 2>/dev/null || true
    $SUDO apt-get purge -y nginx nginx-common nginx-core 2>/dev/null || true
    $SUDO rm -rf /var/www/html /etc/nginx /var/log/nginx 2>/dev/null || true
    log_success "Nginx removed"
    
    # Remove all project data
    log_info "Removing all project data..."
    rm -rf data/ hls/ logs/ tmp/ .env 2>/dev/null || true
    log_success "Project data removed"
    
    # Remove all build artifacts
    log_info "Removing all build artifacts..."
    rm -rf services/api/node_modules/ services/api/dist/ services/frontend/node_modules/ services/frontend/.next/ services/frontend/out/ services/frontend/build/ 2>/dev/null || true
    log_success "Build artifacts removed"
    
    # Remove all caches
    log_info "Removing all caches..."
    $SUDO rm -rf /var/cache/apt/archives/* /var/cache/apt/lists/* /tmp/* /var/tmp/* ~/.cache 2>/dev/null || true
    log_success "Caches removed"
    
    # Remove all logs
    log_info "Removing all logs..."
    $SUDO rm -rf /var/log/*.log /var/log/*.old /var/log/*.gz 2>/dev/null || true
    find . -name "*.log" -type f -delete 2>/dev/null || true
    log_success "Logs removed"
    
    # Clean up temporary files
    log_info "Cleaning up temporary files..."
    find . -name "*.tmp" -o -name ".DS_Store" -o -name "Thumbs.db" -o -name "*.swp" -o -name "*.swo" -o -name "*~" -type f -delete 2>/dev/null || true
    log_success "Temporary files removed"
    
    # Reset file permissions
    log_info "Resetting file permissions..."
    chmod +x scripts/*.sh 2>/dev/null || true
    chmod 644 *.md *.yml *.json 2>/dev/null || true
    log_success "File permissions reset"
    
    # Clean up package manager
    log_info "Cleaning up package manager..."
    $SUDO apt-get autoremove -y 2>/dev/null || true
    $SUDO apt-get autoclean 2>/dev/null || true
    log_success "Package manager cleaned"
    
    # Show what was preserved
    log_info "The following were preserved:"
    echo "  ✓ Source code (all .ts, .tsx, .js, .jsx files)"
    echo "  ✓ Configuration files (.json, .yml, .yaml, .conf)"
    echo "  ✓ Environment template (env.example)"
    echo "  ✓ Documentation files (.md, .txt)"
    echo "  ✓ SSH configuration and keys"
    echo "  ✓ Git repository and history"
    echo "  ✓ Makefile and scripts"
    echo "  ✓ Project structure"
    
    # Show what was removed
    log_warning "The following were completely removed:"
    echo "  ✗ Docker and all containers/images/volumes"
    echo "  ✗ Node.js and npm"
    echo "  ✗ MongoDB and all data"
    echo "  ✗ Redis and all data"
    echo "  ✗ Nginx and all configs"
    echo "  ✗ All project data and logs"
    echo "  ✗ All build artifacts and caches"
    echo "  ✗ All temporary files"
    
    # Show next steps
    log_success "Complete system reset finished!"
    echo ""
    log_info "Next steps:"
    echo "  1. Run 'make install' to reinstall everything"
    echo "  2. Run 'make start' to start services"
    echo "  3. Or run 'make setup' for quick setup"
    echo ""
    log_info "Your SSH configuration and source code are intact."
    log_warning "You will need to reconfigure everything from scratch."
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
        reset-all) reset_all ;;
        *) 
            echo "Usage: $0 {install|start|stop|status|logs|clean|build|reset-all}"
            exit 1
            ;;
    esac
}

main "$@"
