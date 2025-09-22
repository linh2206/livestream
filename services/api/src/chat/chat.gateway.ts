import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, { username: string; socketId: string }>();
  private streamViewers = new Map<string, Set<string>>();

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove user from online users
    for (const [streamId, users] of this.streamViewers.entries()) {
      if (users.has(client.id)) {
        users.delete(client.id);
        this.server.to(streamId).emit('online_count', { count: users.size });
        break;
      }
    }
  }

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { room: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, username } = data;
    
    client.join(room);
    this.onlineUsers.set(client.id, { username, socketId: client.id });
    
    // Add to stream viewers
    if (!this.streamViewers.has(room)) {
      this.streamViewers.set(room, new Set());
    }
    this.streamViewers.get(room)?.add(client.id);
    
    // Emit online count
    const viewerCount = this.streamViewers.get(room)?.size || 0;
    this.server.to(room).emit('online_count', { count: viewerCount });
    
    console.log(`${username} joined room ${room}`);
  }

  @SubscribeMessage('chat_message')
  async handleMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { room, streamId, userId, username, message } = data;
    
    // Create message in database
    const savedMessage = await this.chatService.create({
      room,
      streamId,
      userId,
      username,
      message,
      avatar: '',
    });

    // Emit message to room
    this.server.to(room).emit('chat_message', {
      id: (savedMessage as any)._id,
      username,
      message,
      timestamp: savedMessage.createdAt,
    });
  }

  @SubscribeMessage('like')
  async handleLike(
    @MessageBody() data: { streamId: string; room: string; liked: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, room, liked } = data;
    
    // Here you would update the like count in the database
    // For now, just emit the like event
    this.server.to(room).emit('like', {
      streamId,
      liked,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room } = data;
    
    client.leave(room);
    
    // Remove from stream viewers
    this.streamViewers.get(room)?.delete(client.id);
    const viewerCount = this.streamViewers.get(room)?.size || 0;
    this.server.to(room).emit('online_count', { count: viewerCount });
    
    console.log(`Client left room ${room}`);
  }
}
