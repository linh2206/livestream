#!/bin/bash

echo "🔨 Building and Starting Livestream Platform"
echo "============================================="
echo "This script will:"
echo "  • Remove existing .env and config.env files"
echo "  • Copy fresh .env.example to .env and config.env"
echo "  • Generate JWT secrets if needed"
echo "  • Stop existing containers"
echo "  • Build and start all services"
echo "  • Check service health"
echo "============================================="

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Copy environment files from example (always fresh copy)
echo "📋 Setting up fresh environment files from .env.example..."

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    echo "❌ .env.example not found. Please create .env.example first."
    exit 1
fi

# Remove existing env files if they exist
if [ -f ".env" ]; then
    rm .env
    echo "🗑️  Removed existing .env file"
fi

if [ -f "config.env" ]; then
    rm config.env
    echo "🗑️  Removed existing config.env file"
fi

# Copy .env.example to .env
cp .env.example .env
echo "✅ Created fresh .env file from .env.example"

# Copy .env.example to config.env
cp .env.example config.env
echo "✅ Created fresh config.env file from .env.example"

# Generate JWT secret if needed
if grep -q "your-super-secret-jwt-key-change-in-production" .env; then
    echo "🔐 Generating JWT secret..."
    random_secret=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i.bak "s/your-super-secret-jwt-key-change-in-production/${random_secret}/g" .env
    sed -i.bak "s/your-super-secret-jwt-key-change-in-production/${random_secret}/g" config.env
    rm -f .env.bak config.env.bak
    echo "✅ Generated and set JWT_SECRET"
fi

echo "✅ Environment files setup completed!"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service status
echo "🏥 Checking service status..."
echo "Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'DOWN')"
echo "Backend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:9000/api/v1/health || echo 'DOWN')"

echo ""
echo "✅ Build and start completed!"
echo "============================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:9000/api/v1"
echo "📊 MongoDB: mongodb://localhost:27017"
echo ""
echo "👤 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "============================================="
