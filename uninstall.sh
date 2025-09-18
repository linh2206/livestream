#!/bin/bash

# 🎬 LiveStream App - Complete Uninstall Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for active streaming processes
check_streaming_processes() {
    log_info "Checking for active streaming processes..."
    
    # Check for FFmpeg processes
    ffmpeg_processes=$(pgrep -f "ffmpeg" 2>/dev/null || true)
    if [[ -n "$ffmpeg_processes" ]]; then
        log_warning "Found active FFmpeg processes:"
        ps -p $ffmpeg_processes -o pid,cmd 2>/dev/null || true
        echo ""
    fi
    
    # Check for OBS processes
    obs_processes=$(pgrep -f "obs" 2>/dev/null || true)
    if [[ -n "$obs_processes" ]]; then
        log_warning "Found active OBS processes:"
        ps -p $obs_processes -o pid,cmd 2>/dev/null || true
        echo ""
    fi
    
    # Check for processes using streaming ports
    for port in 8080 1935 3000 5432 6379; do
        port_processes=$(lsof -ti:$port 2>/dev/null || true)
        if [[ -n "$port_processes" ]]; then
            log_warning "Found processes using port $port:"
            ps -p $port_processes -o pid,cmd 2>/dev/null || true
            echo ""
        fi
    done
}

# Confirmation prompt
confirm_uninstall() {
    echo "🗑️  LiveStream App - Ultra Clean Uninstall"
    echo "=========================================="
    echo ""
    
    # Check for active streaming processes first
    check_streaming_processes
    
    log_warning "This will ULTRA CLEAN remove LiveStream App and ALL related components:"
    echo ""
    echo "  • Kill ALL livestream/stream processes"
    echo "  • Remove ALL Docker containers, images, volumes, networks"
    echo "  • Remove ALL systemd services"
    echo "  • Remove ALL firewall rules"
    echo "  • Remove ALL logs and temporary files"
    echo "  • Remove project files and directories"
    echo "  • Remove system packages (optional)"
    echo ""
    echo "✅ ONLY PROTECTED:"
    echo "  • SSH connection (port 22)"
    echo ""
    log_error "⚠️  WARNING: This will ULTRA CLEAN everything except SSH!"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Uninstall cancelled."
        exit 0
    fi
}

# Stop and remove Docker containers
remove_docker_containers() {
    log_info "Stopping and removing Docker containers..."
    
    cd "$PROJECT_ROOT"
    
    # Try docker-compose first, then docker compose
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        log_warning "Docker Compose not found, skipping container removal"
        return
    fi
    
    # Stop ALL containers (not just livestream)
    docker stop $(docker ps -aq) 2>/dev/null || true
    
    # Remove ALL containers
    docker rm -f $(docker ps -aq) 2>/dev/null || true
    
    # Remove ALL images
    docker rmi -f $(docker images -q) 2>/dev/null || true
    
    # Remove ALL volumes
    docker volume rm -f $(docker volume ls -q) 2>/dev/null || true
    
    # Remove ALL networks (except default)
    docker network ls --format "{{.Name}}" | grep -v -E "^(bridge|host|none)$" | xargs -r docker network rm 2>/dev/null || true
    
    # Clean up Docker system completely
    docker system prune -a -f --volumes 2>/dev/null || true
    
    log_success "Docker completely removed (ultra clean)"
}

# Remove system configurations (Linux only - ultra clean)
remove_system_configs() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_info "Removing system configurations (ultra clean)..."
        
        # Stop and disable ALL livestream related services
        for service in livestream-app livestream livestream-backend livestream-nginx livestream-postgres livestream-redis livestream-websocket; do
            sudo systemctl stop "$service" 2>/dev/null || true
            sudo systemctl disable "$service" 2>/dev/null || true
            sudo rm -f "/etc/systemd/system/${service}.service" 2>/dev/null || true
            sudo rm -f "/lib/systemd/system/${service}.service" 2>/dev/null || true
            sudo rm -f "/usr/lib/systemd/system/${service}.service" 2>/dev/null || true
        done
        
        # Remove ALL firewall rules (protect SSH port 22)
        sudo ufw delete allow 8080 2>/dev/null || true
        sudo ufw delete allow 1935 2>/dev/null || true
        sudo ufw delete allow 3000 2>/dev/null || true
        sudo ufw delete allow 5432 2>/dev/null || true
        sudo ufw delete allow 6379 2>/dev/null || true
        
        # iptables rules - remove ALL livestream related ports (protect SSH port 22)
        sudo iptables -D INPUT -p tcp --dport 8080 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 1935 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 5432 -j ACCEPT 2>/dev/null || true
        sudo iptables -D INPUT -p tcp --dport 6379 -j ACCEPT 2>/dev/null || true
        
        # Reload systemd
        sudo systemctl daemon-reload 2>/dev/null || true
        sudo systemctl reset-failed 2>/dev/null || true
        
        log_success "System configurations removed (ultra clean)"
    else
        log_info "Skipping system configurations (not Linux)"
    fi
}

# Kill all processes (ultra clean - only protect SSH)
kill_all_processes() {
    log_info "Killing all processes (ultra clean - only protecting SSH)..."
    
    # Kill ALL livestream related processes
    pkill -f "livestream" 2>/dev/null || true
    pkill -f "stream" 2>/dev/null || true
    pkill -f "nginx.*livestream" 2>/dev/null || true
    pkill -f "node.*livestream" 2>/dev/null || true
    pkill -f "ffmpeg.*livestream" 2>/dev/null || true
    pkill -f "ffmpeg.*stream" 2>/dev/null || true
    
    # Kill processes by port (all livestream ports, only protect SSH port 22)
    for port in 8080 1935 3000 5432 6379; do
        if command -v lsof >/dev/null 2>&1; then
            processes=$(lsof -ti:$port 2>/dev/null || true)
            if [[ -n "$processes" ]]; then
                for pid in $processes; do
                    # Only protect SSH processes
                    cmd=$(ps -p $pid -o cmd= 2>/dev/null || true)
                    if ! echo "$cmd" | grep -q -i "ssh\|sshd"; then
                        kill -9 $pid 2>/dev/null || true
                    fi
                done
            fi
        fi
    done
    
    # PROTECT ONLY SSH port 22
    log_info "Protecting ONLY SSH port 22..."
    
    # Wait for processes to terminate
    sleep 2
    
    log_success "All processes killed (only SSH protected)"
}

# Remove project files
remove_project_files() {
    log_info "Removing project files..."
    
    # Remove the entire project directory
    cd "$(dirname "$PROJECT_ROOT")"
    rm -rf "$(basename "$PROJECT_ROOT")"
    
    log_success "Project files removed"
}

# Clean up logs and temporary files (ultra clean)
cleanup_logs_and_temp() {
    log_info "Cleaning up logs and temporary files (ultra clean)..."
    
    # Remove ALL livestream related log files
    sudo rm -rf /var/log/livestream* 2>/dev/null || true
    sudo rm -rf /var/log/stream* 2>/dev/null || true
    
    # Remove ALL livestream related temporary files
    sudo rm -rf /tmp/livestream* 2>/dev/null || true
    sudo rm -rf /tmp/stream* 2>/dev/null || true
    sudo rm -rf /tmp/hls* 2>/dev/null || true
    
    # Remove ALL livestream related cache files
    sudo rm -rf /var/cache/livestream* 2>/dev/null || true
    sudo rm -rf /var/cache/stream* 2>/dev/null || true
    
    # Clean up journal logs completely
    sudo journalctl --vacuum-time=1d 2>/dev/null || true
    
    # Remove any remaining livestream directories
    sudo rm -rf /opt/livestream* 2>/dev/null || true
    sudo rm -rf /usr/local/bin/livestream* 2>/dev/null || true
    
    log_success "All logs and temporary files cleaned (ultra clean)"
}

# Clean up system packages (optional - ultra clean)
cleanup_packages() {
    log_info "Cleaning up system packages (ultra clean)..."
    
    # Remove Docker packages
    sudo apt-get remove -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
    sudo apt-get remove -y docker-compose 2>/dev/null || true
    
    # Remove FFmpeg
    sudo apt-get remove -y ffmpeg 2>/dev/null || true
    
    # Clean up package cache
    sudo apt-get autoremove -y 2>/dev/null || true
    sudo apt-get autoclean 2>/dev/null || true
    
    log_success "System packages cleaned (ultra clean)"
}

# Main uninstall function
main() {
    confirm_uninstall
    
    kill_all_processes
    remove_docker_containers
    remove_system_configs
    remove_project_files
    cleanup_logs_and_temp
    
    echo ""
    read -p "Remove system packages (Docker, FFmpeg)? (y/n): " remove_packages
    if [[ "$remove_packages" == "y" || "$remove_packages" == "Y" ]]; then
        cleanup_packages
    fi
    
    echo ""
    log_success "🎬 LiveStream App ULTRA CLEAN removed!"
    echo ""
    echo "📋 What was removed:"
    echo "  • ALL livestream/stream processes"
    echo "  • ALL Docker containers, images, volumes, networks"
    echo "  • ALL systemd services"
    echo "  • ALL firewall rules"
    echo "  • ALL logs and temporary files"
    echo "  • Project files and directories"
    echo "  • System packages (if selected)"
    echo ""
    echo "✅ ONLY PROTECTED:"
    echo "  • SSH connection (port 22)"
    echo ""
    echo "🔄 Server is now ULTRA CLEAN - ready for fresh installation!"
    echo ""
}

# Run main function
main "$@"
