# LiveStream Platform

A complete livestreaming platform built with Next.js, NestJS, MongoDB, Redis, and Socket.IO. Optimized for Docker deployment with comprehensive monitoring and management tools.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git
- Ubuntu/Debian system (for installation scripts)

### One-Command Setup

```bash
# Clone and setup everything
git clone <repository-url>
cd livestream
make setup
```

### Manual Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd livestream
```

2. **Install system dependencies**
```bash
./scripts/install-all.sh
```

3. **Build and start services**
```bash
./scripts/build-start.sh
```

4. **Access the application**
   - Frontend: ${FRONTEND_URL:-http://localhost:3000}
   - Backend API: ${API_BASE_URL:-http://localhost:9000/api/v1}
   - Grafana: ${GRAFANA_URL:-http://localhost:8000} (admin/admin123)
   - Prometheus: ${PROMETHEUS_URL:-http://localhost:9090}
   - RTMP Server: ${RTMP_BASE_URL:-rtmp://localhost:1935}

## 🏗️ Architecture

### Core Services
- **Frontend** (Next.js): Modern React-based user interface
- **Backend** (NestJS): RESTful API and WebSocket gateway
- **MongoDB**: Primary database for users, streams, and chat
- **Redis**: Caching, session storage, and real-time data
- **Nginx RTMP**: RTMP server for live streaming ingestion

### Monitoring & Observability
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Comprehensive monitoring dashboards
- **Node Exporter**: System metrics
- **MongoDB Exporter**: Database performance metrics
- **Redis Exporter**: Cache performance metrics

### Key Features
- ✅ **User Management**: Authentication, authorization, profiles
- ✅ **Live Streaming**: RTMP ingestion with HLS output
- ✅ **Real-time Chat**: Socket.IO powered chat system
- ✅ **Viewer Analytics**: Real-time viewer count and engagement
- ✅ **Admin Dashboard**: User management and system monitoring
- ✅ **Health Monitoring**: Comprehensive health checks
- ✅ **Auto-scaling**: Docker-based horizontal scaling
- ✅ **Security**: JWT authentication, CORS, rate limiting

## 📁 Project Structure

```
livestream/
├── apps/                    # Application code
│   ├── backend/            # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/    # Feature modules
│   │   │   │   ├── auth/   # Authentication
│   │   │   │   ├── chat/   # Real-time chat
│   │   │   │   ├── streams/# Stream management
│   │   │   │   ├── users/  # User management
│   │   │   │   └── ...
│   │   │   └── shared/     # Shared utilities
│   │   └── Dockerfile
│   └── frontend/           # Next.js application
│       ├── src/
│       │   ├── app/        # App router pages
│       │   ├── components/ # React components
│       │   └── lib/        # Utilities and hooks
│       └── Dockerfile
├── config/                 # Configuration files
│   ├── database/          # Database initialization
│   ├── grafana/           # Grafana dashboards
│   ├── nginx/             # Nginx configuration
│   └── prometheus/        # Prometheus configuration
├── scripts/               # Management scripts
│   ├── install-all.sh     # System installation
│   ├── build-start.sh     # Build and start services
│   ├── clean-all.sh       # Cleanup utilities
│   └── ...                # Other management scripts
├── docker-compose.yml     # Service orchestration
├── Makefile              # Development commands
└── README.md             # This file
```

## 🛠️ Development

### Available Commands

```bash
# Quick setup
make setup

# Individual operations
make install    # Install system dependencies
make build      # Build and start services
make start      # Start services
make stop       # Stop services
make clean      # Clean up containers
make logs       # View service logs

# Admin operations
make reset-password # Reset admin password to default
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your settings
```

Key configuration options:
- **Ports**: Customize service ports
- **JWT Secret**: Auto-generated if not set
- **Google OAuth**: Optional authentication
- **URLs**: Auto-configured from ports

### Development Workflow

1. **Start development environment**
```bash
make build
```

2. **View logs**
```bash
make logs
# Or specific service: docker-compose logs -f backend
```

3. **Stop services**
```bash
make stop
```

4. **Clean and rebuild**
```bash
make clean
make build
```

## 🔧 Configuration

### Port Configuration
- Frontend: 3000
- Backend API: 9000
- MongoDB: 27017
- Redis: 6379
- RTMP: 1935
- Grafana: 8000
- Prometheus: 9090

### Environment Variables
See `.env.example` for all available configuration options.

### Docker Services
All services run in Docker containers with:
- Health checks
- Resource limits
- Auto-restart policies
- Network isolation

## 📊 Monitoring

### Grafana Dashboards
Access Grafana at ${GRAFANA_URL:-http://localhost:8000} (admin/admin123)

Available dashboards:
- **System Health**: Overall system status
- **Application Metrics**: API and service performance
- **Database Performance**: MongoDB and Redis metrics
- **Network Monitoring**: Traffic and connectivity
- **Streaming Performance**: RTMP and HLS metrics

### Prometheus Metrics
Access Prometheus at ${PROMETHEUS_URL:-http://localhost:9090}

Key metrics:
- HTTP request rates and latencies
- Database connection pools
- Memory and CPU usage
- Custom application metrics

## 🔐 Security

### Authentication
- JWT-based authentication
- Google OAuth integration (optional)
- Password hashing with bcrypt
- Session management with Redis

### Security Features
- CORS configuration
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection

## 🚀 Deployment

### Production Deployment

1. **Configure environment**
```bash
cp .env.example .env
# Update production values
```

2. **Deploy with Docker**
```bash
docker-compose -f docker-compose.yml up -d --build
```

3. **Setup monitoring**
- Access Grafana dashboards
- Configure alerts in Prometheus
- Monitor system health

### Scaling

The platform supports horizontal scaling:
- Multiple backend instances
- Load balancer configuration
- Database clustering
- Redis clustering

## 🐛 Troubleshooting

### Common Issues

1. **Services not starting**
```bash
docker-compose logs [service-name]
```

2. **Port conflicts**
```bash
# Check port usage
netstat -tulpn | grep :PORT
# Update .env file with different ports
```

3. **Database connection issues**
```bash
# Check MongoDB container
docker-compose logs mongodb
```

4. **Reset admin user**
```bash
make reset-password
```

### Health Checks

All services include health checks:
```bash
# Check service health
docker-compose ps
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/profile` - Get user profile

### Stream Endpoints
- `GET /api/v1/streams` - List streams
- `POST /api/v1/streams` - Create stream
- `GET /api/v1/streams/:id` - Get stream details

### Chat Endpoints
- WebSocket connection for real-time chat
- Message history API
- Online users tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the logs with `make logs`
- Open an issue on GitHub

---

**Built with ❤️ for the livestreaming community**