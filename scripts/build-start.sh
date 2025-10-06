#!/bin/bash

# LiveStream Platform - Build and Start Script
# This script builds and starts all Docker services

set -e  # Exit on any error

# Fix terminal encoding and font issues
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export TERM=xterm-256color

# Additional terminal fixes
export LC_CTYPE=en_US.UTF-8
export LC_NUMERIC=en_US.UTF-8
export LC_TIME=en_US.UTF-8
export LC_COLLATE=en_US.UTF-8
export LC_MONETARY=en_US.UTF-8
export LC_MESSAGES=en_US.UTF-8
export LC_PAPER=en_US.UTF-8
export LC_NAME=en_US.UTF-8
export LC_ADDRESS=en_US.UTF-8
export LC_TELEPHONE=en_US.UTF-8
export LC_MEASUREMENT=en_US.UTF-8
export LC_IDENTIFICATION=en_US.UTF-8

# Disable color output for cleaner logs
export NO_COLOR=1
export FORCE_COLOR=0

# Function to fix terminal display
fix_terminal_display() {
    # Clear screen and reset terminal
    clear
    reset
    
    # Set terminal to raw mode for better control
    stty raw -echo 2>/dev/null || true
    
    # Reset terminal settings
    stty sane 2>/dev/null || true
    
    # Clear any pending input
    read -t 0.1 -n 10000 discard 2>/dev/null || true
    
    # Set line buffering for stdout
    if command -v stdbuf >/dev/null 2>&1; then
        exec stdbuf -oL -eL "$0" "$@"
    fi
}

# Apply terminal fix immediately
fix_terminal_display

# Set line buffering for cleaner output
if command -v stdbuf >/dev/null 2>&1; then
    exec stdbuf -oL -eL "$0" "$@"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to fix Docker connectivity issues
fix_docker_connectivity() {
    log_warning "🔧 Docker connectivity issues detected. Attempting to fix..."
    
    # Create Docker daemon config
    log_info "Configuring Docker daemon for better connectivity..."
    sudo mkdir -p /etc/docker
    
    # Create daemon.json with better DNS and no problematic mirrors
    sudo tee /etc/docker/daemon.json > /dev/null << 'DOCKER_EOF'
{
    "dns": ["8.8.8.8", "1.1.1.1"],
    "ipv6": false,
    "registry-mirrors": [],
    "storage-driver": "overlay2"
}
DOCKER_EOF
    
    # Restart Docker daemon
    log_info "Restarting Docker daemon..."
    sudo systemctl restart docker || sudo service docker restart
    
    # Wait for Docker to be ready
    sleep 5
    
    # Test Docker connectivity
    log_info "Testing Docker connectivity..."
    if docker ps &> /dev/null; then
        log_success "✅ Docker daemon restarted successfully"
        return 0
    else
        log_error "❌ Docker daemon restart failed"
        return 1
    fi
}

echo "🔨 Building and Starting Livestream Platform"
echo "============================================="
echo "This script will:"
echo "  • Remove existing .env files"
echo "  • Copy fresh .env.example to .env"
echo "  • Generate JWT secrets if needed"
echo "  • Stop existing containers"
echo "  • Build and start all services"
echo "  • Check service health"
echo "============================================="

# Check if Docker is running
if ! docker ps &> /dev/null; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Copy environment files from example (always fresh copy)
log_info "Setting up fresh environment files from .env.example..."

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    log_error ".env.example not found. Please create .env.example first."
    exit 1
fi

# Remove existing env files if they exist
if [ -f ".env" ]; then
    rm .env
    echo "🗑️  Removed existing .env file"
fi

# Copy .env.example to .env
cp .env.example .env
echo "✅ Created fresh .env file from .env.example"

# Setup backend environment
if [ -f "apps/backend/.env.example" ]; then
    cp apps/backend/.env.example apps/backend/.env
    echo "✅ Created backend .env file"
fi

# Setup frontend environment
if [ -f "apps/frontend/.env.example" ]; then
    cp apps/frontend/.env.example apps/frontend/.env
    echo "✅ Created frontend .env file"
fi

# Generate JWT secret if needed
if grep -q "your-super-secret-jwt-key-change-in-production" .env; then
    echo "🔐 Generating JWT secret..."
    random_secret=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    # Use different delimiter to avoid issues with special characters
    sed -i.bak "s|your-super-secret-jwt-key-change-in-production|${random_secret}|g" .env
    # Also update backend .env if it exists
    if [ -f "apps/backend/.env" ]; then
        sed -i.bak "s|your-super-secret-jwt-key-change-in-production|${random_secret}|g" apps/backend/.env
    fi
    rm -f .env.bak apps/backend/.env.bak
    echo "✅ Generated and set JWT_SECRET"
fi

echo "✅ Environment files setup completed!"


# Check Docker Compose version and use appropriate command
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
    echo "✅ Using Docker Compose V2"
else
    COMPOSE_CMD="docker-compose"
    echo "✅ Using Docker Compose V1"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
$COMPOSE_CMD down

# Build and start services with error handling
echo "🔨 Building and starting all services..."
echo "  • Building Docker images..."

# Try to build, if it fails due to network issues, fix and retry
if ! $COMPOSE_CMD build --no-cache; then
    log_warning "Build failed, likely due to network/Docker connectivity issues"
    log_info "Attempting to fix Docker connectivity..."
    
    if fix_docker_connectivity; then
        log_info "Retrying build after Docker fix..."
        if ! $COMPOSE_CMD build --no-cache; then
            log_error "Build still failing after Docker fix. Manual intervention required."
            exit 1
        fi
    else
        log_error "Failed to fix Docker connectivity. Please run 'make fix-docker' manually."
        exit 1
    fi
fi

echo "  • Starting all services..."
$COMPOSE_CMD up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
echo "  • Waiting for database services..."
sleep 15

echo "  • Waiting for application services..."
sleep 25

# Check service status
echo "🏥 Checking service status..."
echo "  • MongoDB: $(docker ps --filter 'name=livestream-mongodb' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Redis: $(docker ps --filter 'name=livestream-redis' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Backend: $(docker ps --filter 'name=livestream-backend' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Frontend: $(docker ps --filter 'name=livestream-frontend' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Nginx: $(docker ps --filter 'name=livestream-nginx' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Grafana: $(docker ps --filter 'name=livestream-grafana' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Prometheus: $(docker ps --filter 'name=livestream-prometheus' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"

# Function to fix service issues
fix_service_issues() {
    log_info "🔧 Checking and fixing service issues..."
    
    # Check Backend API health
    BACKEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${API_BASE_URL:-http://183.182.104.226:24190}/api/v1/health || echo 'DOWN')
    if [ "$BACKEND_STATUS" != "200" ]; then
        log_warning "Backend API health check failed (HTTP $BACKEND_STATUS)"
        log_info "Backend might be starting up, waiting additional 10 seconds..."
        sleep 10
        BACKEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${API_BASE_URL:-http://183.182.104.226:24190}/api/v1/health || echo 'DOWN')
        if [ "$BACKEND_STATUS" = "200" ]; then
            log_success "✅ Backend API is now healthy"
        else
            log_warning "⚠️ Backend API still not responding, but continuing..."
        fi
    fi
    
    # Check Nginx connectivity
    NGINX_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${NGINX_URL:-http://localhost:80} || echo 'DOWN')
    if [ "$NGINX_STATUS" = "DOWN" ] || [ "$NGINX_STATUS" = "000" ]; then
        log_warning "Nginx connection failed, checking port mapping..."
        
        # Check if nginx is running on port 80
        if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
            log_info "Port 80 is in use, checking if it's nginx..."
            # Try accessing nginx directly
            NGINX_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80 2>/dev/null || echo 'DOWN')
            if [ "$NGINX_STATUS" = "200" ]; then
                log_success "✅ Nginx is accessible on port 80"
            else
                log_warning "⚠️ Nginx port mapping issue, but continuing..."
            fi
        else
            log_warning "⚠️ Port 80 not accessible, but continuing..."
        fi
    fi
}

# Test HTTP endpoints
echo ""
echo "🌐 Testing HTTP endpoints..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${FRONTEND_URL:-http://localhost:3000} || echo 'DOWN')
echo "  • Frontend: $FRONTEND_STATUS"

BACKEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${API_BASE_URL:-http://183.182.104.226:24190}/api/v1/health || echo 'DOWN')
echo "  • Backend API: $BACKEND_STATUS"

NGINX_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${NGINX_URL:-http://localhost:80} || echo 'DOWN')
echo "  • Nginx: $NGINX_STATUS"

GRAFANA_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${GRAFANA_URL:-http://localhost:8000} || echo 'DOWN')
echo "  • Grafana: $GRAFANA_STATUS"

PROMETHEUS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${PROMETHEUS_URL:-http://localhost:9090} || echo 'DOWN')
echo "  • Prometheus: $PROMETHEUS_STATUS"

# Fix any service issues
fix_service_issues

echo ""
echo "✅ Build and start completed!"
echo "============================================="
echo "🌐 Frontend: ${FRONTEND_URL:-http://localhost}"
echo "🔧 Backend: ${API_BASE_URL:-http://localhost/api/v1}"
echo "📊 MongoDB: mongodb://${HOST:-localhost}:${MONGODB_PORT:-27017}"
echo ""
echo "👤 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "============================================="
