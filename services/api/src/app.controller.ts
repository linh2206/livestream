import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('status')
  getStatus() {
    return this.appService.getStatus();
  }

  @Get('bandwidth')
  getBandwidth() {
    return this.appService.getBandwidth();
  }
}
