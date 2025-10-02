#!/bin/bash

# LiveStream Platform - Complete System Installation Script
# This script installs all system dependencies and prepares the environment

set -e  # Exit on any error

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

echo "🚀 Installing Livestream Platform - Complete System Setup"
echo "=========================================================="
echo "This script will install everything the system needs:"
echo "  • System dependencies (Docker, Node.js, Git)"
echo "  • Development tools and libraries"
echo "  • Create necessary directories and structure"
echo "  • Setup environment files from .env.example"
echo "  • Generate JWT secrets and security keys"
echo "  • Install all project dependencies (backend, frontend)"
echo "  • Setup SSH keys and permissions"
echo "  • Note: FFmpeg can be installed separately via dedicated scripts"
echo "=========================================================="

# Check if running on Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    log_error "This script is designed for Ubuntu/Debian systems"
    exit 1
fi

# Check if running as root
if [ "$(id -u)" = "0" ]; then
    log_warning "Running as root. This is not recommended for security reasons."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Exiting..."
        exit 1
    fi
fi

# Update system
log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
log_info "Installing Docker..."
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
log_success "Docker installed and configured"

# Install Node.js 18
log_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
log_success "Node.js $(node --version) and npm $(npm --version) installed"

# Note: MongoDB and Nginx will be installed via Docker containers
log_info "MongoDB and Nginx will be installed via Docker containers"

# Install Git
log_info "Installing Git..."
sudo apt install -y git
log_success "Git installed"

# Install additional tools
log_info "Installing additional tools..."
sudo apt install -y curl wget unzip build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Note: FFmpeg will be installed via dedicated scripts if needed
log_info "FFmpeg can be installed via scripts/install-ffmpeg-quick.sh or scripts/compile-ffmpeg.sh"

# Install monitoring tools
log_info "Installing monitoring tools..."
sudo apt install -y htop iotop nethogs

# Install development tools
log_info "Installing development tools..."
sudo apt install -y vim nano tree jq

# Install Python and pip (for some tools)
log_info "Installing Python and pip..."
sudo apt install -y python3 python3-pip python3-venv

# Install additional system libraries
log_info "Installing system libraries..."
sudo apt install -y libssl-dev libffi-dev libxml2-dev libxslt1-dev zlib1g-dev libjpeg-dev libpng-dev

log_success "All system dependencies installed"

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p apps/backend/hls/stream
mkdir -p config/database
mkdir -p config/nginx
mkdir -p logs
log_success "Directory structure created"

# Setup environment files
log_info "Setting up environment files..."
if [ -f ".env.example" ]; then
    cp .env.example .env
    log_success "Created .env file from .env.example"
fi

if [ -f "apps/backend/.env.example" ]; then
    cp apps/backend/.env.example apps/backend/.env
    log_success "Created backend .env file"
fi

if [ -f "apps/frontend/.env.example" ]; then
    cp apps/frontend/.env.example apps/frontend/.env
    log_success "Created frontend .env file"
fi

# Install project dependencies
log_info "Installing project dependencies..."
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..
log_success "Project dependencies installed"

# Setup SSH
log_info "Setting up SSH..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    log_success "SSH key generated"
else
    log_info "SSH key already exists"
fi
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
log_success "SSH setup completed"

# Note: Services will be built and started by build-start.sh
log_info "Services will be built and started when you run build-start.sh"

echo ""
log_success "System installation completed successfully!"
echo "=========================================================="
echo "📋 Next steps:"
echo "  1. Run './scripts/build-start.sh' to build and start services"
echo "  2. Or run 'make build' for quick setup"
echo ""
echo "🌐 Once started, access:"
echo "  • Frontend: \${FRONTEND_URL:-http://localhost:3000}"
echo "  • API: \${API_BASE_URL:-http://localhost:9000/api/v1}"
echo "  • Grafana: \${GRAFANA_URL:-http://localhost:8080} (admin/admin123)"
echo "  • Prometheus: \${PROMETHEUS_URL:-http://localhost:9090}"
echo ""
echo "👤 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🔄 To restart services: make start"
echo "🛑 To stop services: make stop"
echo "📊 To view logs: make logs"
echo "=========================================================="
