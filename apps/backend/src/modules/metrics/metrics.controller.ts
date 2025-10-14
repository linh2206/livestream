import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Res() res: Response) {
    try {
      const metrics = await this.metricsService.getMetrics();
      res.send(metrics);
    } catch (error) {
      // Return basic metrics if service fails
      res.send(
        '# Basic metrics\n# HELP livestream_up Application is running\nlivestream_up 1\n'
      );
    }
  }
}
