import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getOverview(@Query('timeRange') timeRange: string = '7d') {
    return this.analyticsService.getOverview(timeRange);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserAnalytics(@Query('timeRange') timeRange: string = '7d') {
    return this.analyticsService.getUserAnalytics(timeRange);
  }

  @Get('streams')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getStreamAnalytics(@Query('timeRange') timeRange: string = '7d') {
    return this.analyticsService.getStreamAnalytics(timeRange);
  }

  @Get('realtime')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRealtimeData() {
    return this.analyticsService.getRealtimeData();
  }

  @Get('top-streamers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getTopStreamers(@Query('limit') limit: string = '10') {
    return this.analyticsService.getTopStreamers(parseInt(limit, 10));
  }

  @Get('chat-stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getChatStats(@Query('timeRange') timeRange: string = '7d') {
    return this.analyticsService.getChatStats(timeRange);
  }
}
