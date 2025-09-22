import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for API endpoints with multi-origin support
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow all origins for development
      // In production, you should specify allowed origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:80',
        'https://yourdomain.com',
        'https://www.yourdomain.com'
      ];
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Origin', 'X-Requested-With', 'Accept'],
    credentials: true
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const port = process.env.PORT || 9000;
  await app.listen(port);
  console.log(`🚀 Backend server running on port ${port}`);
}
bootstrap();
