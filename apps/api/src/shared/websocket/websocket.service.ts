import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';

export interface SocketUser {
  id: string;
  username: string;
  socketId: string;
  isOnline: boolean;
  room?: string;
}

@Injectable()
export class WebSocketService {
  private server: Server;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private roomUsers: Map<string, Set<string>> = new Map();

  constructor(private redisService: RedisService) {}

  setServer(server: Server) {
    this.server = server;
  }

  // User management
  addUser(userId: string, username: string, socketId: string, room?: string): void {
    const user: SocketUser = {
      id: userId,
      username,
      socketId,
      isOnline: true,
      room,
    };

    this.connectedUsers.set(userId, user);

    // Add to room if specified
    if (room) {
      this.addUserToRoom(userId, room);
    }

    // Update Redis
    this.redisService.sadd('online_users', userId);
    this.redisService.hset('user_sessions', userId, JSON.stringify(user));
  }

  removeUser(userId: string): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      // Remove from room
      if (user.room) {
        this.removeUserFromRoom(userId, user.room);
      }

      this.connectedUsers.delete(userId);
      this.redisService.srem('online_users', userId);
      this.redisService.hdel('user_sessions', userId);
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

  getRoomUserCount(room: string): number {
    const roomUsers = this.roomUsers.get(room);
    return roomUsers ? roomUsers.size : 0;
  }

  // Broadcasting
  broadcastToRoom(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, data);
  }

  broadcastToAll(event: string, data: any): void {
    this.server.emit(event, data);
  }

  sendToUser(userId: string, event: string, data: any): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.server.to(user.socketId).emit(event, data);
    }
  }

  // Stream events
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
    this.broadcastToAll('stream:update', {
      streamId,
      updates,
      timestamp: new Date(),
    });
  }

  broadcastViewerCount(streamId: string, count: number): void {
    this.broadcastToAll('stream:viewer_count', {
      streamId,
      count,
      timestamp: new Date(),
    });
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
}
