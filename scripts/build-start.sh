#!/bin/bash

# LiveStream Platform - Optimized Build and Start Script
set -e

# Simple logging
log_info() { echo "INFO: $1"; }
log_success() { echo "SUCCESS: $1"; }
log_warning() { echo "WARNING: $1"; }
log_error() { echo "ERROR: $1"; }

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
docker-compose down --remove-orphans > /dev/null 2>&1
docker-compose build --no-cache > /dev/null 2>&1
docker-compose up -d > /dev/null 2>&1

# Wait for services
log_info "Waiting for services to start..."
sleep 30

# Check status
log_info "Service status:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

log_success "Build and start completed!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:9000/api/v1"
echo "RTMP: rtmp://localhost:1935/live"
echo "HLS: http://localhost:8080/api/v1/hls"
