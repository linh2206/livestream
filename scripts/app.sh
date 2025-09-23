#!/bin/bash

# LiveStream App Management Script
# Optimized version with duplicates removed

set -e

# Colors for output
log_info() { echo -e "\033[0;36m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_warning() { echo -e "\033[0;33m[WARNING]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# Common functions
get_sudo_cmd() { [ "$(id -u)" = "0" ] && echo "" || echo "sudo"; }
get_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        log_error "Docker Compose not found" >&2
        exit 1
    fi
}

# Check if running on Ubuntu
check_os() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "This script is only supported on Ubuntu"
        exit 1
    fi
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Install Docker on Ubuntu
install_docker() {
    log_info "Installing Docker on Ubuntu..."
    
    # Check if running on Ubuntu
    if ! command -v apt-get >/dev/null 2>&1; then
        log_error "This script requires Ubuntu with apt package manager"
        exit 1
    fi
    
    SUDO_CMD=$(get_sudo_cmd)
    
    # Remove old Docker installations
    log_info "Removing old Docker installations..."
    $SUDO_CMD systemctl stop docker 2>/dev/null || true
    $SUDO_CMD systemctl stop containerd 2>/dev/null || true
    $SUDO_CMD apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    $SUDO_CMD apt-get purge -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    $SUDO_CMD rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
    
    # Update package index
    log_info "Updating package index..."
    $SUDO_CMD apt-get update
    
    # Install prerequisites
    log_info "Installing prerequisites..."
    $SUDO_CMD apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    log_info "Adding Docker's official GPG key..."
    $SUDO_CMD mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO_CMD gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up Docker repository
    log_info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index
    $SUDO_CMD apt-get update
    
    # Install Docker Engine
    log_info "Installing Docker Engine..."
    $SUDO_CMD apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker service
    log_info "Starting Docker service..."
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
    
    # Add current user to docker group
    if [ "$(id -u)" != "0" ]; then
    log_info "Adding user to docker group..."
        $SUDO_CMD usermod -aG docker $USER
    log_warning "Please logout and login again to use Docker without sudo"
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
    
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose installed successfully:"
        docker compose version
    else
        log_error "Docker Compose installation failed"
        exit 1
    fi
    
    log_success "Docker and Docker Compose installation completed!"
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js..."
    SUDO_CMD=$(get_sudo_cmd)
    
    # Update package list
    $SUDO_CMD apt-get update
    
    # Install curl if not present
    $SUDO_CMD apt-get install -y curl
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO_CMD -E bash -
    
    # Install Node.js
    $SUDO_CMD apt-get install -y nodejs
    
    # Verify installation
    if check_nodejs; then
        log_success "Node.js $(node --version) and npm $(npm --version) installed successfully"
    else
        log_error "Failed to install Node.js"
        return 1
    fi
}

# Check CPU capabilities and fix MongoDB version
check_cpu_and_mongodb() {
    log_info "Checking CPU capabilities..."
    
    # Check if CPU has AVX support
    if grep -q avx /proc/cpuinfo 2>/dev/null; then
        log_success "CPU has AVX support - using MongoDB 7.0"
        MONGO_VERSION="mongo:7.0"
    else
        log_warning "CPU does not have AVX support - using MongoDB 4.4"
        MONGO_VERSION="mongo:4.4"
        
        # Update docker-compose.yml to use MongoDB 4.4
        if [ -f "docker-compose.yml" ]; then
            log_info "Updating docker-compose.yml to use MongoDB 4.4..."
            sed -i.bak 's/mongo:7.0/mongo:4.4/g' docker-compose.yml
            log_success "Updated docker-compose.yml"
        fi
    fi
    
    export MONGO_VERSION
}

# Fix network and DNS issues
fix_network() {
    log_info "Fixing network and DNS issues..."
    
    SUDO_CMD=$(get_sudo_cmd)
    
    # Stop systemd-resolved if running
    log_info "Stopping systemd-resolved..."
    $SUDO_CMD systemctl stop systemd-resolved 2>/dev/null || true
    $SUDO_CMD systemctl disable systemd-resolved 2>/dev/null || true
    
    # Fix DNS resolution
    log_info "Backing up resolv.conf..."
    $SUDO_CMD cp /etc/resolv.conf /etc/resolv.conf.backup 2>/dev/null || true
    
    log_info "Setting DNS to multiple providers..."
    cat << 'EOF' | $SUDO_CMD tee /etc/resolv.conf
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
nameserver 1.0.0.1
nameserver 208.67.222.222
nameserver 208.67.220.220
EOF
    log_success "DNS fixed with multiple providers"
    
    # Make resolv.conf immutable
    $SUDO_CMD chattr +i /etc/resolv.conf 2>/dev/null || true
    
    # Restart network services
    log_info "Restarting network services..."
    $SUDO_CMD systemctl restart networking 2>/dev/null || true
    $SUDO_CMD systemctl restart NetworkManager 2>/dev/null || true
    
    # Restart Docker daemon if installed
    if command -v docker >/dev/null 2>&1; then
        log_info "Restarting Docker daemon..."
        $SUDO_CMD systemctl stop docker 2>/dev/null || true
        sleep 3
        $SUDO_CMD systemctl start docker 2>/dev/null || {
            log_warning "Failed to start Docker service, will install Docker later"
        }
        sleep 5
    fi
    
    # Test network connectivity
    log_info "Testing network connectivity..."
    for dns in 8.8.8.8 1.1.1.1 208.67.222.222; do
        if ping -c 1 -W 5 $dns >/dev/null 2>&1; then
            log_success "Network connectivity OK with $dns"
            break
        else
            log_warning "Failed to ping $dns"
        fi
    done
}

# Check and fix Docker build issues
check_docker_build() {
    log_info "Checking Docker build configuration..."
    
    # Check if API Dockerfile exists and fix COPY command
    if [ -f "services/api/Dockerfile" ]; then
        if ! grep -q "COPY src/ ./" services/api/Dockerfile; then
            log_warning "Fixing API Dockerfile COPY command..."
            sed -i.bak 's/COPY src.*/COPY src\/ .\//' services/api/Dockerfile
            log_success "API Dockerfile fixed - now using 'COPY src/ ./'"
        else
            log_success "API Dockerfile already has correct COPY command"
        fi
    else
        log_error "API Dockerfile not found"
        return 1
    fi
    
    # Check if API src directory exists
    if [ ! -d "services/api/src" ]; then
        log_warning "API src directory not found, creating..."
        mkdir -p services/api/src
        log_success "Created services/api/src directory"
    fi
    
    # Check essential API files exist
    check_api_files
    
    # Check frontend configuration
    check_frontend_config
    
    log_success "Docker build check completed"
    return 0
}

# Check essential API files exist
check_api_files() {
    # Check if essential API files exist
    if [ ! -f "services/api/src/main.ts" ]; then
        log_error "main.ts not found - API cannot start without this file"
        return 1
    fi
    
    if [ ! -f "services/api/src/app.module.ts" ]; then
        log_error "app.module.ts not found - API cannot start without this file"
        return 1
    fi
    
    if [ ! -f "services/api/src/app.controller.ts" ]; then
        log_error "app.controller.ts not found - API cannot start without this file"
        return 1
    fi
    
    if [ ! -f "services/api/src/app.service.ts" ]; then
        log_error "app.service.ts not found - API cannot start without this file"
        return 1
    fi
    
    log_success "All essential API files are present"
}

# Check frontend configuration
check_frontend_config() {
    # Check if frontend directory exists
    if [ ! -d "services/frontend" ]; then
        log_error "Frontend directory not found"
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "services/frontend/package.json" ]; then
        log_error "Frontend package.json not found"
        return 1
    fi
    
    # Check configuration files exist
    check_frontend_config_files
    
    # Check components exist
    check_frontend_components
}

# Check frontend configuration files exist
check_frontend_config_files() {
    # Check if essential frontend files exist
    if [ ! -f "services/frontend/tsconfig.json" ]; then
        log_error "tsconfig.json not found - Frontend cannot build without this file"
        return 1
    fi
    
    if [ ! -f "services/frontend/next.config.js" ]; then
        log_error "next.config.js not found - Frontend cannot build without this file"
        return 1
    fi
    
    if [ ! -f "services/frontend/postcss.config.js" ]; then
        log_error "postcss.config.js not found - Frontend cannot build without this file"
        return 1
    fi
    
    if [ ! -f "services/frontend/tailwind.config.js" ]; then
        log_error "tailwind.config.js not found - Frontend cannot build without this file"
        return 1
    fi
    
    log_success "All essential frontend config files are present"
}

# Check frontend components exist
check_frontend_components() {
    # Check if essential frontend components exist
    if [ ! -d "services/frontend/hooks" ]; then
        log_error "hooks directory not found - Frontend cannot work without this directory"
        return 1
    fi
    
    if [ ! -f "services/frontend/hooks/useSocket.ts" ]; then
        log_error "useSocket.ts not found - Frontend cannot work without this file"
        return 1
    fi
    
    if [ ! -f "services/frontend/components/VideoPlayer.tsx" ]; then
        log_error "VideoPlayer.tsx not found - Frontend cannot work without this file"
        return 1
    fi
    
    log_success "All essential frontend components are present"
}

# Create .env file from env.example
create_env_file() {
    log_info "Creating .env files..."
    
    # Create root .env file
    if [ -f env.example ]; then
        cp env.example .env
        log_success "Root .env file created from env.example"
    else
        log_error "env.example not found - cannot create root .env file"
        return 1
    fi
    
    # Create frontend .env file
    if [ -f services/frontend/.env.example ]; then
        cp services/frontend/.env.example services/frontend/.env
        log_success "Frontend .env file created from .env.example"
    else
        log_warning "services/frontend/.env.example not found - skipping frontend .env creation"
    fi
}

# Setup everything (install + start)
setup() {
    log_info "Setting up LiveStream App..."
    
    # Check CPU and fix MongoDB version first
    check_cpu_and_mongodb
    
    # Fix network issues
    fix_network
    
    # Check Docker build issues
    check_docker_build
    
    # Check if Docker is installed
    if ! check_docker; then
        log_info "Docker not found. Installing Docker..."
        install_docker
    fi
    
    # Create .env file
    create_env_file
    
    # Configure Docker daemon with registry mirrors
    log_info "Configuring Docker daemon with registry mirrors..."
    SUDO_CMD=$(get_sudo_cmd)
    $SUDO_CMD mkdir -p /etc/docker
    cat << 'EOF' | $SUDO_CMD tee /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "dns": ["8.8.8.8", "1.1.1.1"],
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5
}
EOF
    $SUDO_CMD systemctl restart docker
    sleep 5
    
    # Try to pull base images first
    log_info "Pulling base images..."
    docker pull node:18-alpine || log_warning "Failed to pull node:18-alpine, will try during build"
    docker pull ${MONGO_VERSION:-mongo:4.4} || log_warning "Failed to pull ${MONGO_VERSION:-mongo:4.4}, will try during build"
    docker pull redis:7-alpine || log_warning "Failed to pull redis:7-alpine, will try during build"
    
        # Build services
        log_info "Building services..."
        COMPOSE_CMD=$(get_compose_cmd)
        export DOCKER_BUILDKIT=1
        export COMPOSE_HTTP_TIMEOUT=600
        export DOCKER_BUILDKIT_PROGRESS=plain
        
        # Try building individual services first for better error handling
        log_info "Building API service..."
        if ! $COMPOSE_CMD build api; then
            log_error "Failed to build API service"
            exit 1
        fi
        
        log_info "Building Frontend service..."
        if ! $COMPOSE_CMD build frontend; then
            log_warning "Frontend build failed, trying with npm install instead of npm ci..."
            # Update frontend Dockerfile to use npm install
            sed -i 's/RUN npm ci/RUN npm install/g' services/frontend/Dockerfile
            if ! $COMPOSE_CMD build frontend; then
                log_error "Failed to build Frontend service"
                exit 1
            fi
        fi
        
        log_info "Building Nginx service..."
        if ! $COMPOSE_CMD build nginx; then
            log_error "Failed to build Nginx service"
            exit 1
        fi
    
    # Start services
    log_info "Starting services..."
    $COMPOSE_CMD up -d
    
    # Wait for services to be healthy
    wait_for_health "livestream-mongodb" 30 || log_warning "MongoDB health check timeout"
    wait_for_health "livestream-redis" 20 || log_warning "Redis health check timeout"
    wait_for_health "livestream-api" 40 || log_warning "API health check timeout"
    wait_for_health "livestream-frontend" 30 || log_warning "Frontend health check timeout"
    
        log_success "Setup complete!"
        log_info "🎬 LiveStream App is ready!"
        log_info "🌐 Frontend: http://localhost:3000"
        log_info "🔌 API: http://183.182.104.226:24190/"
        log_info "📺 HLS Streaming: http://localhost:8080/hls"
        log_info "📡 RTMP Ingest: rtmp://localhost:1935/live"
        log_info "📊 RTMP Stats: http://localhost:8080/stat"
        log_info "🗄️ MongoDB: mongodb://localhost:27017/livestream"
        log_info "⚡ Redis: redis://localhost:6379"
}

# Wait for service health
wait_for_health() {
    local service=$1
    local timeout=${2:-30}
    local count=0
    
    while [ $count -lt $timeout ]; do
        if docker ps --filter "name=$service" --filter "health=healthy" | grep -q "$service"; then
            log_success "$service is healthy"
            return 0
        fi
        count=$((count + 1))
        sleep 1
    done
    
    log_error "$service health check failed"
    return 1
}

# Docker service management
docker_service() {
    local action=$1
    local compose_cmd=$(get_compose_cmd)
    
    # Create .env files if they don't exist
    if [ ! -f .env ] || [ ! -f services/frontend/.env ]; then
        create_env_file
    fi
    
    case $action in
        start)
            log_info "Starting LiveStream App..."
            if check_docker; then
                $compose_cmd up -d
                wait_for_health "livestream-mongodb" 30 || log_warning "MongoDB health check timeout"
                wait_for_health "livestream-redis" 20 || log_warning "Redis health check timeout"
                wait_for_health "livestream-api" 40 || log_warning "API health check timeout"
                wait_for_health "livestream-frontend" 30 || log_warning "Frontend health check timeout"
                log_success "Services started"
                log_info "Frontend: http://localhost:3000"
                log_info "Backend: http://183.182.104.226:24190"
                log_info "HLS Streaming: http://localhost:8080/hls"
                log_info "RTMP: rtmp://localhost:1935/live"
            else
                log_warning "Docker not found or not running. Attempting to install/start Docker..."
                if install_docker; then
                    log_info "Docker installed successfully. Starting services..."
                    $compose_cmd up -d
                    wait_for_health "livestream-mongodb" 30 || log_warning "MongoDB health check timeout"
                    wait_for_health "livestream-redis" 20 || log_warning "Redis health check timeout"
                    wait_for_health "livestream-api" 40 || log_warning "API health check timeout"
                    wait_for_health "livestream-frontend" 30 || log_warning "Frontend health check timeout"
                    log_success "Services started"
                    log_info "Frontend: http://localhost:3000"
                    log_info "Backend: http://183.182.104.226:24190"
                    log_info "HLS Streaming: http://localhost:8080/hls"
                    log_info "RTMP: rtmp://localhost:1935/live"
                else
                    log_error "Failed to install Docker. Please install Docker manually."
                    exit 1
                fi
            fi
            ;;
        stop)
            log_info "Stopping LiveStream App..."
            if check_docker; then
                $compose_cmd down
                log_success "Services stopped"
            else
                log_warning "Docker not running, nothing to stop"
            fi
            ;;
        clean)
            log_info "Cleaning up..."
            if check_docker; then
                $compose_cmd down -v
                docker system prune -f
                log_success "Cleanup complete"
            else
                log_warning "Docker not running, nothing to clean"
            fi
            ;;
    esac
}

# Wrapper functions
start() { docker_service start; }
stop() { docker_service stop; }
clean() { docker_service clean; }





# Main function
main() {
    case "$1" in
        install) setup ;;
        setup) setup ;;
        start) start ;;
        stop) stop ;;
        clean) clean ;;
        install-docker) install_docker ;;
        create-env) create_env_file ;;
        *) 
            echo "Usage: $0 {install|setup|start|stop|clean|install-docker|create-env}"
            exit 1
            ;;
    esac
}

main "$@"