// Application Constants
export const APP_CONSTANTS = {
  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-secret-key',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Database Configuration
  DATABASE: {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/livestream',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // Streaming Configuration
  STREAMING: {
    HLS_BASE_URL: process.env.HLS_BASE_URL || 'http://localhost:9000/api/v1',
    RTMP_BASE_URL: process.env.RTMP_BASE_URL || 'rtmp://localhost:1935',
    NGINX_URL: process.env.NGINX_URL || 'http://localhost:8080',
  },
  
  // API Configuration
  API: {
    BASE_URL: process.env.API_BASE_URL || 'http://localhost:9000/api/v1',
    WS_BASE_URL: process.env.WS_BASE_URL || 'ws://localhost:9000',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  
  // File Paths
  PATHS: {
    HLS_DIR: '/app/hls',
    LOGS_DIR: '/app/logs',
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  
  // Cache TTL (Time To Live)
  CACHE: {
    STREAM_STATUS_TTL: 30, // seconds
    USER_SESSION_TTL: 3600, // 1 hour
    METRICS_TTL: 60, // 1 minute
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  
  // HLS Configuration
  HLS: {
    FRAGMENT_DURATION: parseInt(process.env.HLS_FRAGMENT_DURATION || '2'), // seconds
    PLAYLIST_LENGTH: parseInt(process.env.HLS_PLAYLIST_LENGTH || '6'),
    CLEANUP_INTERVAL: parseInt(process.env.HLS_CLEANUP_INTERVAL || '300'), // 5 minutes
  },
} as const;

// Stream Status Enum
export enum StreamStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  ENDED = 'ended',
}

// User Roles Enum
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

// Error Messages
export const ERROR_MESSAGES = {
  STREAM_NOT_FOUND: 'Stream not found',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access denied',
  INVALID_TOKEN: 'Invalid authentication token',
  STREAM_OFFLINE: 'Stream is currently offline',
  AUTHENTICATION_REQUIRED: 'Authentication required for private stream',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  STREAM_CREATED: 'Stream created successfully',
  STREAM_UPDATED: 'Stream updated successfully',
  STREAM_DELETED: 'Stream deleted successfully',
  STREAM_LIKED: 'Stream liked successfully',
  USER_REGISTERED: 'User registered successfully',
  USER_LOGIN: 'Login successful',
} as const;




