import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';

export interface SocketUser {
  id: string;
  username: string;
  socketId: string;
  isOnline: boolean;
  room?: string;
  lastActivity: Date;
  connectionCount: number;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private roomUsers: Map<string, Set<string>> = new Map();
  
  // Rate limiting
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute
  
  // Connection pooling
  private readonly MAX_CONNECTIONS_PER_USER = 3;
  private readonly MAX_TOTAL_CONNECTIONS = 1000;
  
  // Cleanup intervals
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds

  constructor(private redisService: RedisService) {
    this.startCleanupInterval();
  }

  setServer(server: Server) {
    this.server = server;
  }

  // Rate limiting
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(userId, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }
    
    if (userLimit.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      this.logger.warn(`Rate limit exceeded for user ${userId}`);
      return false;
    }
    
    userLimit.count++;
    return true;
  }

  // Connection management
  private canAcceptConnection(userId: string): boolean {
    // Check total connections
    if (this.connectedUsers.size >= this.MAX_TOTAL_CONNECTIONS) {
      this.logger.warn('Maximum total connections reached');
      return false;
    }
    
    // Check per-user connections
    const existingUser = this.connectedUsers.get(userId);
    if (existingUser && existingUser.connectionCount >= this.MAX_CONNECTIONS_PER_USER) {
      this.logger.warn(`Maximum connections per user reached for ${userId}`);
      return false;
    }
    
    return true;
  }

  // User management
  addUser(userId: string, username: string, socketId: string, room?: string): boolean {
    if (!this.canAcceptConnection(userId)) {
      return false;
    }

    const existingUser = this.connectedUsers.get(userId);
    const user: SocketUser = {
      id: userId,
      username,
      socketId,
      isOnline: true,
      room,
      lastActivity: new Date(),
      connectionCount: existingUser ? existingUser.connectionCount + 1 : 1,
    };

    this.connectedUsers.set(userId, user);

    // Add to room if specified
    if (room) {
      this.addUserToRoom(userId, room);
    }

    // Update Redis
    this.redisService.sadd('online_users', userId);
    this.redisService.hset('user_sessions', userId, JSON.stringify(user));
    
    this.logger.log(`User ${userId} connected (${user.connectionCount} connections)`);
    return true;
  }

  removeUser(userId: string): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      // Decrease connection count
      user.connectionCount--;
      
      if (user.connectionCount <= 0) {
        // Remove from room
        if (user.room) {
          this.removeUserFromRoom(userId, user.room);
        }

        this.connectedUsers.delete(userId);
        this.redisService.srem('online_users', userId);
        this.redisService.hdel('user_sessions', userId);
        
        this.logger.log(`User ${userId} disconnected completely`);
      } else {
        this.logger.log(`User ${userId} disconnected (${user.connectionCount} connections remaining)`);
      }
    }
  }

  getUser(userId: string): SocketUser | undefined {
    return this.connectedUsers.get(userId);
  }

  getOnlineUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }

  // Room management
  addUserToRoom(userId: string, room: string): void {
    if (!this.roomUsers.has(room)) {
      this.roomUsers.set(room, new Set());
    }
    this.roomUsers.get(room)!.add(userId);

    // Update user's room
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.room = room;
    }

    // Update Redis
    this.redisService.sadd(`room:${room}:users`, userId);
  }

  removeUserFromRoom(userId: string, room: string): void {
    const roomUsers = this.roomUsers.get(room);
    if (roomUsers) {
      roomUsers.delete(userId);
      if (roomUsers.size === 0) {
        this.roomUsers.delete(room);
      }
    }

    // Update Redis
    this.redisService.srem(`room:${room}:users`, userId);
  }

  getRoomUsers(room: string): string[] {
    const roomUsers = this.roomUsers.get(room);
    return roomUsers ? Array.from(roomUsers) : [];
  }


  // Cleanup methods
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveUsers();
      this.cleanupRateLimit();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanupInactiveUsers(): void {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (now.getTime() - user.lastActivity.getTime() > inactiveThreshold) {
        this.logger.warn(`Removing inactive user ${userId}`);
        this.removeUser(userId);
      }
    }
  }

  private cleanupRateLimit(): void {
    const now = Date.now();
    for (const [userId, limit] of this.rateLimitMap.entries()) {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(userId);
      }
    }
  }

  // Update user activity
  private updateUserActivity(userId: string): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  // Broadcasting with rate limiting
  broadcastToRoom(room: string, event: string, data: any, userId?: string): void {
    if (userId && !this.checkRateLimit(userId)) {
      return;
    }
    
    this.server.to(room).emit(event, data);
    
    if (userId) {
      this.updateUserActivity(userId);
    }
  }

  broadcastToAll(event: string, data: any, userId?: string): void {
    if (userId && !this.checkRateLimit(userId)) {
      return;
    }
    
    this.server.emit(event, data);
    
    if (userId) {
      this.updateUserActivity(userId);
    }
  }

  sendToUser(userId: string, event: string, data: any): void {
    if (!this.checkRateLimit(userId)) {
      return;
    }
    
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.server.to(user.socketId).emit(event, data);
      this.updateUserActivity(userId);
    }
  }

  // Stream events with throttling
  private streamUpdateThrottle = new Map<string, NodeJS.Timeout>();

  broadcastStreamStart(streamId: string, streamData: any): void {
    this.broadcastToAll('stream:start', {
      streamId,
      data: streamData,
      timestamp: new Date(),
    });
  }

  broadcastStreamStop(streamId: string): void {
    this.broadcastToAll('stream:stop', {
      streamId,
      timestamp: new Date(),
    });
  }

  broadcastStreamUpdate(streamId: string, updates: any): void {
    // Throttle stream updates to prevent spam
    if (this.streamUpdateThrottle.has(streamId)) {
      clearTimeout(this.streamUpdateThrottle.get(streamId));
    }

    const timeout = setTimeout(() => {
      this.broadcastToAll('stream:update', {
        streamId,
        updates,
        timestamp: new Date(),
      });
      this.streamUpdateThrottle.delete(streamId);
    }, 1000); // Throttle to 1 update per second

    this.streamUpdateThrottle.set(streamId, timeout);
  }


  broadcastViewerCount(streamId: string, count: number): void {
    this.broadcastToAll('stream:viewer_count_update', {
      streamId,
      viewerCount: count,
      timestamp: new Date(),
    });
  }

  async getRoomUserCount(room: string): Promise<number> {
    if (!this.server) return 0;
    
    const roomSockets = await this.server.in(room).fetchSockets();
    return roomSockets.length;
  }

  broadcastStreamLike(streamId: string, likeCount: number): void {
    this.broadcastToAll('stream:like', {
      streamId,
      likeCount,
      timestamp: new Date(),
    });
  }

  // Chat events
  broadcastChatMessage(room: string, message: any): void {
    this.broadcastToRoom(room, 'chat:message', {
      ...message,
      timestamp: new Date(),
    });
  }

  broadcastUserTyping(room: string, userId: string, username: string): void {
    this.broadcastToRoom(room, 'chat:typing', {
      userId,
      username,
      timestamp: new Date(),
    });
  }

  broadcastUserStopTyping(room: string, userId: string): void {
    this.broadcastToRoom(room, 'chat:stop_typing', {
      userId,
      timestamp: new Date(),
    });
  }

  // System events
  broadcastBandwidthUpdate(stats: any): void {
    this.broadcastToAll('system:bandwidth', {
      stats,
      timestamp: new Date(),
    });
  }

  broadcastSystemStats(stats: any): void {
    this.broadcastToAll('system:stats', {
      stats,
      timestamp: new Date(),
    });
  }

  // Cleanup on destroy
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all timeouts
    for (const timeout of this.streamUpdateThrottle.values()) {
      clearTimeout(timeout);
    }
    this.streamUpdateThrottle.clear();
    
    // Clear rate limit map
    this.rateLimitMap.clear();
    
    this.logger.log('WebSocket service cleaned up');
  }

  // Get connection stats
  getConnectionStats(): any {
    return {
      totalConnections: this.connectedUsers.size,
      totalRooms: this.roomUsers.size,
      rateLimitEntries: this.rateLimitMap.size,
      streamUpdateThrottles: this.streamUpdateThrottle.size,
    };
  }
}

