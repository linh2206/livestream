#!/bin/bash

# LiveStream App Control Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" >&2; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

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
    # Use docker compose (plugin) - this is the modern way
    if command -v docker >/dev/null 2>&1; then
        if docker compose version >/dev/null 2>&1; then
            echo "docker compose"
        elif command -v docker-compose >/dev/null 2>&1; then
            log_warning "Using legacy docker-compose command"
            echo "docker-compose"
        else
            log_error "Docker Compose not found. Please install docker-compose-plugin:"
            log_error "  sudo apt-get install docker-compose-plugin"
            exit 1
        fi
    else
        log_error "Docker not found. Please install Docker first."
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
    
    # Remove old Docker installations completely
    log_info "Removing old Docker installations completely..."
    $SUDO apt-get remove -y docker docker-engine docker.io containerd runc docker-compose || true
    $SUDO apt-get purge -y docker docker-engine docker.io containerd runc docker-compose || true
    $SUDO rm -rf /var/lib/docker || true
    $SUDO rm -rf /var/lib/containerd || true
    $SUDO rm -rf /etc/docker || true
    $SUDO rm -rf /etc/apt/sources.list.d/docker.list || true
    $SUDO rm -rf /etc/apt/keyrings/docker.gpg || true
    $SUDO rm -rf /usr/local/bin/docker-compose || true
    $SUDO rm -rf /usr/bin/docker-compose || true
    $SUDO rm -rf /usr/local/bin/docker-compose-* || true
    $SUDO rm -rf /usr/bin/docker-compose-* || true
    $SUDO rm -rf /snap/bin/docker-compose || true
    
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
    
    # Verify Docker Compose plugin installation
    log_info "Verifying Docker Compose plugin..."
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose plugin installed successfully"
    else
        log_warning "Docker Compose plugin not found, trying to install manually..."
        $SUDO apt-get install -y docker-compose-plugin
    fi
    
    # Verify Docker installation
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
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux: Use systemctl
            if [ "$(id -u)" = "0" ]; then
                systemctl start docker
                systemctl enable docker
            else
                sudo systemctl start docker
                sudo systemctl enable docker
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS: Start Docker Desktop
            log_info "Please start Docker Desktop manually on macOS"
            open -a Docker 2>/dev/null || true
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
    
    # Set build timeout and retry
    export DOCKER_BUILDKIT=1
    export COMPOSE_HTTP_TIMEOUT=300
    
    # Debug info
    log_info "Docker version: $(docker --version 2>/dev/null || echo 'Not found')"
    log_info "Docker Compose version: $($COMPOSE_CMD version 2>/dev/null || echo 'Not found')"
    log_info "Docker info: $(docker info --format '{{.ServerVersion}}' 2>/dev/null || echo 'Not available')"
    
    # Test network connectivity
    log_info "Testing network connectivity..."
    if command -v ping >/dev/null 2>&1; then
        if ! ping -c 1 registry-1.docker.io >/dev/null 2>&1; then
            log_warning "Cannot reach Docker registry. Check network connection."
        fi
    else
        log_info "Ping command not available, skipping network test"
    fi
    
    # Build with timeout and retry
    log_info "Building with timeout 10 minutes..."
    if ! timeout 600 $COMPOSE_CMD build --no-cache; then
        log_warning "Build with --no-cache failed, trying without --no-cache..."
        if ! timeout 600 $COMPOSE_CMD build; then
            log_warning "Build failed, trying to build individual services..."
            # Try building services one by one (skip mongodb and redis as they use pre-built images)
            for service in api frontend nginx; do
                log_info "Building $service..."
                if ! timeout 300 $COMPOSE_CMD build $service 2>&1; then
                    log_error "Failed to build $service. Check the output above for details."
                    exit 1
                fi
            done
        fi
    fi
    
    log_success "Dependencies installed"
}

# Start services
start() {
    log_info "Starting LiveStream App..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD up -d
        
        # Wait for critical services to be healthy (non-blocking)
        wait_for_health "livestream-mongodb" 30 || log_warning "MongoDB health check timeout"
        wait_for_health "livestream-redis" 20 || log_warning "Redis health check timeout"
        wait_for_health "livestream-api" 40 || log_warning "API health check timeout"
        wait_for_health "livestream-frontend" 30 || log_warning "Frontend health check timeout"
        
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
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        SUDO=""
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="ubuntu"
        if [ "$(id -u)" = "0" ]; then
            SUDO=""
        else
            SUDO="sudo"
        fi
    else
        log_error "Unsupported OS: $OSTYPE"
        exit 1
    fi
    
    log_info "Detected OS: $OS"
    
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
        
        if [ "$OS" = "macos" ]; then
            # macOS: Remove Docker Desktop
            log_info "Removing Docker Desktop on macOS..."
            # Stop Docker Desktop
            osascript -e 'quit app "Docker Desktop"' 2>/dev/null || true
            # Remove Docker Desktop app
            rm -rf /Applications/Docker.app 2>/dev/null || true
            # Remove Docker data
            rm -rf ~/Library/Containers/com.docker.docker 2>/dev/null || true
            rm -rf ~/Library/Application\ Support/Docker\ Desktop 2>/dev/null || true
            rm -rf ~/Library/Group\ Containers/group.com.docker 2>/dev/null || true
            rm -rf ~/Library/HTTPStorages/com.docker.docker 2>/dev/null || true
            rm -rf ~/Library/Logs/Docker\ Desktop 2>/dev/null || true
            rm -rf ~/Library/Preferences/com.docker.docker.plist 2>/dev/null || true
            rm -rf ~/Library/Saved\ Application\ State/com.electron.docker-frontend.savedState 2>/dev/null || true
            rm -rf ~/Library/Cookies/com.docker.docker.binarycookies 2>/dev/null || true
            # Remove Docker CLI
            rm -rf /usr/local/bin/docker /usr/local/bin/docker-compose 2>/dev/null || true
            rm -rf /usr/local/share/docker 2>/dev/null || true
        else
            # Ubuntu: Remove Docker packages
            $SUDO apt-get remove -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
            $SUDO apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
            
            # Remove Docker directories
            $SUDO rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
        fi
        
        log_success "Docker completely removed"
    fi
    
    # Remove Node.js and npm
    log_info "Removing Node.js and npm..."
    if [ "$OS" = "macos" ]; then
        # macOS: Remove Node.js via Homebrew or manual
        if command -v brew >/dev/null 2>&1; then
            brew uninstall --ignore-dependencies node npm 2>/dev/null || true
        fi
        # Remove Node.js manually
        rm -rf /usr/local/bin/npm /usr/local/bin/node /usr/local/bin/npx 2>/dev/null || true
        rm -rf /usr/local/lib/node_modules /usr/local/include/node 2>/dev/null || true
        rm -rf ~/.npm ~/.node-gyp ~/.nvm 2>/dev/null || true
        rm -rf /opt/homebrew/bin/node /opt/homebrew/bin/npm /opt/homebrew/bin/npx 2>/dev/null || true
        rm -rf /opt/homebrew/lib/node_modules 2>/dev/null || true
    else
        # Ubuntu: Remove Node.js via apt
        $SUDO apt-get remove -y nodejs npm 2>/dev/null || true
        $SUDO apt-get purge -y nodejs npm 2>/dev/null || true
        $SUDO rm -rf /usr/local/bin/npm /usr/local/bin/node /usr/local/lib/node_modules /usr/local/include/node 2>/dev/null || true
        $SUDO rm -rf ~/.npm ~/.node-gyp 2>/dev/null || true
    fi
    log_success "Node.js and npm removed"
    
    # Remove MongoDB
    log_info "Removing MongoDB..."
    if [ "$OS" = "macos" ]; then
        # macOS: Remove MongoDB via Homebrew
        if command -v brew >/dev/null 2>&1; then
            brew services stop mongodb-community 2>/dev/null || true
            brew uninstall mongodb-community 2>/dev/null || true
        fi
        # Remove MongoDB data
        rm -rf /usr/local/var/mongodb /usr/local/var/log/mongodb 2>/dev/null || true
        rm -rf ~/.mongodb 2>/dev/null || true
    else
        # Ubuntu: Remove MongoDB via apt
        $SUDO systemctl stop mongod 2>/dev/null || true
        $SUDO apt-get remove -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
        $SUDO apt-get purge -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
        $SUDO rm -rf /var/lib/mongodb /var/log/mongodb /etc/mongod.conf 2>/dev/null || true
    fi
    log_success "MongoDB removed"
    
    # Remove Redis
    log_info "Removing Redis..."
    if [ "$OS" = "macos" ]; then
        # macOS: Remove Redis via Homebrew
        if command -v brew >/dev/null 2>&1; then
            brew services stop redis 2>/dev/null || true
            brew uninstall redis 2>/dev/null || true
        fi
        # Remove Redis data
        rm -rf /usr/local/var/db/redis /usr/local/var/log/redis 2>/dev/null || true
        rm -rf ~/.redis 2>/dev/null || true
    else
        # Ubuntu: Remove Redis via apt
        $SUDO systemctl stop redis 2>/dev/null || true
        $SUDO apt-get remove -y redis-server redis-tools 2>/dev/null || true
        $SUDO apt-get purge -y redis-server redis-tools 2>/dev/null || true
        $SUDO rm -rf /var/lib/redis /var/log/redis /etc/redis 2>/dev/null || true
    fi
    log_success "Redis removed"
    
    # Remove Nginx
    log_info "Removing Nginx..."
    if [ "$OS" = "macos" ]; then
        # macOS: Remove Nginx via Homebrew
        if command -v brew >/dev/null 2>&1; then
            brew services stop nginx 2>/dev/null || true
            brew uninstall nginx 2>/dev/null || true
        fi
        # Remove Nginx data
        rm -rf /usr/local/var/www /usr/local/etc/nginx /usr/local/var/log/nginx 2>/dev/null || true
    else
        # Ubuntu: Remove Nginx via apt
        $SUDO systemctl stop nginx 2>/dev/null || true
        $SUDO apt-get remove -y nginx nginx-common nginx-core 2>/dev/null || true
        $SUDO apt-get purge -y nginx nginx-common nginx-core 2>/dev/null || true
        $SUDO rm -rf /var/www/html /etc/nginx /var/log/nginx 2>/dev/null || true
    fi
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
    if [ "$OS" = "macos" ]; then
        # macOS: Remove caches
        rm -rf ~/Library/Caches/* 2>/dev/null || true
        rm -rf /tmp/* /var/tmp/* 2>/dev/null || true
        rm -rf ~/.cache 2>/dev/null || true
        # Remove Homebrew caches
        if command -v brew >/dev/null 2>&1; then
            brew cleanup --prune=all 2>/dev/null || true
        fi
    else
        # Ubuntu: Remove caches
        $SUDO rm -rf /var/cache/apt/archives/* /var/cache/apt/lists/* /tmp/* /var/tmp/* ~/.cache 2>/dev/null || true
    fi
    log_success "Caches removed"
    
    # Remove all logs
    log_info "Removing all logs..."
    if [ "$OS" = "macos" ]; then
        # macOS: Remove logs
        rm -rf ~/Library/Logs/* 2>/dev/null || true
        rm -rf /var/log/*.log /var/log/*.old /var/log/*.gz 2>/dev/null || true
    else
        # Ubuntu: Remove logs
        $SUDO rm -rf /var/log/*.log /var/log/*.old /var/log/*.gz 2>/dev/null || true
    fi
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
    if [ "$OS" = "macos" ]; then
        # macOS: Clean up Homebrew
        if command -v brew >/dev/null 2>&1; then
            brew cleanup --prune=all 2>/dev/null || true
            brew autoremove 2>/dev/null || true
        fi
    else
        # Ubuntu: Clean up apt
        $SUDO apt-get autoremove -y 2>/dev/null || true
        $SUDO apt-get autoclean 2>/dev/null || true
    fi
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
