# LiveStream App

A complete live streaming application with real-time chat, built with modern technologies and clean architecture.

## 🚀 Features

- **Live Streaming**: RTMP input with HLS output
- **Real-time Chat**: WebSocket-based chat system
- **User Management**: Registration, authentication, and profiles
- **Stream Management**: Create, manage, and monitor streams
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

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
│   └── nginx/                 # Nginx config
├── scripts/                   # Scripts
│   ├── app.sh                # Main app control script
│   └── setup-ssh-server.sh   # SSH server setup
├── services/
│   ├── api/                  # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/         # Authentication
│   │   │   ├── users/        # User management
│   │   │   ├── streams/       # Stream management
│   │   │   ├── chat/          # Chat & WebSocket
│   │   │   └── main.ts        # Application entry
│   │   ├── package.json
│   │   └── Dockerfile
│   └── frontend/              # Next.js Frontend
│       ├── app/               # App router
│       ├── components/        # React components
│       ├── hooks/             # Custom hooks
│       ├── package.json
│       └── Dockerfile
├── .github/
│   └── workflows/          # GitHub Actions
│       ├── ci.yml         # Continuous Integration
│       └── cd.yml         # Continuous Deployment
├── docker-compose.yml     # Docker Compose
├── Makefile              # Build automation
├── .env.example          # Environment variables
└── README.md
```

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
- **Backend API**: http://localhost:9000
- **Web Interface**: http://localhost:8080

### Available Commands

```bash
make help          # Show all available commands
make install       # Install dependencies
make start         # Start all services
make stop          # Stop all services
make status        # Show service status
make build         # Build all services
make test          # Run tests
make deploy        # Deploy to server
make setup-ssh     # Configure SSH server for Ubuntu
make clean         # Clean up containers and images
make logs          # Show service logs
```

### Streaming

1. **Configure your streaming software:**
- **RTMP URL**: `rtmp://localhost:1935/live`
- **Stream Key**: `stream`

2. **View your stream**: http://localhost:8080

## 🛠️ Available Commands

### Main Script Commands

```bash
./scripts/livestream.sh [command]
```

**Commands:**
- `install` - Install dependencies and setup
- `start` - Start all services
- `stop` - Stop all services
- `status` - Show service status
- `stream` - Start streaming
- `test` - Test local environment
- `test-production` - Test production environment
- `clean` - Clean up (keep code)
- `uninstall` - Complete removal
- `help` - Show help

### Make Commands

```bash
make [command]
```

**Development:**
- `make install` - Install dependencies and setup
- `make start` - Start all services
- `make stop` - Stop all services
- `make status` - Show service status
- `make build` - Build all services
- `make test` - Run tests

**Deployment:**
- `make deploy` - Deploy to single server
- `make deploy-multi` - Deploy to multiple servers

**Maintenance:**
- `make clean` - Clean up containers and images
- `make logs` - Show service logs

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

The `.env` file is automatically created during installation from `env.example`. You can customize it if needed:

```env
# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key

# Frontend URL
FRONTEND_URL=http://localhost:8080

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/livestream?authSource=admin

# Redis
REDIS_URL=redis://redis:6379

# Production settings
NODE_ENV=production
```

**Note**: The `.env` file is automatically created when you run `./scripts/livestream.sh install`. No manual setup required!

## 🚀 Deployment

### Single Server
```bash
./scripts/livestream.sh start
```

### Multiple Servers (Docker Swarm)
```bash
./scripts/livestream.sh multi
```

### GitHub Actions CI/CD

The project includes GitHub Actions for:
- **Testing**: Run tests on all services
- **Building**: Build and push Docker images
- **Deploying**: Deploy to staging/production
- **Security**: Vulnerability scanning

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
   ./scripts/livestream.sh status
   ```

4. **Docker startup issues**: 
   ```bash
   # Check internet connection
   ping google.com
   
   # Clean Docker system
   docker system prune -f
   
   # Try again
   ./scripts/livestream.sh start
   ```

### Testing

Test your environment:
```bash
# Test local environment
./scripts/livestream.sh test

# Test production environment  
./scripts/livestream.sh test-production
```

### Logs

View service logs:
```bash
make logs
# or
docker-compose -f deployments/docker/docker-compose.single.yml logs -f
```

### Reset Everything

Complete reset:
```bash
./scripts/livestream.sh uninstall
./scripts/livestream.sh install
./scripts/livestream.sh start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation