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
import { Types } from 'mongoose';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { StreamsService } from '../streams/streams.service';

@WebSocketGateway({
  cors: {
    origin: true, // Allow all origins with credentials
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, { username: string; socketId: string }>();
  private streamViewers = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private streamsService: StreamsService,
  ) {}

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
    
    console.log(`👤 ${username} joining room ${room}`);
    
    client.join(room);
    this.onlineUsers.set(client.id, { username, socketId: client.id });
    
    // Add to stream viewers
    if (!this.streamViewers.has(room)) {
      this.streamViewers.set(room, new Set());
    }
    this.streamViewers.get(room)?.add(client.id);
    
    // Emit online count
    const viewerCount = this.streamViewers.get(room)?.size || 0;
    console.log(`👥 Emitting online count: ${viewerCount} for room ${room}`);
    this.server.to(room).emit('online_count', { count: viewerCount });
    
    console.log(`${username} joined room ${room}`);
  }

  @SubscribeMessage('chat_message')
  async handleMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { room, streamId, userId, username, content } = data;
    
    console.log('💬 Chat message received:', { room, streamId, userId, username, content });
    
    // Create message in database
    const savedMessage = await this.chatService.create({
      room,
      streamId: new Types.ObjectId(streamId),
      userId: new Types.ObjectId(userId),
      username,
      content,
      avatar: '',
    });

    console.log('💬 Message saved to database:', (savedMessage as any)._id);

    // Emit message to room
    this.server.to(room).emit('chat_message', {
      _id: (savedMessage as any)._id,
      username,
      message: content,
      createdAt: savedMessage.createdAt,
    });
    
    console.log('💬 Message emitted to room:', room);
  }

  @SubscribeMessage('like')
  async handleLike(
    @MessageBody() data: { streamId: string; room: string; liked: boolean; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamId, room, liked, userId } = data;
    
    console.log('👍 Like event received:', { streamId, room, liked, userId });
    
    try {
      // Update like count in database
      const result = await this.streamsService.updateLikeCountByStreamKey(streamId, liked);
      
      console.log('👍 Like count updated:', result);
      
      // Emit like update to room
      this.server.to(room).emit('like_update', {
        streamId,
        liked,
        count: result.likeCount,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('❌ Error updating like count:', error);
      // Still emit the event even if database update fails
      this.server.to(room).emit('like_update', {
        streamId,
        liked,
        count: 0,
        timestamp: new Date(),
        error: 'Failed to update like count',
      });
    }
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

  @SubscribeMessage('get_viewer_count')
  async handleGetViewerCount(
    @MessageBody() data: { streamKey: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamKey } = data;
    
    try {
      const result = await this.streamsService.getViewerCount(streamKey);
      client.emit('viewer_count_response', result);
    } catch (error) {
      console.error('❌ Error getting viewer count:', error);
      client.emit('viewer_count_response', {
        streamKey,
        viewerCount: 0,
        isLive: false,
        error: 'Failed to get viewer count',
      });
    }
  }

  @SubscribeMessage('get_like_count')
  async handleGetLikeCount(
    @MessageBody() data: { streamKey: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamKey } = data;
    
    try {
      const result = await this.streamsService.getLikeCount(streamKey);
      client.emit('like_count_response', result);
    } catch (error) {
      console.error('❌ Error getting like count:', error);
      client.emit('like_count_response', {
        streamKey,
        likeCount: 0,
        isLive: false,
        error: 'Failed to get like count',
      });
    }
  }

  @SubscribeMessage('get_stream_status')
  async handleGetStreamStatus(
    @MessageBody() data: { streamKey: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { streamKey } = data;
    
    try {
      const result = await this.streamsService.getViewerCount(streamKey);
      client.emit('stream_status_response', {
        streamKey,
        isLive: result.isLive,
        viewerCount: result.viewerCount,
      });
    } catch (error) {
      console.error('❌ Error getting stream status:', error);
      client.emit('stream_status_response', {
        streamKey,
        isLive: false,
        viewerCount: 0,
        error: 'Failed to get stream status',
      });
    }
  }
}
