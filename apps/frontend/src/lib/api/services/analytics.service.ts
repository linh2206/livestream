import { apiClient } from '../client';

export interface RealTimeMetrics {
  totalStreams: number;
  activeStreams: number;
  totalViewers: number;
  totalUsers: number;
  totalVods: number;
  averageViewerCount: number;
  topStreams: Array<{
    id: string;
    title: string;
    viewerCount: number;
    username: string;
  }>;
  recentActivity: Array<{
    type: 'stream_started' | 'stream_ended' | 'user_registered' | 'vod_created';
    timestamp: string;
    data: Record<string, unknown>;
  }>;
}

export interface StreamAnalytics {
  streamId: string;
  title: string;
  viewerCount: number;
  likeCount: number;
  totalViewerCount: number;
  duration: number;
  startTime: string;
  endTime?: string;
  status: 'live' | 'ended' | 'scheduled';
  username: string;
  category?: string;
  tags: string[];
}

export interface UserAnalytics {
  totalStreams: number;
  totalViewers: number;
  totalLikes: number;
  averageViewerCount: number;
  totalVods: number;
  recentStreams: Array<{
    id: string;
    title: string;
    viewerCount: number;
    startTime: string;
    status: string;
  }>;
}

export interface PlatformStats {
  overview: {
    totalStreams: number;
    activeStreams: number;
    totalUsers: number;
    totalVods: number;
    totalViewers: number;
    averageViewerCount: number;
  };
  topStreams: RealTimeMetrics['topStreams'];
  recentActivity: RealTimeMetrics['recentActivity'];
}

export interface DashboardData {
  metrics: RealTimeMetrics;
  charts: {
    viewerTrend: {
      labels: string[];
      data: number[];
    };
    streamCategories: {
      labels: string[];
      data: number[];
    };
    userGrowth: {
      labels: string[];
      data: number[];
    };
  };
}

class AnalyticsService {
  /**
   * Get real-time platform metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    return apiClient.get<RealTimeMetrics>('/analytics/realtime');
  }

  /**
   * Get stream analytics
   */
  async getStreamAnalytics(streamId: string): Promise<StreamAnalytics> {
    return apiClient.get<StreamAnalytics>(`/analytics/stream/${streamId}`);
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    return apiClient.get<UserAnalytics>(`/analytics/user/${userId}`);
  }

  /**
   * Get current user analytics
   */
  async getMyAnalytics(userId: string): Promise<UserAnalytics> {
    return apiClient.get<UserAnalytics>(
      `/analytics/my-analytics?userId=${userId}`
    );
  }

  /**
   * Get platform statistics (admin only)
   */
  async getPlatformStats(): Promise<PlatformStats> {
    return apiClient.get<PlatformStats>('/analytics/platform-stats');
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    return apiClient.get<DashboardData>('/analytics/dashboard');
  }
}

export const analyticsService = new AnalyticsService();
