#!/bin/bash

# Quick FFmpeg Installation Script for Ubuntu/Debian/Mint
# This script installs FFmpeg from repositories (faster but less optimized)
# Usage: ./install-ffmpeg-quick.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_status "Installing FFmpeg from repositories..."

# Update package list
sudo apt-get update

# Install FFmpeg and related tools
sudo apt-get install -y \
    ffmpeg \
    ffmpeg-doc \
    libavcodec-extra \
    libavcodec-extra58 \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev

print_success "FFmpeg installed successfully!"

# Verify installation
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1 | cut -d' ' -f3)
    print_success "FFmpeg $FFMPEG_VERSION is ready to use"
    
    # Show basic info
    print_status "FFmpeg version:"
    ffmpeg -version | head -n1
    
    print_status "Available encoders:"
    ffmpeg -encoders | grep -E "(h264|h265|vp8|vp9|aac|mp3|opus)" | head -10
    
else
    echo "FFmpeg installation verification failed"
    exit 1
fi

print_success "Quick FFmpeg installation completed!"
print_status "For optimized compilation with custom codecs, use: ./compile-ffmpeg.sh"
