# 🎥 LiveStream Platform Documentation

Tài liệu hướng dẫn đầy đủ cho LiveStream Platform - một hệ thống streaming video trực tiếp với RTMP input và HLS output.

## 📋 Tổng quan

LiveStream Platform là một giải pháp streaming video hoàn chỉnh bao gồm:

- **Frontend**: Next.js React application
- **Backend**: NestJS API server với WebSocket
- **Database**: MongoDB + Redis
- **Streaming**: NGINX RTMP + HLS conversion
- **Infrastructure**: Docker containerized

## 🚀 Quick Start

### Cài đặt và chạy

```bash
# Clone repository
git clone https://github.com/linh2206/livestream.git
cd livestream

# Setup và start services
make setup

# Hoặc từng bước
make install-ffmpeg  # Cài FFmpeg
make start          # Start Docker services
```

### Truy cập ứng dụng

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:9000/api/v1
- **RTMP Server**: rtmp://localhost:1935/live
- **HLS Streams**: http://localhost:8080/api/v1/hls

## 📚 Tài liệu chi tiết

### 🛠️ [Setup & Installation](./setup/)
- [Quick Start Guide](./setup/quick-start.md)
- [FFmpeg Installation](./setup/ffmpeg.md)
- [Docker Setup](./setup/docker.md)
- [Environment Configuration](./setup/environment.md)

### 💻 [Development](./development/)
- [Development Workflow](./development/workflow.md)
- [Testing Guide](./development/testing.md)
- [API Documentation](./development/api.md)
- [Code Standards](./development/standards.md)

### 🚀 [Deployment](./deployment/)
- [CI/CD Setup](./deployment/cicd.md)
- [Production Deployment](./deployment/production.md)
- [Server Configuration](./deployment/server-config.md)
- [SSL/HTTPS Setup](./deployment/ssl.md)

### 📊 [Monitoring](./monitoring/)
- [Health Checks](./monitoring/health.md)
- [Logging](./monitoring/logging.md)
- [Performance Monitoring](./monitoring/performance.md)
- [Troubleshooting](./monitoring/troubleshooting.md)

## 🎯 Các tính năng chính

### Streaming
- ✅ RTMP input từ OBS Studio
- ✅ Tự động convert sang HLS
- ✅ Low-latency streaming
- ✅ Multiple quality presets

### Web Interface
- ✅ Real-time video player
- ✅ Chat system với WebSocket
- ✅ User authentication
- ✅ Admin dashboard

### API
- ✅ RESTful API
- ✅ WebSocket real-time
- ✅ JWT authentication
- ✅ Rate limiting

### DevOps
- ✅ Docker containerization
- ✅ CI/CD pipeline
- ✅ Health monitoring
- ✅ Auto-scaling ready

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (Port 80/1935)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   RTMP Server   │  │  HTTP Server    │  │  Reverse Proxy  │ │
│  │   (Port 1935)   │  │   (Port 80)     │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │   Backend     │ │ Frontend  │ │  Database   │
        │  (Port 9000)  │ │(Port 3000)│ │   Layer     │
        │               │ │           │ │             │
        │ ┌───────────┐ │ │ ┌───────┐ │ │ ┌─────────┐ │
        │ │HLS Ctrl   │ │ │ │Next.js│ │ │ │MongoDB  │ │
        │ │RTMP Ctrl  │ │ │ │React  │ │ │ │Redis    │ │
        │ │Auth Ctrl  │ │ │ │UI/UX  │ │ │ │         │ │
        │ │Stream Ctrl│ │ │ │       │ │ │ │         │ │
        │ └───────────┘ │ │ └───────┘ │ │ └─────────┘ │
        └───────────────┘ └───────────┘ └─────────────┘
```

## 🔄 Workflow

### Stream Publishing
1. **OBS Studio** → RTMP push to `rtmp://localhost:1935/live/{streamKey}`
2. **NGINX RTMP** → Auto-convert to HLS format
3. **Backend API** → Store stream metadata in database
4. **WebSocket** → Notify clients about new stream

### Stream Viewing
1. **Client** → Request stream via HTTP
2. **NGINX** → Proxy to Backend HLS controller
3. **Backend** → Serve HLS playlist and segments
4. **Client Player** → Play video stream

## 🛠️ Commands hữu ích

```bash
# Development
make start          # Start all services
make stop           # Stop all services
make logs           # View service logs
make clean          # Clean up containers

# Setup
make setup          # Complete setup
make install-ffmpeg # Install FFmpeg
make setup-ssh      # Setup SSH server

# Testing
cd apps/backend && npm test
cd apps/frontend && npm test
```

## 📞 Hỗ trợ

- **GitHub Issues**: [Tạo issue](https://github.com/linh2206/livestream/issues)
- **Documentation**: Xem các tài liệu chi tiết trong thư mục con
- **CI/CD Logs**: Kiểm tra GitHub Actions

## 📄 License

MIT License - Xem file [LICENSE](../LICENSE) để biết thêm chi tiết.

---

**Happy Streaming! 🎥✨**