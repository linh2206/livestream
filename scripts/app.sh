#!/bin/bash

# LiveStream App Management Script
# Ubuntu only version

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Check and fix Docker build issues
check_docker_build() {
    log_info "Checking Docker build configuration..."
    
    # Check if API Dockerfile exists and fix COPY command
    if [ -f "services/api/Dockerfile" ]; then
        if ! grep -q "COPY src/ ./" services/api/Dockerfile; then
            log_warning "Fixing API Dockerfile COPY command..."
            # Fix the COPY command to use correct path
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
    
    # Check if tsconfig.json exists and has correct paths
    if [ -f "services/frontend/tsconfig.json" ]; then
        if ! grep -q '"@/*"' services/frontend/tsconfig.json; then
            log_warning "tsconfig.json missing @/* path mapping"
            log_info "Adding @/* path mapping to tsconfig.json..."
            sed -i.bak 's/"compilerOptions": {/"compilerOptions": {\n    "baseUrl": ".",\n    "paths": {\n      "@\/*": [".\/*"]\n    },/' services/frontend/tsconfig.json
            log_success "Added @/* path mapping"
        fi
    else
        log_warning "tsconfig.json not found, creating basic one..."
        cat > services/frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
        log_success "Created tsconfig.json with @/* path mapping"
    fi
    
    # Check if hooks directory exists
    if [ ! -d "services/frontend/hooks" ]; then
        log_warning "hooks directory not found, creating..."
        mkdir -p services/frontend/hooks
    fi
    
    # Check if useSocket.ts exists
    if [ ! -f "services/frontend/hooks/useSocket.ts" ]; then
        log_warning "useSocket.ts not found, creating basic one..."
        cat > services/frontend/hooks/useSocket.ts << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000', {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return { socket, isConnected };
}
EOF
        log_success "Created useSocket.ts"
    fi
    
    log_success "Docker build check completed"
    return 0
}


# Install Docker on Ubuntu
install_docker() {
    log_info "Installing Docker on Ubuntu..."
    
    # Check if running on Ubuntu
    if ! command -v apt-get >/dev/null 2>&1; then
        log_error "This script requires Ubuntu with apt package manager"
        exit 1
    fi
    
    # Check if running as root
    if [ "$(id -u)" = "0" ]; then
        SUDO=""
    else
        SUDO="sudo"
    fi
    
    log_info "Removing old Docker installations completely..."
    
    # Stop Docker services
    $SUDO systemctl stop docker 2>/dev/null || true
    $SUDO systemctl stop containerd 2>/dev/null || true
    
    # Remove old Docker packages
    $SUDO apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    $SUDO apt-get purge -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Remove old Docker directories
    $SUDO rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
    
    log_info "Updating package index..."
    $SUDO apt-get update
    
    log_info "Installing prerequisites..."
    $SUDO apt-get install -y ca-certificates curl gnupg lsb-release
    
    log_info "Adding Docker's official GPG key..."
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    log_info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    log_info "Updating package index..."
    $SUDO apt-get update
    
    log_info "Installing Docker Engine..."
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    log_info "Verifying Docker Compose plugin..."
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose plugin installed successfully"
    else
        log_warning "Docker Compose plugin not found, trying to install manually..."
        $SUDO apt-get install -y docker-compose-plugin
    fi
    
    log_info "Verifying Docker installation..."
    if docker --version >/dev/null 2>&1; then
        log_success "Docker installed successfully:"
        docker --version
    else
        log_error "Docker installation failed"
        exit 1
    fi
    
    log_info "Verifying Docker Compose installation..."
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose installed successfully:"
        docker compose version
    else
        log_error "Docker Compose installation failed"
        exit 1
    fi
    
    # Create Docker directories
    log_info "Creating Docker directories..."
    $SUDO mkdir -p /var/lib/docker/tmp
    $SUDO mkdir -p /var/lib/docker/containers
    $SUDO mkdir -p /var/lib/docker/volumes
    $SUDO mkdir -p /var/lib/docker/image
    $SUDO mkdir -p /var/lib/docker/overlay2
    
    # Start Docker service
    log_info "Starting Docker service..."
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    
    # Add user to docker group if not root
    if [ "$(id -u)" != "0" ]; then
        log_info "Adding user to docker group..."
        $SUDO usermod -aG docker $USER
        log_warning "Please logout and login again, or run: newgrp docker"
    fi
    
    # Verify installation
    log_info "Verifying Docker installation..."
    if docker info >/dev/null 2>&1; then
        log_success "Docker installed successfully:"
        docker --version
    else
        log_error "Docker installation failed"
        exit 1
    fi
    
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

# Sync source code to server
sync_code() {
    # Check if we're on Ubuntu server
    if [[ "$HOSTNAME" == *"ubuntu"* ]] || [[ "$USER" == "ubuntu" ]]; then
        log_info "Ubuntu server detected - syncing code..."
        
        # Change to livestream directory
        cd /root/livestream 2>/dev/null || {
            log_error "Cannot access /root/livestream directory"
            exit 1
        }
        
        # Auto-fix missing src directory
        if [ ! -d "services/api/src" ] && [ -d "/home/ubuntu/src" ]; then
            log_info "Moving src/ to correct location..."
            sudo mv /home/ubuntu/src services/api/ && log_success "src/ moved successfully"
        elif [ ! -d "services/api/src" ]; then
            log_error "src/ directory not found. Run 'make sync' first."
            exit 1
        fi
        
        # Check frontend
        [ ! -d "services/frontend/app" ] && log_warning "Frontend app/ missing - may cause build issues"
    fi
}

# Setup everything (install + start)
setup() {
    log_info "Setting up LiveStream App..."
    
    # Check Docker build issues first
    check_docker_build
    
    # Check if Docker is installed
    if ! check_docker; then
        log_info "Docker not found. Installing Docker..."
        install_docker
    fi
    
    # Start Docker service
    log_info "Starting Docker service..."
    SUDO_CMD=$(get_sudo_cmd)
    $SUDO_CMD systemctl start docker
    
    # Create .env file if it doesn't exist
    log_info "Creating .env file..."
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            log_success ".env file created from env.example"
        else
            cat > .env << EOF
# LiveStream App Environment Variables
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password@mongodb:27017/livestream?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_WS_URL=ws://localhost:9000
BACKEND_URL=http://api:3000
EOF
            log_success ".env file created with default values"
        fi
    else
        log_info ".env file already exists"
    fi
    
    # Initialize Docker daemon
    log_info "Initializing Docker daemon..."
    $SUDO_CMD systemctl stop docker 2>/dev/null || true
    $SUDO_CMD pkill dockerd 2>/dev/null || true
    $SUDO_CMD rm -f /var/run/docker.pid 2>/dev/null || true
    $SUDO_CMD mkdir -p /var/lib/docker/{tmp,containers,volumes,image,overlay2}
    $SUDO_CMD systemctl start docker
    
    # Wait for Docker to be ready
    log_info "Waiting for Docker to be ready..."
    for i in {1..30}; do
        if docker info >/dev/null 2>&1; then
            log_success "Docker is ready"
            break
        fi
        log_info "Waiting for Docker... $i/30"
        sleep 2
    done
    
    # Build services
    log_info "Building services..."
    COMPOSE_CMD=$(get_compose_cmd)
    export DOCKER_BUILDKIT=1
    export COMPOSE_HTTP_TIMEOUT=300
    
    if ! $COMPOSE_CMD build --no-cache; then
        log_warning "Build failed, trying individual services..."
        for service in api frontend nginx; do
            log_info "Building $service..."
            $COMPOSE_CMD build $service || { log_error "Failed to build $service"; exit 1; }
        done
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
    log_info "Frontend: http://localhost:3000"
    log_info "Backend: http://localhost:9000"
    log_info "Web Interface: http://localhost:8080"
}

# Install dependencies (legacy - use setup instead)
install() {
    log_warning "install command is deprecated. Use 'setup' instead."
    setup
}

# Docker service management
docker_service() {
    local action=$1
    local compose_cmd=$(get_compose_cmd)
    
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
                log_info "Backend: http://localhost:9000"
                log_info "Web Interface: http://localhost:8080"
            else
                log_error "Cannot start without Docker. Please start Docker first."
                exit 1
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
        status)
            log_info "Service Status:"
            if check_docker; then
                $compose_cmd ps
            else
                log_warning "Docker not running, cannot show status"
            fi
            ;;
        logs)
            log_info "Showing service logs..."
            if check_docker; then
                $compose_cmd logs -f
            else
                log_error "Cannot show logs without Docker. Please start Docker first."
                exit 1
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
        build)
            log_info "Building services..."
            if check_docker; then
                $compose_cmd build
                log_success "Build complete"
            else
                log_error "Cannot build without Docker. Please start Docker first."
                exit 1
            fi
            ;;
    esac
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

# Wrapper functions
start() { docker_service start; }
stop() { docker_service stop; }
status() { docker_service status; }
logs() { docker_service logs; }
clean() { docker_service clean; }
build() { docker_service build; }

# Reset everything (keep SSH and code) - Ubuntu only
reset_all() {
    log_warning "WARNING: This will DELETE EVERYTHING except SSH and source code!"
    log_warning "This includes: Docker, databases, logs, caches, and all data!"
    echo ""
    read -p "Are you absolutely sure you want to continue? Type 'YES' to confirm: " confirm
    if [ "$confirm" != "YES" ]; then
        log_info "Operation cancelled."
        exit 1
    fi
    
    log_info "Starting complete system reset..."
    
    # Check if running on Ubuntu
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "This command is only supported on Ubuntu"
        exit 1
    fi
    
    OS="ubuntu"
    if [ "$(id -u)" = "0" ]; then
        SUDO=""
    else
        SUDO="sudo"
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
        
        # Ubuntu: Remove Docker packages
        $SUDO apt-get remove -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
        $SUDO apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
        
        # Remove Docker directories
        $SUDO rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
        
        log_success "Docker completely removed"
    fi
    
    # Remove Node.js and npm
    log_info "Removing Node.js and npm..."
    # Ubuntu: Remove Node.js via apt
    $SUDO apt-get remove -y nodejs npm 2>/dev/null || true
    $SUDO apt-get purge -y nodejs npm 2>/dev/null || true
    $SUDO rm -rf /usr/local/bin/npm /usr/local/bin/node /usr/local/lib/node_modules /usr/local/include/node 2>/dev/null || true
    $SUDO rm -rf ~/.npm ~/.node-gyp 2>/dev/null || true
    log_success "Node.js and npm removed"
    
    # Remove MongoDB
    log_info "Removing MongoDB..."
    # Ubuntu: Remove MongoDB via apt
    $SUDO systemctl stop mongod 2>/dev/null || true
    $SUDO apt-get remove -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
    $SUDO apt-get purge -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
    $SUDO rm -rf /var/lib/mongodb /var/log/mongodb /etc/mongod.conf 2>/dev/null || true
    log_success "MongoDB removed"
    
    # Remove Redis
    log_info "Removing Redis..."
    # Ubuntu: Remove Redis via apt
    $SUDO systemctl stop redis 2>/dev/null || true
    $SUDO apt-get remove -y redis-server redis-tools 2>/dev/null || true
    $SUDO apt-get purge -y redis-server redis-tools 2>/dev/null || true
    $SUDO rm -rf /var/lib/redis /var/log/redis /etc/redis 2>/dev/null || true
    log_success "Redis removed"
    
    # Remove Nginx
    log_info "Removing Nginx..."
    # Ubuntu: Remove Nginx via apt
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
    # Ubuntu: Remove caches
    $SUDO rm -rf /var/cache/apt/archives/* /var/cache/apt/lists/* /tmp/* /var/tmp/* ~/.cache 2>/dev/null || true
    log_success "Caches removed"
    
    # Remove all logs
    log_info "Removing all logs..."
    # Ubuntu: Remove logs
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
    # Ubuntu: Clean up apt
    $SUDO apt-get autoremove -y 2>/dev/null || true
    $SUDO apt-get autoclean 2>/dev/null || true
    log_success "Package manager cleaned"
    
    # Show what was preserved
    log_info "The following were preserved:"
    echo "  - Source code files"
    echo "  - Configuration files"
    echo "  - Environment template"
    echo "  - Documentation files"
    echo "  - SSH configuration and keys"
    echo "  - Git repository and history"
    echo "  - Makefile and scripts"
    echo "  - Project structure"
    
    # Show what was removed
    log_warning "The following were completely removed:"
    echo "  - Docker and all containers/images/volumes"
    echo "  - Node.js and npm"
    echo "  - MongoDB and all data"
    echo "  - Redis and all data"
    echo "  - Nginx and all configs"
    echo "  - All project data and logs"
    echo "  - All build artifacts and caches"
    echo "  - All temporary files"
    
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

# Sync code to server
sync_to_server() {
    # Default server config
    SERVER_HOST=${SERVER_HOST:-183.182.104.226}
    SERVER_PORT=${SERVER_PORT:-24122}
    SERVER_USER=${SERVER_USER:-ubuntu}
    
    log_info "Syncing to $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
    
    # Create directory structure in user's home
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "mkdir -p ~/livestream/services/{api,frontend}"
    
    # Sync API code
    log_info "Syncing API source code..."
    scp -P $SERVER_PORT -r services/api/src $SERVER_USER@$SERVER_HOST:~/livestream/services/api/
    
    # Sync frontend code
    log_info "Syncing frontend source code..."
    for dir in app components hooks; do
        [ -d "services/frontend/$dir" ] && {
            scp -P $SERVER_PORT -r services/frontend/$dir $SERVER_USER@$SERVER_HOST:~/livestream/services/frontend/
        }
    done
    
    # Sync config files
    log_info "Syncing configuration files..."
    for file in docker-compose.yml Makefile env.example; do
        [ -f "$file" ] && {
            scp -P $SERVER_PORT $file $SERVER_USER@$SERVER_HOST:~/livestream/
        }
    done
    
    # Sync scripts
    scp -P $SERVER_PORT -r scripts $SERVER_USER@$SERVER_HOST:~/livestream/
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "chmod +x ~/livestream/scripts/*.sh"
    
    log_success "Code sync completed to ~/livestream!"
    log_info "Run 'cd ~/livestream && make install' on the server to continue"
}

# Main function
main() {
    case "$1" in
        install) install ;;
        setup) setup ;;
        start) start ;;
        stop) stop ;;
        status) status ;;
        logs) logs ;;
        clean) clean ;;
        build) build ;;
        reset-all) reset_all ;;
        sync) sync_to_server ;;
        *) 
            echo "Usage: $0 {install|setup|start|stop|status|logs|clean|build|reset-all|sync}"
            exit 1
            ;;
    esac
}

main "$@"