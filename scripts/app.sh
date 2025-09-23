#!/bin/bash

# LiveStream App Management Script
# Optimized version with duplicates removed

set -e

# Colors for output
log_info() { echo -e "\033[0;36m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_warning() { echo -e "\033[0;33m[WARNING]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# Common functions
get_sudo_cmd() { [ "$(id -u)" = "0" ] && echo "" || echo "sudo"; }
get_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        log_error "Docker Compose not found" >&2
        exit 1
    fi
}

# Check if running on Ubuntu
check_os() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "This script is only supported on Ubuntu"
        exit 1
    fi
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Install Docker on Ubuntu
install_docker() {
    log_info "Installing Docker on Ubuntu..."
    
    # Check if running on Ubuntu
    if ! command -v apt-get >/dev/null 2>&1; then
        log_error "This script requires Ubuntu with apt package manager"
        exit 1
    fi
    
    SUDO_CMD=$(get_sudo_cmd)
    
    # Remove old Docker installations
    log_info "Removing old Docker installations..."
    $SUDO_CMD systemctl stop docker 2>/dev/null || true
    $SUDO_CMD systemctl stop containerd 2>/dev/null || true
    $SUDO_CMD apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    $SUDO_CMD apt-get purge -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    $SUDO_CMD rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
    
    # Update package index
    log_info "Updating package index..."
    $SUDO_CMD apt-get update
    
    # Install prerequisites
    log_info "Installing prerequisites..."
    $SUDO_CMD apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    log_info "Adding Docker's official GPG key..."
    $SUDO_CMD mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO_CMD gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up Docker repository
    log_info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index
    $SUDO_CMD apt-get update
    
    # Install Docker Engine
    log_info "Installing Docker Engine..."
    $SUDO_CMD apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker service
    log_info "Starting Docker service..."
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
    
    # Add current user to docker group
    if [ "$(id -u)" != "0" ]; then
    log_info "Adding user to docker group..."
        $SUDO_CMD usermod -aG docker $USER
    log_warning "Please logout and login again to use Docker without sudo"
    fi
    
    # Verify installation
    log_info "Verifying Docker installation..."
    if docker --version >/dev/null 2>&1; then
        log_success "Docker installed successfully:"
        docker --version
    else
        log_error "Docker installation failed"
        exit 1
    fi
    
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose installed successfully:"
        docker compose version
    else
        log_error "Docker Compose installation failed"
        exit 1
    fi
    
    log_success "Docker and Docker Compose installation completed!"
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js..."
    SUDO_CMD=$(get_sudo_cmd)
    
    # Update package list
    $SUDO_CMD apt-get update
    
    # Install curl if not present
    $SUDO_CMD apt-get install -y curl
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO_CMD -E bash -
    
    # Install Node.js
    $SUDO_CMD apt-get install -y nodejs
    
    # Verify installation
    if check_nodejs; then
        log_success "Node.js $(node --version) and npm $(npm --version) installed successfully"
    else
        log_error "Failed to install Node.js"
        return 1
    fi
}

# Check CPU capabilities and fix MongoDB version
check_cpu_and_mongodb() {
    log_info "Checking CPU capabilities..."
    
    # Check if CPU has AVX support
    if grep -q avx /proc/cpuinfo 2>/dev/null; then
        log_success "CPU has AVX support - using MongoDB 7.0"
        MONGO_VERSION="mongo:7.0"
    else
        log_warning "CPU does not have AVX support - using MongoDB 4.4"
        MONGO_VERSION="mongo:4.4"
        
        # Update docker-compose.yml to use MongoDB 4.4
        if [ -f "docker-compose.yml" ]; then
            log_info "Updating docker-compose.yml to use MongoDB 4.4..."
            sed -i.bak 's/mongo:7.0/mongo:4.4/g' docker-compose.yml
            log_success "Updated docker-compose.yml"
        fi
    fi
    
    export MONGO_VERSION
}

# Fix network and DNS issues
fix_network() {
    log_info "Fixing network and DNS issues..."
    
    SUDO_CMD=$(get_sudo_cmd)
    
    # Stop systemd-resolved if running
    log_info "Stopping systemd-resolved..."
    $SUDO_CMD systemctl stop systemd-resolved 2>/dev/null || true
    $SUDO_CMD systemctl disable systemd-resolved 2>/dev/null || true
    
    # Fix DNS resolution
    log_info "Backing up resolv.conf..."
    $SUDO_CMD cp /etc/resolv.conf /etc/resolv.conf.backup 2>/dev/null || true
    
    log_info "Setting DNS to multiple providers..."
    cat << 'EOF' | $SUDO_CMD tee /etc/resolv.conf
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
nameserver 1.0.0.1
nameserver 208.67.222.222
nameserver 208.67.220.220
EOF
    log_success "DNS fixed with multiple providers"
    
    # Make resolv.conf immutable
    $SUDO_CMD chattr +i /etc/resolv.conf 2>/dev/null || true
    
    # Restart network services
    log_info "Restarting network services..."
    $SUDO_CMD systemctl restart networking 2>/dev/null || true
    $SUDO_CMD systemctl restart NetworkManager 2>/dev/null || true
    
    # Restart Docker daemon if installed
    if command -v docker >/dev/null 2>&1; then
        log_info "Restarting Docker daemon..."
        $SUDO_CMD systemctl stop docker 2>/dev/null || true
        sleep 3
        $SUDO_CMD systemctl start docker 2>/dev/null || {
            log_warning "Failed to start Docker service, will install Docker later"
        }
        sleep 5
    fi
    
    # Test network connectivity
    log_info "Testing network connectivity..."
    for dns in 8.8.8.8 1.1.1.1 208.67.222.222; do
        if ping -c 1 -W 5 $dns >/dev/null 2>&1; then
            log_success "Network connectivity OK with $dns"
            break
        else
            log_warning "Failed to ping $dns"
        fi
    done
}

# Check and fix Docker build issues
check_docker_build() {
    log_info "Checking Docker build configuration..."
    
    # Check if API Dockerfile exists and fix COPY command
    if [ -f "services/api/Dockerfile" ]; then
        if ! grep -q "COPY src/ ./" services/api/Dockerfile; then
            log_warning "Fixing API Dockerfile COPY command..."
            sed -i.bak 's/COPY src.*/COPY src\/ .\//' services/api/Dockerfile
            log_success "API Dockerfile fixed - now using 'COPY src/ ./'"
        else
            log_success "API Dockerfile already has correct COPY command"
        fi
    else
        log_error "API Dockerfile not found"
        return 1
    fi
    
    # Check if API src directory exists
    if [ ! -d "services/api/src" ]; then
        log_warning "API src directory not found, creating..."
        mkdir -p services/api/src
        log_success "Created services/api/src directory"
    fi
    
    # Create basic API files if missing
    create_basic_api_files
    
    # Check frontend configuration
    check_frontend_config
    
    log_success "Docker build check completed"
    return 0
}

# Create basic API files if missing
create_basic_api_files() {
    # Create main.ts if missing
    if [ ! -f "services/api/src/main.ts" ]; then
        log_warning "main.ts not found, creating basic one..."
        cat > services/api/src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:80', 'http://localhost:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  
  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  await app.listen(9000);
  console.log('API server running on port 9000');
}
bootstrap();
EOF
        log_success "Created main.ts"
    fi
    
    # Create app.module.ts if missing
    if [ ! -f "services/api/src/app.module.ts" ]; then
        log_warning "app.module.ts not found, creating basic one..."
        cat > services/api/src/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
EOF
        log_success "Created app.module.ts"
    fi
    
    # Create app.controller.ts if missing
    if [ ! -f "services/api/src/app.controller.ts" ]; then
        log_warning "app.controller.ts not found, creating basic one..."
        cat > services/api/src/app.controller.ts << 'EOF'
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
EOF
        log_success "Created app.controller.ts"
    fi
    
    # Create app.service.ts if missing
    if [ ! -f "services/api/src/app.service.ts" ]; then
        log_warning "app.service.ts not found, creating basic one..."
        cat > services/api/src/app.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
EOF
        log_success "Created app.service.ts"
    fi
}

# Check frontend configuration
check_frontend_config() {
    # Check if frontend directory exists
    if [ ! -d "services/frontend" ]; then
        log_error "Frontend directory not found"
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "services/frontend/package.json" ]; then
        log_error "Frontend package.json not found"
        return 1
    fi
    
    # Create missing configuration files
    create_frontend_config_files
    
    # Create missing components
    create_frontend_components
}

# Create frontend configuration files
create_frontend_config_files() {
    # Create tsconfig.json if missing
    if [ ! -f "services/frontend/tsconfig.json" ]; then
        log_warning "tsconfig.json not found, creating basic one..."
        cat > services/frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
        log_success "Created tsconfig.json with @/* path mapping"
    fi
    
    # Create next.config.js if missing
    if [ ! -f "services/frontend/next.config.js" ]; then
        log_warning "next.config.js not found, creating..."
        cat > services/frontend/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
EOF
        log_success "Created next.config.js"
    fi
    
    # Create postcss.config.js if missing
    if [ ! -f "services/frontend/postcss.config.js" ]; then
        log_warning "postcss.config.js not found, creating..."
        cat > services/frontend/postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
        log_success "Created postcss.config.js"
    fi
    
    # Create tailwind.config.js if missing
    if [ ! -f "services/frontend/tailwind.config.js" ]; then
        log_warning "tailwind.config.js not found, creating..."
        cat > services/frontend/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF
        log_success "Created tailwind.config.js"
    fi
}

# Create frontend components
create_frontend_components() {
    # Create hooks directory if missing
    if [ ! -d "services/frontend/hooks" ]; then
        log_warning "hooks directory not found, creating..."
        mkdir -p services/frontend/hooks
    fi
    
    # Create useSocket.ts if missing
    if [ ! -f "services/frontend/hooks/useSocket.ts" ]; then
        log_warning "useSocket.ts not found, creating basic one..."
        cat > services/frontend/hooks/useSocket.ts << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://183.182.104.226:24190', {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return { socket, isConnected };
}
EOF
        log_success "Created useSocket.ts"
    fi
    
    # Create VideoPlayer component if missing
    if [ ! -f "services/frontend/components/VideoPlayer.tsx" ]; then
        log_warning "VideoPlayer.tsx not found, creating..."
        cat > services/frontend/components/VideoPlayer.tsx << 'EOF'
'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  streamName?: string;
}

export default function VideoPlayer({ streamName = 'stream' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = `${process.env.NEXT_PUBLIC_HLS_URL || 'http://localhost:8080'}/hls/${streamName}`;
    
    // Check if browser supports HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
      video.addEventListener('loadstart', () => setIsLoading(false));
      video.addEventListener('error', () => setError('Failed to load stream'));
    } else if (typeof window !== 'undefined' && (window as any).Hls) {
      // HLS.js for other browsers
      const hls = new (window as any).Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setError(null);
      });
      
      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        console.error('HLS error:', data);
        setError('Stream error: ' + data.details);
      });
    } else {
      setError('HLS not supported in this browser');
    }

    return () => {
      if (video && (video as any).hls) {
        (video as any).hls.destroy();
      }
    };
  }, [streamName]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white">Loading stream...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-500 text-center">
            <p>{error}</p>
            <p className="text-sm mt-2">Make sure the stream is active</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        autoPlay
        muted
        playsInline
      />
    </div>
  );
}
EOF
        log_success "Created VideoPlayer.tsx"
    fi
}

# Create .env file
create_env_file() {
    log_info "Creating .env file..."
    
    # Remove old .env
    rm -f .env
    
    # Create new .env
    if [ -f env.example ]; then
        cp env.example .env
        log_success ".env file created from env.example"
    else
        cat > .env << EOF
# Database
MONGODB_URI=mongodb://mongodb:27017/livestream
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API
API_PORT=9000
API_URL=http://api:9000

# Frontend
FRONTEND_PORT=3000
FRONTEND_URL=http://frontend:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://183.182.104.226:24190
NEXT_PUBLIC_WS_URL=http://183.182.104.226:24190
NEXT_PUBLIC_HLS_URL=http://localhost:8080/hls
NEXT_PUBLIC_RTMP_URL=rtmp://localhost:1935/live
NEXT_PUBLIC_STREAM_NAME=stream

# Nginx
BACKEND_URL=http://api:9000
WS_URL=http://api:9000
HLS_URL=http://localhost:8080/hls
RTMP_URL=rtmp://localhost:1935/live
EOF
        log_success ".env file created with default values"
    fi
}

# Setup everything (install + start)
setup() {
    log_info "Setting up LiveStream App..."
    
    # Check CPU and fix MongoDB version first
    check_cpu_and_mongodb
    
    # Fix network issues
    fix_network
    
    # Check Docker build issues
    check_docker_build
    
    # Check if Docker is installed
    if ! check_docker; then
        log_info "Docker not found. Installing Docker..."
        install_docker
    fi
    
    # Create .env file
    create_env_file
    
    # Configure Docker daemon with registry mirrors
    log_info "Configuring Docker daemon with registry mirrors..."
    SUDO_CMD=$(get_sudo_cmd)
    $SUDO_CMD mkdir -p /etc/docker
    cat << 'EOF' | $SUDO_CMD tee /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "dns": ["8.8.8.8", "1.1.1.1"],
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 5
}
EOF
    $SUDO_CMD systemctl restart docker
    sleep 5
    
    # Try to pull base images first
    log_info "Pulling base images..."
    docker pull node:18-alpine || log_warning "Failed to pull node:18-alpine, will try during build"
    docker pull ${MONGO_VERSION:-mongo:4.4} || log_warning "Failed to pull ${MONGO_VERSION:-mongo:4.4}, will try during build"
    docker pull redis:7-alpine || log_warning "Failed to pull redis:7-alpine, will try during build"
    
        # Build services
        log_info "Building services..."
        COMPOSE_CMD=$(get_compose_cmd)
        export DOCKER_BUILDKIT=1
        export COMPOSE_HTTP_TIMEOUT=600
        export DOCKER_BUILDKIT_PROGRESS=plain
        
        # Try building individual services first for better error handling
        log_info "Building API service..."
        if ! $COMPOSE_CMD build api; then
            log_error "Failed to build API service"
            exit 1
        fi
        
        log_info "Building Frontend service..."
        if ! $COMPOSE_CMD build frontend; then
            log_warning "Frontend build failed, trying with npm install instead of npm ci..."
            # Update frontend Dockerfile to use npm install
            sed -i 's/RUN npm ci/RUN npm install/g' services/frontend/Dockerfile
            if ! $COMPOSE_CMD build frontend; then
                log_error "Failed to build Frontend service"
                exit 1
            fi
        fi
        
        log_info "Building Nginx service..."
        if ! $COMPOSE_CMD build nginx; then
            log_error "Failed to build Nginx service"
            exit 1
        fi
    
    # Start services
    log_info "Starting services..."
    $COMPOSE_CMD up -d
    
    # Wait for services to be healthy
    wait_for_health "livestream-mongodb" 30 || log_warning "MongoDB health check timeout"
    wait_for_health "livestream-redis" 20 || log_warning "Redis health check timeout"
    wait_for_health "livestream-api" 40 || log_warning "API health check timeout"
    wait_for_health "livestream-frontend" 30 || log_warning "Frontend health check timeout"
    
        log_success "Setup complete!"
        log_info "🎬 LiveStream App is ready!"
        log_info "🌐 Frontend: http://localhost:3000"
        log_info "🔌 API: http://183.182.104.226:24190/"
        log_info "📺 HLS Streaming: http://localhost:8080/hls"
        log_info "📡 RTMP Ingest: rtmp://localhost:1935/live"
        log_info "📊 RTMP Stats: http://localhost:8080/stat"
        log_info "🗄️ MongoDB: mongodb://localhost:27017/livestream"
        log_info "⚡ Redis: redis://localhost:6379"
}

# Wait for service health
wait_for_health() {
    local service=$1
    local timeout=${2:-30}
    local count=0
    
    while [ $count -lt $timeout ]; do
        if docker ps --filter "name=$service" --filter "health=healthy" | grep -q "$service"; then
            log_success "$service is healthy"
            return 0
        fi
        count=$((count + 1))
        sleep 1
    done
    
    log_error "$service health check failed"
    return 1
}

# Docker service management
docker_service() {
    local action=$1
    local compose_cmd=$(get_compose_cmd)
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        create_env_file
    fi
    
    case $action in
        start)
            log_info "Starting LiveStream App..."
            if check_docker; then
                $compose_cmd up -d
                wait_for_health "livestream-mongodb" 30 || log_warning "MongoDB health check timeout"
                wait_for_health "livestream-redis" 20 || log_warning "Redis health check timeout"
                wait_for_health "livestream-api" 40 || log_warning "API health check timeout"
                wait_for_health "livestream-frontend" 30 || log_warning "Frontend health check timeout"
                log_success "Services started"
                log_info "Frontend: http://localhost:3000"
                log_info "Backend: http://183.182.104.226:24190"
                log_info "HLS Streaming: http://localhost:8080/hls"
                log_info "RTMP: rtmp://localhost:1935/live"
            else
                log_warning "Docker not found or not running. Attempting to install/start Docker..."
                if install_docker; then
                    log_info "Docker installed successfully. Starting services..."
                    $compose_cmd up -d
                    wait_for_health "livestream-mongodb" 30 || log_warning "MongoDB health check timeout"
                    wait_for_health "livestream-redis" 20 || log_warning "Redis health check timeout"
                    wait_for_health "livestream-api" 40 || log_warning "API health check timeout"
                    wait_for_health "livestream-frontend" 30 || log_warning "Frontend health check timeout"
                    log_success "Services started"
                    log_info "Frontend: http://localhost:3000"
                    log_info "Backend: http://183.182.104.226:24190"
                    log_info "HLS Streaming: http://localhost:8080/hls"
                    log_info "RTMP: rtmp://localhost:1935/live"
                else
                    log_error "Failed to install Docker. Please install Docker manually."
                    exit 1
                fi
            fi
            ;;
        stop)
            log_info "Stopping LiveStream App..."
            if check_docker; then
                $compose_cmd down
                log_success "Services stopped"
            else
                log_warning "Docker not running, nothing to stop"
            fi
            ;;
        status)
            log_info "Service Status:"
            if check_docker; then
                $compose_cmd ps
            else
                log_warning "Docker not running, cannot show status"
            fi
            ;;
        logs)
            log_info "Showing service logs..."
            if check_docker; then
                $compose_cmd logs -f
            else
                log_error "Cannot show logs without Docker. Please start Docker first."
                exit 1
            fi
            ;;
        clean)
            log_info "Cleaning up..."
            if check_docker; then
                $compose_cmd down -v
                docker system prune -f
                log_success "Cleanup complete"
            else
                log_warning "Docker not running, nothing to clean"
            fi
            ;;
        build)
            log_info "Building services..."
            if check_docker; then
                $compose_cmd build
                log_success "Build complete"
            else
                log_error "Cannot build without Docker. Please start Docker first."
                exit 1
            fi
            ;;
    esac
}

# Wrapper functions
start() { docker_service start; }
stop() { docker_service stop; }
status() { docker_service status; }
logs() { docker_service logs; }
clean() { docker_service clean; }
build() { docker_service build; }

# Test all services
test_services() {
    log_info "Testing all services..."
    
    # Test MongoDB
    if docker exec livestream-mongodb mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        log_success "✅ MongoDB is running"
    else
        log_error "❌ MongoDB is not responding"
    fi
    
    # Test Redis
    if docker exec livestream-redis redis-cli ping >/dev/null 2>&1; then
        log_success "✅ Redis is running"
    else
        log_error "❌ Redis is not responding"
    fi
    
    # Test Frontend (direct)
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        log_success "✅ Frontend is running (direct)"
    else
        log_error "❌ Frontend is not responding (direct)"
    fi
    
    # Test API direct
    if curl -s http://183.182.104.226:24190/health >/dev/null 2>&1; then
        log_success "✅ API is running (direct)"
    else
        log_error "❌ API is not responding (direct)"
    fi
    
    # Test Nginx proxy
    if curl -s http://localhost:8080/stat >/dev/null 2>&1; then
        log_success "✅ Nginx proxy is working"
    else
        log_error "❌ Nginx proxy is not responding"
    fi
    
    # Test HLS
    if curl -s http://localhost:8080/hls/stream.m3u8 >/dev/null 2>&1; then
        log_success "✅ HLS streaming is working"
    else
        log_warning "⚠️ HLS streaming not available (no active stream)"
    fi
    
    # Test RTMP stats
    if curl -s http://localhost:8080/stat >/dev/null 2>&1; then
        log_success "✅ RTMP stats are available"
    else
        log_error "❌ RTMP stats are not responding"
    fi
}

# Test streaming functionality
test_stream() {
    log_info "Testing streaming functionality..."
    
    # Check if FFmpeg is available
    if ! command -v ffmpeg >/dev/null 2>&1; then
        log_warning "FFmpeg not found. Installing..."
        SUDO_CMD=$(get_sudo_cmd)
        $SUDO_CMD apt update
        $SUDO_CMD apt install -y ffmpeg
    fi
    
    # Start a test pattern stream
    log_info "Starting test pattern stream..."
    log_info "This will run for 30 seconds, then stop automatically"
    log_info "Check http://localhost:3000 to see the stream"
    
    # Run FFmpeg in background with timeout
    timeout 30s ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 \
           -f lavfi -i sine=frequency=1000:sample_rate=44100 \
           -c:v libx264 -preset ultrafast -tune zerolatency \
           -c:a aac -b:a 128k \
           -f flv rtmp://localhost:1935/live/stream \
           -y 2>/dev/null &
    
    FFMPEG_PID=$!
    
    # Wait a moment for stream to start
    sleep 5
    
    # Check if stream is working
    log_info "Checking stream status..."
    if curl -s http://localhost:8080/hls/stream/index.m3u8 >/dev/null 2>&1; then
        log_success "✅ Test stream is working!"
        log_info "🎬 Stream URL: http://localhost:8080/hls/stream/index.m3u8"
        log_info "🌐 Web interface: http://localhost:3000"
    else
        log_warning "⚠️  Stream not ready yet, waiting..."
        sleep 5
        if curl -s http://localhost:8080/hls/stream/index.m3u8 >/dev/null 2>&1; then
            log_success "✅ Test stream is working!"
        else
            log_error "❌ Stream failed to start"
        fi
    fi
    
    # Wait for FFmpeg to finish or kill it
    wait $FFMPEG_PID 2>/dev/null || true
    
    log_info "Test stream completed"
}

# Sync code to server
sync_to_server() {
    # Default server config
    SERVER_HOST=${SERVER_HOST:-183.182.104.226}
    SERVER_PORT=${SERVER_PORT:-24122}
    SERVER_USER=${SERVER_USER:-ubuntu}
    
    log_info "Syncing to $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
    
    # Create directory structure in user's home
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "mkdir -p ~/livestream/services/{api,frontend}"
    
    # Sync API code
    log_info "Syncing API source code..."
    scp -P $SERVER_PORT -r services/api/src $SERVER_USER@$SERVER_HOST:~/livestream/services/api/
    
    # Sync frontend code
    log_info "Syncing frontend source code..."
    for dir in app components hooks; do
        [ -d "services/frontend/$dir" ] && {
            scp -P $SERVER_PORT -r services/frontend/$dir $SERVER_USER@$SERVER_HOST:~/livestream/services/frontend/
        }
    done
    
    # Sync config files
    log_info "Syncing configuration files..."
    for file in docker-compose.yml Makefile env.example; do
        [ -f "$file" ] && {
            scp -P $SERVER_PORT $file $SERVER_USER@$SERVER_HOST:~/livestream/
        }
    done
    
    # Sync scripts
    scp -P $SERVER_PORT -r scripts $SERVER_USER@$SERVER_HOST:~/livestream/
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "chmod +x ~/livestream/scripts/*.sh"
    
    log_success "Code sync completed to ~/livestream!"
    log_info "Run 'cd ~/livestream && make install' on the server to continue"
}

# System optimization functions
optimize_docker() {
    log_info "🐳 Optimizing Docker system..."
    
    # Clean up Docker
    docker system prune -f
    docker builder prune -af
    docker volume prune -f
    docker image prune -af
    
    log_success "✅ Docker system optimized"
}

clean_temp_files() {
    log_info "🧹 Cleaning temporary files..."
    
    # Remove temporary files
    find . -name "*.log" -delete 2>/dev/null || true
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name ".DS_Store" -delete 2>/dev/null || true
    find . -name "Thumbs.db" -delete 2>/dev/null || true
    
    # Clean HLS files
    if [ -d "hls" ]; then
        rm -rf hls/*
        log_info "Cleared HLS files"
    fi
    
    log_success "✅ Temporary files cleaned"
}

optimize_all() {
    log_info "🚀 Starting full system optimization..."
    
    # Stop services first
    log_info "🛑 Stopping services..."
    docker-compose down 2>/dev/null || true
    
    # Run optimizations
    clean_temp_files
    create_env_file
    optimize_docker
    
    log_success "🎉 System optimization complete!"
}

# Main function
main() {
    case "$1" in
        install) setup ;;
        setup) setup ;;
        start) start ;;
        stop) stop ;;
        status) status ;;
        logs) logs ;;
        clean) clean ;;
        build) build ;;
        test) test_services ;;
        test-stream) test_stream ;;
        sync) sync_to_server ;;
        install-docker) install_docker ;;
        create-env) create_env_file ;;
        optimize) optimize_all ;;
        *) 
            echo "Usage: $0 {install|setup|start|stop|status|logs|clean|build|test|test-stream|sync|install-docker|create-env|optimize}"
            exit 1
            ;;
    esac
}

main "$@"