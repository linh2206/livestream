#!/bin/bash

# LiveStream App Management Script
# Ubuntu only version

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Install Docker if not present
install_docker() {
    # Check if Docker is already installed but not running
    if command -v docker >/dev/null 2>&1; then
        log_info "Docker is installed but not running. Starting Docker service..."
        if $(get_sudo_cmd) systemctl start docker 2>/dev/null; then
            $(get_sudo_cmd) systemctl enable docker 2>/dev/null || true
            log_success "Docker service started via systemctl"
        else
            log_warning "systemctl failed, trying to start Docker daemon directly..."
            # Try to start Docker daemon directly
            $(get_sudo_cmd) dockerd --daemon 2>/dev/null || true
        fi
        
        # Wait a moment for Docker to start
        sleep 3
        
        # Test if Docker is now working
        if docker info >/dev/null 2>&1; then
            log_success "Docker service started successfully!"
            return 0
        elif $(get_sudo_cmd) docker info >/dev/null 2>&1; then
            log_success "Docker service started successfully!"
            log_warning "You may need to logout and login again to use Docker without sudo"
            return 0
        else
            log_warning "Docker daemon not responding, will proceed with full installation..."
        fi
    fi
    
    log_info "Installing Docker..."
    
    # Update package index
    log_info "Updating package index..."
    $(get_sudo_cmd) apt update
    
    # Install required packages
    log_info "Installing required packages..."
    $(get_sudo_cmd) apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker GPG key
    log_info "Adding Docker GPG key..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $(get_sudo_cmd) gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    log_info "Adding Docker repository..."
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $(get_sudo_cmd) tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index again
    $(get_sudo_cmd) apt update
    
    # Install Docker Engine
    log_info "Installing Docker Engine..."
    $(get_sudo_cmd) apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    log_info "Starting Docker service..."
    if $(get_sudo_cmd) systemctl start docker 2>/dev/null; then
        $(get_sudo_cmd) systemctl enable docker 2>/dev/null || true
        log_success "Docker service started"
    else
        log_warning "Failed to start Docker service, trying alternative method..."
        # Try to start Docker daemon directly
        $(get_sudo_cmd) dockerd --daemon 2>/dev/null || true
        sleep 3
    fi
    
    # Add current user to docker group
    log_info "Adding user to docker group..."
    $(get_sudo_cmd) usermod -aG docker $USER
    
    log_success "Docker installed successfully!"
    log_warning "Please logout and login again to use Docker without sudo"
    
    # Test Docker installation
    log_info "Testing Docker installation..."
    if $(get_sudo_cmd) docker --version >/dev/null 2>&1; then
        log_success "Docker is working!"
        return 0
    else
        log_error "Docker installation failed"
        return 1
    fi
}

# Check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        return 0
    else
        return 1
    fi
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
    
    # Stop systemd-resolved if running
    log_info "Stopping systemd-resolved..."
    sudo systemctl stop systemd-resolved 2>/dev/null || true
    sudo systemctl disable systemd-resolved 2>/dev/null || true
    
    # Fix DNS resolution
    log_info "Backing up resolv.conf..."
    sudo cp /etc/resolv.conf /etc/resolv.conf.backup 2>/dev/null || true
    
    log_info "Setting DNS to multiple providers..."
    cat << 'EOF' | sudo tee /etc/resolv.conf
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
nameserver 1.0.0.1
nameserver 208.67.222.222
nameserver 208.67.220.220
EOF
    log_success "DNS fixed with multiple providers"
    
    # Make resolv.conf immutable
    sudo chattr +i /etc/resolv.conf 2>/dev/null || true
    
    # Restart network services
    log_info "Restarting network services..."
    sudo systemctl restart networking 2>/dev/null || true
    sudo systemctl restart NetworkManager 2>/dev/null || true
    
    # Restart Docker daemon
    log_info "Restarting Docker daemon..."
    sudo systemctl stop docker 2>/dev/null || true
    sleep 3
    sudo systemctl start docker
    sleep 5
    
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
    
    # Test Docker Hub connectivity
    log_info "Testing Docker Hub connectivity..."
    if curl -s --connect-timeout 10 https://registry-1.docker.io >/dev/null 2>&1; then
        log_success "Docker Hub accessible"
    else
        log_warning "Docker Hub not accessible, will try alternative methods"
    fi
}

# Check and fix Docker build issues
check_docker_build() {
    log_info "Checking Docker build configuration..."
    
    # Check if API Dockerfile exists and fix COPY command
    if [ -f "services/api/Dockerfile" ]; then
        if ! grep -q "COPY src/ ./" services/api/Dockerfile; then
            log_warning "Fixing API Dockerfile COPY command..."
            # Fix the COPY command to use correct path
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
    
    # Check if main.ts exists
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
    
    # Check if app.module.ts exists
    if [ ! -f "services/api/src/app.module.ts" ]; then
        log_warning "app.module.ts not found, creating basic one..."
        cat > services/api/src/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RtmpController, HlsController } from './rtmp.controller';

@Module({
  imports: [],
  controllers: [AppController, RtmpController, HlsController],
  providers: [AppService],
})
export class AppModule {}
EOF
        log_success "Created app.module.ts"
    else
        # Update existing app.module.ts to include RtmpController
        if ! grep -q "RtmpController" services/api/src/app.module.ts; then
            log_warning "Adding RtmpController to app.module.ts..."
            sed -i.bak 's/import { AppService } from/import { AppService } from/' services/api/src/app.module.ts
            sed -i.bak '/import { AppService } from/a import { RtmpController } from '\''./rtmp.controller'\'';' services/api/src/app.module.ts
            sed -i.bak 's/controllers: \[AppController\]/controllers: [AppController, RtmpController]/' services/api/src/app.module.ts
            log_success "Updated app.module.ts"
        fi
    fi
    
    # Check if app.controller.ts exists
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
    
    # Check if app.service.ts exists
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
    
    # Create RTMP controller for stream authentication
    if [ ! -f "services/api/src/rtmp.controller.ts" ]; then
        log_warning "rtmp.controller.ts not found, creating..."
        mkdir -p services/api/src/rtmp
        cat > services/api/src/rtmp.controller.ts << 'EOF'
import { Controller, Post, Body, Res, Get, Param } from '@nestjs/common';
import { Response } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

@Controller('rtmp')
export class RtmpController {
  @Post('publish')
  async onPublish(@Body() body: any, @Res() res: Response) {
    const { name, addr, clientid } = body;
    
    // Accept all stream keys for now
    // You can add authentication logic here
    console.log(`Stream publish: ${name} from ${addr}`);
    
    res.status(200).send('OK');
  }

  @Post('publish_done')
  async onPublishDone(@Body() body: any, @Res() res: Response) {
    const { name, addr, clientid } = body;
    console.log(`Stream publish done: ${name} from ${addr}`);
    res.status(200).send('OK');
  }

  @Post('play')
  async onPlay(@Body() body: any, @Res() res: Response) {
    const { name, addr, clientid } = body;
    console.log(`Stream play: ${name} from ${addr}`);
    res.status(200).send('OK');
  }

  @Post('play_done')
  async onPlayDone(@Body() body: any, @Res() res: Response) {
    const { name, addr, clientid } = body;
    console.log(`Stream play done: ${name} from ${addr}`);
    res.status(200).send('OK');
  }
}

@Controller('hls')
export class HlsController {
  @Get(':streamName')
  async getHlsStream(@Param('streamName') streamName: string, @Res() res: Response) {
    const hlsPath = join('/var/www/html/hls', streamName);
    
    // Check if .m3u8 file exists
    const m3u8File = join(hlsPath, 'index.m3u8');
    if (existsSync(m3u8File)) {
      const content = readFileSync(m3u8File, 'utf8');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(content);
    } else {
      res.status(404).send('Stream not found');
    }
  }

  @Get(':streamName/:segment')
  async getHlsSegment(@Param('streamName') streamName: string, @Param('segment') segment: string, @Res() res: Response) {
    const segmentPath = join('/var/www/html/hls', streamName, segment);
    
    if (existsSync(segmentPath)) {
      const content = readFileSync(segmentPath);
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(content);
    } else {
      res.status(404).send('Segment not found');
    }
  }
}
EOF
        log_success "Created rtmp.controller.ts"
    fi
    
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
    
    # Check if tsconfig.json exists and has correct paths
    if [ -f "services/frontend/tsconfig.json" ]; then
        if ! grep -q '"@/*"' services/frontend/tsconfig.json; then
            log_warning "tsconfig.json missing @/* path mapping"
            log_info "Adding @/* path mapping to tsconfig.json..."
            sed -i.bak 's/"compilerOptions": {/"compilerOptions": {\n    "baseUrl": ".",\n    "paths": {\n      "@\/*": [".\/*"]\n    },/' services/frontend/tsconfig.json
            log_success "Added @/* path mapping"
        fi
    else
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
    
    # Check if hooks directory exists
    if [ ! -d "services/frontend/hooks" ]; then
        log_warning "hooks directory not found, creating..."
        mkdir -p services/frontend/hooks
    fi
    
    # Check if useSocket.ts exists
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
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000', {
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
    
    # Fix webpack build issues
    log_info "Fixing webpack build issues..."
    
    # Create next.config.js if it doesn't exist
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
    
    # Create package-lock.json if missing
    if [ ! -f services/frontend/package-lock.json ]; then
        log_warning "package-lock.json not found, creating one..."
        
        # Check if Node.js is installed
        if ! check_nodejs; then
            log_info "Node.js not found, installing..."
            install_nodejs
        fi
        
        if check_nodejs; then
            cd services/frontend
            npm install --package-lock-only
            cd ../..
            log_success "Created package-lock.json"
        else
            log_warning "npm not available, skipping package-lock.json creation"
        fi
    fi
    
    # Create postcss.config.js if it doesn't exist
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
    
    # Create tailwind.config.js if it doesn't exist
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
    
    # Create VideoPlayer component
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
    
    log_success "Docker build check completed"
    return 0
}


# Install Docker on Ubuntu
install_docker() {
    log_info "Installing Docker on Ubuntu..."
    
    # Check if running on Ubuntu
    if ! command -v apt-get >/dev/null 2>&1; then
        log_error "This script requires Ubuntu with apt package manager"
        exit 1
    fi
    
    # Check if running as root
    if [ "$(id -u)" = "0" ]; then
        SUDO=""
    else
        SUDO="sudo"
    fi
    
    log_info "Removing old Docker installations completely..."
    
    # Stop Docker services
    $SUDO systemctl stop docker 2>/dev/null || true
    $SUDO systemctl stop containerd 2>/dev/null || true
    
    # Remove old Docker packages
    $SUDO apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    $SUDO apt-get purge -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Remove old Docker directories
    $SUDO rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
    
    log_info "Updating package index..."
    $SUDO apt-get update
    
    log_info "Installing prerequisites..."
    $SUDO apt-get install -y ca-certificates curl gnupg lsb-release
    
    log_info "Adding Docker's official GPG key..."
    $SUDO mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    log_info "Setting up Docker repository..."
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    log_info "Updating package index..."
    $SUDO apt-get update
    
    log_info "Installing Docker Engine..."
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    log_info "Verifying Docker Compose plugin..."
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose plugin installed successfully"
    else
        log_warning "Docker Compose plugin not found, trying to install manually..."
        $SUDO apt-get install -y docker-compose-plugin
    fi
    
    log_info "Verifying Docker installation..."
    if docker --version >/dev/null 2>&1; then
        log_success "Docker installed successfully:"
        docker --version
    else
        log_error "Docker installation failed"
        exit 1
    fi
    
    log_info "Verifying Docker Compose installation..."
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose installed successfully:"
        docker compose version
    else
        log_error "Docker Compose installation failed"
        exit 1
    fi
    
    # Create Docker directories
    log_info "Creating Docker directories..."
    $SUDO mkdir -p /var/lib/docker/tmp
    $SUDO mkdir -p /var/lib/docker/containers
    $SUDO mkdir -p /var/lib/docker/volumes
    $SUDO mkdir -p /var/lib/docker/image
    $SUDO mkdir -p /var/lib/docker/overlay2
    
    # Start Docker service
    log_info "Starting Docker service..."
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    
    # Add user to docker group if not root
    if [ "$(id -u)" != "0" ]; then
        log_info "Adding user to docker group..."
        $SUDO usermod -aG docker $USER
        log_warning "Please logout and login again, or run: newgrp docker"
    fi
    
    # Verify installation
    log_info "Verifying Docker installation..."
    if docker info >/dev/null 2>&1; then
        log_success "Docker installed successfully:"
        docker --version
    else
        log_error "Docker installation failed"
        exit 1
    fi
    
    log_info "Verifying Docker Compose installation..."
    if docker compose version >/dev/null 2>&1; then
        log_success "Docker Compose installed successfully:"
        docker compose version
    else
        log_error "Docker Compose installation failed"
        exit 1
    fi
    
    log_success "Docker and Docker Compose installation completed!"
}

# Sync source code to server
sync_code() {
    # Check if we're on Ubuntu server
    if [[ "$HOSTNAME" == *"ubuntu"* ]] || [[ "$USER" == "ubuntu" ]]; then
        log_info "Ubuntu server detected - syncing code..."
        
        # Change to livestream directory
        cd /root/livestream 2>/dev/null || {
            log_error "Cannot access /root/livestream directory"
            exit 1
        }
        
        # Auto-fix missing src directory
        if [ ! -d "services/api/src" ] && [ -d "/home/ubuntu/src" ]; then
            log_info "Moving src/ to correct location..."
            sudo mv /home/ubuntu/src services/api/ && log_success "src/ moved successfully"
        elif [ ! -d "services/api/src" ]; then
            log_error "src/ directory not found. Run 'make sync' first."
            exit 1
        fi
        
        # Check frontend
        [ ! -d "services/frontend/app" ] && log_warning "Frontend app/ missing - may cause build issues"
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
    
    # Start Docker service (if not already running)
    if ! docker info >/dev/null 2>&1; then
        log_info "Starting Docker service..."
        SUDO_CMD=$(get_sudo_cmd)
        if $SUDO_CMD systemctl start docker 2>/dev/null; then
            log_success "Docker service started"
        else
            log_warning "Failed to start Docker service via systemctl"
            # Try alternative method
            $SUDO_CMD dockerd --daemon 2>/dev/null || true
            sleep 3
        fi
    else
        log_info "Docker service is already running"
    fi
    
    # Create .env file if it doesn't exist
    log_info "Creating .env file..."
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            log_success ".env file created from env.example"
        else
            cat > .env << EOF
# LiveStream App Environment Variables
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password@mongodb:27017/livestream?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_WS_URL=ws://localhost:9000
    NEXT_PUBLIC_HLS_URL=http://localhost:8080
    BACKEND_URL=http://api:9000
EOF
            log_success ".env file created with default values"
        fi
    else
        log_info ".env file already exists"
    fi
    
    # Initialize Docker daemon
    log_info "Initializing Docker daemon..."
    $SUDO_CMD systemctl stop docker 2>/dev/null || true
    $SUDO_CMD pkill dockerd 2>/dev/null || true
    $SUDO_CMD rm -f /var/run/docker.pid 2>/dev/null || true
    $SUDO_CMD mkdir -p /var/lib/docker/{tmp,containers,volumes,image,overlay2}
    $SUDO_CMD systemctl start docker
    
    # Wait for Docker to be ready
    log_info "Waiting for Docker to be ready..."
    for i in {1..30}; do
        if docker info >/dev/null 2>&1; then
            log_success "Docker is ready"
            break
        fi
        log_info "Waiting for Docker... $i/30"
        sleep 2
    done
    
    # Fix network issues
    log_info "Fixing network issues..."
    
    # Configure Docker daemon with registry mirrors
    log_info "Configuring Docker daemon with registry mirrors..."
    sudo mkdir -p /etc/docker
    cat << 'EOF' | sudo tee /etc/docker/daemon.json
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
    sudo systemctl restart docker
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
        log_info "🔌 API: http://localhost:9000/"
        log_info "📺 HLS Streaming: http://localhost:8080/hls"
        log_info "📡 RTMP Ingest: rtmp://localhost:1935/live"
        log_info "📊 RTMP Stats: http://localhost:8080/stat"
        log_info "🗄️ MongoDB: mongodb://localhost:27017/livestream"
        log_info "⚡ Redis: redis://localhost:6379"
        log_info ""
        log_info "🔧 Service Access:"
        log_info "  - Frontend: http://localhost:3000 (direct)"
        log_info "  - API: http://localhost:9000/ (direct)"
        log_info "  - WebSocket: ws://localhost:9000/socket.io (direct)"
        log_info "  - HLS: http://localhost:8080/hls/ (via Nginx)"
}

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
    if curl -s http://localhost:9000/health >/dev/null 2>&1; then
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

# Install dependencies (legacy - use setup instead)
install() {
    log_warning "install command is deprecated. Use 'setup' instead."
    setup
}

# Docker service management
docker_service() {
    local action=$1
    local compose_cmd=$(get_compose_cmd)
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file..."
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
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_WS_URL=http://localhost:9000
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
                log_info "Frontend: http://localhost:80"
                log_info "Backend: http://localhost:9000"
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
                    log_info "Frontend: http://localhost:80"
                    log_info "Backend: http://localhost:9000"
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

# Wrapper functions
start() { docker_service start; }
stop() { docker_service stop; }
status() { docker_service status; }
logs() { docker_service logs; }
clean() { docker_service clean; }
build() { docker_service build; }

# Test streaming functionality
test_stream() {
    log_info "Testing streaming functionality..."
    
    # Check if FFmpeg is available
    if ! command -v ffmpeg >/dev/null 2>&1; then
        log_warning "FFmpeg not found. Installing..."
        $(get_sudo_cmd) apt update
        $(get_sudo_cmd) apt install -y ffmpeg
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
    log_info "Use './scripts/test-stream.sh pattern' to start a longer test"
}

# Reset everything (keep SSH and code) - Ubuntu only
reset_all() {
    log_warning "WARNING: This will DELETE EVERYTHING except SSH and source code!"
    log_warning "This includes: Docker, databases, logs, caches, and all data!"
    echo ""
    read -p "Are you absolutely sure you want to continue? Type 'YES' to confirm: " confirm
    if [ "$confirm" != "YES" ]; then
        log_info "Operation cancelled."
        exit 1
    fi
    
    log_info "Starting complete system reset..."
    
    # Check if running on Ubuntu
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "This command is only supported on Ubuntu"
        exit 1
    fi
    
    OS="ubuntu"
    if [ "$(id -u)" = "0" ]; then
        SUDO=""
    else
        SUDO="sudo"
    fi
    
    log_info "Detected OS: $OS"
    
    # Stop all services
    log_info "Stopping all services..."
    $SUDO systemctl stop docker mongodb redis nginx 2>/dev/null || true
    
    # Remove Docker completely
    log_info "Removing Docker completely..."
    if command -v docker >/dev/null 2>&1; then
        # Stop all containers
        docker stop $(docker ps -aq) 2>/dev/null || true
        docker rm $(docker ps -aq) 2>/dev/null || true
        
        # Remove all images, volumes, networks
        docker rmi $(docker images -aq) 2>/dev/null || true
        docker volume rm $(docker volume ls -q) 2>/dev/null || true
        docker network rm $(docker network ls -q) 2>/dev/null || true
        
        # Ubuntu: Remove Docker packages
        $SUDO apt-get remove -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
        $SUDO apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker.io docker-compose 2>/dev/null || true
        
        # Remove Docker directories
        $SUDO rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/apt/sources.list.d/docker.list /etc/apt/keyrings/docker.gpg 2>/dev/null || true
        
        log_success "Docker completely removed"
    fi
    
    # Remove Node.js and npm
    log_info "Removing Node.js and npm..."
    # Ubuntu: Remove Node.js via apt
    $SUDO apt-get remove -y nodejs npm 2>/dev/null || true
    $SUDO apt-get purge -y nodejs npm 2>/dev/null || true
    $SUDO rm -rf /usr/local/bin/npm /usr/local/bin/node /usr/local/lib/node_modules /usr/local/include/node 2>/dev/null || true
    $SUDO rm -rf ~/.npm ~/.node-gyp 2>/dev/null || true
    log_success "Node.js and npm removed"
    
    # Remove MongoDB
    log_info "Removing MongoDB..."
    # Ubuntu: Remove MongoDB via apt
    $SUDO systemctl stop mongod 2>/dev/null || true
    $SUDO apt-get remove -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
    $SUDO apt-get purge -y mongodb-org mongodb-org-server mongodb-org-mongos mongodb-org-tools 2>/dev/null || true
    $SUDO rm -rf /var/lib/mongodb /var/log/mongodb /etc/mongod.conf 2>/dev/null || true
    log_success "MongoDB removed"
    
    # Remove Redis
    log_info "Removing Redis..."
    # Ubuntu: Remove Redis via apt
    $SUDO systemctl stop redis 2>/dev/null || true
    $SUDO apt-get remove -y redis-server redis-tools 2>/dev/null || true
    $SUDO apt-get purge -y redis-server redis-tools 2>/dev/null || true
    $SUDO rm -rf /var/lib/redis /var/log/redis /etc/redis 2>/dev/null || true
    log_success "Redis removed"
    
    # Remove Nginx
    log_info "Removing Nginx..."
    # Ubuntu: Remove Nginx via apt
    $SUDO systemctl stop nginx 2>/dev/null || true
    $SUDO apt-get remove -y nginx nginx-common nginx-core 2>/dev/null || true
    $SUDO apt-get purge -y nginx nginx-common nginx-core 2>/dev/null || true
    $SUDO rm -rf /var/www/html /etc/nginx /var/log/nginx 2>/dev/null || true
    log_success "Nginx removed"
    
    # Remove all project data
    log_info "Removing all project data..."
    rm -rf data/ hls/ logs/ tmp/ .env 2>/dev/null || true
    log_success "Project data removed"
    
    # Remove all build artifacts
    log_info "Removing all build artifacts..."
    rm -rf services/api/node_modules/ services/api/dist/ services/frontend/node_modules/ services/frontend/.next/ services/frontend/out/ services/frontend/build/ 2>/dev/null || true
    log_success "Build artifacts removed"
    
    # Remove all caches
    log_info "Removing all caches..."
    # Ubuntu: Remove caches
    $SUDO rm -rf /var/cache/apt/archives/* /var/cache/apt/lists/* /tmp/* /var/tmp/* ~/.cache 2>/dev/null || true
    log_success "Caches removed"
    
    # Remove all logs
    log_info "Removing all logs..."
    # Ubuntu: Remove logs
    $SUDO rm -rf /var/log/*.log /var/log/*.old /var/log/*.gz 2>/dev/null || true
    find . -name "*.log" -type f -delete 2>/dev/null || true
    log_success "Logs removed"
    
    # Clean up temporary files
    log_info "Cleaning up temporary files..."
    find . -name "*.tmp" -o -name ".DS_Store" -o -name "Thumbs.db" -o -name "*.swp" -o -name "*.swo" -o -name "*~" -type f -delete 2>/dev/null || true
    log_success "Temporary files removed"
    
    # Reset file permissions
    log_info "Resetting file permissions..."
    chmod +x scripts/*.sh 2>/dev/null || true
    chmod 644 *.md *.yml *.json 2>/dev/null || true
    log_success "File permissions reset"
    
    # Clean up package manager
    log_info "Cleaning up package manager..."
    # Ubuntu: Clean up apt
    $SUDO apt-get autoremove -y 2>/dev/null || true
    $SUDO apt-get autoclean 2>/dev/null || true
    log_success "Package manager cleaned"
    
    # Show what was preserved
    log_info "The following were preserved:"
    echo "  - Source code files"
    echo "  - Configuration files"
    echo "  - Environment template"
    echo "  - Documentation files"
    echo "  - SSH configuration and keys"
    echo "  - Git repository and history"
    echo "  - Makefile and scripts"
    echo "  - Project structure"
    
    # Show what was removed
    log_warning "The following were completely removed:"
    echo "  - Docker and all containers/images/volumes"
    echo "  - Node.js and npm"
    echo "  - MongoDB and all data"
    echo "  - Redis and all data"
    echo "  - Nginx and all configs"
    echo "  - All project data and logs"
    echo "  - All build artifacts and caches"
    echo "  - All temporary files"
    
    # Show next steps
    log_success "Complete system reset finished!"
    echo ""
    log_info "Next steps:"
    echo "  1. Run 'make install' to reinstall everything"
    echo "  2. Run 'make start' to start services"
    echo "  3. Or run 'make setup' for quick setup"
    echo ""
    log_info "Your SSH configuration and source code are intact."
    log_warning "You will need to reconfigure everything from scratch."
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

# Main function
main() {
    case "$1" in
        install) install ;;
        setup) setup ;;
        start) start ;;
        stop) stop ;;
        status) status ;;
        logs) logs ;;
        clean) clean ;;
        build) build ;;
        test) test_services ;;
        test-stream) test_stream ;;
        reset-all) reset_all ;;
        sync) sync_to_server ;;
        *) 
            echo "Usage: $0 {install|setup|start|stop|status|logs|clean|build|test|test-stream|reset-all|sync}"
            exit 1
            ;;
    esac
}

main "$@"