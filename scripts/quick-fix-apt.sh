#!/bin/bash

# Quick APT HTTPS Fix - Simple and Direct Approach
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Quick APT HTTPS Fix"
echo "====================="

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

log_info "Step 1: Killing all APT processes..."
pkill -9 -f apt 2>/dev/null || true
pkill -9 -f dpkg 2>/dev/null || true
sleep 3

log_info "Step 2: Removing lock files..."
rm -f /var/lib/dpkg/lock* 2>/dev/null || true
rm -f /var/cache/apt/archives/lock* 2>/dev/null || true
rm -f /var/lib/apt/lists/lock* 2>/dev/null || true
rm -f /var/lib/apt/lists/partial/* 2>/dev/null || true

log_info "Step 3: Cleaning APT cache..."
apt clean 2>/dev/null || true
rm -rf /var/lib/apt/lists/* 2>/dev/null || true
mkdir -p /var/lib/apt/lists/partial

log_info "Step 4: Fixing broken packages..."
dpkg --configure -a 2>/dev/null || true
apt --fix-broken install -y 2>/dev/null || true

log_info "Step 5: Installing HTTPS transport..."
apt install --reinstall -y apt-transport-https ca-certificates gnupg 2>/dev/null || true

log_info "Step 6: Updating certificates..."
update-ca-certificates --fresh 2>/dev/null || true

log_info "Step 7: Testing APT update..."
if timeout 30 apt update 2>/dev/null; then
    log_success "✅ APT update successful!"
    exit 0
fi

log_warning "Standard update failed, trying HTTP method..."

log_info "Step 8: Switching to HTTP temporarily..."
# Backup sources
cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Switch to HTTP
sed -i 's/https:/http:/g' /etc/apt/sources.list 2>/dev/null || true

log_info "Step 9: Testing HTTP update..."
if timeout 30 apt update 2>/dev/null; then
    log_success "✅ APT working with HTTP method!"
    log_info "Installing essential packages..."
    apt install -y openssh-server curl wget 2>/dev/null || true
    log_success "🎉 APT is now functional!"
else
    log_error "❌ APT still not working"
    log_info "Restoring HTTPS sources..."
    sed -i 's/http:/https:/g' /etc/apt/sources.list 2>/dev/null || true
    exit 1
fi
