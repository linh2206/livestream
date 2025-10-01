'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinStreamChat: (streamId: string) => void;
  leaveStreamChat: (streamId: string) => void;
  sendMessage: (streamId: string, content: string) => void;
  likeStream: (streamId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9000', {
        auth: {
          user: {
            id: user.id,
            username: user.username,
          },
        },
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from WebSocket');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const joinStreamChat = (streamId: string) => {
    if (socket && user) {
      socket.emit('join_stream_chat', {
        streamId,
        userId: user.id,
        username: user.username,
      });
    }
  };

  const leaveStreamChat = (streamId: string) => {
    if (socket && user) {
      socket.emit('leave_stream_chat', {
        streamId,
        userId: user.id,
      });
    }
  };

  const sendMessage = (streamId: string, content: string) => {
    if (socket && user) {
      socket.emit('send_message', {
        streamId,
        content,
        userId: user.id,
        username: user.username,
      });
    }
  };

  const likeStream = (streamId: string) => {
    if (socket && user) {
      socket.emit('stream_like', {
        streamId,
        userId: user.id,
      });
    }
  };

  const value = {
    socket,
    isConnected,
    joinStreamChat,
    leaveStreamChat,
    sendMessage,
    likeStream,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
