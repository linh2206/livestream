import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@Catch()
export class WebSocketErrorFilter {
  private readonly logger = new Logger(WebSocketErrorFilter.name);

  catch(exception: Error & { code?: string }, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const data = host.switchToWs().getData();

    this.logger.error(`WebSocket Error for client ${client.id}:`, {
      error: exception.message,
      stack: exception.stack,
      data,
    });

    // Send error response to client
    client.emit('error', {
      message: exception.message || 'Internal server error',
      code: exception.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });

    // If it's a critical error, disconnect the client
    if (
      exception.code === 'CONNECTION_LIMIT_EXCEEDED' ||
      exception.code === 'INVALID_AUTH'
    ) {
      client.disconnect(true);
    }
  }
}
