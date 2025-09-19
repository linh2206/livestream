#!/bin/bash

# LiveStream App Control Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo "[INFO] $1"; }
log_success() { echo "[SUCCESS] $1"; }
log_warning() { echo "[WARNING] $1"; }
log_error() { echo "[ERROR] $1"; }

# Function to check if Docker is running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        echo "[ERROR] Docker is not installed. Please install Docker first."
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        echo "[WARNING] Docker is not running. Please start Docker first."
        return 1
    fi
    
    return 0
}

# Function to get Docker Compose command
get_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo "[ERROR] Docker Compose not found" >&2
        exit 1
    fi
}

# Function to wait for service health
wait_for_health() {
    local service=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    echo "[INFO] Waiting for $service to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps --filter "name=$service" --filter "health=healthy" | grep -q "$service"; then
            echo "[SUCCESS] $service is healthy"
            return 0
        fi
        
        echo "[INFO] Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "[ERROR] $service failed to become healthy after $max_attempts attempts"
    return 1
}

# Install Docker
install_docker() {
    echo "[INFO] Installing Docker on Ubuntu..."
    
    # Check if apt is available
    if ! command -v apt >/dev/null 2>&1; then
        echo "[ERROR] This script requires Ubuntu with apt package manager"
        exit 1
    fi
    
    # Check if running as root
    if [ "$(id -u)" = "0" ]; then
        SUDO=""
    else
        SUDO="sudo"
    fi
    
    # Remove old Docker installations completely
    echo "[INFO] Removing old Docker installations completely..."
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
    echo "[INFO] Updating package index..."
    $SUDO apt-get update
    
    # Install prerequisites
    echo "[INFO] Installing prerequisites..."
    $SUDO apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    echo "[INFO] Adding Docker's official GPG key..."
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo "[INFO] Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index again
    echo "[INFO] Updating package index..."
    $SUDO apt-get update
    
    # Install Docker Engine
    echo "[INFO] Installing Docker Engine..."
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Verify Docker Compose plugin installation
    echo "[INFO] Verifying Docker Compose plugin..."
    if docker compose version >/dev/null 2>&1; then
        echo "[SUCCESS] Docker Compose plugin installed successfully"
    else
        echo "[WARNING] Docker Compose plugin not found, trying to install manually..."
        $SUDO apt-get install -y docker-compose-plugin
    fi
    
    # Verify Docker installation
    echo "[INFO] Verifying Docker installation..."
    if docker --version >/dev/null 2>&1; then
        echo "[SUCCESS] Docker installed successfully:"
        docker --version
    else
        echo "[ERROR] Docker installation failed"
        exit 1
    fi
    
    # Verify Docker Compose installation
    echo "[INFO] Verifying Docker Compose installation..."
    if docker compose version >/dev/null 2>&1; then
        echo "[SUCCESS] Docker Compose installed successfully:"
        docker compose version
    else
        echo "[ERROR] Docker Compose installation failed"
        exit 1
    fi
    
    # Start and enable Docker
    echo "[INFO] Starting Docker service..."
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    
    # Add user to docker group
    if [ "$(id -u)" != "0" ]; then
        echo "[INFO] Adding user to docker group..."
        $SUDO usermod -aG docker $USER
        echo "[WARNING] Please logout and login again, or run: newgrp docker"
    fi
    
    # Verify installation
    echo "[INFO] Verifying Docker installation..."
    if docker --version >/dev/null 2>&1; then
        echo "[SUCCESS] Docker installed successfully:"
        docker --version
    else
        echo "[ERROR] Docker installation failed"
        exit 1
    fi
    
    # Verify Docker Compose installation
    echo "[INFO] Verifying Docker Compose installation..."
    if docker compose version >/dev/null 2>&1; then
        echo "[SUCCESS] Docker Compose installed successfully:"
        docker compose version
    else
        echo "[ERROR] Docker Compose installation failed"
        exit 1
    fi
    
    echo "[SUCCESS] Docker and Docker Compose installation completed!"
}


# Install dependencies
install() {
    echo "[INFO] Installing dependencies..."
    
    # Check if Docker is installed
    if ! command -v docker >/dev/null 2>&1; then
        echo "[INFO] Docker not found. Installing Docker..."
        install_docker
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo "[INFO] Starting Docker service..."
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
            echo "[INFO] Please start Docker Desktop manually on macOS"
            open -a Docker 2>/dev/null || true
        fi
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "[INFO] Creating .env file..."
        if [ -f "env.example" ]; then
            cp env.example .env
            echo "[SUCCESS] .env file created from env.example"
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
            echo "[SUCCESS] .env file created with default values"
        fi
    else
        echo "[INFO] .env file already exists"
    fi

    echo "[INFO] Building services..."
    COMPOSE_CMD=$(get_compose_cmd)
    
    # Set build timeout and retry
    export DOCKER_BUILDKIT=1
    export COMPOSE_HTTP_TIMEOUT=300
    
    # Debug info
    echo "[INFO] Docker version: $(docker --version 2>/dev/null || echo 'Not found')"
    echo "[INFO] Docker Compose version: $(docker compose version 2>/dev/null || echo 'Not found')"
    echo "[INFO] Docker info: $(docker info --format '{{.ServerVersion}}' 2>/dev/null || echo 'Not available')"
    
    # Test network connectivity
    echo "[INFO] Testing network connectivity..."
    if command -v ping >/dev/null 2>&1; then
        if ! ping -c 1 registry-1.docker.io >/dev/null 2>&1; then
            echo "[WARNING] Cannot reach Docker registry. Check network connection."
        fi
    else
        echo "[INFO] Ping command not available, skipping network test"
    fi
    
    # Build with timeout and retry
    echo "[INFO] Building with timeout 10 minutes..."
    if ! $COMPOSE_CMD build --no-cache; then
        echo "[WARNING] Build with --no-cache failed, trying without --no-cache..."
        if ! $COMPOSE_CMD build; then
            echo "[WARNING] Build failed, trying to build individual services..."
            # Try building services one by one (skip mongodb and redis as they use pre-built images)
            for service in api frontend nginx; do
                echo "[INFO] Building $service..."
                if ! $COMPOSE_CMD build $service; then
                    echo "[ERROR] Failed to build $service"
                    exit 1
                fi
            done
        fi
    fi
    
    echo "[SUCCESS] Dependencies installed"
}

# Start services
start() {
    echo "[INFO] Starting LiveStream App..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD up -d
        
        # Wait for critical services to be healthy (non-blocking)
        wait_for_health "livestream-mongodb" 30 || echo "[WARNING] MongoDB health check timeout"
        wait_for_health "livestream-redis" 20 || echo "[WARNING] Redis health check timeout"
        wait_for_health "livestream-api" 40 || echo "[WARNING] API health check timeout"
        wait_for_health "livestream-frontend" 30 || echo "[WARNING] Frontend health check timeout"
        
        echo "[SUCCESS] Services started"
        echo "[INFO] Frontend: http://localhost:3000"
        echo "[INFO] Backend: http://localhost:9000"
        echo "[INFO] Web Interface: http://localhost:8080"
    else
        echo "[ERROR] Cannot start without Docker. Please start Docker first."
        exit 1
    fi
}

# Stop services
stop() {
    echo "[INFO] Stopping LiveStream App..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD down
        echo "[SUCCESS] Services stopped"
    else
        echo "[WARNING] Docker not running, nothing to stop"
    fi
}

# Show status
status() {
    echo "[INFO] Service Status:"
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD ps
    else
        echo "[WARNING] Docker not running, cannot show status"
    fi
}

# Show logs
logs() {
    echo "[INFO] Showing service logs..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD logs -f
    else
        echo "[ERROR] Cannot show logs without Docker. Please start Docker first."
        exit 1
    fi
}

# Clean up
clean() {
    echo "[INFO] Cleaning up..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD down -v
        docker system prune -f
        echo "[SUCCESS] Cleanup complete"
    else
        echo "[WARNING] Docker not running, nothing to clean"
    fi
}

# Build services
build() {
    echo "[INFO] Building services..."
    if check_docker; then
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD build
        echo "[SUCCESS] Build complete"
    else
        echo "[ERROR] Cannot build without Docker. Please start Docker first."
        exit 1
    fi
}

# Reset everything (keep SSH and code)
reset_all() {
    echo "[WARNING] ⚠️  WARNING: This will DELETE EVERYTHING except SSH and source code!"
    echo "[WARNING] This includes: Docker, databases, logs, caches, and all data!"
    echo ""
    read -p "Are you absolutely sure you want to continue? Type 'YES' to confirm: " confirm
    if [ "$confirm" != "YES" ]; then
        echo "[INFO] Operation cancelled."
        exit 1
    fi
    
    echo "[INFO] Starting complete system reset..."
    
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
        echo "[ERROR] Unsupported OS: $OSTYPE"
        exit 1
    fi
    
    echo "[INFO] Detected OS: $OS"
    
    # Stop all services
    echo "[INFO] Stopping all services..."
    $SUDO systemctl stop docker mongodb redis nginx 2>/dev/null || true
    
    # Remove Docker completely
    echo "[INFO] Removing Docker completely..."
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
            echo "[INFO] Removing Docker Desktop on macOS..."
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
        
        echo "[SUCCESS] Docker completely removed"
    fi
    
    # Remove Node.js and npm
    echo "[INFO] Removing Node.js and npm..."
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
    echo "[SUCCESS] Node.js and npm removed"
    
    # Remove MongoDB
    echo "[INFO] Removing MongoDB..."
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
    echo "[SUCCESS] MongoDB removed"
    
    # Remove Redis
    echo "[INFO] Removing Redis..."
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
    echo "[SUCCESS] Redis removed"
    
    # Remove Nginx
    echo "[INFO] Removing Nginx..."
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
    echo "[SUCCESS] Nginx removed"
    
    # Remove all project data
    echo "[INFO] Removing all project data..."
    rm -rf data/ hls/ logs/ tmp/ .env 2>/dev/null || true
    echo "[SUCCESS] Project data removed"
    
    # Remove all build artifacts
    echo "[INFO] Removing all build artifacts..."
    rm -rf services/api/node_modules/ services/api/dist/ services/frontend/node_modules/ services/frontend/.next/ services/frontend/out/ services/frontend/build/ 2>/dev/null || true
    echo "[SUCCESS] Build artifacts removed"
    
    # Remove all caches
    echo "[INFO] Removing all caches..."
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
    echo "[SUCCESS] Caches removed"
    
    # Remove all logs
    echo "[INFO] Removing all logs..."
    if [ "$OS" = "macos" ]; then
        # macOS: Remove logs
        rm -rf ~/Library/Logs/* 2>/dev/null || true
        rm -rf /var/log/*.log /var/log/*.old /var/log/*.gz 2>/dev/null || true
    else
        # Ubuntu: Remove logs
        $SUDO rm -rf /var/log/*.log /var/log/*.old /var/log/*.gz 2>/dev/null || true
    fi
    find . -name "*.log" -type f -delete 2>/dev/null || true
    echo "[SUCCESS] Logs removed"
    
    # Clean up temporary files
    echo "[INFO] Cleaning up temporary files..."
    find . -name "*.tmp" -o -name ".DS_Store" -o -name "Thumbs.db" -o -name "*.swp" -o -name "*.swo" -o -name "*~" -type f -delete 2>/dev/null || true
    echo "[SUCCESS] Temporary files removed"
    
    # Reset file permissions
    echo "[INFO] Resetting file permissions..."
    chmod +x scripts/*.sh 2>/dev/null || true
    chmod 644 *.md *.yml *.json 2>/dev/null || true
    echo "[SUCCESS] File permissions reset"
    
    # Clean up package manager
    echo "[INFO] Cleaning up package manager..."
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
    echo "[SUCCESS] Package manager cleaned"
    
    # Show what was preserved
    echo "[INFO] The following were preserved:"
    echo "  ✓ Source code (all .ts, .tsx, .js, .jsx files)"
    echo "  ✓ Configuration files (.json, .yml, .yaml, .conf)"
    echo "  ✓ Environment template (env.example)"
    echo "  ✓ Documentation files (.md, .txt)"
    echo "  ✓ SSH configuration and keys"
    echo "  ✓ Git repository and history"
    echo "  ✓ Makefile and scripts"
    echo "  ✓ Project structure"
    
    # Show what was removed
    echo "[WARNING] The following were completely removed:"
    echo "  ✗ Docker and all containers/images/volumes"
    echo "  ✗ Node.js and npm"
    echo "  ✗ MongoDB and all data"
    echo "  ✗ Redis and all data"
    echo "  ✗ Nginx and all configs"
    echo "  ✗ All project data and logs"
    echo "  ✗ All build artifacts and caches"
    echo "  ✗ All temporary files"
    
    # Show next steps
    echo "[SUCCESS] Complete system reset finished!"
    echo ""
    echo "[INFO] Next steps:"
    echo "  1. Run 'make install' to reinstall everything"
    echo "  2. Run 'make start' to start services"
    echo "  3. Or run 'make setup' for quick setup"
    echo ""
    echo "[INFO] Your SSH configuration and source code are intact."
    echo "[WARNING] You will need to reconfigure everything from scratch."
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
