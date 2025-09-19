#!/bin/bash

# SSH Server Configuration Script for Ubuntu
# Complete and tested configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Print functions
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
if [ "$(id -u)" = "0" ]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if apt is available (Ubuntu only)
if ! command -v apt >/dev/null 2>&1; then
   print_error "This script requires Ubuntu with apt package manager"
   exit 1
fi

print_header "SSH Server Configuration for Ubuntu"

# Check sudo privileges
print_status "Checking sudo privileges..."
if ! sudo -n true 2>/dev/null; then
    print_warning "This script requires sudo privileges."
    print_warning "You will be prompted for your password multiple times."
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit..."
    echo ""
fi

# Install OpenSSH server
print_status "Installing OpenSSH server..."
sudo apt update && sudo apt install -y openssh-server

# Backup original SSH config
print_status "Backing up original SSH configuration..."
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)

# Create new SSH config
print_status "Configuring SSH server..."
sudo tee /etc/ssh/sshd_config > /dev/null << 'EOF'
# SSH Server Configuration
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
UseDNS no
EOF

# Set proper permissions
sudo chmod 600 /etc/ssh/sshd_config

# Setup SSH directory and keys
print_status "Setting up SSH directory for user: $USER"
mkdir -p ~/.ssh && chmod 700 ~/.ssh

# Generate SSH key if needed
if [ ! -f ~/.ssh/id_rsa ]; then
    print_status "Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "$USER@$(hostname)"
    print_warning "SSH key generated. Add to authorized_keys:"
    echo "cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys"
fi

# Set permissions
chmod 600 ~/.ssh/id_rsa ~/.ssh/authorized_keys 2>/dev/null || true
chmod 644 ~/.ssh/id_rsa.pub

# Configure firewall
print_status "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw status

# Test SSH configuration
print_status "Testing SSH configuration..."
if sudo sshd -t 2>/dev/null; then
    print_status "SSH configuration is valid"
    print_status "Restarting SSH service..."
    sudo systemctl restart ssh
    sudo systemctl enable ssh
    print_status "SSH service status:"
    sudo systemctl status ssh --no-pager
else
    print_error "SSH configuration has errors. Restoring backup..."
    sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config 2>/dev/null || true
    sudo systemctl restart ssh
    exit 1
fi

print_header "SSH Server Configuration Complete"

print_status "SSH server has been configured with the following settings:"
echo "  - Port: 22"
echo "  - Root login: Disabled"
echo "  - Password authentication: Disabled"
echo "  - Public key authentication: Enabled"
echo "  - Max authentication tries: 3"
echo "  - Client alive interval: 300 seconds"

print_warning "Important:"
echo "  1. This script requires sudo privileges - you will be prompted for password"
echo "  2. Add your SSH public key to ~/.ssh/authorized_keys"
echo "  3. Test SSH connection before closing this session"

print_status "Commands:"
echo "  Test connection: ssh $USER@\$(hostname -I | awk '{print \$1}')"
echo "  Add key: cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys"
echo "  Restore config: sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config && sudo systemctl restart ssh"

print_header "Configuration Complete"
echo "SSH server is running with enhanced security settings."
