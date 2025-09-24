import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  
  // Enable CORS for all origins
  app.enableCors({
    origin: true, // Allow all origins
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Origin', 'X-Requested-With', 'Accept'],
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: false,
  }));
  
  // WebSocket adapter with CORS support
  class SocketIOAdapter extends IoAdapter {
    createIOServer(port: number, options?: any): any {
      const server = super.createIOServer(port, {
        ...options,
        cors: {
          origin: true,
          methods: ['GET', 'POST'],
          credentials: true,
        },
      });
      return server;
    }
  }
  
  app.useWebSocketAdapter(new SocketIOAdapter(app));
  
  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  const port = process.env.PORT || 9000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}
bootstrap();
