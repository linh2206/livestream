import { useEffect, useState, useRef, useCallback } from 'react';
import { socketClient } from '../socket/client';
import { SocketEvents, SocketEmitEvents, SocketOptions } from '../socket/types';

export function useSocket(options?: SocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    console.log('🔌 [useSocket] Effect triggered:', {
      hasUser: !!options?.auth?.user,
      hasToken: !!options?.auth?.token,
      userId: options?.auth?.user?.id
    });

    if (options?.auth?.user && options?.auth?.token) {
      console.log('🔌 [useSocket] Connecting with auth...');
      setIsConnecting(true);
      socketClient.connect(options);
      
      // Listen to connection events
      const handleConnect = () => {
        console.log('🔌 [useSocket] Connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      };

      const handleDisconnect = () => {
        console.log('🔌 [useSocket] Disconnected');
        setIsConnected(false);
        setIsConnecting(false);
      };

      const handleError = (err: Error) => {
        console.log('🔌 [useSocket] Connection error:', err.message);
        setError(err.message);
        setIsConnecting(false);
      };

      socketClient.on('connect', handleConnect);
      socketClient.on('disconnect', handleDisconnect);
      socketClient.on('connect_error', handleError);

      socketRef.current = socketClient;

      return () => {
        console.log('🔌 [useSocket] Cleaning up...');
        socketClient.off('connect', handleConnect);
        socketClient.off('disconnect', handleDisconnect);
        socketClient.off('connect_error', handleError);
        socketClient.disconnect();
      };
    } else {
      console.log('🔌 [useSocket] No auth data, disconnecting...');
      socketClient.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [options?.auth?.user?.id, options?.auth?.token]);

  const emit = useCallback(<K extends keyof SocketEmitEvents>(
    event: K,
    data: Parameters<SocketEmitEvents[K]>[0]
  ) => {
    socketClient.emit(event, data);
  }, []);

  const on = useCallback(<K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ) => {
    socketClient.on(event, callback);
  }, []);

  const off = useCallback(<K extends keyof SocketEvents>(
    event: K,
    callback?: SocketEvents[K]
  ) => {
    socketClient.off(event, callback);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    emit,
    on,
    off,
  };
}

