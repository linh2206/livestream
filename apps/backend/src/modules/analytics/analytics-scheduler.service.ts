import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsSchedulerService {
  private readonly logger = new Logger(AnalyticsSchedulerService.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Update real-time metrics every 10 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateRealTimeMetrics() {
    try {
      await this.analyticsService.broadcastMetrics();
      this.logger.debug('Real-time metrics updated and broadcasted');
    } catch (error) {
      this.logger.error('Failed to update real-time metrics:', error);
    }
  }

  /**
   * Clear analytics cache every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async clearAnalyticsCache() {
    try {
      await this.analyticsService.clearCache();
      this.logger.debug('Analytics cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear analytics cache:', error);
    }
  }

  /**
   * Generate daily analytics report
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReport() {
    try {
      const metrics = await this.analyticsService.getRealTimeMetrics();
      this.logger.log('Daily analytics report generated:', {
        totalStreams: metrics.totalStreams,
        activeStreams: metrics.activeStreams,
        totalViewers: metrics.totalViewers,
        totalUsers: metrics.totalUsers,
      });
    } catch (error) {
      this.logger.error('Failed to generate daily report:', error);
    }
  }
}
