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
import { WebSocketService } from './websocket.service';
import { ChatService } from '../../modules/chat/chat.service';
import { APP_CONSTANTS } from '../constants';

@WSGateway({
  cors: {
    origin: [
      'http://localhost:9000',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      process.env.API_BASE_URL,
      process.env.NGINX_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private webSocketService: WebSocketService,
    private chatService: ChatService,
  ) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
  }

  async handleConnection(client: Socket) {
    
    // Extract user info from handshake (if authenticated)
    const user = client.handshake.auth?.user;
    if (user) {
      const success = this.webSocketService.addUser(user.id, user.username, client.id);
      if (!success) {
        client.disconnect(true);
        return;
      }
    }
  }

  async handleDisconnect(client: Socket) {
    
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

  @SubscribeMessage('send_message')
  async handleChatMessage(
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
      this.webSocketService.broadcastToRoom(`chat:${streamId}`, 'chat:new_message', {
        id: (message as any)._id,
        content: message.content,
        userId: message.userId,
        username: message.username,
        avatar: message.avatar,
        timestamp: (message as any).createdAt,
      });
    } catch (error) {
      console.error('Failed to save chat message:', error);
      client.emit('chat:error', { message: APP_CONSTANTS.ERRORS.INTERNAL_ERROR });
    }
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
