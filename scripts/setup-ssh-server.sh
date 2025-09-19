#!/bin/bash

# SSH Server Configuration for Ubuntu
echo "SSH Server Configuration for Ubuntu"
echo "This script requires sudo privileges. You will be prompted for your password."
echo ""

# Check if running as root
if [ "$(id -u)" = "0" ]; then
   echo "WARNING: Running as root"
   echo "This is not recommended for security reasons"
   echo "Consider running as a regular user with sudo privileges"
   echo ""
   read -p "Continue anyway? (y/N): " -n 1 -r
   echo ""
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       echo "Exiting..."
       exit 1
   fi
fi

# Check if apt is available
if ! command -v apt >/dev/null 2>&1; then
   echo "ERROR: This script requires Ubuntu with apt package manager"
   exit 1
fi

echo "Installing OpenSSH server..."
if [ "$(id -u)" = "0" ]; then
    apt update
    apt install -y openssh-server
else
    sudo apt update
    sudo apt install -y openssh-server
fi

echo "Backing up original SSH configuration..."
if [ "$(id -u)" = "0" ]; then
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
else
    sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
fi

echo "Creating SSH banner..."
if [ "$(id -u)" = "0" ]; then
    tee /etc/ssh/banner > /dev/null << 'EOF'
***************************************************************************
                    AUTHORIZED ACCESS ONLY
***************************************************************************
This system is for the use of authorized users only. Individuals using
this computer system without authority, or in excess of their authority,
are subject to having all of their activities on this system monitored
and recorded by system personnel.

In the course of monitoring individuals improperly using this system,
or in the course of system maintenance, the activities of authorized
users may also be monitored.

Anyone using this system expressly consents to such monitoring and is
advised that if such monitoring reveals possible evidence of criminal
activity, system personnel may provide the evidence of such monitoring
to law enforcement officials.
***************************************************************************
EOF
    chmod 644 /etc/ssh/banner
else
    sudo tee /etc/ssh/banner > /dev/null << 'EOF'
***************************************************************************
                    AUTHORIZED ACCESS ONLY
***************************************************************************
This system is for the use of authorized users only. Individuals using
this computer system without authority, or in excess of their authority,
are subject to having all of their activities on this system monitored
and recorded by system personnel.

In the course of monitoring individuals improperly using this system,
or in the course of system maintenance, the activities of authorized
users may also be monitored.

Anyone using this system expressly consents to such monitoring and is
advised that if such monitoring reveals possible evidence of criminal
activity, system personnel may provide the evidence of such monitoring
to law enforcement officials.
***************************************************************************
EOF
    sudo chmod 644 /etc/ssh/banner
fi

echo "Configuring SSH server..."
if [ "$(id -u)" = "0" ]; then
    tee /etc/ssh/sshd_config > /dev/null << 'EOF'
# SSH Server Configuration
Port 22
Protocol 2

# Host keys
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Logging
LogLevel INFO

# Authentication
LoginGraceTime 2m
PermitRootLogin no
StrictModes yes
MaxAuthTries 3
MaxSessions 10

# Public key authentication
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Password authentication (disable for security)
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# X11 forwarding
X11Forwarding no
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes

# Security settings
ClientAliveInterval 300
ClientAliveCountMax 2
Compression delayed
UseDNS no

# Banner
Banner /etc/ssh/banner

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server
EOF
else
    sudo tee /etc/ssh/sshd_config > /dev/null << 'EOF'
# SSH Server Configuration
Port 22
Protocol 2

# Host keys
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Logging
LogLevel INFO

# Authentication
LoginGraceTime 2m
PermitRootLogin no
StrictModes yes
MaxAuthTries 3
MaxSessions 10

# Public key authentication
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Password authentication (disable for security)
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# X11 forwarding
X11Forwarding no
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes

# Security settings
ClientAliveInterval 300
ClientAliveCountMax 2
Compression delayed
UseDNS no

# Banner
Banner /etc/ssh/banner

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server
EOF
fi

echo "Setting up SSH directory..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

echo "Generating SSH key if needed..."
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "$USER@$(hostname)"
    echo "SSH key generated. Add to authorized_keys:"
    echo "cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys"
fi

echo "Setting permissions..."
chmod 600 ~/.ssh/id_rsa ~/.ssh/authorized_keys 2>/dev/null || true
chmod 644 ~/.ssh/id_rsa.pub

echo "Configuring firewall..."
if [ "$(id -u)" = "0" ]; then
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
else
    sudo ufw --force enable
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
fi

echo "Testing SSH configuration..."
if [ "$(id -u)" = "0" ]; then
    if sshd -t; then
        echo "SSH configuration is valid"
        echo "Restarting SSH service..."
        systemctl restart ssh
        systemctl enable ssh
        echo "SSH service status:"
        systemctl status ssh --no-pager
    else
        echo "ERROR: SSH configuration has errors. Restoring backup..."
        cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
        systemctl restart ssh
        exit 1
    fi
else
    if sudo sshd -t; then
        echo "SSH configuration is valid"
        echo "Restarting SSH service..."
        sudo systemctl restart ssh
        sudo systemctl enable ssh
        echo "SSH service status:"
        sudo systemctl status ssh --no-pager
    else
        echo "ERROR: SSH configuration has errors. Restoring backup..."
        sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
        sudo systemctl restart ssh
        exit 1
    fi
fi

echo "SSH Server Configuration Complete"
echo "SSH server is running with enhanced security settings."
echo ""
echo "Important:"
echo "1. Add your SSH public key to ~/.ssh/authorized_keys"
echo "2. Test SSH connection before closing this session"
echo ""
echo "Commands:"
echo "Test connection: ssh \$USER@\$(hostname -I | awk '{print \$1}')"
echo "Add key: cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys"
echo "Restore config: sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config && sudo systemctl restart ssh"
