#!/bin/bash

# LiveStream Platform - Build and Start Script
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

# Setup environment files
if [ -f ".env.example" ]; then cp .env.example .env; fi
if [ -f "apps/backend/.env.example" ]; then cp apps/backend/.env.example apps/backend/.env; fi
if [ -f "apps/frontend/.env.example" ]; then cp apps/frontend/.env.example apps/frontend/.env; fi

# Generate JWT secret if needed
if grep -q "your-super-secret-jwt-key-change-in-production" .env; then
    random_secret=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i.bak "s|your-super-secret-jwt-key-change-in-production|${random_secret}|g" .env
    if [ -f "apps/backend/.env" ]; then
        sed -i.bak "s|your-super-secret-jwt-key-change-in-production|${random_secret}|g" apps/backend/.env
    fi
    rm -f .env.bak apps/backend/.env.bak
fi

# Build and start services
log_info "Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services
log_info "Waiting for services to start..."
sleep 30

# Check status
log_info "Service status:"
docker-compose ps

log_success "Build and start completed!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:9000/api/v1"
echo "RTMP: rtmp://localhost:1935/live"
echo "HLS: http://localhost:8080/api/v1/hls"
