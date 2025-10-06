#!/bin/bash

# LiveStream Platform - System Installation Script
set -e

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

echo "Installing system dependencies..."

# Detect OS and install essentials
if command -v apt &> /dev/null; then
    log_info "Ubuntu/Debian detected - installing essentials..."
    
    # Fix APT issues first
    sudo pkill -9 -f apt 2>/dev/null || true
    sudo pkill -9 -f dpkg 2>/dev/null || true
    sudo rm -f /var/lib/dpkg/lock* 2>/dev/null || true
    sudo rm -f /var/cache/apt/archives/lock* 2>/dev/null || true
    sudo rm -f /var/lib/apt/lists/lock* 2>/dev/null || true
    sudo apt clean 2>/dev/null || true
    sudo rm -rf /var/lib/apt/lists/* 2>/dev/null || true
    sudo mkdir -p /var/lib/apt/lists/partial
    sudo dpkg --configure -a 2>/dev/null || true
    sudo apt --fix-broken install -y 2>/dev/null || true
    
    # Remove conflicting containerd packages
    sudo apt remove -y containerd containerd.io 2>/dev/null || true
    
    sudo apt update -y
    sudo apt install -y docker.io docker-compose nodejs npm git curl wget
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    log_success "Ubuntu setup completed"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    log_info "macOS detected - checking dependencies..."
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found. Please install Docker Desktop for macOS"
    fi
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found. Please install Node.js"
    fi
    log_success "macOS check completed"
else
    log_error "Unsupported OS"
    exit 1
fi

# Create directories and setup env files
mkdir -p apps/backend/hls/stream config/database config/nginx logs
if [ -f ".env.example" ]; then cp .env.example .env; fi
if [ -f "apps/backend/.env.example" ]; then cp apps/backend/.env.example apps/backend/.env; fi
if [ -f "apps/frontend/.env.example" ]; then cp apps/frontend/.env.example apps/frontend/.env; fi

# Setup SSH if needed
mkdir -p ~/.ssh && chmod 700 ~/.ssh
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
fi

log_success "Installation completed! Run 'make setup' to build and start services."
