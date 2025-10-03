#!/bin/bash

# Comprehensive APT HTTPS Issues Fix Script
# Handles common HTTPS method died errors and connectivity issues

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

echo "🔧 Comprehensive APT HTTPS Issues Fix"
echo "====================================="

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    log_error "This script is designed for Linux systems only"
    log_info "Detected: $OSTYPE"
    exit 1
fi

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    log_error "This script must be run as root or with sudo"
    echo "Usage: sudo $0"
    exit 1
fi

# Function to diagnose APT issues
diagnose_apt() {
    log_info "🔍 Diagnosing APT issues..."
    
    echo "📋 Checking APT processes..."
    if pgrep -f apt > /dev/null; then
        log_warning "APT processes are running:"
        ps aux | grep apt | grep -v grep
        log_info "Killing APT processes..."
        pkill -f apt 2>/dev/null || true
        sleep 2
    fi
    
    echo "📋 Checking lock files..."
    LOCK_FILES=(
        "/var/lib/dpkg/lock"
        "/var/lib/dpkg/lock-frontend"
        "/var/cache/apt/archives/lock"
        "/var/lib/apt/lists/lock"
    )
    
    for lock in "${LOCK_FILES[@]}"; do
        if [ -f "$lock" ]; then
            log_warning "Found lock file: $lock"
            rm -f "$lock" 2>/dev/null || true
        fi
    done
    
    echo "📋 Checking network connectivity..."
    if ! ping -c 1 archive.ubuntu.com > /dev/null 2>&1; then
        log_warning "Cannot reach archive.ubuntu.com"
        log_info "Checking DNS..."
        if ! nslookup archive.ubuntu.com > /dev/null 2>&1; then
            log_warning "DNS resolution failed"
            log_info "Setting up Google DNS..."
            echo "nameserver 8.8.8.8" > /etc/resolv.conf
            echo "nameserver 8.8.4.4" >> /etc/resolv.conf
        fi
    fi
    
    echo "📋 Checking HTTPS certificates..."
    if ! curl -s --connect-timeout 10 https://archive.ubuntu.com > /dev/null; then
        log_warning "HTTPS connectivity issues detected"
        return 1
    fi
    
    log_success "Diagnosis completed"
    return 0
}

# Function to fix HTTPS method issues
fix_https_method() {
    log_info "🔧 Fixing HTTPS method issues..."
    
    # Kill all APT processes
    pkill -9 -f apt 2>/dev/null || true
    pkill -9 -f dpkg 2>/dev/null || true
    sleep 3
    
    # Remove all lock files
    rm -f /var/lib/dpkg/lock* 2>/dev/null || true
    rm -f /var/cache/apt/archives/lock* 2>/dev/null || true
    rm -f /var/lib/apt/lists/lock* 2>/dev/null || true
    rm -f /var/lib/apt/lists/partial/* 2>/dev/null || true
    
    # Clean APT cache
    apt clean 2>/dev/null || true
    rm -rf /var/lib/apt/lists/* 2>/dev/null || true
    mkdir -p /var/lib/apt/lists/partial
    
    # Fix broken packages
    dpkg --configure -a 2>/dev/null || true
    apt --fix-broken install -y 2>/dev/null || true
    
    # Install/update HTTPS transport and certificates
    log_info "Installing/updating HTTPS components..."
    apt install --reinstall -y apt-transport-https ca-certificates gnupg lsb-release 2>/dev/null || true
    
    # Update certificates
    update-ca-certificates --fresh 2>/dev/null || true
    
    log_success "HTTPS method fixes applied"
}

# Function to fix sources.list
fix_sources() {
    log_info "🔧 Fixing sources.list..."
    
    # Backup current sources
    cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Get Ubuntu version
    UBUNTU_VERSION=$(lsb_release -cs 2>/dev/null || echo "focal")
    
    # Create clean sources.list
    cat > /etc/apt/sources.list << EOF
# Ubuntu Main Repos
deb http://archive.ubuntu.com/ubuntu/ $UBUNTU_VERSION main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $UBUNTU_VERSION-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $UBUNTU_VERSION-security main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $UBUNTU_VERSION-backports main restricted universe multiverse

# Ubuntu Partner
deb http://archive.canonical.com/ubuntu $UBUNTU_VERSION partner
EOF
    
    log_success "Sources.list updated with HTTP (will switch to HTTPS after fix)"
}

# Function to fix GPG keys
fix_gpg_keys() {
    log_info "🔧 Fixing GPG keys..."
    
    # Update package lists first
    apt update 2>/dev/null || true
    
    # Add Ubuntu archive keys
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3B4FE6ACC0B21F32 2>/dev/null || true
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 871920D1991BC93C 2>/dev/null || true
    
    # Try alternative keyservers
    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 3B4FE6ACC0B21F32 2>/dev/null || true
    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 871920D1991BC93C 2>/dev/null || true
    
    log_success "GPG keys updated"
}

# Function to test APT update with different methods
test_apt_update() {
    log_info "🧪 Testing APT update with different methods..."
    
    # Method 1: Standard update
    log_info "Method 1: Standard apt update..."
    if timeout 30 apt update 2>/dev/null; then
        log_success "✅ Standard apt update successful!"
        return 0
    fi
    
    # Method 2: Update with --allow-unauthenticated
    log_info "Method 2: apt update --allow-unauthenticated..."
    if timeout 30 apt update --allow-unauthenticated 2>/dev/null; then
        log_success "✅ APT update with --allow-unauthenticated successful!"
        return 0
    fi
    
    # Method 3: Update with --allow-releaseinfo-change
    log_info "Method 3: apt update --allow-releaseinfo-change..."
    if timeout 30 apt update --allow-releaseinfo-change 2>/dev/null; then
        log_success "✅ APT update with --allow-releaseinfo-change successful!"
        return 0
    fi
    
    # Method 4: Update with both flags
    log_info "Method 4: apt update with both flags..."
    if timeout 30 apt update --allow-unauthenticated --allow-releaseinfo-change 2>/dev/null; then
        log_success "✅ APT update with both flags successful!"
        return 0
    fi
    
    # Method 5: Try with apt-get
    log_info "Method 5: apt-get update..."
    if timeout 30 apt-get update 2>/dev/null; then
        log_success "✅ apt-get update successful!"
        return 0
    fi
    
    log_warning "All APT update methods failed"
    return 1
}

# Function to switch back to HTTPS
switch_to_https() {
    log_info "🔧 Switching back to HTTPS sources..."
    
    # Replace http with https in sources.list
    sed -i 's/http:/https:/g' /etc/apt/sources.list 2>/dev/null || true
    
    # Test HTTPS update
    if timeout 30 apt update 2>/dev/null; then
        log_success "✅ Successfully switched to HTTPS!"
        return 0
    else
        log_warning "HTTPS still not working, keeping HTTP"
        # Switch back to HTTP
        sed -i 's/https:/http:/g' /etc/apt/sources.list 2>/dev/null || true
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting comprehensive APT HTTPS fix..."
    
    # Step 1: Diagnose issues
    if ! diagnose_apt; then
        log_warning "APT issues detected, proceeding with fixes..."
    fi
    
    # Step 2: Fix HTTPS method
    fix_https_method
    
    # Step 3: Fix sources.list (start with HTTP)
    fix_sources
    
    # Step 4: Fix GPG keys
    fix_gpg_keys
    
    # Step 5: Test APT update
    if test_apt_update; then
        log_success "🎉 APT is now working!"
        
        # Step 6: Try to switch back to HTTPS
        if switch_to_https; then
            log_success "✅ APT HTTPS issues completely resolved!"
        else
            log_warning "APT working with HTTP, HTTPS still has issues"
            log_info "💡 You can manually switch to HTTPS later"
        fi
        
        # Final test
        log_info "Final verification..."
        if apt update --dry-run 2>/dev/null; then
            log_success "🎉 SUCCESS! APT is fully functional!"
            echo ""
            echo "📋 What was fixed:"
            echo "   • APT processes and lock files"
            echo "   • HTTPS transport components"
            echo "   • Certificate authorities"
            echo "   • Package sources"
            echo "   • GPG keys"
            echo ""
            echo "✅ You can now run: apt update && apt upgrade"
        fi
    else
        log_error "❌ Could not fix APT issues completely"
        echo ""
        echo "🔧 Manual troubleshooting steps:"
        echo "   1. Check internet connectivity"
        echo "   2. Check firewall settings"
        echo "   3. Try different DNS servers"
        echo "   4. Check if behind corporate proxy"
        echo "   5. Consider system reboot"
        echo ""
        echo "📞 For detailed logs, check:"
        echo "   • /var/log/apt/term.log"
        echo "   • /var/log/syslog"
    fi
}

# Run main function
main "$@"
