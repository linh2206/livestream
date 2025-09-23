import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  
  // CORS is handled by Nginx proxy
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));
  
  // WebSocket adapter with CORS support
  app.useWebSocketAdapter(new IoAdapter(app));
  
  // Enable graceful shutdown
  app.enableShutdownHooks();
  
  const port = process.env.PORT || 9000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}
bootstrap();
