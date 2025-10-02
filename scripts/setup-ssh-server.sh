#!/bin/bash

# Simple SSH Server Setup Script
echo "🔧 Setting up SSH server..."

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo "❌ This script must be run as root"
    exit 1
fi

# Install SSH server if not installed
if ! command -v sshd &> /dev/null; then
    echo "📦 Installing SSH server..."
    apt update && apt install -y openssh-server
fi

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configure SSH
echo "⚙️  Configuring SSH server..."
cat > /etc/ssh/sshd_config << 'EOF'
# SSH Server Configuration
Port 22
Protocol 2
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Start and enable SSH service
echo "🚀 Starting SSH service..."
systemctl enable ssh
systemctl restart ssh

# Check SSH status
if systemctl is-active --quiet ssh; then
    echo "✅ SSH server is running"
else
    echo "❌ SSH server failed to start"
    exit 1
fi

echo ""
echo "✅ SSH Server Setup Complete!"
echo ""
echo "SSH server is running on port 22"
echo "You can now connect via SSH"
echo ""
echo "Test connection: ssh $USER@$(hostname -I | awk '{print $1}')"