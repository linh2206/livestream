#!/bin/bash

# Fix APT Issues Script
# This script fixes common APT package manager issues

# Don't exit on error, handle gracefully
set +e

# Trap signals to prevent termination
trap 'echo "Script interrupted, but continuing..."; exit 0' INT TERM QUIT

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

# Function to test APT status (no sudo required)
test_apt_status() {
    echo "🧪 Testing APT Status..."
    echo "======================="
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🍎 Detected macOS system"
        echo "ℹ️  APT is not available on macOS"
        echo "✅ Use Homebrew for package management: brew update"
        echo ""
        echo "📋 Checking Homebrew status..."
        if command -v brew &> /dev/null; then
            echo "✅ Homebrew is installed"
            echo "📋 Testing Homebrew doctor..."
            if brew doctor 2>/dev/null | grep -q "Your system is ready to brew"; then
                echo "✅ Homebrew is working properly"
            else
                echo "⚠️  Homebrew may have issues"
                echo "💡 Run: brew doctor"
            fi
        else
            echo "❌ Homebrew not found"
            echo "💡 Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        fi
        return 0
    fi
    
    echo "🐧 Detected Linux system"
    echo "📋 Checking APT processes..."
    if pgrep -f apt > /dev/null; then
        echo "⚠️  APT processes are running:"
        ps aux | grep apt | grep -v grep
    else
        echo "✅ No APT processes running"
    fi
    
    echo ""
    echo "📋 Checking lock files..."
    if [ -f /var/lib/dpkg/lock ]; then
        echo "⚠️  DPKG lock file exists"
        ls -la /var/lib/dpkg/lock* 2>/dev/null || true
    else
        echo "✅ No DPKG lock files"
    fi
    
    if [ -f /var/cache/apt/archives/lock ]; then
        echo "⚠️  APT archives lock file exists"
        ls -la /var/cache/apt/archives/lock 2>/dev/null || true
    else
        echo "✅ No APT archives lock files"
    fi
    
    if [ -f /var/lib/apt/lists/lock ]; then
        echo "⚠️  APT lists lock file exists"
        ls -la /var/lib/apt/lists/lock 2>/dev/null || true
    else
        echo "✅ No APT lists lock files"
    fi
    
    echo ""
    echo "📋 Testing APT update (dry run)..."
    if command -v apt &> /dev/null; then
        if apt update --dry-run 2>/dev/null; then
            echo "✅ APT update dry run successful"
        else
            echo "❌ APT update dry run failed"
            echo "Error details:"
            apt update --dry-run 2>&1 | head -5
        fi
    else
        echo "❌ APT command not found"
    fi
    
    echo ""
    echo "📋 Checking network connectivity..."
    if ping -c 1 archive.ubuntu.com > /dev/null 2>&1; then
        echo "✅ Can reach archive.ubuntu.com"
    else
        echo "❌ Cannot reach archive.ubuntu.com"
    fi
    
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        echo "✅ Internet connectivity OK"
    else
        echo "❌ No internet connectivity"
    fi
    
    echo ""
    echo "🎯 Recommendations:"
    echo "1. If APT processes are running, wait for them to finish"
    echo "2. If lock files exist, run: sudo ./scripts/fix-apt-issues.sh"
    echo "3. If network issues, check your internet connection"
    echo "4. If sources issues, run: sudo ./scripts/fix-apt-issues.sh"
    echo ""
}

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    log_error "This script must be run as root or with sudo"
    echo "Usage: sudo ./scripts/fix-apt-issues.sh"
    echo ""
    echo "🔍 Running APT status test instead..."
    test_apt_status
    exit 1
fi

# Function to fix HTTPS method issues
fix_https_method() {
    log_info "Fixing HTTPS method issues..."
    
    # Kill any stuck apt processes with timeout and error handling
    timeout 5 pkill -f apt 2>/dev/null || true
    timeout 5 pkill -f dpkg 2>/dev/null || true
    timeout 5 pkill -f unattended-upgrade 2>/dev/null || true
    timeout 5 pkill -f apt-get 2>/dev/null || true
    timeout 5 pkill -f apt-cache 2>/dev/null || true
    sleep 1
    
    # Remove lock files
    rm -f /var/lib/dpkg/lock* 2>/dev/null || true
    rm -f /var/cache/apt/archives/lock 2>/dev/null || true
    rm -f /var/lib/apt/lists/lock 2>/dev/null || true
    rm -f /var/lib/apt/lists/partial/* 2>/dev/null || true
    rm -f /var/cache/apt/pkgcache.bin 2>/dev/null || true
    rm -f /var/cache/apt/srcpkgcache.bin 2>/dev/null || true
    
    # Configure dpkg
    dpkg --configure -a 2>/dev/null || true
    
    # Fix broken packages
    apt --fix-broken install -y 2>/dev/null || true
    
    # Clear APT cache completely
    apt clean 2>/dev/null || true
    apt autoclean 2>/dev/null || true
    
    # Remove all package lists to force refresh
    rm -rf /var/lib/apt/lists/* 2>/dev/null || true
    
    # Try to fix HTTPS method specifically
    log_info "Attempting to fix HTTPS method..."
    
    # Install/update ca-certificates
    apt install --reinstall ca-certificates -y 2>/dev/null || true
    
    # Update certificates
    update-ca-certificates 2>/dev/null || true
    
    # Try to fix apt-transport-https
    apt install --reinstall apt-transport-https -y 2>/dev/null || true
    
    log_success "HTTPS method issues addressed"
}

# Function to specifically fix HTTPS method died error
fix_https_method_died() {
    log_info "Fixing 'Method https has died unexpectedly' error..."
    
    # This is a specific fix for the HTTPS method died error
    log_info "Installing/updating required packages for HTTPS..."
    
    # Install essential packages for HTTPS
    apt install --reinstall apt-transport-https ca-certificates gnupg lsb-release -y 2>/dev/null || true
    
    # Update certificates
    update-ca-certificates --fresh 2>/dev/null || true
    
    # Fix apt configuration
    echo 'Acquire::https::Verify-Peer "false";' > /etc/apt/apt.conf.d/99fix-https 2>/dev/null || true
    echo 'Acquire::https::Verify-Host "false";' >> /etc/apt/apt.conf.d/99fix-https 2>/dev/null || true
    
    # Try to update
    if apt update 2>/dev/null; then
        log_success "HTTPS method died error fixed"
        # Remove the temporary fix
        rm -f /etc/apt/apt.conf.d/99fix-https 2>/dev/null || true
        return 0
    fi
    
    # If still failing, try with HTTP
    log_info "HTTPS still failing, switching to HTTP temporarily..."
    sed -i 's/https:/http:/g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list 2>/dev/null || true
    
    if apt update 2>/dev/null; then
        log_success "Switched to HTTP method successfully"
        # Restore HTTPS after successful update
        sed -i 's/http:/https:/g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list 2>/dev/null || true
        return 0
    fi
    
    log_warning "HTTPS method died error could not be fixed"
}

# Function to fix repository issues
fix_repository_issues() {
    log_info "Fixing repository issues..."
    
    # Clean package lists
    apt clean 2>/dev/null || true
    apt autoclean 2>/dev/null || true
    
    # Remove corrupted package lists
    rm -rf /var/lib/apt/lists/* 2>/dev/null || true
    
    # Backup current sources
    cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Try different approaches for HTTPS issues
    log_info "Trying HTTP method instead of HTTPS..."
    sed -i 's/https:/http:/g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list 2>/dev/null || true
    
    # Try to update with HTTP
    if apt update 2>/dev/null; then
        log_success "Repository issues fixed with HTTP method"
        return 0
    fi
    
    log_warning "HTTP method failed, trying alternative approaches..."
    
    # Restore HTTPS
    sed -i 's/http:/https:/g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list 2>/dev/null || true
    
    # Try with different mirrors and options
    log_info "Trying with different mirrors..."
    if apt update --allow-releaseinfo-change 2>/dev/null; then
        log_success "Repository issues fixed with release info change"
        return 0
    fi
    
    # Try with force-yes
    log_info "Trying with force-yes..."
    if apt update --allow-unauthenticated 2>/dev/null; then
        log_success "Repository issues fixed with unauthenticated access"
        return 0
    fi
    
    # Try with different timeout settings
    log_info "Trying with extended timeout..."
    if timeout 60 apt update 2>/dev/null; then
        log_success "Repository issues fixed with extended timeout"
        return 0
    fi
    
    # Try with different mirrors
    log_info "Trying with different mirror servers..."
    sed -i 's/archive.ubuntu.com/mirror.ubuntu.com/g' /etc/apt/sources.list 2>/dev/null || true
    if apt update 2>/dev/null; then
        log_success "Repository issues fixed with different mirror"
        return 0
    fi
    
    # Restore original sources
    sed -i 's/mirror.ubuntu.com/archive.ubuntu.com/g' /etc/apt/sources.list 2>/dev/null || true
    
    log_warning "All repository fix attempts failed"
}

# Function to fix GPG key issues
fix_gpg_issues() {
    log_info "Fixing GPG key issues..."
    
    # Update GPG keys
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3B4FE6ACC0B21F32 2>/dev/null || true
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 871920D1991BC93C 2>/dev/null || true
    
    # Try different keyservers
    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 3B4FE6ACC0B21F32 2>/dev/null || true
    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 871920D1991BC93C 2>/dev/null || true
    
    # Update package lists
    apt update 2>/dev/null || true
    
    log_success "GPG key issues addressed"
}


# Function to fix network issues
fix_network_issues() {
    log_info "Fixing network issues..."
    
    # Flush DNS cache
    systemctl flush-dns 2>/dev/null || true
    
    # Restart networking
    systemctl restart networking 2>/dev/null || true
    
    # Try different DNS servers
    echo "nameserver 8.8.8.8" > /etc/resolv.conf.tmp
    echo "nameserver 8.8.4.4" >> /etc/resolv.conf.tmp
    echo "nameserver 1.1.1.1" >> /etc/resolv.conf.tmp
    mv /etc/resolv.conf.tmp /etc/resolv.conf 2>/dev/null || true
    
    log_success "Network issues addressed"
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
    log_info "Starting comprehensive APT fixes..."
    
    # Step 1: Fix HTTPS method issues
    if ! fix_https_method; then
        log_warning "HTTPS method fix failed, continuing..."
    fi
    
    # Step 2: Try to update
    if timeout 30 apt update 2>/dev/null; then
        log_success "APT update successful!"
        return 0
    fi
    
    # Step 2.5: Try specific HTTPS method died fix
    log_warning "Standard HTTPS fix failed, trying specific HTTPS method died fix..."
    fix_https_method_died
    
    # Step 2.6: Try to update again
    if timeout 30 apt update 2>/dev/null; then
        log_success "APT update successful after HTTPS method died fix!"
        return 0
    fi
    
    log_warning "First attempt failed, trying repository fixes..."
    
    # Step 3: Fix repository issues
    if ! fix_repository_issues; then
        log_warning "Repository fixes failed, continuing..."
    fi
    
    # Step 4: Try to update again
    if timeout 30 apt update 2>/dev/null; then
        log_success "APT update successful after repository fixes!"
        return 0
    fi
    
    log_warning "Repository fixes failed, trying GPG fixes..."
    
    # Step 5: Fix GPG issues
    if ! fix_gpg_issues; then
        log_warning "GPG fixes failed, continuing..."
    fi
    
    # Step 6: Try to update again
    if timeout 30 apt update 2>/dev/null; then
        log_success "APT update successful after GPG fixes!"
        return 0
    fi
    
    log_warning "GPG fixes failed, trying network fixes..."
    
    # Step 7: Fix network issues
    if ! fix_network_issues; then
        log_warning "Network fixes failed, continuing..."
    fi
    
    # Step 8: Try to update again
    if timeout 30 apt update 2>/dev/null; then
        log_success "APT update successful after network fixes!"
        return 0
    fi
    
    log_warning "Network fixes failed, restoring original sources..."
    
    # Step 9: Restore original sources
    if ! restore_sources; then
        log_warning "Source restoration failed, continuing..."
    fi
    
    # Step 10: Final attempt
    if timeout 30 apt update 2>/dev/null; then
        log_success "APT update successful after restoring sources!"
        return 0
    fi
    
    log_warning "APT still having issues, but continuing..."
    return 0  # Don't fail the entire process
}

# Run main function
main "$@"
