import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'Livestream Platform API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        streams: '/api/v1/streams',
        chat: '/api/v1/chat',
        metrics: '/api/v1/metrics',
      },
      documentation: '/api/docs',
    };
  }

  @Get('api')
  getApiInfo() {
    return {
      message: 'API Information',
      version: 'v1',
      baseUrl: '/api/v1',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        streams: '/api/v1/streams',
        chat: '/api/v1/chat',
        metrics: '/api/v1/metrics',
      },
    };
  }
}
