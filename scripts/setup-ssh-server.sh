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

echo "Creating dynamic SSH banner script..."
if [ "$(id -u)" = "0" ]; then
    tee /usr/local/bin/ssh-banner > /dev/null << 'EOF'
#!/bin/bash

# Get system information
HOSTNAME=$(hostname)
UPTIME=$(uptime -p | sed 's/up //')
DATE=$(date '+%Y-%m-%d %H:%M:%S')
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
MEMORY_USED=$(free -h | grep '^Mem:' | awk '{print $3}')
MEMORY_TOTAL=$(free -h | grep '^Mem:' | awk '{print $2}')
DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')
DISK_PERCENT=$(df -h / | tail -1 | awk '{print $5}')

# Get top 8 processes by CPU usage
PROCESSES=$(ps aux --sort=-%cpu | head -9 | tail -8 | awk '{printf "%-12s %-6s %-6s %-8s %s\n", $1, $2, $3"%", $4"%", $11}')

# Function to pad string to fixed width
pad_string() {
    local str="$1"
    local width="$2"
    local len=${#str}
    if [ $len -lt $width ]; then
        printf "%-*s" $width "$str"
    else
        printf "%.*s" $((width-3)) "$str..."
    fi
}

# Get terminal width, default to 80 if not available
TERM_WIDTH=${COLUMNS:-80}
if [ $TERM_WIDTH -lt 60 ]; then
    TERM_WIDTH=60
fi

# Calculate box width (leave some margin)
BOX_WIDTH=$((TERM_WIDTH - 4))

# Create responsive banner
echo "╔$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╗"
echo "║$(printf ' %.0s' $(seq 1 $((BOX_WIDTH-2))))║" | sed "s/^║/║ $(pad_string "LIVESTREAM SERVER" $((BOX_WIDTH-4)))/"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "Hostname: $HOSTNAME" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Uptime: $UPTIME" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Date: $DATE" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║$(printf ' %.0s' $(seq 1 $((BOX_WIDTH-2))))║" | sed "s/^║/║ $(pad_string "SYSTEM STATUS" $((BOX_WIDTH-4)))/"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "CPU Load: $LOAD" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Memory: $MEMORY_USED / $MEMORY_TOTAL" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Disk: $DISK_USED / $DISK_TOTAL ($DISK_PERCENT)" $((BOX_WIDTH-4))) ║"
echo "╚$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╝"
EOF
    chmod +x /usr/local/bin/ssh-banner
    
    # Create dynamic MOTD script
    tee /etc/update-motd.d/99-livestream > /dev/null << 'EOF'
#!/bin/bash

# Get system information
HOSTNAME=$(hostname)
UPTIME=$(uptime -p | sed 's/up //')
DATE=$(date '+%Y-%m-%d %H:%M:%S')
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
MEMORY_USED=$(free -h | grep '^Mem:' | awk '{print $3}')
MEMORY_TOTAL=$(free -h | grep '^Mem:' | awk '{print $2}')
DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')
DISK_PERCENT=$(df -h / | tail -1 | awk '{print $5}')

# Get top 3 processes by CPU usage with better formatting
if command -v ps >/dev/null 2>&1; then
    if ps aux --help 2>&1 | grep -q "sort"; then
        # Linux/Ubuntu
        PROCESSES=$(ps aux --sort=-%cpu | head -4 | tail -3 | awk '{printf "%-10s %-6s %-5s %s\n", $1, $2, $3"%", $11}' | sed 's/  */ /g')
    else
        # macOS
        PROCESSES=$(ps aux | sort -k3 -nr | head -3 | awk '{printf "%-10s %-6s %-5s %s\n", $1, $2, $3"%", $11}' | sed 's/  */ /g')
    fi
else
    PROCESSES="No process info available"
fi

# Get terminal width
TERM_WIDTH=${COLUMNS:-80}
if [ $TERM_WIDTH -lt 80 ]; then
    TERM_WIDTH=80
fi
BOX_WIDTH=$((TERM_WIDTH - 2))

# Function to pad string
pad_string() {
    local str="$1"
    local width="$2"
    local len=${#str}
    if [ $len -lt $width ]; then
        printf "%-*s" $width "$str"
    else
        printf "%.*s" $((width-3)) "$str..."
    fi
}

# Create banner
echo "╔$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╗"
echo "║ $(pad_string "LIVESTREAM SERVER" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "Hostname: $HOSTNAME" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Uptime: $UPTIME" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Date: $DATE" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "SYSTEM STATUS" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "CPU Load: $LOAD" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Memory: $MEMORY_USED / $MEMORY_TOTAL" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Disk: $DISK_USED / $DISK_TOTAL ($DISK_PERCENT)" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "TOP PROCESSES" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "USER       PID   CPU%  COMMAND" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "$PROCESSES" | while read line; do
    echo "║ $(pad_string "$line" $((BOX_WIDTH-4))) ║"
done
echo "╚$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╝"
EOF
    chmod +x /etc/update-motd.d/99-livestream
    
    # Create simple SSH banner
    tee /etc/ssh/banner > /dev/null << 'EOF'
+======================================================================+
| LIVESTREAM SERVER                                                    |
+======================================================================+
| Welcome to LiveStream Platform Server!                              |
| WARNING: Authorized access only. All activities are logged.         |
+======================================================================+
EOF
    chmod 644 /etc/ssh/banner
else
    sudo tee /usr/local/bin/ssh-banner > /dev/null << 'EOF'
#!/bin/bash

# Get system information
HOSTNAME=$(hostname)
UPTIME=$(uptime -p | sed 's/up //')
DATE=$(date '+%Y-%m-%d %H:%M:%S')
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
MEMORY_USED=$(free -h | grep '^Mem:' | awk '{print $3}')
MEMORY_TOTAL=$(free -h | grep '^Mem:' | awk '{print $2}')
DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')
DISK_PERCENT=$(df -h / | tail -1 | awk '{print $5}')

# Get top 8 processes by CPU usage
PROCESSES=$(ps aux --sort=-%cpu | head -9 | tail -8 | awk '{printf "%-12s %-6s %-6s %-8s %s\n", $1, $2, $3"%", $4"%", $11}')

# Function to pad string to fixed width
pad_string() {
    local str="$1"
    local width="$2"
    local len=${#str}
    if [ $len -lt $width ]; then
        printf "%-*s" $width "$str"
    else
        printf "%.*s" $((width-3)) "$str..."
    fi
}

# Get terminal width, default to 80 if not available
TERM_WIDTH=${COLUMNS:-80}
if [ $TERM_WIDTH -lt 60 ]; then
    TERM_WIDTH=60
fi

# Calculate box width (leave some margin)
BOX_WIDTH=$((TERM_WIDTH - 4))

# Create responsive banner
echo "╔$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╗"
echo "║$(printf ' %.0s' $(seq 1 $((BOX_WIDTH-2))))║" | sed "s/^║/║ $(pad_string "LIVESTREAM SERVER" $((BOX_WIDTH-4)))/"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "Hostname: $HOSTNAME" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Uptime: $UPTIME" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Date: $DATE" $((BOX_WIDTH-4))) ║"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║$(printf ' %.0s' $(seq 1 $((BOX_WIDTH-2))))║" | sed "s/^║/║ $(pad_string "SYSTEM STATUS" $((BOX_WIDTH-4)))/"
echo "╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╣"
echo "║ $(pad_string "CPU Load: $LOAD" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Memory: $MEMORY_USED / $MEMORY_TOTAL" $((BOX_WIDTH-4))) ║"
echo "║ $(pad_string "Disk: $DISK_USED / $DISK_TOTAL ($DISK_PERCENT)" $((BOX_WIDTH-4))) ║"
echo "╚$(printf '═%.0s' $(seq 1 $((BOX_WIDTH-2))))╝"
EOF
    sudo chmod +x /usr/local/bin/ssh-banner
    
    # Create dynamic MOTD script
    sudo tee /etc/update-motd.d/99-livestream > /dev/null << 'EOF'
#!/bin/bash

# Get system information
HOSTNAME=$(hostname)
UPTIME=$(uptime -p | sed 's/up //')
DATE=$(date '+%Y-%m-%d %H:%M:%S')
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
MEMORY_USED=$(free -h | grep '^Mem:' | awk '{print $3}')
MEMORY_TOTAL=$(free -h | grep '^Mem:' | awk '{print $2}')
DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')
DISK_PERCENT=$(df -h / | tail -1 | awk '{print $5}')

# Get top 3 processes by CPU usage with better formatting
if command -v ps >/dev/null 2>&1; then
    if ps aux --help 2>&1 | grep -q "sort"; then
        # Linux/Ubuntu
        PROCESSES=$(ps aux --sort=-%cpu | head -4 | tail -3 | awk '{printf "%-10s %-6s %-5s %s\n", $1, $2, $3"%", $11}' | sed 's/  */ /g')
    else
        # macOS
        PROCESSES=$(ps aux | sort -k3 -nr | head -3 | awk '{printf "%-10s %-6s %-5s %s\n", $1, $2, $3"%", $11}' | sed 's/  */ /g')
    fi
else
    PROCESSES="No process info available"
fi

# Get terminal width
TERM_WIDTH=${COLUMNS:-80}
if [ $TERM_WIDTH -lt 80 ]; then
    TERM_WIDTH=80
fi
BOX_WIDTH=$((TERM_WIDTH - 2))

# Function to pad string
pad_string() {
    local str="$1"
    local width="$2"
    local len=${#str}
    if [ $len -lt $width ]; then
        printf "%-*s" $width "$str"
    else
        printf "%.*s" $((width-3)) "$str..."
    fi
}

# Create system info banner with solid lines
echo "┌$(printf '─%.0s' $(seq 1 $((BOX_WIDTH-2))))┐"
echo "│$(printf ' %-*s ' $((BOX_WIDTH-2)) "LIVESTREAM SERVER - SYSTEM STATUS")│"
echo "├$(printf '─%.0s' $(seq 1 $((BOX_WIDTH-2))))┤"
echo "│$(printf ' %-*s ' $((BOX_WIDTH-2)) "CPU Load: $LOAD")│"
echo "│$(printf ' %-*s ' $((BOX_WIDTH-2)) "Memory: $MEMORY_USED / $MEMORY_TOTAL")│"
echo "│$(printf ' %-*s ' $((BOX_WIDTH-2)) "Disk: $DISK_USED / $DISK_TOTAL ($DISK_PERCENT)")│"
echo "└$(printf '─%.0s' $(seq 1 $((BOX_WIDTH-2))))┘"
EOF
    sudo chmod +x /etc/update-motd.d/99-livestream
    
    # Create simple SSH banner with solid lines
    sudo tee /etc/ssh/banner > /dev/null << 'EOF'
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│ LIVESTREAM SERVER                                                    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Welcome to the LiveStream Platform Server!                          │
│                                                                      │
│ WARNING: Authorized access only. All activities are logged.         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
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

# Password authentication (temporarily enabled for setup)
PasswordAuthentication yes
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

# Password authentication (temporarily enabled for setup)
PasswordAuthentication yes
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

# Setup SSH authorized_keys
echo "Setting up SSH authorized_keys..."

# Get current user info
if [ "$(id -u)" = "0" ]; then
    USER_HOME="/root"
    USER_NAME="root"
else
    USER_HOME="$HOME"
    USER_NAME="$(whoami)"
fi

echo "Setting up SSH keys for user: $USER_NAME"

# Create .ssh directory if it doesn't exist
if [ ! -d "$USER_HOME/.ssh" ]; then
    echo "Creating .ssh directory..."
    if [ "$(id -u)" = "0" ]; then
        mkdir -p "$USER_HOME/.ssh"
        chmod 700 "$USER_HOME/.ssh"
    else
        mkdir -p "$USER_HOME/.ssh"
        chmod 700 "$USER_HOME/.ssh"
    fi
fi

# Create authorized_keys file if it doesn't exist
if [ ! -f "$USER_HOME/.ssh/authorized_keys" ]; then
    echo "Creating authorized_keys file..."
    if [ "$(id -u)" = "0" ]; then
        touch "$USER_HOME/.ssh/authorized_keys"
        chmod 600 "$USER_HOME/.ssh/authorized_keys"
    else
        touch "$USER_HOME/.ssh/authorized_keys"
        chmod 600 "$USER_HOME/.ssh/authorized_keys"
    fi
fi

# Add the SSH key to authorized_keys
echo "Adding SSH key to authorized_keys..."
SSH_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDAY9aCNhhLV+eB3cSd0afCzawhnGZE1Dj17AYILokT+/VSGJJR+YXC0Bd5HtiXximu86J2jcW7dfyL4NvhXZeDLzv4NkNxnWa6TNH4IEyqhYPzVWnsZVutB4huYqzIyUMKqxYpXjoOoWN1iKWb2vVpO7DmqGWmGm+qOBCA6B8RrPOCNuiL2QCaFp82z1XARE6EGmXNzXbWpFtUYfIZ41bTwpc/M2p7+Az7nj/fUXSPtvVqkCc/txMjU9QOI5aKVkCz25d9fT7jSEEtf9dWjwAXusmDzfTWReQV1uRmtDxSHso26+v4fKIGwJtkupTjlBOh+E3ug1DVuuf5dErvB5IT14qwZoquLmt58dPUb0G92D8oYc/3Pv3+dY7EjM4p6orEaR0QTTBe++ke5BOsNfhoal0ihZznJ7fEazrPc2msLOlZkpnhKO6TjiIXQksqJlk/7ZgJ5M1b0BPOfr0j+HRPdU43nzZ2oV4Brlui4VX4Na4c7BGTNhWkje1B79SNTuU= linh@Macbook-Pro.local"

# Check if key already exists
if ! grep -q "linh@Macbook-Pro.local" "$USER_HOME/.ssh/authorized_keys" 2>/dev/null; then
    if [ "$(id -u)" = "0" ]; then
        echo "$SSH_KEY" >> "$USER_HOME/.ssh/authorized_keys"
        chmod 600 "$USER_HOME/.ssh/authorized_keys"
    else
        echo "$SSH_KEY" >> "$USER_HOME/.ssh/authorized_keys"
        chmod 600 "$USER_HOME/.ssh/authorized_keys"
    fi
    echo "SSH key added successfully!"
else
    echo "SSH key already exists in authorized_keys"
fi

echo ""
echo "Testing banner display..."
if [ -f "/usr/local/bin/ssh-banner" ]; then
    echo "✅ Banner script exists and is executable"
    echo "Banner preview:"
    /usr/local/bin/ssh-banner
else
    echo "❌ Warning: Banner script not found"
fi

# Update MOTD
log_info "Updating MOTD..."
if [ "$(id -u)" = "0" ]; then
    /etc/update-motd.d/99-livestream > /etc/motd
    echo "✅ MOTD updated successfully"
else
    sudo /etc/update-motd.d/99-livestream | sudo tee /etc/motd > /dev/null
    echo "✅ MOTD updated successfully"
fi

echo ""
echo "Testing MOTD display..."
if [ -f "/etc/update-motd.d/99-livestream" ]; then
    echo "✅ MOTD script exists and is executable"
    echo "MOTD preview:"
    /etc/update-motd.d/99-livestream
    echo ""
    echo "📋 Current /etc/motd content:"
    echo "============================="
    cat /etc/motd
else
    echo "❌ Warning: MOTD script not found"
fi

echo ""
echo "SSH Server Configuration Complete"
echo "SSH server is running with enhanced security settings."
echo ""
echo "Important:"
echo "1. SSH key has been added to ~/.ssh/authorized_keys"
echo "2. Banner is configured and should display on SSH login"
echo "3. Dynamic MOTD with system info is now active"
echo "4. Test SSH connection before closing this session"
echo "5. After testing, disable password auth for security"
echo ""
echo "Commands:"
echo "Test connection: ssh \$USER@\$(hostname -I | awk '{print \$1}')"
echo "Test MOTD: /etc/update-motd.d/99-livestream"
echo "View current MOTD: cat /etc/motd"
echo "Update MOTD: sudo /etc/update-motd.d/99-livestream > /etc/motd"
echo "Disable password auth: sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && sudo systemctl restart ssh"
echo "Restore config: sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config && sudo systemctl restart ssh"
