# 🎬 LiveStream App

A complete live streaming application with real-time chat, likes, and social features - fully containerized with Docker.

## 🚀 Quick Start

### Install & Run (1 command)
```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

### Start Application
```bash
./scripts/start.sh
```

### Stop Application
```bash
./scripts/stop.sh
```

### Test Stream
```bash
./scripts/stream.sh
```

## 🎯 Features

- **🎥 Live Streaming**: RTMP input → HLS output
- **💬 Real-time Chat**: WebSocket-based messaging
- **❤️ Social Features**: Like, share, follow
- **📱 Responsive UI**: Mobile-friendly design
- **🐳 Docker**: Fully containerized
- **🔒 Secure**: JWT auth, CORS, rate limiting

## 🌐 URLs

- **Main App**: http://localhost:8080
- **RTMP Input**: rtmp://localhost:1935/live
- **Stream Key**: stream
- **HLS Output**: http://localhost:8080/hls/stream.m3u8

## 🎮 Streaming Options

### Option 1: OBS Studio
1. Open OBS Studio
2. Go to Settings → Stream
3. Set Service to "Custom..."
4. Server: `rtmp://localhost:1935/live`
5. Stream Key: `stream`
6. Click "Start Streaming"

### Option 2: FFmpeg
```bash
# Test stream with color bars
./scripts/stream.sh

# Custom FFmpeg command
ffmpeg -f avfoundation -i "0:0" -c:v libx264 -preset veryfast -c:a aac -f flv rtmp://localhost:1935/live/stream
```

### Option 3: Other Streaming Software
- **XSplit**: Use same RTMP settings as OBS
- **Wirecast**: Server: `rtmp://localhost:1935/live`, Key: `stream`
- **vMix**: Custom RTMP output with same settings

## 🐳 Docker Services

- **nginx**: RTMP ingest + HLS serving
- **backend**: Node.js API server
- **postgres**: Database
- **redis**: Caching
- **websocket**: Real-time chat

## 📁 Project Structure

```
├── scripts/           # Management scripts
├── docker/           # Docker configuration
├── web/              # Frontend files
└── README.md         # This file
```

## 🔧 Management

```bash
# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Restart services
docker-compose -f docker/docker-compose.yml restart

# Rebuild
docker-compose -f docker/docker-compose.yml build --no-cache
```

## 🛠️ Development

### API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/streams` - List streams
- `GET /api/chat/:streamId` - Chat messages

### WebSocket Events
- `join` - Join stream room
- `chat_message` - Send message
- `like` - Like/unlike stream

---

**🎬 Enjoy your LiveStream App!**