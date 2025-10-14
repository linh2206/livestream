import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway as WSGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamsService } from '../../modules/streams/streams.service';
import { APP_CONSTANTS } from '../constants';
import { WebSocketService } from './websocket.service';

@WSGateway({
  cors: {
    origin: [
      'http://localhost:9000',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      process.env.API_BASE_URL,
      process.env.NGINX_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/',
})
export class WebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Track last viewer count to prevent duplicate broadcasts
  private lastViewerCount = new Map<string, number>();

  constructor(
    private webSocketService: WebSocketService,
    private eventEmitter: EventEmitter2,
    private streamsService: StreamsService
  ) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
  }

  // Update viewer count only when it changes
  private updateViewerCount(streamId: string, viewerCount: number) {
    // Check if count actually changed
    const lastCount = this.lastViewerCount.get(streamId);
    if (lastCount === viewerCount) {
      return; // No change, don't broadcast
    }

    // Update last count
    this.lastViewerCount.set(streamId, viewerCount);

    // Emit event to update viewer count in database
    this.eventEmitter.emit('stream.viewer_joined', {
      streamId,
      viewerCount,
    });

    // Broadcast viewer count to all clients in this stream room
    this.server.to(`stream:${streamId}`).emit('stream:viewer_count_update', {
      streamId,
      viewerCount,
    });
  }

  async handleConnection(client: Socket) {
    // eslint-disable-next-line no-console
    console.log('🔌 [WebSocket] New connection:', client.id);

    // Extract user info from handshake (if authenticated)
    const user = client.handshake.auth?.user;
    if (user) {
      // eslint-disable-next-line no-console
      console.log('👤 [WebSocket] User authenticated:', user.username);
      const success = this.webSocketService.addUser(
        user.id,
        user.username,
        client.id
      );
      if (!success) {
        client.disconnect(true);
        return;
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('👤 [WebSocket] Anonymous connection');
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
    @ConnectedSocket() client: Socket
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
    @ConnectedSocket() client: Socket
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
    @ConnectedSocket() client: Socket
  ) {
    const { streamId, userId } = data;

    if (!userId || userId === 'undefined' || !streamId) {
      // eslint-disable-next-line no-console
      console.log('❌ Invalid join_stream data:', { streamId, userId });
      return;
    }

    // Join stream room
    await client.join(`stream:${streamId}`);

    // Add user to room tracking
    this.webSocketService.addUserToRoom(userId, `stream:${streamId}`);

    // Get current viewer count
    const viewerCount = await this.webSocketService.getRoomUserCount(
      `stream:${streamId}`
    );

    // Update viewer count only when it changes
    this.updateViewerCount(streamId, viewerCount);

    // eslint-disable-next-line no-console
    console.log(
      `👥 User ${userId} joined stream ${streamId}, total viewers: ${viewerCount}`
    );
  }

  @SubscribeMessage('leave_stream')
  async handleLeaveStream(
    @MessageBody() data: { streamId: string; userId: string },
    @ConnectedSocket() _client: Socket
  ) {
    const { streamId, userId: _userId } = data;

    if (!_userId || _userId === 'undefined' || !streamId) {
      // eslint-disable-next-line no-console
      console.log('❌ Invalid leave_stream data:', {
        streamId,
        userId: _userId,
      });
      return;
    }

    // Leave stream room
    await _client.leave(`stream:${streamId}`);

    // Remove user from room tracking
    this.webSocketService.removeUserFromRoom(_userId, `stream:${streamId}`);

    // Get current viewer count
    const viewerCount = await this.webSocketService.getRoomUserCount(
      `stream:${streamId}`
    );

    // Update viewer count only when it changes
    this.updateViewerCount(streamId, viewerCount);

    // eslint-disable-next-line no-console
    console.log(
      `👥 User ${_userId} left stream ${streamId}, total viewers: ${viewerCount}`
    );
  }

  @SubscribeMessage('join_stream_chat')
  async handleJoinStreamChat(
    @MessageBody() data: { streamId: string; userId: string; username: string },
    @ConnectedSocket() _client: Socket
  ) {
    const { streamId, userId, username: _username } = data;

    // eslint-disable-next-line no-console
    console.log('💬 [Chat] User joining chat:', {
      streamId,
      userId,
      username: _username,
    });

    // Join chat room
    await _client.join(`chat:${streamId}`);

    // Notify others about new user
    _client
      .to(`chat:${streamId}`)
      .emit('chat:user_join', { username: _username });

    // eslint-disable-next-line no-console
    console.log('💬 [Chat] User joined chat room:', `chat:${streamId}`);
  }

  @SubscribeMessage('leave_stream_chat')
  async handleLeaveStreamChat(
    @MessageBody()
    data: { streamId: string; userId: string; username?: string },
    @ConnectedSocket() _client: Socket
  ) {
    const { streamId, userId: _userId, username } = data;

    // eslint-disable-next-line no-console
    console.log('💬 [Chat] User leaving chat:', {
      streamId,
      userId: _userId,
      username,
    });

    // Leave chat room
    await _client.leave(`chat:${streamId}`);

    // Notify others about user leaving
    if (username) {
      _client.to(`chat:${streamId}`).emit('chat:user_leave', { username });
    }

    // eslint-disable-next-line no-console
    console.log('💬 [Chat] User left chat room:', `chat:${streamId}`);
  }

  @SubscribeMessage('send_message')
  async handleChatMessage(
    @MessageBody()
    data: {
      streamId: string;
      content: string;
      userId: string;
      username: string;
    },
    @ConnectedSocket() client: Socket
  ) {
    // eslint-disable-next-line no-console
    console.log('🔍 [WebSocket] Received send_message event:', data);
    const { streamId, content, userId, username } = data;

    // eslint-disable-next-line no-console
    console.log('💬 [Chat] Received message:', {
      streamId,
      content,
      userId,
      username,
    });

    try {
      // Emit event for chat service to handle
      this.eventEmitter.emit('chat.message.create', {
        streamId,
        content,
        userId,
        username,
        socket: this.server,
        room: `chat:${streamId}`,
      });

      // eslint-disable-next-line no-console
      console.log('💬 [Chat] Event emitted for chat service');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send chat message:', error);
      client.emit('chat:error', {
        message: APP_CONSTANTS.ERRORS.INTERNAL_ERROR,
      });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { room: string; userId: string; username: string },
    @ConnectedSocket() _client: Socket
  ) {
    const { room, userId, username } = data;
    this.webSocketService.broadcastUserTyping(room, userId, username);
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @MessageBody() data: { room: string; userId: string },
    @ConnectedSocket() _client: Socket
  ) {
    const { room, userId: _userId } = data;
    this.webSocketService.broadcastUserStopTyping(room, _userId);
  }

  @SubscribeMessage('stream_like')
  async handleStreamLike(
    @MessageBody() data: { streamId: string; userId: string },
    @ConnectedSocket() _client: Socket
  ) {
    const { streamId, userId: _userId } = data;

    try {
      // Get the actual stream to get current like count
      const stream = await this.streamsService.findById(streamId);
      if (stream) {
        // Broadcast the actual like count
        this.webSocketService.broadcastStreamLike(streamId, stream.likeCount);
        // eslint-disable-next-line no-console
        console.log(
          `❤️ [Stream] User ${_userId} liked stream ${streamId}, count: ${stream.likeCount}`
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error handling stream like:', error);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }
}
