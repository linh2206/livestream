# LiveStream System Architecture & Mapping

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        LiveStream System                        │
├─────────────────────────────────────────────────────────────────┤
│ Port 3000 │  Port 8080  │  Port 9000  │  Port 1935  │  Port 27017 │
│ Frontend  │ HLS/API     │ Backend API │ RTMP        │ MongoDB     │
└─────────────────────────────────────────────────────────────────┘
```

## 📡 Port Mapping

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| **Frontend** | 3000 | 3000 | Next.js Web Interface |
| **HLS Streaming** | 8080 | 8080 | HLS Streams & API Proxy |
| **Backend API** | 9000 | 9000 | NestJS REST API |
| **RTMP** | 1935 | 1935 | RTMP Ingest |
| **MongoDB** | 27017 | 27017 | Database |
| **Redis** | 6379 | 6379 | Cache & Sessions |

## 🔄 Data Flow

```
Streamer (OBS) → RTMP:1935 → Nginx RTMP → HLS Segments → Port 8080 → Frontend Port 3000
                                      ↓
                              API:9000 → MongoDB:27017
                                      ↓
                              Redis:6379 (Cache)
```

## 🎯 Service Endpoints

### Frontend (Port 3000)
- **Main Interface**: `http://localhost:3000`
- **Player**: `http://localhost:3000` (with VideoPlayer component)
- **Chat**: `http://localhost:3000` (with Chat component)

### HLS Streaming (Port 8080)
- **HLS Stream**: `http://localhost:8080/hls/{streamName}`
- **API Proxy**: `http://localhost:8080/api/*`
- **WebSocket**: `ws://localhost:8080/socket.io/`
- **RTMP Stats**: `http://localhost:8080/stat`

### Backend API (Port 9000)
- **Health Check**: `http://localhost:9000/health`
- **RTMP Auth**: `http://localhost:9000/rtmp/publish`
- **HLS Serve**: `http://localhost:9000/hls/{streamName}`

### RTMP (Port 1935)
- **Stream URL**: `rtmp://localhost:1935/live`
- **Stream Key**: `stream` (or any name)

## 🛠️ Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `config/nginx/nginx.conf` | Reverse proxy & RTMP |
| `services/api/Dockerfile` | Backend container |
| `services/frontend/Dockerfile` | Frontend container |
| `scripts/app.sh` | Setup & management |

## 🚀 Quick Start

```bash
# Setup everything
./scripts/app.sh setup

# Start streaming
# OBS Settings:
#   Server: rtmp://localhost:1935/live
#   Stream Key: stream

# View stream
# Browser: http://localhost:3000
```

## 🔧 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:9000` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:9000` | WebSocket URL |
| `NEXT_PUBLIC_HLS_URL` | `http://localhost:8080/hls` | HLS Streaming URL |
| `MONGODB_URI` | `mongodb://admin:password@mongodb:27017/livestream` | Database URL |
| `REDIS_URL` | `redis://redis:6379` | Redis URL |

## 📊 Performance Optimizations

### Nginx
- ✅ Gzip compression enabled
- ✅ CORS headers configured
- ✅ Proxy buffering disabled for HLS
- ✅ WebSocket upgrade support
- ✅ RTMP statistics endpoint

### Docker
- ✅ Multi-stage builds
- ✅ Non-root user security
- ✅ Health checks
- ✅ Volume persistence
- ✅ Network isolation

### Frontend
- ✅ HLS.js fallback for browsers
- ✅ Error handling & loading states
- ✅ Responsive design
- ✅ Real-time chat integration

### Backend
- ✅ CORS enabled
- ✅ Graceful shutdown
- ✅ RTMP authentication
- ✅ HLS file serving
- ✅ WebSocket support

## 🔍 Monitoring & Debugging

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service]

# Check RTMP stats
curl http://localhost:8080/stat

# Test HLS stream
curl http://localhost:8080/hls/stream
```

## 🛡️ Security Features

- ✅ Non-root containers
- ✅ Network isolation
- ✅ CORS configuration
- ✅ Input validation
- ✅ Rate limiting (nginx)
- ✅ Health checks

## 📈 Scalability

- ✅ Horizontal scaling ready
- ✅ Load balancer compatible
- ✅ Database clustering support
- ✅ Redis clustering support
- ✅ CDN integration ready
