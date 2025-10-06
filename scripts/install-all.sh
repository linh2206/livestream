#!/bin/bash

# LiveStream Platform - Optimized System Installation Script
set -e

# Simple logging
log_info() { echo "INFO: $1"; }
log_success() { echo "SUCCESS: $1"; }
log_warning() { echo "WARNING: $1"; }
log_error() { echo "ERROR: $1"; }

# Quick system setup
echo "Installing system dependencies..."




# Detect OS and install essentials
if command -v apt &> /dev/null; then
    log_info "Ubuntu/Debian detected - installing essentials..."
    
    # Wait for APT locks to be released
    while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || \
          sudo fuser /var/lib/dpkg/lock >/dev/null 2>&1 || \
          sudo fuser /var/cache/apt/archives/lock >/dev/null 2>&1; do
        echo "[INFO] Waiting for other apt/dpkg processes to finish..."
        sleep 2
    done
    
    sudo dpkg --configure -a || true
    sudo apt-get -o Dpkg::Use-Pty=0 -y -qq update
    sudo apt-get -o Dpkg::Use-Pty=0 -y install docker.io docker-compose nodejs npm git curl wget
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
