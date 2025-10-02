'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
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
  
  // Get token from cookie for socket auth
  const getTokenFromCookie = () => {
    if (typeof document === 'undefined') return null;
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
  };

  // Only connect socket when user is loaded and authenticated
  const { socket, isConnected, isConnecting, error, emit, on, off } = useSocket({
    auth: (!isLoading && user && isAuthenticated && user._id && getTokenFromCookie()) ? {
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      token: getTokenFromCookie() || undefined
    } : undefined,
  });

  // Debug socket connection status
  useEffect(() => {
    console.log('🔌 [SocketContext] Status changed:', {
      isLoading,
      hasUser: !!user,
      isAuthenticated,
      hasToken: !!getTokenFromCookie(),
      isConnected,
      isConnecting,
      hasSocket: !!socket,
      userId: user?._id
    });
    
    // Force disconnect if no valid user
    if (!isLoading && (!user || !user._id || !isAuthenticated)) {
      console.log('🔌 [SocketContext] Invalid auth state, disconnecting...');
    }
  }, [isLoading, user?._id, isAuthenticated]);

  // Handle socket connection events silently (no notifications)
  // Socket runs in background without user notifications

  // Chat methods - use useCallback to prevent re-creation
  const joinStreamChat = useCallback((streamId: string) => {
    console.log('💬 [SocketContext] joinStreamChat called:', { streamId, user: user?.username, isConnected, hasSocket: !!socket });
    if (user && isConnected && socket) {
      console.log('💬 [SocketContext] Emitting join_stream_chat event');
      emit('join_stream_chat', {
        streamId,
        userId: user._id,
        username: user.username,
      });
    } else {
      console.log('💬 [SocketContext] Cannot join - missing:', { hasUser: !!user, isConnected, hasSocket: !!socket });
    }
  }, [user, isConnected, emit, socket]);

  const leaveStreamChat = useCallback((streamId: string) => {
    if (user && isConnected) {
      emit('leave_stream_chat', {
        streamId,
        userId: user._id,
      });
    }
  }, [user, isConnected, emit]);

  const sendMessage = useCallback((streamId: string, content: string) => {
    console.log('💬 [SocketContext] sendMessage called:', { streamId, content, user: user?.username, isConnected });
    if (user && isConnected && socket) {
      console.log('💬 [SocketContext] Emitting send_message event');
      emit('send_message', {
        streamId,
        content,
        userId: user._id,
        username: user.username,
      });
    } else {
      console.log('💬 [SocketContext] Cannot send - missing:', { hasUser: !!user, isConnected, hasSocket: !!socket });
    }
  }, [user, isConnected, emit, socket]);

  // Stream methods - use useCallback to prevent re-creation
  const likeStream = useCallback((streamId: string) => {
    if (user && isConnected) {
      emit('stream_like', {
        streamId,
        userId: user._id,
      });
    }
  }, [user, isConnected, emit]);

  const unlikeStream = useCallback((streamId: string) => {
    if (user && isConnected) {
      emit('stream_unlike', {
        streamId,
        userId: user._id,
      });
    }
  }, [user, isConnected, emit]);

  const joinStream = useCallback((streamId: string) => {
    if (user && isConnected && user._id) {
      console.log('🚀 Emitting join_stream:', { streamId, userId: user._id });
      emit('join_stream', {
        streamId,
        userId: user._id,
      });
    } else {
      console.log('❌ Cannot join stream - missing data:', { user: !!user, isConnected, userId: user?._id });
    }
  }, [user, isConnected, emit]);

  const leaveStream = useCallback((streamId: string) => {
    if (user && isConnected && user._id) {
      console.log('🚀 Emitting leave_stream:', { streamId, userId: user._id });
      emit('leave_stream', {
        streamId,
        userId: user._id,
      });
    } else {
      console.log('❌ Cannot leave stream - missing data:', { user: !!user, isConnected, userId: user?._id });
    }
  }, [user, isConnected, emit]);

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
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}

