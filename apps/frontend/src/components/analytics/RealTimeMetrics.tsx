'use client';

import React from 'react';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';

interface MetricCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, trend }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        {trend && (
          <p className={`text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </p>
        )}
      </div>
      <div className={`text-3xl ${color}`}>{icon}</div>
    </div>
  </Card>
);

export const RealTimeMetrics: React.FC = () => {
  const { metrics, loading, error } = useAnalytics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Loading />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-400">
          <p>Failed to load analytics: {error}</p>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <p>No analytics data available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Streams"
        value={metrics.totalStreams}
        icon="📺"
        color="text-blue-400"
      />
      <MetricCard
        title="Active Streams"
        value={metrics.activeStreams}
        icon="🔴"
        color="text-red-400"
      />
      <MetricCard
        title="Total Viewers"
        value={metrics.totalViewers}
        icon="👥"
        color="text-green-400"
      />
      <MetricCard
        title="Total Users"
        value={metrics.totalUsers}
        icon="👤"
        color="text-purple-400"
      />
    </div>
  );
};

export const TopStreams: React.FC = () => {
  const { metrics, loading, error } = useAnalytics();

  if (loading) {
    return (
      <Card className="p-6">
        <Loading />
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <p>No data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Top Streams</h3>
      <div className="space-y-3">
        {metrics.topStreams.map((stream, index) => (
          <div key={stream.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
              <div>
                <p className="text-white font-medium">{stream.title}</p>
                <p className="text-sm text-gray-400">by {stream.username}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-semibold">{stream.viewerCount} viewers</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const RecentActivity: React.FC = () => {
  const { metrics, loading, error } = useAnalytics();

  if (loading) {
    return (
      <Card className="p-6">
        <Loading />
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-400">
          <p>No data available</p>
        </div>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stream_started': return '🔴';
      case 'stream_ended': return '⏹️';
      case 'user_registered': return '👤';
      case 'vod_created': return '📹';
      default: return '📝';
    }
  };

  const getActivityText = (activity: typeof metrics.recentActivity[0]) => {
    switch (activity.type) {
      case 'stream_started':
        return `${activity.data.username} started streaming "${activity.data.title}"`;
      case 'stream_ended':
        return `${activity.data.username} ended stream "${activity.data.title}"`;
      case 'user_registered':
        return `${activity.data.username} joined the platform`;
      case 'vod_created':
        return `${activity.data.username} created VOD "${activity.data.title}"`;
      default:
        return 'Unknown activity';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {metrics.recentActivity.slice(0, 10).map((activity, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
            <span className="text-lg">{getActivityIcon(activity.type)}</span>
            <div className="flex-1">
              <p className="text-white text-sm">{getActivityText(activity)}</p>
              <p className="text-xs text-gray-400">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
