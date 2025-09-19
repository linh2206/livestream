# LiveStream Project Map

## 🏗️ Project Architecture Overview

```
livestream/
├── 📁 config/                    # Configuration Files
│   ├── 📁 database/              # Database Configuration
│   │   └── init-mongo.js        # MongoDB initialization script
│   └── 📁 nginx/                # Nginx Configuration
│       ├── Dockerfile           # Nginx Docker image
│       └── nginx.conf           # Nginx reverse proxy config
│
├── 📁 scripts/                   # Automation Scripts
│   ├── app.sh                   # Main app control script
│   └── setup-ssh-server.sh      # SSH server setup for Ubuntu
│
├── 📁 services/                  # Microservices
│   ├── 📁 api/                  # Backend API (NestJS)
│   │   ├── Dockerfile           # API Docker image
│   │   ├── package.json         # API dependencies
│   │   ├── nest-cli.json        # NestJS CLI config
│   │   ├── tsconfig.json        # TypeScript config
│   │   └── 📁 src/              # Source code
│   │       ├── main.ts          # Application entry point
│   │       ├── app.module.ts    # Root module
│   │       ├── app.controller.ts # Root controller
│   │       ├── app.service.ts   # Root service
│   │       ├── 📁 auth/         # Authentication module
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.service.ts
│   │       │   ├── auth.module.ts
│   │       │   ├── 📁 dto/      # Data Transfer Objects
│   │       │   │   ├── login.dto.ts
│   │       │   │   └── register.dto.ts
│   │       │   ├── 📁 guards/   # Authentication guards
│   │       │   │   ├── jwt-auth.guard.ts
│   │       │   │   └── local-auth.guard.ts
│   │       │   └── 📁 strategies/ # Passport strategies
│   │       │       ├── jwt.strategy.ts
│   │       │       └── local.strategy.ts
│   │       ├── 📁 users/        # User management
│   │       │   ├── users.controller.ts
│   │       │   ├── users.service.ts
│   │       │   ├── users.module.ts
│   │       │   ├── 📁 dto/
│   │       │   │   ├── create-user.dto.ts
│   │       │   │   └── update-user.dto.ts
│   │       │   └── 📁 schemas/
│   │       │       └── user.schema.ts
│   │       ├── 📁 streams/      # Stream management
│   │       │   ├── streams.controller.ts
│   │       │   ├── streams.service.ts
│   │       │   ├── streams.module.ts
│   │       │   ├── 📁 dto/
│   │       │   │   ├── create-stream.dto.ts
│   │       │   │   └── update-stream.dto.ts
│   │       │   └── 📁 schemas/
│   │       │       └── stream.schema.ts
│   │       └── 📁 chat/         # Real-time chat
│   │           ├── chat.gateway.ts
│   │           ├── chat.service.ts
│   │           ├── chat.module.ts
│   │           ├── 📁 dto/
│   │           │   └── create-message.dto.ts
│   │           └── 📁 schemas/
│   │               └── message.schema.ts
│   │
│   └── 📁 frontend/             # Frontend (Next.js)
│       ├── Dockerfile           # Frontend Docker image
│       ├── package.json         # Frontend dependencies
│       ├── next.config.js       # Next.js configuration
│       ├── tailwind.config.js   # Tailwind CSS config
│       ├── postcss.config.js    # PostCSS config
│       ├── tsconfig.json        # TypeScript config
│       ├── 📁 app/              # Next.js App Router
│       │   ├── layout.tsx       # Root layout
│       │   └── page.tsx         # Home page
│       ├── 📁 components/       # React components
│       │   ├── Chat.tsx         # Chat component
│       │   └── VideoPlayer.tsx  # Video player component
│       └── 📁 hooks/            # Custom React hooks
│           └── useSocket.ts     # Socket.io hook
│
├── 📁 .github/                  # GitHub Actions CI/CD
│   └── 📁 workflows/
│       ├── ci.yml              # Continuous Integration
│       └── cd.yml              # Continuous Deployment
│
├── 📁 docs/                     # Documentation
│
├── 📁 hls/                      # HLS video files (runtime)
│
├── docker-compose.yml           # Docker Compose configuration
├── Makefile                     # Build automation
├── .env.example                 # Environment variables template
├── .env                         # Environment variables (local)
├── .gitignore                   # Git ignore rules
├── LICENSE                      # License file
└── README.md                    # Project documentation
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
RTMP Input → Nginx RTMP → HLS Output → Frontend Video Player
├── Port 1935 (RTMP)
├── Port 8080 (HLS)
└── Real-time streaming
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

## 🚀 Deployment Flow

### 1. **Local Development**
```bash
make install    # Install dependencies
make start      # Start all services
make status     # Check service status
```

### 2. **Server Setup**
```bash
make setup-ssh  # Configure SSH server
make deploy     # Deploy to server
```

### 3. **CI/CD Pipeline**
```
GitHub Actions
├── ci.yml: Test & Build
└── cd.yml: Deploy to production
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

## 📊 Port Mapping

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | Next.js application |
| Backend API | 9000 | NestJS API server |
| Nginx Web | 8080 | Web interface + HLS |
| Nginx RTMP | 1935 | RTMP streaming input |
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache |
| Streaming | 3002 | Streaming service |

## 🔐 Security Features

- **SSH Hardening** - Secure server access
- **JWT Authentication** - Secure API access
- **Password-less SSH** - Key-based authentication
- **Firewall Rules** - UFW configuration
- **Docker Isolation** - Container security

## 📝 Available Commands

```bash
# Development
make install              # Install dependencies
make start               # Start all services
make stop                # Stop all services
make status              # Show service status
make build               # Build all services
make test                # Run tests

# Deployment
make deploy              # Deploy to server

# Server Setup
make setup-ssh  # Configure SSH server
make ssh-status # Show SSH status

# Maintenance
make clean               # Clean up containers
make logs                # Show service logs
```

## 🎯 Project Goals

1. **Live Streaming** - RTMP to HLS conversion
2. **Real-time Chat** - WebSocket-based messaging
3. **User Management** - Registration and authentication
4. **Stream Management** - Create and manage streams
5. **Responsive Design** - Mobile and desktop support
6. **Easy Deployment** - One-command setup
7. **Security** - Hardened SSH and authentication
