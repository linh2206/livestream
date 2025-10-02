#!/bin/bash

# Livestream Application Deployment Script
# This script ensures all services are running and ready for production

echo "🚀 Starting Livestream Application Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Docker is running"

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose down

# Build and start all services
print_status "Building and starting all services..."
docker-compose up -d --build

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service status
print_status "Checking service status..."
docker-compose ps

# Check if all services are running
services=("mongodb" "redis" "backend" "frontend" "nginx")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "$service.*healthy\|$service.*Up"; then
        print_success "$service is running"
    else
        print_error "$service is not running properly"
        all_healthy=false
    fi
done

if [ "$all_healthy" = true ]; then
    print_success "All services are running successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:9000"
    echo "   Nginx (RTMP): http://localhost:80"
    echo "   MongoDB: localhost:27017"
    echo "   Redis: localhost:6379"
    echo ""
    echo "📊 Monitoring URLs:"
    echo "   Prometheus: http://localhost:9090"
    echo "   Grafana: http://localhost:8080"
    echo ""
    echo "✅ Deployment completed successfully!"
    echo "🎯 Ready for production use!"
else
    print_error "Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi



