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

# Generate JWT secret if needed (inline, no backup/tmp)
if grep -q "your-super-secret-jwt-key-change-in-production" .env; then
    random_secret=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i "s|your-super-secret-jwt-key-change-in-production|${random_secret}|g" .env
    if [ -f "apps/backend/.env" ]; then
        sed -i "s|your-super-secret-jwt-key-change-in-production|${random_secret}|g" apps/backend/.env
    fi
fi

# Build and start services
log_info "Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services
log_info "Waiting for services to start..."
sleep 30

# Fix HLS permissions
log_info "Fixing HLS permissions..."
docker-compose exec -T --user root nginx mkdir -p /app/hls/stream/ 2>/dev/null || true
docker-compose exec -T --user root nginx chmod -R 777 /app/hls/ 2>/dev/null || true
docker-compose exec -T --user root nginx chown -R 1001:1001 /app/hls/ 2>/dev/null || true
docker-compose exec -T --user root backend chmod -R 755 /app/hls/ 2>/dev/null || true
docker-compose exec -T --user root backend chown -R nestjs:nodejs /app/hls/ 2>/dev/null || true
log_success "HLS permissions fixed for both nginx and backend"

# Check status
log_info "Service status:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Show connection info
log_success "Build and start completed!"
echo ""
echo "🌐 Access URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:9000/api/v1"
echo "  RTMP Stream: rtmp://localhost:1935/live"
echo "  HLS Stream: http://localhost:9000/api/v1/hls"
echo ""
echo "🎬 Streaming Commands:"
echo "  Test Stream: ffmpeg -f lavfi -i testsrc=duration=60:size=1280x720:rate=30 -c:v libx264 -preset fast -crf 23 -f flv rtmp://localhost:1935/live/stream"
echo "  Webcam Stream: ffmpeg -f v4l2 -i /dev/video0 -f alsa -i default -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -f flv rtmp://localhost:1935/live/stream"
echo ""
echo "🔧 Troubleshooting:"
echo "  Check logs: docker-compose logs [service_name]"
echo "  Fix nginx permissions: docker-compose exec -T --user root nginx chmod -R 777 /app/hls/"
echo "  Fix backend permissions: docker-compose exec -T --user root backend chmod -R 755 /app/hls/"
echo "  Restart services: docker-compose restart"
echo "  Update stream status: docker-compose exec mongodb mongo livestream -u admin -p admin123 --authenticationDatabase admin --eval \"db.streams.updateOne({streamKey: 'stream'}, {\\\$set: {status: 'active', isLive: true}})\""
