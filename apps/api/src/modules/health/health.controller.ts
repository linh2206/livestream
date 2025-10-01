import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async getHealthStatus(): Promise<HealthStatus> {
    return this.healthService.getHealthStatus();
  }

  @Get('ping')
  async ping() {
    return this.healthService.ping();
  }
}
