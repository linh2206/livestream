# Livestream Application

A complete livestreaming platform built with Next.js, NestJS, MongoDB, Redis, and Socket.IO.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Deployment

1. **Clone the repository**
```bash
   git clone <repository-url>
   cd livestream
   ```

2. **Deploy the application**
   ```bash
   ./deploy.sh
   ```

   Or manually:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:9000
   - RTMP Server: rtmp://localhost:1935

## 🏗️ Architecture

### Services
- **Frontend** (Next.js): User interface and streaming player
- **Backend** (NestJS): API server and WebSocket gateway
- **MongoDB**: Database for users, streams, and chat messages
- **Redis**: Caching and session storage
- **Nginx**: Reverse proxy and RTMP server
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboard

### Features
- ✅ User authentication and authorization
- ✅ Live streaming with HLS
- ✅ Real-time chat with Socket.IO
- ✅ Viewer count tracking
- ✅ Like/unlike functionality
- ✅ Admin user management
- ✅ Responsive design
- ✅ Production-ready deployment

## 🔧 Configuration

### Environment Variables
The application uses the following environment variables:

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:9000/api/v1)
- `NEXT_PUBLIC_WS_URL`: WebSocket URL (default: ws://localhost:9000)
- `NEXT_PUBLIC_RTMP_URL`: RTMP server URL (default: rtmp://localhost:1935)

### Ports
- 3000: Frontend
- 9000: Backend API
- 80: Nginx (HTTP)
- 1935: RTMP
- 27017: MongoDB
- 6379: Redis
- 9090: Prometheus
- 8080: Grafana

## 📱 Usage

### For Streamers
1. Register/Login at http://localhost:3000/login
2. Create a new stream
3. Use OBS or similar software to stream to: `rtmp://localhost:1935/live/{stream_key}`
4. Share your stream URL with viewers

### For Viewers
1. Visit http://localhost:3000/streams
2. Click on any live stream to watch
3. Use the chat feature to interact with other viewers
4. Like streams to show support

### For Admins
1. Login with admin credentials
2. Access admin panel at http://localhost:3000/admin/users
3. Manage users, roles, and system settings

## 🔍 Monitoring

### Prometheus Metrics
- Access: http://localhost:9090
- Monitor system performance and application metrics

### Grafana Dashboards
- Access: http://localhost:8080
- Default credentials: admin/admin
- View detailed system and application dashboards

## 🛠️ Development

### Local Development
```bash
# Backend
cd apps/backend
npm install
npm run start:dev

# Frontend
cd apps/frontend
npm install
npm run dev
```

### Testing
```bash
# Run all tests
docker-compose exec backend npm test
docker-compose exec frontend npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   docker-compose logs [service-name]
   ```

2. **Port conflicts**
   - Check if ports 3000, 9000, 80, 1935 are available
   - Modify docker-compose.yml if needed

3. **Database connection issues**
```bash
   docker-compose restart mongodb redis
   ```

4. **Build failures**
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose up -d --build
   ```

### Health Checks
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs backend
docker-compose logs frontend
```

## 📝 API Documentation

### Authentication
- POST `/api/v1/auth/login` - User login
- POST `/api/v1/auth/register` - User registration
- GET `/api/v1/auth/profile` - Get user profile

### Streams
- GET `/api/v1/streams` - List all streams
- GET `/api/v1/streams/:id` - Get stream details
- POST `/api/v1/streams/:id/like` - Like/unlike stream

### WebSocket Events
- `join_stream` - Join stream room
- `leave_stream` - Leave stream room
- `join_stream_chat` - Join chat room
- `send_message` - Send chat message
- `stream:viewer_count_update` - Viewer count updates

## 🚀 Production Deployment

### Security Considerations
- Change default passwords
- Use HTTPS in production
- Configure proper CORS settings
- Set up SSL certificates
- Use environment-specific configurations

### Scaling
- Use Docker Swarm or Kubernetes for orchestration
- Set up load balancers
- Configure database clustering
- Implement CDN for static assets

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team.