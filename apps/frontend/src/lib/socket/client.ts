import { io, Socket } from 'socket.io-client';

export interface SocketConfig {
  url: string;
  auth?: {
    user: {
      id: string;
      username: string;
      role: string;
    };
    token: string;
  };
}

export interface SocketEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (error: { message: string; code: string }) => void;
  connected: (data: {
    message: string;
    userId?: string;
    username?: string;
  }) => void;
  'chat:message': (data: {
    message: string;
    user: string;
    timestamp: string;
  }) => void;
  'stream:update': (data: Record<string, unknown>) => void;
  'user:online': (data: { userId: string; username: string }) => void;
  'user:offline': (data: { userId: string }) => void;
  // Chat events
  'chat:new_message': (data: Record<string, unknown>) => void;
  'chat:message_deleted': (data: {
    messageId: string;
    streamId: string;
  }) => void;
  'chat:user_joined': (data: {
    streamId: string;
    user: Record<string, unknown>;
  }) => void;
  'chat:user_left': (data: { streamId: string; userId: string }) => void;
  'chat:user_join': (data: { username: string }) => void;
  'chat:user_leave': (data: { username: string }) => void;
  'chat:user_typing': (data: { username: string }) => void;
  'chat:user_stop_typing': (data: { username: string }) => void;
  // Stream events
  'stream:started': (stream: Record<string, unknown>) => void;
  'stream:ended': (data: { streamId: string; streamKey: string }) => void;
  'stream:viewer_count_update': (data: {
    streamId: string;
    viewerCount: number;
  }) => void;
  'stream:like_update': (data: { streamId: string; likeCount: number }) => void;
  // User events
  'user:status_update': (data: { userId: string; isOnline: boolean }) => void;
  // Admin events
  'admin:user_updated': (user: Record<string, unknown>) => void;
  'admin:user_deleted': (data: { userId: string }) => void;
  'admin:stream_updated': (stream: Record<string, unknown>) => void;
  'admin:stream_deleted': (data: { streamId: string }) => void;
  // System events
  'system:maintenance': (data: { message: string; duration?: number }) => void;
  // Alert events
  alert: (alertData: {
    name: string;
    severity: 'critical' | 'warning' | 'info';
    status: 'firing' | 'resolved';
    summary: string;
    description: string;
    timestamp: string;
    labels: Record<string, string>;
  }) => void;
}

export interface SocketEmitEvents {
  join_room: (data: { room: string }) => void;
  leave_room: (data: { room: string }) => void;
  chat_message: (data: {
    room: string;
    message: string;
    timestamp: string;
  }) => void;
  join_stream: (data: { streamId: string }) => void;
  leave_stream: (data: { streamId: string }) => void;
  // Chat events
  join_stream_chat: (data: {
    streamId: string;
    userId: string;
    username: string;
  }) => void;
  leave_stream_chat: (data: {
    streamId: string;
    userId: string;
    username?: string;
  }) => void;
  send_message: (data: {
    streamId: string;
    content: string;
    userId: string;
    username: string;
  }) => void;
  delete_message: (data: { messageId: string; streamId: string }) => void;
  typing: (data: { room: string; userId: string; username: string }) => void;
  stop_typing: (data: { room: string; userId: string }) => void;
  // Stream events
  stream_like: (data: { streamId: string; userId: string }) => void;
  stream_unlike: (data: { streamId: string; userId: string }) => void;
  // User events
  user_heartbeat: (data: { userId: string }) => void;
  user_status_update: (data: { userId: string; status: string }) => void;
  // Admin events
  'admin:get_online_users': () => void;
  'admin:get_system_stats': () => void;
}

class SocketClient {
  private socket: Socket | null = null;
  private config: SocketConfig | null = null;
  private isConnecting = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' =
    'disconnected';
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  connect(config: SocketConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prevent multiple connections
      if (this.isConnecting || this.connectionState === 'connected') {
        resolve();
        return;
      }

      // Disconnect existing socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.config = config;
      this.isConnecting = true;
      this.connectionState = 'connecting';

      try {
        this.socket = io(config.url, {
          auth: config.auth,
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 5000,
          reconnectionAttempts: 10,
          reconnectionDelayMax: 5000,
        });

        this.setupEventListeners();

        // Wait for connection
        const timeout = setTimeout(() => {
          if (this.connectionState !== 'connected') {
            this.isConnecting = false;
            this.connectionState = 'disconnected';
            console.error('WebSocket connection timeout');
            reject(new Error('Connection timeout'));
          }
        }, 30000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.connectionState = 'connected';
          // WebSocket connected successfully
          resolve();
        });

        this.socket.once('connect_error', error => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.connectionState = 'disconnected';
          console.error('WebSocket connection error:', error);
          reject(error);
        });
      } catch (error) {
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionState = 'connected';
      this.emitEvent('connect');

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (this.socket && this.socket.connected) {
          this.socket.emit('ping');
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);
    });

    this.socket.on('disconnect', (reason: string) => {
      this.connectionState = 'disconnected';
      this.emitEvent('disconnect', reason);
    });

    this.socket.on('error', (error: { message: string; code: string }) => {
      this.emitEvent('error', error);
    });

    this.socket.on(
      'connected',
      (data: { message: string; userId?: string; username?: string }) => {
        this.emitEvent('connected', data);
      }
    );

    this.socket.on('pong', () => {
      // WebSocket heartbeat received
    });

    // Forward all other events
    this.socket.onAny((eventName: string, ...args: unknown[]) => {
      if (
        !['connect', 'disconnect', 'error', 'connected'].includes(eventName)
      ) {
        this.emitEvent(eventName, ...args);
      }
    });
  }

  private emitEvent(eventName: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            `Error in socket event listener for ${eventName}:`,
            error
          );
        }
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'disconnected';
    this.isConnecting = false;
    this.eventListeners.clear();
  }

  emit<K extends keyof SocketEmitEvents>(
    event: K,
    data: Parameters<SocketEmitEvents[K]>[0]
  ): void {
    if (this.socket && this.connectionState === 'connected') {
      this.socket.emit(event, data);
    }
  }

  on<K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off<K extends keyof SocketEvents>(
    event: K,
    listener?: SocketEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      if (listener) {
        listeners.delete(listener);
      } else {
        listeners.clear();
      }
    }
  }

  getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionState;
  }

  isConnected(): boolean {
    return (
      this.connectionState === 'connected' && this.socket?.connected === true
    );
  }
}

// Singleton instance
export const socketClient = new SocketClient();
