import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get real-time platform metrics
   */
  @Get('realtime')
  @UseGuards(AdminGuard)
  async getRealTimeMetrics() {
    return this.analyticsService.getRealTimeMetrics();
  }

  /**
   * Get stream analytics
   */
  @Get('stream/:streamId')
  async getStreamAnalytics(@Param('streamId') streamId: string) {
    const analytics = await this.analyticsService.getStreamAnalytics(streamId);

    if (!analytics) {
      return { error: 'Stream not found' };
    }

    return analytics;
  }

  /**
   * Get user analytics
   */
  @Get('user/:userId')
  async getUserAnalytics(@Param('userId') userId: string) {
    return this.analyticsService.getUserAnalytics(userId);
  }

  /**
   * Get current user analytics
   */
  @Get('my-analytics')
  async getMyAnalytics(@Query('userId') userId: string) {
    return this.analyticsService.getUserAnalytics(userId);
  }

  /**
   * Get platform statistics (admin only)
   */
  @Get('platform-stats')
  @UseGuards(AdminGuard)
  async getPlatformStats() {
    const metrics = await this.analyticsService.getRealTimeMetrics();

    return {
      overview: {
        totalStreams: metrics.totalStreams,
        activeStreams: metrics.activeStreams,
        totalUsers: metrics.totalUsers,
        totalVods: metrics.totalVods,
        totalViewers: metrics.totalViewers,
        averageViewerCount: metrics.averageViewerCount,
      },
      topStreams: metrics.topStreams,
      recentActivity: metrics.recentActivity,
    };
  }

  /**
   * Get analytics dashboard data
   */
  @Get('dashboard')
  @UseGuards(AdminGuard)
  async getDashboardData() {
    const metrics = await this.analyticsService.getRealTimeMetrics();

    return {
      metrics,
      charts: {
        viewerTrend: await this.getViewerTrend(),
        streamCategories: await this.getStreamCategories(),
        userGrowth: await this.getUserGrowth(),
      },
    };
  }

  /**
   * Get viewer trend data
   */
  private async getViewerTrend() {
    // Get viewer count over last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // This would typically come from a time-series database
    // For now, return mock data
    return {
      labels: Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(yesterday.getTime() + i * 60 * 60 * 1000);
        return hour.getHours() + ':00';
      }),
      data: Array.from(
        { length: 24 },
        () => Math.floor(Math.random() * 1000) + 100
      ),
    };
  }

  /**
   * Get stream categories distribution
   */
  private async getStreamCategories() {
    // This would aggregate stream categories
    return {
      labels: ['Gaming', 'Music', 'Education', 'Entertainment', 'Sports'],
      data: [35, 25, 20, 15, 5],
    };
  }

  /**
   * Get user growth data
   */
  private async getUserGrowth() {
    // This would show user registration over time
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [100, 150, 200, 300, 400, 500],
    };
  }
}
