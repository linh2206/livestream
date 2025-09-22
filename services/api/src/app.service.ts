import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'Welcome to LiveStream API!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'livestream-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  getStatus() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'livestream-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      endpoints: {
        health: '/health',
        status: '/status',
        rtmp: '/rtmp',
        hls: '/rtmp/hls',
        streams: '/streams',
        users: '/users',
        auth: '/auth',
        chat: '/chat',
      },
    };
  }
}
