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
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        echo "docker-compose"
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
    
    # Install Docker
    log_info "Installing Docker..."
    if [ "$(id -u)" = "0" ]; then
        apt install -y docker.io docker-compose
    else
        sudo apt install -y docker.io docker-compose
    fi
    
    # Install latest docker-compose
    log_info "Installing latest docker-compose..."
    COMPOSE_VERSION="v2.23.0"
    
    # Remove old docker-compose first
    if [ "$(id -u)" = "0" ]; then
        rm -f /usr/local/bin/docker-compose /usr/bin/docker-compose /usr/local/bin/docker-compose-v2
        curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        # Create symlink for docker compose (new syntax)
        ln -sf /usr/local/bin/docker-compose /usr/local/bin/docker-compose-v2
        # Override old docker-compose
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        # Also create docker compose (new syntax without hyphen)
        ln -sf /usr/local/bin/docker-compose /usr/local/bin/docker-compose-new
    else
        sudo rm -f /usr/local/bin/docker-compose /usr/bin/docker-compose /usr/local/bin/docker-compose-v2
        sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        # Create symlink for docker compose (new syntax)
        sudo ln -sf /usr/local/bin/docker-compose /usr/local/bin/docker-compose-v2
        # Override old docker-compose
        sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        # Also create docker compose (new syntax without hyphen)
        sudo ln -sf /usr/local/bin/docker-compose /usr/local/bin/docker-compose-new
    fi
    
    # Verify installation
    if docker-compose --version >/dev/null 2>&1; then
        log_success "Docker Compose ${COMPOSE_VERSION} installed successfully"
        docker-compose --version
    else
        log_error "Failed to install Docker Compose"
        exit 1
    fi
    
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

# Check if Docker is running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed."
        echo ""
        echo "To install Docker on Ubuntu:"
        echo "1. sudo apt update"
        echo "2. sudo apt install -y docker.io docker-compose"
        echo "3. sudo systemctl start docker"
        echo "4. sudo systemctl enable docker"
        echo "5. sudo usermod -aG docker \$USER"
        echo "6. Logout and login again"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running."
        echo ""
        echo "To start Docker:"
        echo "1. sudo systemctl start docker"
        echo "2. sudo systemctl enable docker"
        exit 1
    fi
    return 0
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
            cat > .env << EOF
# LiveStream App Environment Variables
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_WS_URL=ws://localhost:9000
MONGODB_URI=mongodb://admin:password@mongodb:27017/livestream?authSource=admin
REDIS_URL=redis://redis:6379
RTMP_URL=rtmp://localhost:1935/live
HLS_URL=http://localhost:8080/hls
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
        # Try new syntax first, fallback to old syntax
        if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
            docker compose down
        else
            docker-compose down
        fi
        log_success "Services stopped"
    else
        log_warning "Docker not running, nothing to stop"
    fi
}

# Show status
status() {
    log_info "Service Status:"
    if check_docker; then
        # Try new syntax first, fallback to old syntax
        if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
            docker compose ps
        else
            docker-compose ps
        fi
    else
        log_warning "Docker not running, cannot show status"
    fi
}

# Show logs
logs() {
    log_info "Showing service logs..."
    if check_docker; then
        # Try new syntax first, fallback to old syntax
        if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
            docker compose logs -f
        else
            docker-compose logs -f
        fi
    else
        log_error "Cannot show logs without Docker. Please start Docker first."
        exit 1
    fi
}

# Clean up
clean() {
    log_info "Cleaning up..."
    if check_docker; then
        # Try new syntax first, fallback to old syntax
        if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
            docker compose down -v
        else
            docker-compose down -v
        fi
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
        # Try new syntax first, fallback to old syntax
        if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
            docker compose build
        else
            docker-compose build
        fi
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
