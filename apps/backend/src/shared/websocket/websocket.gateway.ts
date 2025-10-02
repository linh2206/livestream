import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@WSGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:9000',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private webSocketService: WebSocketService) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
    console.log('🚀 WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    
    // Extract user info from handshake (if authenticated)
    const user = client.handshake.auth?.user;
    if (user) {
      const success = this.webSocketService.addUser(user.id, user.username, client.id);
      if (!success) {
        console.log(`Connection rejected for user ${user.id} - limits exceeded`);
        client.disconnect(true);
        return;
      }
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Find and remove user
    const user = Array.from(this.webSocketService.getOnlineUsers()).find(
      u => u.socketId === client.id
    );
    
    if (user) {
      this.webSocketService.removeUser(user.id);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { room: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, userId } = data;
    
    await client.join(room);
    this.webSocketService.addUserToRoom(userId, room);
    
    // Notify room about new user
    this.webSocketService.broadcastToRoom(room, 'user:join', {
      userId,
      timestamp: new Date(),
    });

    client.emit('joined_room', { room });
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { room: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, userId } = data;
    
    await client.leave(room);
    this.webSocketService.removeUserFromRoom(userId, room);
    
    // Notify room about user leaving
    this.webSocketService.broadcastToRoom(room, 'user:leave', {
      userId,
      timestamp: new Date(),
    });

    client.emit('left_room', { room });
  }

  @SubscribeMessage('join_stream')
  async handleJoinStream(
    @MessageBody() data: { streamId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId } = data;
    
    if (!userId || userId === 'undefined' || !streamId) {
      console.log('❌ Invalid join_stream data:', { streamId, userId });
      return;
    }
    
    // Join stream room
    await client.join(`stream:${streamId}`);
    
    // Get current viewer count
    const viewerCount = await this.webSocketService.getRoomUserCount(`stream:${streamId}`);
    
    // Broadcast viewer count to all clients in this stream room
    this.server.to(`stream:${streamId}`).emit('stream:viewer_count_update', {
      streamId,
      viewerCount
    });
    
    console.log(`👥 User ${userId} joined stream ${streamId}, total viewers: ${viewerCount}`);
  }

  @SubscribeMessage('leave_stream')
  async handleLeaveStream(
    @MessageBody() data: { streamId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId } = data;
    
    if (!userId || userId === 'undefined' || !streamId) {
      console.log('❌ Invalid leave_stream data:', { streamId, userId });
      return;
    }
    
    // Leave stream room
    await client.leave(`stream:${streamId}`);
    
    // Get current viewer count
    const viewerCount = await this.webSocketService.getRoomUserCount(`stream:${streamId}`);
    
    // Broadcast viewer count to all clients in this stream room
    this.server.to(`stream:${streamId}`).emit('stream:viewer_count_update', {
      streamId,
      viewerCount
    });
    
    console.log(`👥 User ${userId} left stream ${streamId}, total viewers: ${viewerCount}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { streamId: string; content: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, content, userId, username } = data;
    
    console.log('💬 [Chat] Received message:', { streamId, userId, username, content });
    
    const message = {
      id: Date.now().toString(),
      content,
      userId,
      username,
      timestamp: new Date(),
    };

    // Broadcast to all OTHER clients in the chat room (exclude sender)
    client.to(`chat:${streamId}`).emit('chat:new_message', message);
    
    // Also send back to sender to confirm (with same structure)
    client.emit('chat:new_message', message);
    
    console.log('💬 [Chat] Broadcasted to room:', `chat:${streamId}`, 'including sender');
  }

  @SubscribeMessage('join_stream_chat')
  async handleJoinStreamChat(
    @MessageBody() data: { streamId: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId, username } = data;
    
    console.log('💬 [Chat] User joining chat:', { streamId, userId, username });
    
    // Join chat room
    await client.join(`chat:${streamId}`);
    
    // Notify others about new user
    client.to(`chat:${streamId}`).emit('chat:user_join', { username });
    
    console.log('💬 [Chat] User joined chat room:', `chat:${streamId}`);
  }

  @SubscribeMessage('leave_stream_chat')
  async handleLeaveStreamChat(
    @MessageBody() data: { streamId: string; userId: string; username?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId, username } = data;
    
    console.log('💬 [Chat] User leaving chat:', { streamId, userId, username });
    
    // Leave chat room
    await client.leave(`chat:${streamId}`);
    
    // Notify others about user leaving
    if (username) {
      client.to(`chat:${streamId}`).emit('chat:user_leave', { username });
    }
    
    console.log('💬 [Chat] User left chat room:', `chat:${streamId}`);
  }

  @SubscribeMessage('chat_message')
  async handleChatMessage(
    @MessageBody() data: { room: string; content: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, content, userId, username } = data;
    
    const message = {
      id: Date.now().toString(),
      content,
      userId,
      username,
      room,
      timestamp: new Date(),
    };

    this.webSocketService.broadcastChatMessage(room, message);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { room: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, userId, username } = data;
    this.webSocketService.broadcastUserTyping(room, userId, username);
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @MessageBody() data: { room: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, userId } = data;
    this.webSocketService.broadcastUserStopTyping(room, userId);
  }

  @SubscribeMessage('stream_like')
  async handleStreamLike(
    @MessageBody() data: { streamId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId } = data;
    
    // Here you would typically update the like count in the database
    // For now, just broadcast the event
    this.webSocketService.broadcastStreamLike(streamId, 0); // You'd get actual count from DB
  }
}
