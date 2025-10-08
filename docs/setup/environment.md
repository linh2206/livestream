# 🔧 Environment Configuration

Hướng dẫn cấu hình environment variables và settings cho LiveStream Platform.

## 📋 Environment Variables

### Backend (.env)
```bash
# Database
MONGODB_URI=mongodb://mongodb:27017/livestream
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Server
PORT=9000
NODE_ENV=development

# RTMP/HLS
RTMP_BASE_URL=rtmp://localhost:1935/live
HLS_BASE_URL=http://localhost:8080/api/v1/hls

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=/app/uploads

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Frontend (.env.local)
```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:9000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:9000

# App
NEXT_PUBLIC_APP_NAME=LiveStream Platform
NEXT_PUBLIC_APP_VERSION=1.0.0

# Features
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_ADMIN=true
```

### Docker Compose (.env)
```bash
# Services
COMPOSE_PROJECT_NAME=livestream
COMPOSE_FILE=docker-compose.yml

# Networks
NETWORK_NAME=livestream_network

# Volumes
MONGODB_DATA_PATH=./data/mongodb
REDIS_DATA_PATH=./data/redis
HLS_PATH=./hls
VOD_PATH=./vod
LOGS_PATH=./logs
```

## 🐳 Docker Configuration

### docker-compose.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
      - ./config/database/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: ./apps/backend
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/livestream
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    ports:
      - "9000:9000"

  frontend:
    build: ./apps/frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:9000/api/v1
    depends_on:
      - backend
    ports:
      - "3000:3000"

  nginx:
    image: nginx:alpine
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./hls:/app/hls
      - ./vod:/app/vod
    ports:
      - "80:80"
      - "1935:1935"
    depends_on:
      - backend
      - frontend

volumes:
  mongodb_data:
  redis_data:
```

## 🔐 Security Configuration

### Production Security
```bash
# Backend Security
JWT_SECRET=<strong-random-secret>
BCRYPT_ROUNDS=12
SESSION_SECRET=<another-random-secret>

# HTTPS
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# CORS (Production)
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting (Strict)
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=50

# File Upload Security
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,video/mp4
```

### Database Security
```bash
# MongoDB
MONGODB_AUTH_SOURCE=admin
MONGODB_USERNAME=livestream_user
MONGODB_PASSWORD=<secure-password>

# Redis
REDIS_PASSWORD=<redis-password>
REDIS_TLS=true
```

## 🌍 Environment Profiles

### Development
```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=*
DEBUG=true
HOT_RELOAD=true
```

### Staging
```bash
# .env.staging
NODE_ENV=staging
LOG_LEVEL=info
CORS_ORIGIN=https://staging.yourdomain.com
DEBUG=false
HOT_RELOAD=false
```

### Production
```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=error
CORS_ORIGIN=https://yourdomain.com
DEBUG=false
HOT_RELOAD=false
```

## 📊 Monitoring Configuration

### Health Checks
```bash
# Health check intervals
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics
```

### Logging
```bash
# Log levels
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_PATH=/app/logs/app.log

# Log rotation
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
```

## 🔧 Configuration Files

### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:9000;
    }
    
    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        
        location /api/v1/ {
            proxy_pass http://backend;
        }
        
        location / {
            proxy_pass http://frontend;
        }
    }
}

rtmp {
    server {
        listen 1935;
        application live {
            live on;
            hls on;
            hls_path /app/hls;
            hls_fragment 2s;
            hls_playlist_length 6s;
        }
    }
}
```

### MongoDB Init Script
```javascript
// config/database/init-mongo.js
db = db.getSiblingDB('livestream');

db.createUser({
  user: 'livestream_user',
  pwd: 'livestream_password',
  roles: [
    { role: 'readWrite', db: 'livestream' }
  ]
});

// Create collections
db.createCollection('users');
db.createCollection('streams');
db.createCollection('chats');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.streams.createIndex({ streamKey: 1 }, { unique: true });
```

## 🚀 Deployment Configuration

### CI/CD Environment Variables
```bash
# GitHub Secrets
STAGING_HOST=192.168.1.100
STAGING_USERNAME=ubuntu
STAGING_SSH_KEY=<private-ssh-key>

PRODUCTION_HOST=123.45.67.89
PRODUCTION_USERNAME=ubuntu
PRODUCTION_SSH_KEY=<private-ssh-key>

# Docker Registry
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password
DOCKER_REGISTRY=your-registry.com
```

## ✅ Configuration Validation

### Environment Check Script
```bash
#!/bin/bash
# scripts/check-env.sh

echo "Checking environment configuration..."

# Check required variables
required_vars=(
    "MONGODB_URI"
    "REDIS_URL"
    "JWT_SECRET"
    "NEXT_PUBLIC_API_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

echo "✅ All required environment variables are set!"
```

## 🔄 Configuration Management

### Environment Switching
```bash
# Switch to development
cp .env.development .env
make restart

# Switch to staging
cp .env.staging .env
make restart

# Switch to production
cp .env.production .env
make restart
```

### Configuration Backup
```bash
# Backup current configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
    .env* \
    config/ \
    docker-compose.yml
```

## 🆘 Troubleshooting

### Common Issues

1. **Environment variables not loaded**
   ```bash
   # Check .env file exists
   ls -la .env*
   
   # Validate syntax
   cat .env | grep -v '^#' | grep -v '^$'
   ```

2. **Docker environment issues**
   ```bash
   # Check environment in container
   docker-compose exec backend env
   
   # Restart with clean environment
   docker-compose down
   docker-compose up -d
   ```

3. **Database connection issues**
   ```bash
   # Test MongoDB connection
   docker-compose exec mongodb mongosh --eval "db.runCommand('ping')"
   
   # Test Redis connection
   docker-compose exec redis redis-cli ping
   ```

---

**Configuration hoàn tất! 🎯**
