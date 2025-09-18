# 🎬 LiveStream App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Ubuntu-lightgrey.svg)](https://github.com/your-username/livestream-app)

A complete live streaming application with real-time chat, likes, and social features - fully containerized with Docker.

## ✨ Features

- 🎥 **Live Streaming**: RTMP input → HLS output
- 💬 **Real-time Chat**: WebSocket-based messaging
- ❤️ **Social Features**: Like, share, follow functionality
- 📱 **Responsive UI**: Mobile-friendly design
- 🐳 **Docker Support**: Fully containerized
- 🔒 **Security**: JWT auth, CORS, rate limiting
- 🌐 **Cross-platform**: macOS and Ubuntu support
- 🎮 **Multiple Streaming**: OBS Studio, FFmpeg, custom commands

## 🚀 Quick Start

### Install & Run (1 command)
```bash
chmod +x scripts/*.sh
./scripts/install.sh
./scripts/start.sh
```

### Access the Application
- **Web Interface**: http://localhost:8080
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

## 🛠️ Management Scripts

| Script | Description |
|--------|-------------|
| `./scripts/install.sh` | Install dependencies (Docker, FFmpeg) |
| `./scripts/start.sh` | Start all services |
| `./scripts/stop.sh` | Stop all services |
| `./scripts/stream.sh` | FFmpeg streaming options |
| `./uninstall.sh` | Complete system cleanup |

## 🏗️ Architecture

### Docker Services
- **nginx**: RTMP ingest + HLS serving
- **backend**: Node.js API server
- **postgres**: Database
- **redis**: Caching
- **websocket**: Real-time chat

### Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript, HLS.js
- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Streaming**: Nginx RTMP module, HLS
- **Real-time**: WebSocket
- **Container**: Docker, Docker Compose

## 📱 Features

### Live Streaming
- RTMP input from OBS/FFmpeg
- HLS output for web players
- Real-time video processing
- Multiple quality options

### Real-time Chat
- WebSocket-based messaging
- User authentication
- Message history
- Emoji support

### Social Features
- Like/unlike streams
- Share functionality
- Follow/unfollow users
- Real-time engagement stats

### Modern UI
- Glass morphism design
- Responsive layout
- Dark/light themes
- Mobile-friendly

## 🔧 Development

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd livestream-app

# Start development environment
./scripts/install.sh
./scripts/start.sh

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

### Environment Variables
```bash
# Database
POSTGRES_DB=livestream
POSTGRES_USER=livestream
POSTGRES_PASSWORD=livestream

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-secret-key
```

## 🚀 Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f docker/docker-compose.yml build

# Start production services
docker-compose -f docker/docker-compose.yml up -d

# Check status
docker-compose -f docker/docker-compose.yml ps
```

### Environment Configuration
- Set production environment variables
- Configure SSL certificates
- Set up reverse proxy (optional)
- Configure monitoring

## 🗑️ Uninstall

Complete removal of all components:
```bash
./uninstall.sh
```

This will remove:
- Docker containers and images
- Project directories
- System files and logs

**⚠️ Warning**: This action cannot be undone!

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Nginx RTMP Module](https://github.com/arut/nginx-rtmp-module) for streaming capabilities
- [HLS.js](https://github.com/video-dev/hls.js/) for video playback
- [Docker](https://www.docker.com/) for containerization
- All open source contributors

## 📞 Support

- 📧 Email: support@livestream-app.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/livestream-app/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-username/livestream-app/discussions)

## 🗺️ Roadmap

- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native/Flutter)
- [ ] Multi-stream support
- [ ] Advanced chat moderation
- [ ] Plugin system
- [ ] Enterprise features

---

**🎬 Enjoy your LiveStream App!**

⭐ Star this repository if you found it helpful!
