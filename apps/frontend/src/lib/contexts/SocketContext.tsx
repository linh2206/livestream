'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSocket } from '../hooks/useSocket';
import { SocketConfig } from '../socket/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface SocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  emit: <K extends keyof import('../socket/client').SocketEmitEvents>(
    event: K,
    data: Parameters<import('../socket/client').SocketEmitEvents[K]>[0]
  ) => void;
  on: <K extends keyof import('../socket/client').SocketEvents>(
    event: K,
    listener: import('../socket/client').SocketEvents[K]
  ) => void;
  off: <K extends keyof import('../socket/client').SocketEvents>(
    event: K,
    listener?: import('../socket/client').SocketEvents[K]
  ) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  joinStream: (streamId: string) => void;
  leaveStream: (streamId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showError } = useToast();
  const socket = useSocket();
  const [lastAuthState, setLastAuthState] = useState<{
    isAuthenticated: boolean;
    userId: string | null;
  }>({ isAuthenticated: false, userId: null });

  // Get token from localStorage
  const getTokenFromStorage = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };

  // Create socket config
  const socketConfig = useMemo((): SocketConfig | null => {
    if (!isLoading) {
      // Always connect WebSocket, even for anonymous users
      if (user && isAuthenticated && user._id && getTokenFromStorage()) {
        // Authenticated user
        return {
          url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:9000',
          auth: {
            user: {
              id: user._id,
              username: user.username,
              role: user.role,
            },
            token: getTokenFromStorage() || '',
          },
        };
      } else {
        // Anonymous user - connect without auth
        return {
          url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:9000',
        };
      }
    }
    return null;
  }, [isLoading, user, isAuthenticated]);

  // Handle authentication state changes
  useEffect(() => {
    const currentAuthState = {
      isAuthenticated,
      userId: user?._id || null,
    };

    // Only reconnect if auth state actually changed
    if (
      currentAuthState.isAuthenticated !== lastAuthState.isAuthenticated ||
      currentAuthState.userId !== lastAuthState.userId
    ) {
      setLastAuthState(currentAuthState);

      if (socketConfig) {
        // Always connect (even for anonymous users)
        socket.connect(socketConfig).catch(error => {
          // eslint-disable-next-line no-console
          console.error('Socket connection failed:', error);
          showError('Connection Error', 'Failed to connect to server');
        });
      } else {
        // Disconnect if no config
        socket.disconnect();
      }
    }
  }, [
    isAuthenticated,
    user?._id,
    socket,
    showError,
    lastAuthState,
    socketConfig,
  ]);

  // Handle socket errors
  useEffect(() => {
    if (socket.error) {
      showError('Socket Error', socket.error);
    }
  }, [socket.error, showError]);

  // Socket event handlers
  const joinRoom = (room: string) => {
    socket.emit('join_room', { room });
  };

  const leaveRoom = (room: string) => {
    socket.emit('leave_room', { room });
  };

  const joinStream = (streamId: string) => {
    socket.emit('join_stream', { streamId });
  };

  const leaveStream = (streamId: string) => {
    socket.emit('leave_stream', { streamId });
  };

  const contextValue: SocketContextType = {
    isConnected: socket.isConnected,
    isConnecting: socket.isConnecting,
    error: socket.error,
    emit: socket.emit,
    on: socket.on,
    off: socket.off,
    joinRoom,
    leaveRoom,
    joinStream,
    leaveStream,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
