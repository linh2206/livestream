# FFmpeg Installation Scripts

This directory contains scripts to install FFmpeg on Ubuntu, Debian, or Mint systems for the livestream project.

## Available Scripts

### 1. Quick Installation (`install-ffmpeg-quick.sh`)
**Recommended for most users**

- Installs FFmpeg from system repositories
- Fast installation (2-5 minutes)
- Includes most common codecs
- Good for development and testing

```bash
./install-ffmpeg-quick.sh
```

### 2. Custom Compilation (`compile-ffmpeg.sh`)
**For production environments**

- Compiles FFmpeg from source with custom optimizations
- Includes additional codecs and libraries
- Takes longer (30-60 minutes) but provides better performance
- Optimized for streaming applications

```bash
./compile-ffmpeg.sh
```

## Features Included

### Quick Installation
- FFmpeg core
- Common codecs (H.264, H.265, VP8, VP9, AAC, MP3, Opus)
- Development libraries
- Documentation

### Custom Compilation
- All quick installation features plus:
- Additional codecs (AV1, x264, x265)
- Hardware acceleration (VA-API, VDPAU)
- Optimized for your specific CPU
- Static and shared libraries
- Custom installation directory

## Usage Examples

### Basic Usage
```bash
# Quick installation
./install-ffmpeg-quick.sh

# Custom compilation
./compile-ffmpeg.sh
```

### Advanced Usage
```bash
# Compile specific version
./compile-ffmpeg.sh -v 6.0.1

# Install to custom directory
./compile-ffmpeg.sh -d /opt/ffmpeg

# Use specific number of CPU cores
./compile-ffmpeg.sh -j 8

# Clean up build files
./compile-ffmpeg.sh --cleanup
```

## System Requirements

### Minimum Requirements
- Ubuntu 18.04+ / Debian 10+ / Linux Mint 19+
- 2GB RAM
- 5GB free disk space
- Internet connection

### Recommended for Compilation
- Ubuntu 20.04+ / Debian 11+ / Linux Mint 20+
- 4GB+ RAM
- 10GB+ free disk space
- Multi-core CPU (4+ cores recommended)

## Verification

After installation, verify FFmpeg is working:

```bash
# Check version
ffmpeg -version

# List available encoders
ffmpeg -encoders

# Test basic functionality
ffmpeg -f lavfi -i testsrc=duration=10:size=320x240:rate=1 test.mp4
```

## Troubleshooting

### Common Issues

1. **Permission denied**
   ```bash
   chmod +x *.sh
   ```

2. **Missing dependencies**
   ```bash
   sudo apt-get update
   sudo apt-get install build-essential
   ```

3. **Compilation fails**
   - Check available RAM (need at least 2GB)
   - Ensure all dependencies are installed
   - Try with fewer parallel jobs: `./compile-ffmpeg.sh -j 2`

4. **FFmpeg not found after installation**
   ```bash
   sudo ldconfig
   source ~/.bashrc
   ```

### Getting Help

```bash
# Show script help
./compile-ffmpeg.sh --help

# Check FFmpeg help
ffmpeg -h
```

## Integration with Livestream Project

These scripts are designed to work with the livestream project's requirements:

- **RTMP streaming**: H.264/H.265 encoders
- **HLS streaming**: MP4 container support
- **Chat integration**: Audio codec support
- **Monitoring**: Hardware acceleration for better performance

## Performance Tips

1. **For streaming servers**: Use custom compilation with hardware acceleration
2. **For development**: Quick installation is sufficient
3. **For production**: Compile with specific optimizations for your hardware
4. **For Docker**: Use multi-stage builds with these scripts

## Security Notes

- Scripts require sudo access for system installation
- Custom compilation builds from source (more secure)
- Quick installation uses system packages (faster but less control)

## License

These scripts are provided as-is for the livestream project. FFmpeg is licensed under GPL/LGPL depending on configuration.
