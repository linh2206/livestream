# LiveStream App

A complete live streaming application with real-time chat, built with modern technologies and clean architecture.

## 🚀 Features

- **Live Streaming**: RTMP input with HLS output
- **Real-time Chat**: WebSocket-based chat system
- **User Management**: Registration, authentication, and profiles
- **Google OAuth**: Login with Google account
- **Stream Management**: Create, manage, and monitor streams
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LiveStream System                        │
├─────────────────────────────────────────────────────────────────┤
│ Port 3000 │  Port 8080  │  Port 9000  │  Port 1935  │  Port 27017 │
│ Frontend  │ HLS/API     │ Backend API │ RTMP        │ MongoDB     │
└─────────────────────────────────────────────────────────────────┘
```

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport strategies
- **Real-time**: Socket.io for WebSocket connections
- **API**: RESTful API with Swagger documentation

### Frontend (Next.js)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks
- **Real-time**: Socket.io client
- **Video Player**: HLS.js for video streaming

### Infrastructure
- **Containerization**: Docker and Docker Compose
- **Database**: MongoDB 7.0
- **Cache**: Redis 7.0
- **Streaming**: Nginx RTMP module
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions for automated testing and deployment

## 📁 Project Structure

```
livestream/
├── config/                     # Configuration files
│   ├── database/              # MongoDB config
│   │   └── init-mongo.js     # MongoDB initialization script
│   └── nginx/                 # Nginx config
│       ├── Dockerfile        # Nginx Docker image
│       └── nginx.conf        # Nginx reverse proxy config
├── scripts/                   # Scripts
│   ├── app.sh                # Main app control script
│   └── setup-ssh-server.sh   # SSH server setup
├── services/
│   ├── api/                  # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/         # Authentication
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── dto/      # Data Transfer Objects
│   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   └── register.dto.ts
│   │   │   │   ├── guards/   # Authentication guards
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── local-auth.guard.ts
│   │   │   │   └── strategies/ # Passport strategies
│   │   │   │       ├── jwt.strategy.ts
│   │   │   │       └── local.strategy.ts
│   │   │   ├── users/        # User management
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-user.dto.ts
│   │   │   │   │   └── update-user.dto.ts
│   │   │   │   └── schemas/
│   │   │   │       └── user.schema.ts
│   │   │   ├── streams/      # Stream management
│   │   │   │   ├── streams.controller.ts
│   │   │   │   ├── streams.service.ts
│   │   │   │   ├── streams.module.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-stream.dto.ts
│   │   │   │   │   └── update-stream.dto.ts
│   │   │   │   └── schemas/
│   │   │   │       └── stream.schema.ts
│   │   │   ├── chat/         # Real-time chat
│   │   │   │   ├── chat.gateway.ts
│   │   │   │   ├── chat.service.ts
│   │   │   │   ├── chat.module.ts
│   │   │   │   ├── dto/
│   │   │   │   │   └── create-message.dto.ts
│   │   │   │   └── schemas/
│   │   │   │       └── message.schema.ts
│   │   │   ├── rtmp/         # RTMP management
│   │   │   │   ├── rtmp.controller.ts
│   │   │   │   ├── rtmp.service.ts
│   │   │   │   ├── rtmp.module.ts
│   │   │   │   └── dto/
│   │   │   │       └── create-stream.dto.ts
│   │   │   ├── main.ts       # Application entry
│   │   │   ├── app.module.ts # Root module
│   │   │   ├── app.controller.ts # Root controller
│   │   │   └── app.service.ts # Root service
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   └── tsconfig.json
│   └── frontend/             # Next.js Frontend
│       ├── app/              # App router
│       │   ├── layout.tsx    # Root layout
│       │   ├── page.tsx      # Home page
│       │   └── globals.css   # Global styles
│       ├── components/       # React components
│       │   ├── Chat.tsx      # Chat component
│       │   ├── VideoPlayer.tsx # Video player component
│       │   ├── UsersTable.tsx # Users table component
│       │   └── BandwidthMonitor.tsx # Bandwidth monitor
│       ├── hooks/            # Custom React hooks
│       │   └── useSocket.ts  # Socket.io hook
│       ├── public/           # Static assets
│       │   ├── favicon.ico
│       │   ├── site.webmanifest
│       │   └── package.json
│       ├── package.json
│       ├── Dockerfile
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       └── tsconfig.json
├── hls/                      # HLS video files (runtime)
├── docker-compose.yml        # Docker Compose configuration
├── docker-compose.yml.bak    # Backup configuration
├── Makefile                  # Build automation
├── .env.example              # Environment variables template
├── LICENSE                   # License file
└── README.md                 # Project documentation
```

## 🔄 Data Flow & Connections

### 1. **Frontend ↔ Backend Communication**
```
Frontend (Next.js) ←→ Backend API (NestJS)
├── HTTP REST API calls
├── WebSocket connections (Socket.io)
└── Authentication (JWT tokens)
```

### 2. **Database Connections**
```
Backend API ←→ MongoDB
├── User data
├── Stream data
├── Chat messages
└── Authentication data
```

### 3. **Streaming Pipeline**
```
Streamer (OBS) → RTMP:1935 → Nginx RTMP → HLS Segments → Port 8080 → Frontend Port 3000
                                      ↓
                              API:9000 → MongoDB:27017
                                      ↓
                              Redis:6379 (Cache)
```

### 4. **Docker Services**
```
docker-compose.yml
├── frontend:3000    (Next.js app)
├── api:9000         (NestJS API)
├── nginx:8080       (Reverse proxy + RTMP)
├── mongodb:27017    (Database)
├── redis:6379       (Cache)
└── streaming:3002   (Streaming service)
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
- **Health Check**: `http://localhost:24190/health`
- **RTMP Auth**: `http://localhost:24190/rtmp/publish`
- **HLS Serve**: `http://localhost:24190/hls/{streamName}`

### RTMP (Port 1935)
- **Stream URL**: `rtmp://localhost:1935/live`
- **Stream Key**: `stream` (or any name)

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- FFmpeg (for streaming)
- Node.js 18+ (for development)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd livestream
```

2. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the application:**
```bash
make start
# or
docker-compose up -d
```

4. **Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:24190
- **Web Interface**: http://localhost:8080

### Streaming

1. **Configure your streaming software:**
- **RTMP URL**: `rtmp://localhost:1935/live`
- **Stream Key**: `stream`

2. **View your stream**: http://localhost:3000

## 🛠️ Available Commands

### Main Script Commands

```bash
./scripts/app.sh [command]
```

**Commands:**
- `install` - Install dependencies and setup
- `setup` - Quick setup (install + start)
- `start` - Start all services
- `stop` - Stop all services
- `clean` - Clean up containers and images
- `install-docker` - Install Docker on Ubuntu
- `create-env` - Create .env file from .env.example

### Make Commands

```bash
make [command]
```

**Development:**
- `make install` - Install dependencies and setup
- `make setup` - Quick setup (install + start)
- `make start` - Start all services
- `make stop` - Stop all services

**Maintenance:**
- `make clean` - Clean up containers and images

## 🔧 Development

### Backend Development

```bash
cd services/api
npm install
npm run start:dev
```

### Frontend Development

```bash
cd services/frontend
npm install
npm run dev
```

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/profile` - Get user profile

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Streams
- `GET /streams` - Get all streams
- `GET /streams/active` - Get active streams
- `POST /streams` - Create stream
- `GET /streams/:id` - Get stream by ID
- `PATCH /streams/:id` - Update stream
- `DELETE /streams/:id` - Delete stream

### RTMP
- `POST /rtmp/publish` - RTMP authentication
- `GET /rtmp/status` - RTMP status

## 🔌 WebSocket Events

### Client to Server
- `join` - Join a stream room
- `chat_message` - Send chat message
- `like` - Like/unlike stream
- `leave` - Leave stream room

### Server to Client
- `chat_message` - Receive chat message
- `online_count` - Update viewer count
- `like` - Like notification

## ⚙️ Configuration

### Environment Variables

Environment files are automatically created during installation from `.env.example` templates:

```bash
# Manual creation (optional - script does this automatically)
./scripts/app.sh create-env
```

**Environment Files:**
- `.env.example` - Root environment template  
- `services/frontend/.env.example` - Frontend environment template

The `.env` files are automatically created from these templates. You can customize them if needed:

```env
# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:24190
NEXT_PUBLIC_WS_URL=ws://localhost:24190
NEXT_PUBLIC_HLS_URL=http://localhost:8080/hls

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/livestream?authSource=admin

# Redis
REDIS_URL=redis://redis:6379

# Production settings
NODE_ENV=production
```

**Note**: The `.env` file is automatically created when you run `./scripts/app.sh install`. No manual setup required!

### Google OAuth Setup

Để sử dụng Google Login, bạn cần cấu hình Google OAuth credentials:

#### Bước 1: Tạo Google OAuth Credentials

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật Google+ API:
   - Vào "APIs & Services" > "Library"
   - Tìm "Google+ API" và bật
4. Tạo OAuth 2.0 credentials:
   - Vào "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Chọn "Web application"
   - Đặt tên: "LiveStream App"
   - Authorized redirect URIs:
     - `http://localhost:9000/auth/google/callback`
     - `http://localhost:24190/auth/google/callback`

#### Bước 2: Cập nhật Environment Variables

Sau khi tạo credentials, cập nhật file `.env`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:9000/auth/google/callback
```

#### Bước 3: Test Google Login

1. Restart API: `docker-compose restart api`
2. Truy cập: `http://localhost:9000/auth/google`
3. Hoặc từ frontend: `http://localhost:3000`

**Lưu ý:**
- Thay thế `your-actual-google-client-id` và `your-actual-google-client-secret` bằng credentials thực tế
- Đảm bảo redirect URI khớp với cấu hình trong Google Console
- Trong production, sử dụng HTTPS URLs

## 🚀 Deployment

### Single Server
```bash
./scripts/app.sh start
```

### Multiple Servers (Docker Swarm)
```bash
./scripts/app.sh multi
```

### GitHub Actions CI/CD

The project includes GitHub Actions for:
- **Testing**: Run tests on all services
- **Building**: Build and push Docker images
- **Deploying**: Deploy to staging/production
- **Security**: Vulnerability scanning

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
- ✅ SSH Hardening - Secure server access
- ✅ JWT Authentication - Secure API access
- ✅ Password-less SSH - Key-based authentication
- ✅ Firewall Rules - UFW configuration
- ✅ Docker Isolation - Container security

## 📈 Scalability

- ✅ Horizontal scaling ready
- ✅ Load balancer compatible
- ✅ Database clustering support
- ✅ Redis clustering support
- ✅ CDN integration ready

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg not found**: 
   ```bash
   # Ubuntu/Debian (recommended: use snap)
   sudo snap install ffmpeg
   
   # Alternative: apt
   sudo apt update && sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

2. **Port conflicts**: Check if ports 8080, 3000, 9000 are available

3. **Database connection**: Ensure MongoDB is running
   ```bash
   ./scripts/app.sh status
   ```

4. **Docker startup issues**: 
   ```bash
   # Check internet connection
   ping google.com
   
   # Clean Docker system
   docker system prune -f
   
   # Try again
   ./scripts/app.sh start
   ```

### Testing

Test your environment:
```bash
# Test local environment
./scripts/app.sh test

# Test production environment  
./scripts/app.sh test-production
```

### Logs

View service logs:
```bash
make logs
# or
docker-compose logs -f
```

### Reset Everything

Complete reset:
```bash
./scripts/app.sh uninstall
./scripts/app.sh install
./scripts/app.sh start
```

## 🔧 Key Technologies

### **Backend Stack**
- **NestJS** - Node.js framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **Passport** - Authentication strategies

### **Frontend Stack**
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication
- **HLS.js** - Video streaming

### **Infrastructure**
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy + RTMP server
- **Redis** - Caching
- **GitHub Actions** - CI/CD

## 🎯 Project Goals

1. **Live Streaming** - RTMP to HLS conversion
2. **Real-time Chat** - WebSocket-based messaging
3. **User Management** - Registration and authentication
4. **Stream Management** - Create and manage streams
5. **Responsive Design** - Mobile and desktop support
6. **Easy Deployment** - One-command setup
7. **Security** - Hardened SSH and authentication

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation