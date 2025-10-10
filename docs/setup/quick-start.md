# 🚀 Quick Start Guide

Hướng dẫn cài đặt và chạy LiveStream Platform nhanh nhất.

## 📋 Yêu cầu hệ thống

### Minimum Requirements
- **OS**: Ubuntu 18.04+ / macOS / Windows 10+
- **RAM**: 4GB+
- **Storage**: 10GB free space
- **Network**: Internet connection

### Recommended
- **OS**: Ubuntu 20.04+ / macOS Big Sur+
- **RAM**: 8GB+
- **Storage**: 20GB+ free space
- **CPU**: Multi-core processor

## ⚡ Cài đặt nhanh (5 phút)

### 1. Clone repository
```bash
git clone https://github.com/linh2206/livestream.git
cd livestream
```

### 2. Chạy setup tự động
```bash
# Cài đặt tất cả dependencies và start services
make setup
```

Lệnh này sẽ:
- ✅ Cài đặt Docker và Docker Compose
- ✅ Cài đặt FFmpeg
- ✅ Build và start tất cả services
- ✅ Tạo các thư mục cần thiết

### 3. Kiểm tra services
```bash
# Xem trạng thái services
docker-compose ps

# Xem logs
make logs
```

### 4. Truy cập ứng dụng
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:9000/api/v1
- **RTMP**: rtmp://localhost:1935/live

## 🎥 Test streaming

### 1. Cấu hình OBS Studio
- **Server**: `rtmp://localhost:1935/live`
- **Stream Key**: `test` (hoặc tùy chọn)

### 2. Start streaming
- Click "Start Streaming" trong OBS
- Vào http://localhost:3000 để xem stream

### 3. Kiểm tra stream
```bash
# Kiểm tra HLS files được tạo
ls -la hls/stream/

# Test HLS endpoint
curl http://localhost:8080/api/v1/hls/test
```

## 🔧 Cài đặt thủ công (nếu cần)

### 1. Cài Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# macOS
brew install docker
```

### 2. Cài FFmpeg
```bash
# Quick install (recommended)
make install-ffmpeg

# Hoặc compile từ source
make compile-ffmpeg
```

### 3. Start services
```bash
# Start tất cả services
make start

# Hoặc từng service
docker-compose up -d mongodb redis
docker-compose up -d backend frontend
docker-compose up -d nginx
```

## 🐛 Troubleshooting

### Services không start
```bash
# Kiểm tra logs
make logs

# Restart services
make stop
make start

# Clean và rebuild
make clean
make setup
```

### FFmpeg không hoạt động
```bash
# Kiểm tra FFmpeg
ffmpeg -version

# Reinstall FFmpeg
make install-ffmpeg

# Hoặc check permissions
sudo chmod +x scripts/*.sh
```

### Port conflicts
```bash
# Kiểm tra ports đang sử dụng
netstat -tulpn | grep :3000
netstat -tulpn | grep :9000
netstat -tulpn | grep :1935

# Kill processes nếu cần
sudo kill -9 <PID>
```

### Docker issues
```bash
# Restart Docker
sudo systemctl restart docker

# Clean Docker
docker system prune -af

# Rebuild images
docker-compose build --no-cache
```

## ✅ Verification

Sau khi cài đặt thành công:

1. **Frontend accessible**: http://localhost:3000
2. **Backend API working**: http://localhost:9000/api/v1/health
3. **RTMP server ready**: `rtmp://localhost:1935/live`
4. **FFmpeg installed**: `ffmpeg -version`
5. **Docker services running**: `docker-compose ps`

## 🎯 Next Steps

Sau khi setup thành công:

1. **[Development Workflow](../development/workflow.md)** - Bắt đầu phát triển
2. **[API Documentation](../development/api.md)** - Tìm hiểu API
3. **[Testing Guide](../development/testing.md)** - Viết và chạy tests
4. **[Production Deployment](../deployment/production.md)** - Deploy lên server

## 🆘 Cần giúp đỡ?

- **GitHub Issues**: [Tạo issue](https://github.com/linh2206/livestream/issues)
- **Documentation**: Xem các tài liệu chi tiết khác
- **Community**: Join Discord/Telegram group

---

**Chúc bạn streaming vui vẻ! 🎥**


