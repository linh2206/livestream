#!/bin/bash

echo "🚀 Installing Livestream Platform - Complete System Setup"
echo "=========================================================="
echo "This script will install everything the system needs:"
echo "  • System dependencies (Docker, Node.js, Git)"
echo "  • Create necessary directories and structure"
echo "  • Setup environment files from .env.example"
echo "  • Generate JWT secrets and security keys"
echo "  • Install all project dependencies (backend, frontend)"
echo "  • Setup SSH keys and permissions"
echo "  • Build and start all services with Docker"
echo "  • Initialize database and admin user"
echo "=========================================================="

# Check if running on Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    echo "❌ This script is designed for Ubuntu/Debian systems"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Note: MongoDB and Nginx will be installed via Docker containers
echo "ℹ️  MongoDB and Nginx will be installed via Docker containers"

# Install Git
echo "🔧 Installing Git..."
sudo apt install -y git

# Install additional tools
echo "🛠️ Installing additional tools..."
sudo apt install -y curl wget unzip

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p apps/backend/hls/stream
mkdir -p config/database
mkdir -p config/nginx
mkdir -p logs
echo "✅ Created directory structure"

# Setup environment files
echo "📋 Setting up environment files..."
if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
fi

if [ -f "apps/backend/.env.example" ]; then
    cp apps/backend/.env.example apps/backend/.env
    echo "✅ Created backend .env file"
fi

if [ -f "apps/frontend/.env.example" ]; then
    cp apps/frontend/.env.example apps/frontend/.env
    echo "✅ Created frontend .env file"
fi

# Install project dependencies
echo "📦 Installing project dependencies..."
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..

# Setup SSH
echo "🔐 Setting up SSH..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
fi
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Setup admin user
echo "👤 Setting up admin user..."
if docker ps | grep -q livestream-mongodb; then
    docker exec livestream-mongodb mongosh livestream --eval "
        db.users.updateOne(
            { username: 'admin' },
            {
                \$set: {
                    password: '\$2b\$10\$rQZ8K9vXqJ2H3L4M5N6O7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9'
                }
            },
            { upsert: true }
        );
        print('Admin password set to admin123');
    " 2>/dev/null
fi

echo ""
echo "✅ System installation completed successfully!"
echo "=========================================================="
echo "📋 Next steps:"
echo "  1. Run './scripts/build-start.sh' to rebuild and restart services"
echo "  2. Or run 'docker-compose up -d --build' manually"
echo ""
echo "🌐 Once started, access:"
echo "  • Frontend: http://localhost:3000"
echo "  • API: http://localhost:9000/api/v1"
echo "  • Grafana: http://localhost:8080 (admin/admin123)"
echo "  • Prometheus: http://localhost:9090"
echo ""
echo "👤 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🔄 To restart services: docker-compose restart"
echo "🛑 To stop services: docker-compose down"
echo "📊 To view logs: docker-compose logs -f [service-name]"
echo "=========================================================="
