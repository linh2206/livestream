# 🎥 Livestream Platform - Complete Workflow

## 🏗️ System Architecture

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

## 🔄 Complete Data Flow

### 1. Stream Publishing (OBS → System)
```
OBS Studio
    │
    ▼ (RTMP Push)
┌─────────────────┐
│  NGINX RTMP     │ ← Port 1935
│  Server         │
└─────────────────┘
    │
    ▼ (Auto HLS Conversion)
┌─────────────────┐
│  HLS Files      │ ← /app/hls/{streamKey}/
│  - index.m3u8   │
│  - 1.ts         │
│  - 2.ts         │
│  - 3.ts         │
└─────────────────┘
    │
    ▼ (Callback)
┌─────────────────┐
│  Backend API    │ ← on_publish callback
│  - Create Stream│
│  - Update Status│
│  - Store in DB  │
└─────────────────┘
```

### 2. Stream Viewing (Client → System)
```
Web Browser
    │
    ▼ (HTTP Request)
┌─────────────────┐
│  NGINX HTTP     │ ← Port 80
│  Server         │
└─────────────────┘
    │
    ▼ (Route Matching)
┌─────────────────┐
│  Route Handler  │
│  - /api/v1/hls/ │ → Backend HLS Controller
│  - /api/v1/     │ → Backend API
│  - /            │ → Frontend
└─────────────────┘
    │
    ▼ (HLS Request)
┌─────────────────┐
│  Backend HLS    │
│  Controller     │
│  - Check Stream │
│  - Serve Files  │
│  - Modify URLs  │
└─────────────────┘
    │
    ▼ (File Response)
┌─────────────────┐
│  HLS Content    │
│  - Playlist     │
│  - Segments     │
└─────────────────┘
    │
    ▼ (HTTP Response)
┌─────────────────┐
│  Client Player  │
│  - HLS.js       │
│  - Video Player │
└─────────────────┘
```

## 🎯 Detailed Workflow Steps

### Step 1: Stream Setup
1. **OBS Configuration**:
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: `{custom_key}` (e.g., "stream")

2. **RTMP Processing**:
   - NGINX receives RTMP stream
   - Auto-converts to HLS format
   - Stores files in `/app/hls/{streamKey}/`

3. **Backend Callback**:
   - `on_publish` → `POST /api/v1/rtmp/publish`
   - Creates/updates stream in database
   - Sets `isLive: true`, `status: 'active'`

### Step 2: Stream Access
1. **Client Request**:
   - Browser requests: `http://localhost/api/v1/hls/stream`

2. **NGINX Routing**:
   - Matches `/api/v1/hls/` pattern
   - Proxies to Backend: `http://backend:9000`

3. **Backend Processing**:
   - HLS Controller receives request
   - Validates stream exists
   - Reads playlist file: `/app/hls/stream/index.m3u8`
   - Modifies segment URLs: `1.ts` → `/api/v1/hls/stream/1.ts`

4. **Response**:
   - Returns modified playlist with absolute URLs
   - Client can now request segments

### Step 3: Segment Serving
1. **Segment Request**:
   - Client requests: `http://localhost/api/v1/hls/stream/1.ts`

2. **NGINX Processing**:
   - Matches `/api/v1/hls/.*\.ts$` pattern
   - Proxies to Backend with video headers

3. **Backend Response**:
   - Serves binary segment file
   - Sets proper headers: `Content-Type: video/mp2t`

## 🔧 Key Components

### NGINX Configuration
```nginx
# RTMP Server
rtmp {
    server {
        listen 1935;
        application live {
            live on;
            hls on;
            hls_path /app/hls;
            hls_fragment 2s;
            hls_playlist_length 6;
        }
    }
}

# HTTP Server
http {
    server {
        listen 80;
        
        # HLS Routes
        location /api/v1/hls/ {
            proxy_pass http://backend:9000;
        }
        
        # API Routes
        location /api/v1/ {
            proxy_pass http://backend:9000;
        }
        
        # Frontend
        location / {
            proxy_pass http://frontend:3000;
        }
    }
}
```

### Backend Services
- **HLS Controller**: Serves HLS files and modifies URLs
- **RTMP Controller**: Handles stream callbacks
- **Streams Service**: Manages stream data
- **Health Service**: System monitoring

### Database Schema
- **Streams**: `{streamKey, title, hlsUrl, isLive, status}`
- **Users**: Authentication and permissions
- **Chat**: Real-time messaging

## 🚀 Production Features

### Performance Optimizations
- ✅ NGINX caching for HLS segments
- ✅ Gzip compression
- ✅ Connection pooling
- ✅ Optimized HLS fragment settings

### Monitoring & Health
- ✅ Health check endpoints
- ✅ Service status monitoring
- ✅ Real-time metrics
- ✅ Error logging

### Security
- ✅ CORS configuration
- ✅ Input validation
- ✅ JWT authentication
- ✅ Rate limiting

## 📊 System Status

### Current Endpoints
- **Health**: `http://localhost/api/v1/health`
- **Streams**: `http://localhost/api/v1/streams`
- **HLS**: `http://localhost/api/v1/hls/{streamKey}`
- **Frontend**: `http://localhost/`

### Service Health
- ✅ Database: Healthy
- ✅ Redis: Healthy
- ✅ WebSocket: Healthy
- ✅ RTMP: Healthy
- ✅ HLS: Healthy

## 🎯 Ready for Production!

The system is fully optimized, tested, and ready for production use with:
- Clean architecture
- Proper error handling
- Performance optimizations
- Comprehensive monitoring
- Scalable design





