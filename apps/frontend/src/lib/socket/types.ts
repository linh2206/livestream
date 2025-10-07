// Socket Event Types
export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;

  // Chat events
  'chat:new_message': (message: ChatMessage) => void;
  'chat:message_deleted': (data: {
    messageId: string;
    streamId: string;
  }) => void;
  'chat:user_joined': (data: { streamId: string; user: User }) => void;
  'chat:user_left': (data: { streamId: string; userId: string }) => void;

  // Stream events
  'stream:started': (stream: Stream) => void;
  'stream:ended': (data: { streamId: string; streamKey: string }) => void;
  'stream:viewer_count_update': (data: {
    streamId: string;
    viewerCount: number;
  }) => void;
  'stream:like_update': (data: { streamId: string; likeCount: number }) => void;

  // User events
  'user:online': (user: User) => void;
  'user:offline': (data: { userId: string }) => void;
  'user:status_update': (data: { userId: string; isOnline: boolean }) => void;

  // Admin events
  'admin:user_updated': (user: User) => void;
  'admin:user_deleted': (data: { userId: string }) => void;
  'admin:stream_updated': (stream: Stream) => void;
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

// Socket Emit Events
export interface SocketEmitEvents {
  // Chat events
  join_stream_chat: (data: {
    streamId: string;
    userId: string;
    username: string;
  }) => void;
  leave_stream_chat: (data: { streamId: string; userId: string }) => void;
  send_message: (data: {
    streamId: string;
    content: string;
    userId: string;
    username: string;
  }) => void;
  delete_message: (data: { messageId: string; streamId: string }) => void;

  // Stream events
  stream_like: (data: { streamId: string; userId: string }) => void;
  stream_unlike: (data: { streamId: string; userId: string }) => void;
  join_stream: (data: { streamId: string; userId: string }) => void;
  leave_stream: (data: { streamId: string; userId: string }) => void;

  // User events
  user_heartbeat: (data: { userId: string }) => void;
  user_status_update: (data: { userId: string; status: string }) => void;

  // Admin events
  'admin:get_online_users': () => void;
  'admin:get_system_stats': () => void;
}

// Socket Data Types
export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  avatar?: string;
  streamId: string;
  streamKey: string;
  timestamp: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'manager';
  isOnline: boolean;
  lastSeen: string;
}

export interface Stream {
  _id: string;
  title: string;
  description?: string;
  streamKey: string;
  hlsUrl?: string;
  status: 'inactive' | 'active' | 'ended';
  isLive: boolean;
  viewerCount: number;
  likeCount: number;
  userId: string;
  user?: User;
}

// Socket Connection Options
export interface SocketOptions {
  auth?: {
    user: {
      id: string;
      username: string;
      role?: string;
    };
    token?: string;
  };
  transports?: string[];
  timeout?: number;
  forceNew?: boolean;
}

// Socket Hook Return Type
export interface UseSocketReturn {
  socket: any | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: <K extends keyof SocketEmitEvents>(
    event: K,
    data: Parameters<SocketEmitEvents[K]>[0]
  ) => void;
  on: <K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ) => void;
  off: <K extends keyof SocketEvents>(
    event: K,
    callback?: SocketEvents[K]
  ) => void;
}
