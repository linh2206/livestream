import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for API endpoints
  app.enableCors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Origin', 'X-Requested-With', 'Accept'],
    credentials: false // Must be false when origin is '*'
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
