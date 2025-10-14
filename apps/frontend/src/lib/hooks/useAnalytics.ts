import { useCallback, useEffect, useState } from 'react';
import { analyticsService } from '../api/services/analytics.service';
// import { useSocket } from './useSocket'; // TODO: Implement socket functionality

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
    timestamp: string | Date;
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
  startTime: Date | string;
  endTime?: Date | string;
  status: 'live' | 'ended' | 'scheduled';
  username: string;
  category?: string;
  tags: string[];
}

export interface UserAnalytics {
  userId: string;
  username: string;
  totalStreams: number;
  totalViewers: number;
  totalLikes: number;
  averageViewerCount: number;
  streams: StreamAnalytics[];
}

export const useAnalytics = () => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const { socket } = useSocket(); // TODO: Implement socket functionality

  // Fetch initial metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getRealTimeMetrics();
      setMetrics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch analytics'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // TODO: Listen for real-time updates
  // useEffect(() => {
  //   if (!socket) return;
  //
  //   const handleMetricsUpdate = (data: RealTimeMetrics) => {
  //     setMetrics(data);
  //   };
  //
  //   if (socket && typeof socket === 'object' && socket !== null) {
  //     (socket as any).on('analytics:metrics', handleMetricsUpdate);
  //   }
  //
  //   return () => {
  //     if (socket && typeof socket === 'object' && socket !== null) {
  //       (socket as any).off('analytics:metrics', handleMetricsUpdate);
  //     }
  //   };
  // }, [socket]);

  // Fetch initial data
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
};

export const useStreamAnalytics = (streamId: string) => {
  const [analytics, setAnalytics] = useState<StreamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!streamId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getStreamAnalytics(streamId);
      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch stream analytics'
      );
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
};

export const useUserAnalytics = (userId: string) => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getUserAnalytics(userId);
      setAnalytics(data as unknown as UserAnalytics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch user analytics'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
};
