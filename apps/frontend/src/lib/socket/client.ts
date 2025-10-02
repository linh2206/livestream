import { io, Socket } from 'socket.io-client';
import { SocketEvents, SocketEmitEvents, SocketOptions } from './types';

class SocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private isConnecting = false;
  private error: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  connect(options?: SocketOptions): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.error = null;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9000';
    
    this.socket = io(socketUrl, {
      auth: options?.auth,
      transports: options?.transports || ['websocket'],
      timeout: options?.timeout || 20000,
      forceNew: options?.forceNew || false,
      autoConnect: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // Socket connected silently
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.error = null;
    });

    this.socket.on('disconnect', (reason) => {
      // Socket disconnected silently
      this.isConnected = false;
      this.isConnecting = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      // Socket connection error handled silently
      this.isConnected = false;
      this.isConnecting = false;
      this.error = error.message;
      this.handleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      // Socket reconnected silently
      this.isConnected = true;
      this.isConnecting = false;
      this.error = null;
    });

    this.socket.on('reconnect_error', (error) => {
      // Socket reconnection error handled silently
      this.error = error.message;
    });

    this.socket.on('reconnect_failed', () => {
      // Socket reconnection failed silently
      this.isConnected = false;
      this.isConnecting = false;
      this.error = 'Failed to reconnect to server';
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Max reconnection attempts reached silently
      this.error = 'Unable to connect to server';
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        // Attempting to reconnect silently
        this.socket.connect();
      }
    }, delay);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.error = null;
    this.reconnectAttempts = 0;
  }

  emit<K extends keyof SocketEmitEvents>(
    event: K,
    data: Parameters<SocketEmitEvents[K]>[0]
  ): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
    // Socket not connected - emit silently ignored
  }

  on<K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ): void {
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off<K extends keyof SocketEvents>(
    event: K,
    callback?: SocketEvents[K]
  ): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
      } else {
        this.socket.off(event);
      }
    }
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get connecting(): boolean {
    return this.isConnecting;
  }

  get connectionError(): string | null {
    return this.error;
  }

  get socketInstance(): Socket | null {
    return this.socket;
  }

  // Utility methods
  joinRoom(room: string): void {
    this.emit('join_room' as any, { room });
  }

  leaveRoom(room: string): void {
    this.emit('leave_room' as any, { room });
  }

  // Chat specific methods
  joinStreamChat(streamId: string, userId: string, username: string): void {
    this.emit('join_stream_chat', { streamId, userId, username });
  }

  leaveStreamChat(streamId: string, userId: string): void {
    this.emit('leave_stream_chat', { streamId, userId });
  }

  sendMessage(streamId: string, content: string, userId: string, username: string): void {
    this.emit('send_message', { streamId, content, userId, username });
  }

  // Stream specific methods
  likeStream(streamId: string, userId: string): void {
    this.emit('stream_like', { streamId, userId });
  }

  unlikeStream(streamId: string, userId: string): void {
    this.emit('stream_unlike', { streamId, userId });
  }

  joinStream(streamId: string, userId: string): void {
    this.emit('join_stream', { streamId, userId });
  }

  leaveStream(streamId: string, userId: string): void {
    this.emit('leave_stream', { streamId, userId });
  }

  // User specific methods
  sendHeartbeat(userId: string): void {
    this.emit('user_heartbeat', { userId });
  }

  updateUserStatus(userId: string, status: string): void {
    this.emit('user_status_update', { userId, status });
  }
}

export const socketClient = new SocketClient();
