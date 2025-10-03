import { useEffect, useState, useRef, useCallback } from 'react';
import { socketClient } from '../socket/client';
import { SocketEvents, SocketEmitEvents, SocketOptions } from '../socket/types';

export function useSocket(options?: SocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
      hasUser: !!options?.auth?.user,
      hasToken: !!options?.auth?.token,
      userId: options?.auth?.user?.id
    });

    if (options?.auth?.user && options?.auth?.token) {
      setIsConnecting(true);
      socketClient.connect(options);
      
      // Listen to connection events
      const handleConnect = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };

      const handleError = (err: Error) => {
        setError(err.message);
        setIsConnecting(false);
      };

      socketClient.on('connect', handleConnect);
      socketClient.on('disconnect', handleDisconnect);
      socketClient.on('connect_error', handleError);

      socketRef.current = socketClient;

      return () => {
        socketClient.off('connect', handleConnect);
        socketClient.off('disconnect', handleDisconnect);
        socketClient.off('connect_error', handleError);
        socketClient.disconnect();
      };
    } else {
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

