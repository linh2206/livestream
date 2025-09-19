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
    
    # Update package list
    log_info "Updating package list..."
    if [ "$(id -u)" = "0" ]; then
        apt update
    else
        sudo apt update
    fi
    
    # Install Docker from official repository
    log_info "Installing Docker from official repository..."
    
    # Add Docker's official GPG key
    if [ "$(id -u)" = "0" ]; then
        apt update
        apt install -y ca-certificates curl gnupg lsb-release
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt update
        apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    else
        sudo apt update
        sudo apt install -y ca-certificates curl gnupg lsb-release
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt update
        sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    
    # Docker Compose is now included with docker-compose-plugin
    log_info "Docker Compose is included with docker-compose-plugin"
    
    # Start Docker service
    log_info "Starting Docker service..."
    if [ "$(id -u)" = "0" ]; then
        systemctl start docker
        systemctl enable docker
    else
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    # Add user to docker group
    if [ "$(id -u)" != "0" ]; then
        log_info "Adding user to docker group..."
        sudo usermod -aG docker $USER
        log_warning "Please logout and login again, or run: newgrp docker"
    fi
    
    log_success "Docker installed successfully!"
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
