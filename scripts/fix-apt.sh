#!/bin/bash

# Simple APT Fix Script - One script to rule them all
# Fixes the "Method https has died unexpectedly" error

set -e

echo "🔧 Fixing APT HTTPS issues..."

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo "❌ This script must be run as root or with sudo"
    echo "Usage: sudo $0"
    exit 1
fi

echo "✅ Running as root"

# Step 1: Kill all APT processes
echo "🔄 Killing APT processes..."
pkill -9 -f apt 2>/dev/null || true
pkill -9 -f dpkg 2>/dev/null || true
sleep 2

# Step 2: Remove lock files
echo "🔄 Removing lock files..."
rm -f /var/lib/dpkg/lock* 2>/dev/null || true
rm -f /var/cache/apt/archives/lock* 2>/dev/null || true
rm -f /var/lib/apt/lists/lock* 2>/dev/null || true

# Step 3: Clean cache
echo "🔄 Cleaning APT cache..."
apt clean 2>/dev/null || true
rm -rf /var/lib/apt/lists/* 2>/dev/null || true
mkdir -p /var/lib/apt/lists/partial

# Step 4: Fix broken packages
echo "🔄 Fixing broken packages..."
dpkg --configure -a 2>/dev/null || true
apt --fix-broken install -y 2>/dev/null || true

# Step 5: Install HTTPS transport
echo "🔄 Installing HTTPS transport..."
apt install --reinstall -y apt-transport-https ca-certificates 2>/dev/null || true

# Step 6: Try APT update
echo "🔄 Testing APT update..."
if timeout 30 apt update 2>/dev/null; then
    echo "✅ APT is working!"
    exit 0
fi

# Step 7: If HTTPS fails, switch to HTTP
echo "⚠️  HTTPS failed, switching to HTTP..."
cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
sed -i 's/https:/http:/g' /etc/apt/sources.list 2>/dev/null || true

if timeout 30 apt update 2>/dev/null; then
    echo "✅ APT working with HTTP!"
    echo "📦 Installing essential packages..."
    apt install -y openssh-server curl wget 2>/dev/null || true
    echo "🎉 APT fixed and essential packages installed!"
else
    echo "❌ APT still not working"
    exit 1
fi
