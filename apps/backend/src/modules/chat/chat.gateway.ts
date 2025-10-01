import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';

import { ChatService } from './chat.service';
import { WebSocketService } from '../../shared/websocket/websocket.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private webSocketService: WebSocketService,
  ) {}

  afterInit(server: Server) {
    console.log('🚀 Chat Gateway initialized');
  }

  async handleConnection(client: Socket) {
    console.log(`Chat client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_stream_chat')
  async handleJoinStreamChat(
    @MessageBody() data: { streamId: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId, username } = data;
    const room = `stream_${streamId}`;
    
    await client.join(room);
    this.webSocketService.addUserToRoom(userId, room);
    
    // Notify room about new user
    this.webSocketService.broadcastToRoom(room, 'chat:user_join', {
      userId,
      username,
      timestamp: new Date(),
    });

    // Send recent messages to the new user
    const recentMessages = await this.chatService.getRecentMessages(streamId, 20);
    client.emit('chat:recent_messages', recentMessages);

    client.emit('chat:joined', { room });
  }

  @SubscribeMessage('leave_stream_chat')
  async handleLeaveStreamChat(
    @MessageBody() data: { streamId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId } = data;
    const room = `stream_${streamId}`;
    
    await client.leave(room);
    this.webSocketService.removeUserFromRoom(userId, room);
    
    // Notify room about user leaving
    this.webSocketService.broadcastToRoom(room, 'chat:user_leave', {
      userId,
      timestamp: new Date(),
    });

    client.emit('chat:left', { room });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { streamId: string; content: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, content, userId, username } = data;
    
    try {
      // Create message in database
      const message = await this.chatService.createMessage({
        streamId,
        content,
      }, userId);

      // Broadcast message to room
      const room = `stream_${streamId}`;
      this.webSocketService.broadcastToRoom(room, 'chat:new_message', {
        id: (message as any)._id,
        content: message.content,
        userId: message.userId,
        username: message.username,
        avatar: message.avatar,
        timestamp: (message as any).createdAt,
      });
    } catch (error) {
      client.emit('chat:error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { streamId: string; userId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId, username } = data;
    const room = `stream_${streamId}`;
    
    this.webSocketService.broadcastToRoom(room, 'chat:typing', {
      userId,
      username,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @MessageBody() data: { streamId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, userId } = data;
    const room = `stream_${streamId}`;
    
    this.webSocketService.broadcastToRoom(room, 'chat:stop_typing', {
      userId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { messageId, userId } = data;
    
    try {
      await this.chatService.deleteMessage(messageId, userId);
      
      // Broadcast message deletion
      this.webSocketService.broadcastToAll('chat:message_deleted', {
        messageId,
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('chat:error', { message: 'Failed to delete message' });
    }
  }
}
