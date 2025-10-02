// Export API layer
export * from './api';

// Export Socket layer
export { socketClient } from './socket/client';
export type { 
  SocketEvents, 
  SocketEmitEvents,
  ChatMessage,
  User,
  Stream,
  SocketOptions,
  UseSocketReturn
} from './socket/types';

// Export Hooks (only for lists/tables)
export * from './hooks';

// Export Contexts
export { AuthProvider, useAuth } from './contexts/AuthContext';
export { SocketProvider, useSocketContext } from './contexts/SocketContext';
