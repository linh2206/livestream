import { useCallback, useEffect, useRef, useState } from 'react';
import { socketClient, SocketConfig, SocketEvents } from '../socket/client';

export interface UseSocketResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (config: SocketConfig) => Promise<void>;
  disconnect: () => void;
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
}

export function useSocket(): UseSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenersRef = useRef<Map<string, Function>>(new Map());

  const connect = useCallback(async (config: SocketConfig) => {
    try {
      setIsConnecting(true);
      setError(null);
      await socketClient.connect(config);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketClient.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, []);

  const emit = useCallback(
    <K extends keyof import('../socket/client').SocketEmitEvents>(
      event: K,
      data: Parameters<import('../socket/client').SocketEmitEvents[K]>[0]
    ) => {
      socketClient.emit(event, data);
    },
    []
  );

  const on = useCallback(
    <K extends keyof import('../socket/client').SocketEvents>(
      event: K,
      listener: import('../socket/client').SocketEvents[K]
    ) => {
      socketClient.on(event, listener);
      listenersRef.current.set(event as string, listener);
    },
    []
  );

  const off = useCallback(
    <K extends keyof import('../socket/client').SocketEvents>(
      event: K,
      listener?: import('../socket/client').SocketEvents[K]
    ) => {
      socketClient.off(event, listener);
      if (listener) {
        listenersRef.current.delete(event as string);
      }
    },
    []
  );

  // Monitor connection state
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleError = (error: { message: string; code: string }) => {
      setError(error.message);
    };

    socketClient.on('connect', handleConnect);
    socketClient.on('disconnect', handleDisconnect);
    socketClient.on('error', handleError);

    // Set initial state
    setIsConnected(socketClient.isConnected());

    return () => {
      socketClient.off('connect', handleConnect);
      socketClient.off('disconnect', handleDisconnect);
      socketClient.off('error', handleError);
    };
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    const currentListeners = listenersRef.current;
    return () => {
      currentListeners.forEach((listener, event) => {
        socketClient.off(event as keyof SocketEvents, listener as () => void);
      });
      currentListeners.clear();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}
