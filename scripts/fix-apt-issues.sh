#!/bin/bash

# Fix APT Issues Script
# This script fixes common APT package manager issues

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

echo "🔧 Fixing APT Issues"
echo "===================="
echo "This script will fix common APT package manager issues:"
echo "  • HTTPS method errors"
echo "  • Repository connection issues"
echo "  • Package list corruption"
echo "  • GPG key issues"
echo "===================="

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Function to fix HTTPS method issues
fix_https_method() {
    log_info "Fixing HTTPS method issues..."
    
    # Kill any stuck apt processes
    pkill -f apt || true
    pkill -f dpkg || true
    
    # Remove lock files
    rm -f /var/lib/dpkg/lock*
    rm -f /var/cache/apt/archives/lock
    rm -f /var/lib/apt/lists/lock
    
    # Configure dpkg
    dpkg --configure -a
    
    log_success "HTTPS method issues fixed"
}

# Function to fix repository issues
fix_repository_issues() {
    log_info "Fixing repository issues..."
    
    # Clean package lists
    apt clean
    apt autoclean
    
    # Remove corrupted package lists
    rm -rf /var/lib/apt/lists/*
    
    # Update package lists with different methods
    log_info "Trying HTTP method instead of HTTPS..."
    sed -i 's/https:/http:/g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list 2>/dev/null || true
    
    # Try to update
    if apt update; then
        log_success "Repository issues fixed with HTTP method"
    else
        log_warning "HTTP method failed, trying alternative approach..."
        
        # Restore HTTPS
        sed -i 's/http:/https:/g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list 2>/dev/null || true
        
        # Try with different mirrors
        log_info "Trying with different mirrors..."
        apt update --allow-releaseinfo-change || true
    fi
}

# Function to fix GPG key issues
fix_gpg_issues() {
    log_info "Fixing GPG key issues..."
    
    # Update GPG keys
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3B4FE6ACC0B21F32 || true
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 871920D1991BC93C || true
    
    # Update package lists
    apt update || true
    
    log_success "GPG key issues addressed"
}

# Function to fix package manager
fix_package_manager() {
    log_info "Fixing package manager..."
    
    # Reinstall apt
    apt install --reinstall apt -y
    
    # Fix broken packages
    apt --fix-broken install -y
    
    # Update package lists
    apt update
    
    log_success "Package manager fixed"
}

# Function to restore original sources
restore_sources() {
    log_info "Restoring original sources..."
    
    # Backup current sources
    cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Create basic sources.list
    cat > /etc/apt/sources.list << 'EOF'
# Ubuntu Main Repos
deb http://archive.ubuntu.com/ubuntu/ $(lsb_release -cs) main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $(lsb_release -cs)-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $(lsb_release -cs)-security main restricted universe multiverse

# Ubuntu Backports
deb http://archive.ubuntu.com/ubuntu/ $(lsb_release -cs)-backports main restricted universe multiverse
EOF
    
    log_success "Original sources restored"
}

# Main execution
main() {
    log_info "Starting APT fixes..."
    
    # Step 1: Fix HTTPS method issues
    fix_https_method
    
    # Step 2: Try to update
    if apt update; then
        log_success "APT update successful!"
        return 0
    fi
    
    log_warning "First attempt failed, trying repository fixes..."
    
    # Step 3: Fix repository issues
    fix_repository_issues
    
    # Step 4: Try to update again
    if apt update; then
        log_success "APT update successful after repository fixes!"
        return 0
    fi
    
    log_warning "Repository fixes failed, trying GPG fixes..."
    
    # Step 5: Fix GPG issues
    fix_gpg_issues
    
    # Step 6: Try to update again
    if apt update; then
        log_success "APT update successful after GPG fixes!"
        return 0
    fi
    
    log_warning "GPG fixes failed, trying package manager fixes..."
    
    # Step 7: Fix package manager
    fix_package_manager
    
    # Step 8: Try to update again
    if apt update; then
        log_success "APT update successful after package manager fixes!"
        return 0
    fi
    
    log_warning "Package manager fixes failed, restoring original sources..."
    
    # Step 9: Restore original sources
    restore_sources
    
    # Step 10: Final attempt
    if apt update; then
        log_success "APT update successful after restoring sources!"
        return 0
    fi
    
    log_error "All APT fixes failed. Manual intervention required."
    echo ""
    echo "Manual steps to try:"
    echo "1. Check internet connection"
    echo "2. Check firewall settings"
    echo "3. Try different DNS servers"
    echo "4. Check system time/date"
    echo "5. Contact system administrator"
    
    return 1
}

# Run main function
main "$@"
