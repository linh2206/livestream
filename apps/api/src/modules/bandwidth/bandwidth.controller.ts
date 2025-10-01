import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { BandwidthService, BandwidthStats } from './bandwidth.service';

@Controller('bandwidth')
export class BandwidthController {
  constructor(private bandwidthService: BandwidthService) {}

  @Get('stats')
  async getBandwidthStats(): Promise<BandwidthStats> {
    return this.bandwidthService.getBandwidthStats();
  }

  @Get('historical')
  async getHistoricalStats(@Query('hours') hours: string = '24') {
    const hoursNum = parseInt(hours, 10);
    return this.bandwidthService.getHistoricalStats(hoursNum);
  }

  @Get('top-streams')
  async getTopStreamsByBandwidth(@Query('limit') limit: string = '10') {
    const limitNum = parseInt(limit, 10);
    return this.bandwidthService.getTopStreamsByBandwidth(limitNum);
  }

  @Post('update')
  async updateBandwidthStats(@Body() stats: Partial<BandwidthStats>) {
    await this.bandwidthService.updateBandwidthStats(stats);
    return { message: 'Bandwidth stats updated successfully' };
  }
}
