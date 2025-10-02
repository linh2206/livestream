#!/bin/bash

# LiveStream Platform - Build and Start Script
# This script builds and starts all Docker services

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

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Check Docker Hub connectivity
echo "🔍 Checking Docker Hub connectivity..."
if ! docker pull hello-world &>/dev/null; then
    echo "⚠️  Docker Hub rate limit reached or network issue"
    echo ""
    echo "💡 To fix this issue:"
    echo "  1. Create Docker Hub account at: https://hub.docker.com"
    echo "  2. Run: docker login"
    echo "  3. Enter your Docker Hub username and password"
    echo "  4. Or use anonymous: docker login --username anonymous --password anonymous"
    echo ""
    echo "⏳ Waiting 10 seconds before continuing..."
    sleep 10
    echo "🔄 Continuing with existing images..."
    docker rmi hello-world &>/dev/null || true
else
    echo "✅ Docker Hub accessible"
    docker rmi hello-world &>/dev/null || true
fi

# Build and start services
echo "🔨 Building and starting all services..."
echo "  • Building Docker images..."
docker compose build --no-cache

echo "  • Starting all services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
echo "  • Waiting for database services..."
sleep 10

echo "  • Waiting for application services..."
sleep 15

# Check service status
echo "🏥 Checking service status..."
echo "  • MongoDB: $(docker ps --filter 'name=livestream-mongodb' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Redis: $(docker ps --filter 'name=livestream-redis' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Backend: $(docker ps --filter 'name=livestream-backend' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Frontend: $(docker ps --filter 'name=livestream-frontend' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Nginx: $(docker ps --filter 'name=livestream-nginx' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Grafana: $(docker ps --filter 'name=livestream-grafana' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"
echo "  • Prometheus: $(docker ps --filter 'name=livestream-prometheus' --format 'table {{.Status}}' | tail -n +2 || echo 'DOWN')"

# Test HTTP endpoints
echo ""
echo "🌐 Testing HTTP endpoints..."
echo "  • Frontend: $(curl -s -o /dev/null -w '%{http_code}' \${FRONTEND_URL} || echo 'DOWN')"
echo "  • Backend API: $(curl -s -o /dev/null -w '%{http_code}' \${API_BASE_URL}/health || echo 'DOWN')"
echo "  • Grafana: $(curl -s -o /dev/null -w '%{http_code}' \${GRAFANA_URL} || echo 'DOWN')"
echo "  • Prometheus: $(curl -s -o /dev/null -w '%{http_code}' \${PROMETHEUS_URL} || echo 'DOWN')"

echo ""
echo "✅ Build and start completed!"
echo "============================================="
echo "🌐 Frontend: \${FRONTEND_URL}"
echo "🔧 Backend: \${API_BASE_URL}"
echo "📊 MongoDB: mongodb://\${HOST}:\${MONGODB_PORT}"
echo ""
echo "👤 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "============================================="
