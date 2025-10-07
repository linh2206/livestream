import { apiClient } from '../client';

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalStreams: number;
  activeStreams: number;
  totalViews: number;
  totalMessages: number;
  totalLikes: number;
  newUsersThisPeriod: number;
  newStreamsThisPeriod: number;
  userGrowthRate: number;
  streamGrowthRate: number;
}

export interface RealtimeData {
  onlineUsers: number;
  activeStreams: number;
  totalViewers: number;
  recentMessages: number;
  timestamp: string;
}

export interface TopStreamer {
  _id: string;
  username: string;
  avatar?: string;
  totalStreams: number;
  totalViews: number;
  totalLikes: number;
  averageViewers: number;
}

export interface ChatStats {
  messageStats: Array<{
    _id: {
      year: number;
      month: number;
      day: number;
    };
    messages: number;
  }>;
  topChatters: Array<{
    username: string;
    avatar?: string;
    messageCount: number;
  }>;
}

class AnalyticsService {
  async getOverview(timeRange: string = '7d'): Promise<AnalyticsOverview> {
    return apiClient.get<AnalyticsOverview>(
      `/analytics/overview?timeRange=${timeRange}`
    );
  }

  async getUserAnalytics(timeRange: string = '7d') {
    return apiClient.get(`/analytics/users?timeRange=${timeRange}`);
  }

  async getStreamAnalytics(timeRange: string = '7d') {
    return apiClient.get(`/analytics/streams?timeRange=${timeRange}`);
  }

  async getRealtimeData(): Promise<RealtimeData> {
    return apiClient.get<RealtimeData>('/analytics/realtime');
  }

  async getTopStreamers(limit: number = 10): Promise<TopStreamer[]> {
    return apiClient.get<TopStreamer[]>(
      `/analytics/top-streamers?limit=${limit}`
    );
  }

  async getChatStats(timeRange: string = '7d'): Promise<ChatStats> {
    return apiClient.get<ChatStats>(
      `/analytics/chat-stats?timeRange=${timeRange}`
    );
  }
}

export const analyticsService = new AnalyticsService();
