# 🎯 Livestream Platform

Professional livestreaming platform với RTMP, HLS, real-time chat, user management, và bandwidth monitoring.

## 🚀 Quick Start

```bash
# Setup toàn bộ
make setup

# Truy cập
# Frontend: http://localhost:3000
# API: http://localhost:9000/api/v1
# HLS: http://localhost:8080/hls
# RTMP: rtmp://localhost:1935/live

# Admin login
# Email: admin@livestream.com
# Password: admin123
```

## 📁 Cấu trúc Project

```
livestream/
├── apps/
│   ├── api/                 # NestJS Backend (Port 9000)
│   └── frontend/            # Next.js Frontend (Port 3000)
├── infrastructure/
│   └── nginx/               # RTMP/HLS Server (Ports 1935/8080)
├── config/
│   └── database/            # MongoDB init
├── scripts/                 # Setup & management
├── docker-compose.yml       # Container orchestration
└── Makefile                 # Commands
```

## 🎯 Features

- ✅ **RTMP Streaming** (Port 1935)
- ✅ **HLS Playback** (Port 8080)
- ✅ **Real-time Chat** (WebSocket)
- ✅ **User Management** (JWT Auth)
- ✅ **Bandwidth Monitoring**
- ✅ **Online Users Tracking**
- ✅ **Stream Liking**
- ✅ **Admin Panel**

## 🔧 Commands

```bash
make setup   # Setup toàn bộ
make start   # Start services
make stop    # Stop services
make logs    # View logs
make clean   # Clean everything
```

## 🎥 Streaming

**Publish**: `rtmp://localhost:1935/live/{streamKey}`  
**Playback**: `http://localhost:8080/hls/{streamKey}/index.m3u8`

## 🔒 Security

- JWT authentication
- Password hashing
- CORS configuration
- Input validation
- Role-based access

## 🚀 Production Ready

- Docker containerization
- Environment configuration
- Health checks
- Error handling
- Scalable architecture

---
**Ready to use!** 🎉