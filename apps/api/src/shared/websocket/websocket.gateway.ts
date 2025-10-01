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
      'http://localhost:8080',
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
      this.webSocketService.addUser(user.id, user.username, client.id);
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
