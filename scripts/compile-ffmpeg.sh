#!/bin/bash

# FFmpeg Compilation Script for Ubuntu/Debian/Mint
# This script compiles FFmpeg with common codecs and optimizations
# Author: Generated for livestream project
# Usage: ./compile-ffmpeg.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FFMPEG_VERSION="6.1.1"
INSTALL_DIR="/usr/local"
BUILD_DIR="/tmp/ffmpeg-build"
THREADS=$(nproc)

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is not recommended for security reasons."
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "Cannot detect OS. This script is designed for Ubuntu/Debian/Mint."
        exit 1
    fi
    
    print_status "Detected OS: $OS $VER"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing build dependencies..."
    
    # Update package list
    sudo apt-get update
    
    # Install essential build tools
    sudo apt-get install -y \
        autoconf \
        automake \
        build-essential \
        cmake \
        git-core \
        libass-dev \
        libfreetype6-dev \
        libgnutls28-dev \
        libmp3lame-dev \
        libsdl2-dev \
        libtool \
        libva-dev \
        libvdpau-dev \
        libvorbis-dev \
        libxcb1-dev \
        libxcb-shm0-dev \
        libxcb-xfixes0-dev \
        meson \
        ninja-build \
        pkg-config \
        texinfo \
        wget \
        yasm \
        zlib1g-dev
    
    # Install additional codec libraries
    sudo apt-get install -y \
        libaom-dev \
        libdav1d-dev \
        libfdk-aac-dev \
        libmp3lame-dev \
        libopus-dev \
        libvpx-dev \
        libx264-dev \
        libx265-dev \
        libxvidcore-dev
    
    # Install optional libraries for better performance
    sudo apt-get install -y \
        libavcodec-extra \
        libavformat-dev \
        libavutil-dev \
        libswscale-dev \
        libswresample-dev
    
    print_success "Dependencies installed successfully"
}

# Function to create build directory
setup_build_dir() {
    print_status "Setting up build directory..."
    
    # Remove existing build directory if it exists
    if [[ -d "$BUILD_DIR" ]]; then
        rm -rf "$BUILD_DIR"
    fi
    
    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"
    
    print_success "Build directory created: $BUILD_DIR"
}

# Function to download and extract FFmpeg
download_ffmpeg() {
    print_status "Downloading FFmpeg $FFMPEG_VERSION..."
    
    wget -O ffmpeg-${FFMPEG_VERSION}.tar.xz \
        "https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz"
    
    if [[ ! -f "ffmpeg-${FFMPEG_VERSION}.tar.xz" ]]; then
        print_error "Failed to download FFmpeg"
        exit 1
    fi
    
    print_status "Extracting FFmpeg..."
    tar -xf ffmpeg-${FFMPEG_VERSION}.tar.xz
    cd ffmpeg-${FFMPEG_VERSION}
    
    print_success "FFmpeg downloaded and extracted"
}

# Function to configure FFmpeg build
configure_ffmpeg() {
    print_status "Configuring FFmpeg build..."
    
    ./configure \
        --prefix="$INSTALL_DIR" \
        --enable-gpl \
        --enable-version3 \
        --enable-static \
        --enable-shared \
        --disable-debug \
        --disable-ffplay \
        --disable-indev=sndio \
        --disable-outdev=sndio \
        --cc=gcc \
        --enable-fontconfig \
        --enable-frei0r \
        --enable-gnutls \
        --enable-gpl \
        --enable-libaom \
        --enable-libass \
        --enable-libdav1d \
        --enable-libfdk-aac \
        --enable-libfreetype \
        --enable-libmp3lame \
        --enable-libopus \
        --enable-libvorbis \
        --enable-libvpx \
        --enable-libx264 \
        --enable-libx265 \
        --enable-libxvid \
        --enable-libzimg \
        --enable-nonfree \
        --enable-openssl \
        --enable-pic \
        --enable-pthreads \
        --enable-shared \
        --enable-small \
        --enable-vaapi \
        --enable-vdpau \
        --enable-version3 \
        --enable-x86asm \
        --extra-cflags="-I$INSTALL_DIR/include" \
        --extra-ldflags="-L$INSTALL_DIR/lib" \
        --extra-libs="-lpthread -lm" \
        --ld="g++" \
        --pkg-config-flags="--static"
    
    print_success "FFmpeg configured successfully"
}

# Function to compile FFmpeg
compile_ffmpeg() {
    print_status "Compiling FFmpeg (this may take a while)..."
    print_status "Using $THREADS threads for compilation"
    
    make -j$THREADS
    
    if [[ $? -ne 0 ]]; then
        print_error "Compilation failed"
        exit 1
    fi
    
    print_success "FFmpeg compiled successfully"
}

# Function to install FFmpeg
install_ffmpeg() {
    print_status "Installing FFmpeg..."
    
    sudo make install
    
    # Update library cache
    sudo ldconfig
    
    print_success "FFmpeg installed to $INSTALL_DIR"
}

# Function to verify installation
verify_installation() {
    print_status "Verifying FFmpeg installation..."
    
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION_INSTALLED=$(ffmpeg -version | head -n1 | cut -d' ' -f3)
        print_success "FFmpeg $FFMPEG_VERSION_INSTALLED is installed and working"
        
        # Show configuration
        print_status "FFmpeg configuration:"
        ffmpeg -version | grep "configuration:"
        
        # Show available codecs
        print_status "Available encoders:"
        ffmpeg -encoders | grep -E "(h264|h265|vp8|vp9|aac|mp3|opus)"
        
    else
        print_error "FFmpeg installation verification failed"
        exit 1
    fi
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up build files..."
    
    if [[ -d "$BUILD_DIR" ]]; then
        rm -rf "$BUILD_DIR"
        print_success "Build directory cleaned up"
    fi
}

# Function to show usage
show_usage() {
    echo "FFmpeg Compilation Script for Ubuntu/Debian/Mint"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --version  Set FFmpeg version (default: $FFMPEG_VERSION)"
    echo "  -d, --dir      Set install directory (default: $INSTALL_DIR)"
    echo "  -j, --jobs     Set number of parallel jobs (default: $THREADS)"
    echo "  --cleanup      Only cleanup build files"
    echo ""
    echo "Examples:"
    echo "  $0                    # Compile with default settings"
    echo "  $0 -v 6.0.1          # Compile specific version"
    echo "  $0 -d /opt/ffmpeg    # Install to custom directory"
    echo "  $0 --cleanup          # Clean up build files only"
}

# Main function
main() {
    print_status "Starting FFmpeg compilation script..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--version)
                FFMPEG_VERSION="$2"
                shift 2
                ;;
            -d|--dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            -j|--jobs)
                THREADS="$2"
                shift 2
                ;;
            --cleanup)
                cleanup
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check if running as root
    check_root
    
    # Detect OS
    detect_os
    
    # Install dependencies
    install_dependencies
    
    # Setup build directory
    setup_build_dir
    
    # Download and extract FFmpeg
    download_ffmpeg
    
    # Configure FFmpeg
    configure_ffmpeg
    
    # Compile FFmpeg
    compile_ffmpeg
    
    # Install FFmpeg
    install_ffmpeg
    
    # Verify installation
    verify_installation
    
    # Cleanup
    cleanup
    
    print_success "FFmpeg compilation and installation completed successfully!"
    print_status "You can now use FFmpeg for your livestream project."
}

# Run main function
main "$@"
