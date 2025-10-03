#!/bin/bash

# Quick APT Issues Checker
# Identifies common problems that affect APT HTTPS

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

echo "🔍 APT Issues Quick Checker"
echo "=========================="

# Check OS
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    log_error "This script is for Ubuntu/Linux systems only"
    log_info "Detected: $OSTYPE"
    exit 1
fi

log_success "✅ Running on Ubuntu/Linux system"

# Check if APT is available
if ! command -v apt &> /dev/null; then
    log_error "❌ APT command not found"
    exit 1
fi
log_success "✅ APT command available"

# Check running processes
echo ""
log_info "📋 Checking APT processes..."
if pgrep -f apt > /dev/null; then
    log_warning "⚠️  APT processes are running:"
    ps aux | grep apt | grep -v grep | head -5
    echo "💡 These processes may cause lock issues"
else
    log_success "✅ No APT processes running"
fi

# Check lock files
echo ""
log_info "📋 Checking lock files..."
LOCK_FILES=(
    "/var/lib/dpkg/lock"
    "/var/lib/dpkg/lock-frontend"
    "/var/cache/apt/archives/lock"
    "/var/lib/apt/lists/lock"
)

LOCKS_FOUND=0
for lock in "${LOCK_FILES[@]}"; do
    if [ -f "$lock" ]; then
        log_warning "⚠️  Lock file found: $lock"
        LOCKS_FOUND=1
    fi
done

if [ $LOCKS_FOUND -eq 0 ]; then
    log_success "✅ No lock files found"
fi

# Check network connectivity
echo ""
log_info "📋 Checking network connectivity..."
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    log_success "✅ Internet connectivity OK"
else
    log_error "❌ No internet connectivity"
fi

if ping -c 1 archive.ubuntu.com > /dev/null 2>&1; then
    log_success "✅ Can reach archive.ubuntu.com"
else
    log_warning "⚠️  Cannot reach archive.ubuntu.com"
fi

# Check DNS resolution
echo ""
log_info "📋 Checking DNS resolution..."
if nslookup archive.ubuntu.com > /dev/null 2>&1; then
    log_success "✅ DNS resolution working"
else
    log_warning "⚠️  DNS resolution issues"
    log_info "Current DNS servers:"
    cat /etc/resolv.conf 2>/dev/null | grep nameserver || echo "No nameservers found"
fi

# Check HTTPS connectivity
echo ""
log_info "📋 Checking HTTPS connectivity..."
if curl -s --connect-timeout 10 https://archive.ubuntu.com > /dev/null 2>&1; then
    log_success "✅ HTTPS connectivity OK"
else
    log_warning "⚠️  HTTPS connectivity issues"
fi

# Check certificates
echo ""
log_info "📋 Checking certificates..."
if [ -d "/etc/ssl/certs" ] && [ -f "/etc/ssl/certs/ca-certificates.crt" ]; then
    log_success "✅ Certificate store exists"
else
    log_warning "⚠️  Certificate store issues"
fi

# Check APT transport HTTPS
echo ""
log_info "📋 Checking APT HTTPS transport..."
if dpkg -l | grep -q apt-transport-https; then
    log_success "✅ apt-transport-https installed"
else
    log_warning "⚠️  apt-transport-https not installed"
fi

# Check sources.list
echo ""
log_info "📋 Checking sources.list..."
if [ -f "/etc/apt/sources.list" ]; then
    log_success "✅ sources.list exists"
    
    # Check for HTTPS sources
    if grep -q "https://" /etc/apt/sources.list; then
        log_info "✅ HTTPS sources found in sources.list"
    else
        log_info "ℹ️  No HTTPS sources found (using HTTP)"
    fi
    
    # Check for broken sources
    if grep -q "deb.*archive.ubuntu.com" /etc/apt/sources.list; then
        log_success "✅ Valid Ubuntu archive sources found"
    else
        log_warning "⚠️  No valid Ubuntu archive sources found"
    fi
else
    log_warning "⚠️  sources.list not found"
fi

# Check GPG keys
echo ""
log_info "📋 Checking GPG keys..."
if apt-key list 2>/dev/null | grep -q "3B4FE6ACC0B21F32"; then
    log_success "✅ Ubuntu archive GPG key found"
else
    log_warning "⚠️  Ubuntu archive GPG key missing"
fi

# Test APT update (dry run)
echo ""
log_info "📋 Testing APT update (dry run)..."
if apt update --dry-run 2>/dev/null; then
    log_success "✅ APT update dry run successful"
else
    log_error "❌ APT update dry run failed"
    echo ""
    log_info "Error details:"
    apt update --dry-run 2>&1 | head -10
fi

# Summary and recommendations
echo ""
echo "📋 SUMMARY AND RECOMMENDATIONS:"
echo "================================"

if pgrep -f apt > /dev/null || [ $LOCKS_FOUND -eq 1 ]; then
    echo "🔧 Run: sudo make fix-apt (to fix process/lock issues)"
fi

if ! curl -s --connect-timeout 10 https://archive.ubuntu.com > /dev/null 2>&1; then
    echo "🌐 HTTPS connectivity issues detected"
    echo "   • Check firewall settings"
    echo "   • Check proxy configuration"
    echo "   • Try different DNS servers"
fi

if ! nslookup archive.ubuntu.com > /dev/null 2>&1; then
    echo "🔍 DNS resolution issues detected"
    echo "   • Try: echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf"
fi

if ! dpkg -l | grep -q apt-transport-https; then
    echo "📦 Missing HTTPS transport"
    echo "   • Run: sudo apt install apt-transport-https"
fi

if ! apt update --dry-run 2>/dev/null; then
    echo "⚠️  APT update failing"
    echo "   • Run: sudo make fix-apt (comprehensive fix)"
fi

echo ""
echo "🚀 Quick fixes available:"
echo "   • make fix-apt     - Fix APT issues"
echo "   • make fix-docker  - Fix Docker issues"
echo "   • make fix-all     - Fix both APT and Docker"
echo ""
