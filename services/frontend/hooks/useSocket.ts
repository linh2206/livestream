'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectSocket = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9000';
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    const socketInstance = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
      setError(null);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      setIsConnected(false);
      setError(error.message || 'Connection failed');
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setError(null);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection error:', error);
      setError('Reconnection failed');
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('🔄 Reconnection failed');
      setError('Unable to reconnect to server');
    });

    setSocket(socketInstance);

    return socketInstance;
  }, []);

  useEffect(() => {
    const socketInstance = connectSocket();

    return () => {
      if (socketInstance) {
        socketInstance.close();
      }
    };
  }, [connectSocket]);

  return { socket, isConnected, error };
}
