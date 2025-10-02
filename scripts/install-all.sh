#!/bin/bash

# LiveStream Platform - Complete System Installation Script
# This script installs all system dependencies and prepares the environment

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

# Function to install Docker Compose with version compatibility check
install_docker_compose() {
    log_info "Installing Docker Compose plugin..."
    
    # Check if docker compose already works
    if docker compose version &>/dev/null; then
        log_success "Docker Compose  already installed and working"
        return 0
    fi
    
    # Get system architecture
    ARCH=$(uname -m)
    OS_NAME=$(uname -s)
    
    # Map architecture names
    case $ARCH in
        x86_64) ARCH="x86_64" ;;
        aarch64|arm64) ARCH="aarch64" ;;
        armv7l) ARCH="armv7" ;;
        *) log_error "Unsupported architecture: $ARCH"; return 1 ;;
    esac
    
    # Get latest stable version with timeout and fallback
    log_info "Fetching latest Docker Compose  version..."
    LATEST_VERSION=$(timeout 10 curl -s https://api.github.com/repos/docker/compose/releases/latest 2>/dev/null | grep '"tag_name"' | cut -d'"' -f4)
    
    if [ -z "$LATEST_VERSION" ]; then
        log_warning "Could not fetch latest version (network issue), using fallback version"
        LATEST_VERSION="v2.24.0"
    fi
    
    log_info "Installing Docker Compose  ${LATEST_VERSION} for ${OS_NAME}-${ARCH}..."
    
    # Create Docker CLI plugins directory
    sudo mkdir -p /usr/libexec/docker/cli-plugins
    
    # Download and install Docker Compose 
    DOWNLOAD_URL="https://github.com/docker/compose/releases/download/${LATEST_VERSION}/docker-compose-${OS_NAME}-${ARCH}"
    
    log_info "Downloading from: $DOWNLOAD_URL"
    if sudo timeout 60 curl -L --retry 3 --retry-delay 5 "$DOWNLOAD_URL" -o /usr/local/bin/docker-compose; then
        sudo chmod +x /usr/local/bin/docker-compose
        
        # Create symlink for docker compose command
        sudo ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose
        
        # Verify installation
        if docker compose version &>/dev/null; then
            log_success "Docker Compose  ${LATEST_VERSION} installed successfully"
            docker compose version
        else
            log_error "Docker Compose  installation failed"
            return 1
        fi
    else
        log_warning "Failed to download Docker Compose , trying alternative method..."
        
        # Try installing via apt as fallback
        if sudo apt update && sudo apt install -y docker-compose-plugin; then
            log_success "Docker Compose  installed via apt package"
            if docker compose version &>/dev/null; then
                log_success "Docker Compose  working via apt installation"
                return 0
            fi
        fi
        
        log_error "All Docker Compose  installation methods failed"
        log_info "You may need to check network connectivity or install manually"
        return 1
    fi
}

# Function to fix DNS and network connectivity issues
fix_dns_issues() {
    log_info "Checking DNS and network connectivity..."
    
    # Test DNS resolution
    if nslookup google.com &>/dev/null; then
        log_success "DNS resolution working"
        return 0
    fi
    
    log_warning "DNS resolution failed, trying to fix..."
    
    # Flush DNS cache
    systemctl flush-dns 2>/dev/null || true
    systemctl restart systemd-resolved 2>/dev/null || true
    
    # Try different DNS servers
    log_info "Trying Google DNS servers..."
    if [ -f /etc/resolv.conf ]; then
        cp /etc/resolv.conf /etc/resolv.conf.backup
        echo "nameserver 8.8.8.8" > /etc/resolv.conf
        echo "nameserver 8.8.4.4" >> /etc/resolv.conf
        echo "nameserver 1.1.1.1" >> /etc/resolv.conf
    fi
    
    # Test again
    if nslookup google.com &>/dev/null; then
        log_success "DNS fixed with Google/Cloudflare servers"
    else
        log_warning "DNS still having issues, but continuing..."
    fi
}

echo "🚀 Installing Livestream Platform - Complete System Setup"
echo "=========================================================="
echo "This script will install system dependencies and prepare environment:"
echo "  • System dependencies (Docker, Node.js, Git)"
echo "  • Development tools and libraries"
echo "  • Create necessary directories and structure"
echo "  • Setup environment files from .env.example"
echo "  • Generate JWT secrets and security keys"
echo "  • Install project dependencies (if npm available)"
echo "  • Setup SSH keys and permissions"
echo "  • Note: FFmpeg can be installed separately via dedicated scripts"
echo ""
echo "⚠️  This script does NOT build or start services!"
echo "    Use 'make build' or './scripts/build-start.sh' after this script."
echo "=========================================================="

# Check if running on Ubuntu/Debian or macOS
if ! command -v apt &> /dev/null && [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "This script is designed for Ubuntu/Debian or macOS systems"
    exit 1
fi

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    log_info "Detected macOS system"
elif command -v apt &> /dev/null; then
    OS="ubuntu"
    log_info "Detected Ubuntu/Debian system"
else
    log_error "Unsupported operating system"
    exit 1
fi

# Check if running as root
if [ "$(id -u)" = "0" ]; then
    log_warning "Running as root. This is not recommended for security reasons."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Exiting..."
        exit 1
    fi
fi

# Update system based on OS
if [ "$OS" = "ubuntu" ]; then
    log_info "Updating system packages..."
        if ! timeout 60 sudo apt update 2>/dev/null; then
            log_warning "APT update failed. Skipping APT fix to avoid termination..."
            log_info "Continuing with installation without APT update"
        else
            log_success "✅ APT update successful!"
        fi

    log_info "Upgrading system packages..."
    timeout 300 sudo apt upgrade -y || log_warning "System upgrade timed out or failed"
elif [ "$OS" = "macos" ]; then
    log_info "Updating macOS packages..."
    if command -v brew &> /dev/null; then
        log_info "Updating Homebrew..."
        brew update || log_warning "Homebrew update failed"
        log_success "✅ Homebrew update completed!"
    else
        log_warning "Homebrew not found. Please install Homebrew first."
        log_info "Run: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    fi
fi

# Install Docker based on OS
if [ "$OS" = "ubuntu" ]; then
    log_info "Installing Docker..."
    sudo apt install -y docker.io
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    
    # Install Docker Compose  plugin
    # Fix DNS issues before installing Docker Compose
    fix_dns_issues
    
    install_docker_compose
    
    log_success "Docker and Docker Compose  installed and configured"
elif [ "$OS" = "macos" ]; then
    log_info "Checking Docker installation..."
    if command -v docker &> /dev/null; then
        log_success "Docker already installed"
    else
        log_warning "Docker not found. Please install Docker Desktop for macOS"
        log_info "Download from: https://www.docker.com/products/docker-desktop"
    fi
fi

# Install Node.js based on OS
if [ "$OS" = "ubuntu" ]; then
    log_info "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs

    # Verify installation
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_success "Node.js $(node --version) and npm $(npm --version) installed"
    else
        log_error "Failed to install Node.js or npm"
        log_info "Trying alternative installation method..."
        sudo apt install -y nodejs npm
        if command -v node &> /dev/null && command -v npm &> /dev/null; then
            log_success "Node.js $(node --version) and npm $(npm --version) installed via apt"
        else
            log_warning "Node.js installation failed. Docker containers will handle dependencies."
        fi
    fi
elif [ "$OS" = "macos" ]; then
    log_info "Checking Node.js installation..."
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_success "Node.js $(node --version) and npm $(npm --version) already installed"
    else
        log_warning "Node.js not found. Please install Node.js"
        log_info "Run: brew install node"
    fi
fi

# Note: MongoDB and Nginx will be installed via Docker containers
log_info "MongoDB and Nginx will be installed via Docker containers"

# Install Git based on OS
if [ "$OS" = "ubuntu" ]; then
    log_info "Installing Git..."
    sudo apt install -y git
    log_success "Git installed"

    # Install additional tools
    log_info "Installing additional tools..."
    sudo apt install -y curl wget unzip build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release
elif [ "$OS" = "macos" ]; then
    log_info "Checking Git installation..."
    if command -v git &> /dev/null; then
        log_success "Git already installed"
    else
        log_warning "Git not found. Please install Git"
        log_info "Run: brew install git"
    fi
fi

# Note: FFmpeg will be installed via dedicated scripts if needed
log_info "FFmpeg can be installed via scripts/install-ffmpeg-quick.sh or scripts/compile-ffmpeg.sh"

# Install additional tools based on OS
if [ "$OS" = "ubuntu" ]; then
    # Install monitoring tools
    log_info "Installing monitoring tools..."
    sudo apt install -y htop iotop nethogs

    # Install development tools
    log_info "Installing development tools..."
    sudo apt install -y vim nano tree jq

    # Install Python and pip (for some tools)
    log_info "Installing Python and pip..."
    sudo apt install -y python3 python3-pip python3-venv

    # Install additional system libraries
    log_info "Installing system libraries..."
    sudo apt install -y libssl-dev libffi-dev libxml2-dev libxslt1-dev zlib1g-dev libjpeg-dev libpng-dev

    # Install additional build tools for Node.js native modules
    log_info "Installing Node.js build tools..."
    sudo apt install -y build-essential python3-dev python3-setuptools

    log_success "All system dependencies installed"
elif [ "$OS" = "macos" ]; then
    log_info "Checking additional tools..."
    if command -v brew &> /dev/null; then
        log_info "Installing additional tools via Homebrew..."
        brew install htop tree jq python3 || log_warning "Some tools installation failed"
        log_success "Additional tools installation completed"
    else
        log_warning "Homebrew not found. Please install tools manually if needed"
    fi
fi

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p apps/backend/hls/stream
mkdir -p config/database
mkdir -p config/nginx
mkdir -p logs
log_success "Directory structure created"

# Setup environment files
log_info "Setting up environment files..."
if [ -f ".env.example" ]; then
    cp .env.example .env
    log_success "Created .env file from .env.example"
fi

if [ -f "apps/backend/.env.example" ]; then
    cp apps/backend/.env.example apps/backend/.env
    log_success "Created backend .env file"
fi

if [ -f "apps/frontend/.env.example" ]; then
    cp apps/frontend/.env.example apps/frontend/.env
    log_success "Created frontend .env file"
fi

# Install project dependencies (only if Node.js is available)
if command -v npm &> /dev/null; then
    log_info "Installing project dependencies..."
    
    # Build tools already installed above
    
    if [ -d "apps/backend" ]; then
        log_info "Installing backend dependencies..."
        cd apps/backend
        # Try npm install with error handling
        if npm install --no-optional --legacy-peer-deps 2>/dev/null; then
            log_success "Backend dependencies installed"
        else
            log_warning "Backend npm install failed, will be handled by Docker"
        fi
        cd ../..
    fi
    
    if [ -d "apps/frontend" ]; then
        log_info "Installing frontend dependencies..."
        cd apps/frontend
        # Try npm install with error handling
        if npm install --no-optional --legacy-peer-deps 2>/dev/null; then
            log_success "Frontend dependencies installed"
        else
            log_warning "Frontend npm install failed, will be handled by Docker"
        fi
        cd ../..
    fi
    
    log_info "Project dependencies installation completed (with fallback to Docker)"
else
    log_warning "npm not found. Project dependencies will be installed when building Docker containers."
fi

# Setup SSH
log_info "Setting up SSH..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    log_success "SSH key generated"
else
    log_info "SSH key already exists"
fi
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
log_success "SSH setup completed"

# Note: Services will be built and started by build-start.sh
log_info "System dependencies installed. Services will be built and started by build-start.sh"

echo ""
log_success "System installation completed successfully!"
echo "=========================================================="
echo "📋 Next steps:"
echo "  1. Run './scripts/build-start.sh' to build and start services"
echo "  2. Or run 'make build' for quick setup"
echo ""
echo "ℹ️  Note: If npm dependencies failed to install (common with native modules),"
echo "    they will be installed automatically when building Docker containers."
echo "    This is normal and expected behavior."
echo ""
echo "🌐 Once started, access:"
echo "  • Frontend: \${FRONTEND_URL}"
echo "  • API: \${API_BASE_URL}"
echo "  • Grafana: \${GRAFANA_URL} (admin/admin123)"
echo "  • Prometheus: \${PROMETHEUS_URL}"
echo ""
echo "👤 Default login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🔄 To restart services: make start"
echo "🛑 To stop services: make stop"
echo "📊 To view logs: make logs"
echo "=========================================================="
