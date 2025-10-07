'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  joinStreamChat: (streamId: string) => void;
  leaveStreamChat: (streamId: string) => void;
  sendMessage: (streamId: string, content: string) => void;
  likeStream: (streamId: string) => void;
  unlikeStream: (streamId: string) => void;
  joinStream: (streamId: string) => void;
  leaveStream: (streamId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showInfo, showError, showWarning } = useToast();

  // Get token from localStorage for socket auth (consistent with AuthContext)
  const getTokenFromStorage = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };

  // Only connect socket when user is loaded and authenticated
  const { socket, isConnected, isConnecting, error, emit, on, off } = useSocket(
    {
      auth:
        !isLoading &&
        user &&
        isAuthenticated &&
        user._id &&
        getTokenFromStorage()
          ? {
              user: {
                id: user._id,
                username: user.username,
                role: user.role,
              },
              token: getTokenFromStorage() || undefined,
            }
          : undefined,
    }
  );

  // Debug socket connection status
  useEffect(() => {
    const debugInfo = {
      isLoading,
      hasUser: !!user,
      isAuthenticated,
      hasToken: !!getTokenFromStorage(),
      isConnected,
      isConnecting,
      hasSocket: !!socket,
      userId: user?._id,
    };
    // Debug info available but not logged
  }, [isLoading, user, isAuthenticated, isConnected, isConnecting, socket]);

  // Force disconnect if no valid user
  useEffect(() => {
    if (!isLoading && (!user || !user._id || !isAuthenticated)) {
      // Force disconnect logic can be added here
    }
  }, [isLoading, user?._id, isAuthenticated]);

  // Handle socket connection events silently (no notifications)
  // Socket runs in background without user notifications

  // Handle alert notifications
  useEffect(() => {
    if (socket && isConnected) {
      const handleAlert = (alertData: any) => {
        const { name, severity, status, summary, description } = alertData;

        // Map severity to toast type
        let toastType: 'success' | 'error' | 'warning' | 'info' = 'info';
        switch (severity) {
          case 'critical':
            toastType = 'error';
            break;
          case 'warning':
            toastType = 'warning';
            break;
          case 'info':
            toastType = 'info';
            break;
          default:
            toastType = 'info';
        }

        // Only show alerts for firing status (not resolved)
        if (status === 'firing') {
          const title = `${severity.toUpperCase()}: ${name}`;
          const message = summary || description || 'System alert triggered';

          switch (toastType) {
            case 'error':
              showError(title, message, { duration: 8000 });
              break;
            case 'warning':
              showWarning(title, message, { duration: 6000 });
              break;
            case 'info':
              showInfo(title, message, { duration: 5000 });
              break;
            default:
              showInfo(title, message, { duration: 5000 });
          }
        }
      };

      socket.on('alert', handleAlert);

      return () => {
        socket.off('alert', handleAlert);
      };
    }
  }, [socket, isConnected, showError, showWarning, showInfo]);

  // Chat methods - use useCallback to prevent re-creation
  const joinStreamChat = useCallback(
    (streamId: string) => {
      if (user && isConnected && socket) {
        emit('join_stream_chat', {
          streamId,
          userId: user._id,
          username: user.username,
        });
      } else {
      }
    },
    [user, isConnected, emit, socket]
  );

  const leaveStreamChat = useCallback(
    (streamId: string) => {
      if (user && isConnected) {
        emit('leave_stream_chat', {
          streamId,
          userId: user._id,
        });
      }
    },
    [user, isConnected, emit]
  );

  const sendMessage = useCallback(
    (streamId: string, content: string) => {
      if (user && isConnected && socket) {
        emit('send_message', {
          streamId,
          content,
          userId: user._id,
          username: user.username,
        });
      }
    },
    [user, isConnected, emit, socket]
  );

  // Stream methods - use useCallback to prevent re-creation
  const likeStream = useCallback(
    (streamId: string) => {
      if (user && isConnected) {
        emit('stream_like', {
          streamId,
          userId: user._id,
        });
      }
    },
    [user, isConnected, emit]
  );

  const unlikeStream = useCallback(
    (streamId: string) => {
      if (user && isConnected) {
        emit('stream_unlike', {
          streamId,
          userId: user._id,
        });
      }
    },
    [user, isConnected, emit]
  );

  const joinStream = useCallback(
    (streamId: string) => {
      if (user && isConnected && user._id) {
        emit('join_stream', {
          streamId,
          userId: user._id,
        });
      } else {
      }
    },
    [user, isConnected, emit]
  );

  const leaveStream = useCallback(
    (streamId: string) => {
      if (user && isConnected && user._id) {
        emit('leave_stream', {
          streamId,
          userId: user._id,
        });
      } else {
      }
    },
    [user, isConnected, emit]
  );

  const value = {
    socket,
    isConnected,
    isConnecting,
    error,
    joinStreamChat,
    leaveStreamChat,
    sendMessage,
    likeStream,
    unlikeStream,
    joinStream,
    leaveStream,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
