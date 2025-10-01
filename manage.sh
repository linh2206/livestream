#!/bin/bash

# Livestream Platform Management Script
# Usage: ./manage.sh [install|start|stop|clear|reset-admin|ssh-server]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Install function
install() {
    print_info "🚀 Installing Livestream Platform..."
    
    check_docker
    
    # Create necessary directories
    print_info "📁 Creating directories..."
    mkdir -p apps/api/hls
    mkdir -p logs
    chmod 755 apps/api/hls logs
    
    # Create .env files from examples if they don't exist
    print_info "📝 Creating .env files..."
    for example_env in $(find . -name ".env.example"); do
        env_file=$(echo "$example_env" | sed 's/.env.example/.env/')
        if [ ! -f "$env_file" ]; then
            cp "$example_env" "$env_file"
            print_status "Created $env_file"
        fi
    done
    
    # Build Docker images
    print_info "🔨 Building Docker images..."
    docker-compose build
    
    print_status "Installation completed!"
    print_info "Run './manage.sh start' to start the services."
}

# Start function
start() {
    print_info "🚀 Starting Livestream Platform..."
    
    check_docker
    
    # Create directories if they don't exist
    mkdir -p apps/api/hls logs
    chmod 755 apps/api/hls logs
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    print_info "⏳ Waiting for services to be ready..."
    sleep 10
    
    print_status "Services started!"
    print_info "🌐 Access URLs:"
    print_info "   Frontend: http://localhost:3000"
    print_info "   API: http://localhost:9000/api/v1"
    print_info "   HLS: http://localhost:9000/api/v1/hls"
    print_info "   RTMP: rtmp://localhost:1935/live"
}

# Stop function
stop() {
    print_info "🛑 Stopping Livestream Platform..."
    docker-compose down
    print_status "Services stopped!"
}

# Clear function
clear() {
    print_info "🧹 Cleaning up Livestream Platform..."
    docker-compose down -v --remove-orphans
    rm -rf apps/api/hls logs
    rm -f .env apps/api/.env apps/frontend/.env
    print_status "Cleanup completed!"
}

# Reset admin function
reset_admin() {
    print_info "🔄 Resetting admin user..."
    
    # Wait for API to be ready
    until curl -s http://localhost:9000/api/v1/health | grep -q "healthy"; do
        print_info "Waiting for API to be healthy..."
        sleep 5
    done
    
    # Create admin user
    curl -X POST http://localhost:9000/api/v1/auth/register \
        -H "Content-Type: application/json" \
        -d '{
            "username": "admin",
            "email": "admin@livestream.com",
            "password": "admin123"
        }' || true
    
    # Update user role to admin
    docker-compose exec -T mongodb mongo livestream --eval "
        db.users.updateOne(
            { email: 'admin@livestream.com' }, 
            { \$set: { role: 'admin' } }
        )
    " || true
    
    print_status "Admin user reset!"
    print_info "Email: admin@livestream.com"
    print_info "Password: admin123"
}

# SSH server function
ssh_server() {
    print_info "🔐 Configuring SSH Server..."
    print_warning "This is a placeholder for SSH server configuration."
    print_info "Please implement your specific SSH setup steps here."
}

# Main script logic
case "$1" in
    install)
        install
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    clear)
        clear
        ;;
    reset-admin)
        reset_admin
        ;;
    ssh-server)
        ssh_server
        ;;
    *)
        echo "Usage: $0 {install|start|stop|clear|reset-admin|ssh-server}"
        echo ""
        echo "Commands:"
        echo "  install     - Install dependencies and build Docker images"
        echo "  start       - Start all services"
        echo "  stop        - Stop all services"
        echo "  clear       - Stop services and remove all data"
        echo "  reset-admin - Reset admin user credentials"
        echo "  ssh-server  - Configure SSH server (placeholder)"
        exit 1
        ;;
esac
