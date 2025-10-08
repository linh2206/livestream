# 🔌 API Documentation

Tài liệu API đầy đủ cho LiveStream Platform Backend.

## 📋 Base Information

- **Base URL**: `http://localhost:9000/api/v1`
- **Content Type**: `application/json`
- **Authentication**: Bearer Token (JWT)

## 🔐 Authentication

### POST /auth/login
Đăng nhập user

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "user|admin"
  }
}
```

### POST /auth/register
Đăng ký user mới

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

### POST /auth/refresh
Refresh access token

**Headers:**
```
Authorization: Bearer <token>
```

## 📺 Stream Management

### GET /streams
Lấy danh sách streams

**Query Parameters:**
- `page`: Số trang (default: 1)
- `limit`: Số items per page (default: 10)
- `status`: Filter by status (`active`, `inactive`)
- `user`: Filter by user ID

**Response:**
```json
{
  "streams": [
    {
      "id": "string",
      "streamKey": "string",
      "title": "string",
      "description": "string",
      "isLive": boolean,
      "status": "active|inactive|error",
      "hlsUrl": "string",
      "thumbnail": "string",
      "viewerCount": number,
      "createdAt": "2023-10-08T10:00:00Z",
      "updatedAt": "2023-10-08T10:00:00Z",
      "user": {
        "id": "string",
        "username": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### POST /streams
Tạo stream mới

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "streamKey": "string" // optional, auto-generated if not provided
}
```

**Response:**
```json
{
  "id": "string",
  "streamKey": "string",
  "title": "string",
  "description": "string",
  "hlsUrl": "string",
  "rtmpUrl": "string",
  "createdAt": "2023-10-08T10:00:00Z"
}
```

### GET /streams/:id
Lấy thông tin stream cụ thể

**Response:**
```json
{
  "id": "string",
  "streamKey": "string",
  "title": "string",
  "description": "string",
  "isLive": boolean,
  "status": "active|inactive|error",
  "hlsUrl": "string",
  "thumbnail": "string",
  "viewerCount": number,
  "createdAt": "2023-10-08T10:00:00Z",
  "updatedAt": "2023-10-08T10:00:00Z",
  "user": {
    "id": "string",
    "username": "string"
  }
}
```

### PUT /streams/:id
Cập nhật stream

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "string",
  "description": "string"
}
```

### DELETE /streams/:id
Xóa stream

**Headers:**
```
Authorization: Bearer <token>
```

## 🎥 HLS Streaming

### GET /hls/:streamKey
Lấy HLS playlist cho stream

**Response:**
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:2.000,
/api/v1/hls/stream/1.ts
#EXTINF:2.000,
/api/v1/hls/stream/2.ts
#EXTINF:2.000,
/api/v1/hls/stream/3.ts
#EXT-X-ENDLIST
```

### GET /hls/:streamKey/:segment
Lấy HLS segment

**Response:**
Binary video segment data

**Headers:**
```
Content-Type: video/mp2t
Cache-Control: public, max-age=3600
```

## 💬 Chat System

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:9000/chat');

// Join chat room
ws.send(JSON.stringify({
  type: 'join',
  roomId: 'stream-id'
}));

// Send message
ws.send(JSON.stringify({
  type: 'message',
  roomId: 'stream-id',
  message: 'Hello world!'
}));

// Listen for messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

### WebSocket Message Types

**Join Room:**
```json
{
  "type": "join",
  "roomId": "string"
}
```

**Leave Room:**
```json
{
  "type": "leave",
  "roomId": "string"
}
```

**Send Message:**
```json
{
  "type": "message",
  "roomId": "string",
  "message": "string"
}
```

**Message Received:**
```json
{
  "type": "message",
  "id": "string",
  "roomId": "string",
  "message": "string",
  "user": {
    "id": "string",
    "username": "string"
  },
  "timestamp": "2023-10-08T10:00:00Z"
}
```

## 👥 User Management

### GET /users/profile
Lấy thông tin profile user hiện tại

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "role": "user|admin",
  "avatar": "string",
  "createdAt": "2023-10-08T10:00:00Z",
  "streams": [
    {
      "id": "string",
      "title": "string",
      "isLive": boolean
    }
  ]
}
```

### PUT /users/profile
Cập nhật profile user

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "avatar": "string"
}
```

### GET /users/:id/streams
Lấy danh sách streams của user

**Response:**
```json
{
  "streams": [
    {
      "id": "string",
      "title": "string",
      "isLive": boolean,
      "status": "active|inactive|error",
      "viewerCount": number,
      "createdAt": "2023-10-08T10:00:00Z"
    }
  ]
}
```

## 🔧 RTMP Management

### POST /rtmp/publish
Callback khi stream được publish (internal)

**Request:**
```json
{
  "streamKey": "string",
  "app": "live",
  "name": "string"
}
```

### POST /rtmp/unpublish
Callback khi stream được unpublish (internal)

**Request:**
```json
{
  "streamKey": "string",
  "app": "live",
  "name": "string"
}
```

## 📊 Analytics

### GET /analytics/streams/:id
Lấy analytics cho stream

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `hour|day|week|month` (default: day)
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```json
{
  "streamId": "string",
  "period": "day",
  "data": {
    "viewerCount": {
      "peak": 150,
      "average": 75,
      "total": 1200
    },
    "duration": {
      "total": 3600,
      "average": 1800
    },
    "chat": {
      "totalMessages": 250,
      "activeUsers": 45
    }
  },
  "timeline": [
    {
      "timestamp": "2023-10-08T10:00:00Z",
      "viewerCount": 50,
      "chatMessages": 10
    }
  ]
}
```

## 🏥 Health & Monitoring

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-10-08T10:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "websocket": "ok",
    "rtmp": "ok"
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

### GET /metrics
Prometheus metrics (nếu enabled)

**Response:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1000

# HELP stream_viewers_current Current number of stream viewers
# TYPE stream_viewers_current gauge
stream_viewers_current{stream_id="stream1"} 50
```

## 🛡️ Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ],
  "timestamp": "2023-10-08T10:00:00Z"
}
```

### HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Validation Error
- **500**: Internal Server Error

## 📝 Rate Limiting

### Limits
- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes
- **Stream Creation**: 5 requests per hour
- **Chat Messages**: 30 messages per minute

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696752000
```

## 🔄 WebSocket Events

### Connection Events
```javascript
// Connection established
ws.onopen = () => {
  console.log('Connected to WebSocket');
};

// Connection closed
ws.onclose = () => {
  console.log('Disconnected from WebSocket');
};

// Error occurred
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Stream Events
```json
// Stream started
{
  "type": "stream_started",
  "streamId": "string",
  "streamKey": "string",
  "timestamp": "2023-10-08T10:00:00Z"
}

// Stream ended
{
  "type": "stream_ended",
  "streamId": "string",
  "streamKey": "string",
  "timestamp": "2023-10-08T10:00:00Z"
}

// Viewer count updated
{
  "type": "viewer_count",
  "streamId": "string",
  "count": 150
}
```

## 🧪 Testing

### Postman Collection
Import collection từ: `docs/postman/LiveStream-API.postman_collection.json`

### cURL Examples
```bash
# Login
curl -X POST http://localhost:9000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Get streams
curl -X GET http://localhost:9000/api/v1/streams \
  -H "Authorization: Bearer <token>"

# Create stream
curl -X POST http://localhost:9000/api/v1/streams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"My Stream","description":"Test stream"}'
```

## 📚 SDK Examples

### JavaScript SDK
```javascript
import { LiveStreamAPI } from '@livestream/sdk';

const api = new LiveStreamAPI({
  baseURL: 'http://localhost:9000/api/v1',
  token: 'your-jwt-token'
});

// Get streams
const streams = await api.streams.list();

// Create stream
const stream = await api.streams.create({
  title: 'My Stream',
  description: 'Test stream'
});

// Join chat
const chat = api.chat.join('stream-id');
chat.onMessage((message) => {
  console.log('New message:', message);
});
```

---

**API Documentation hoàn tất! 🔌**
