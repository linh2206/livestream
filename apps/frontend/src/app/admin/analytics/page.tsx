'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AuthWrapper } from '@/components/auth/AuthWrapper';
import { LoadingWrapper } from '@/components/ui/LoadingWrapper';
import { apiClient } from '@/lib/api/client';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalStreams: number;
  activeStreams: number;
  totalViews: number;
  totalMessages: number;
  topStreamers: Array<{
    username: string;
    totalStreams: number;
    totalViews: number;
  }>;
  streamStats: Array<{
    date: string;
    streams: number;
    views: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
}

export default function AdminAnalyticsPage() {
  // ALL HOOKS AT TOP
  const { user, isLoading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');

  // useEffect BEFORE conditional returns
  React.useEffect(() => {
    if (!authLoading && user && user.role === 'admin') {
      const fetchAnalytics = async () => {
        try {
          // Use existing endpoints instead of non-existent /analytics
          const [usersData, streamsData] = await Promise.all([
            apiClient.get('/users'),
            apiClient.get('/streams'),
          ]);

          // Build analytics from available data
          const analyticsData: AnalyticsData = {
            totalUsers: (usersData as any).data?.length || 0,
            activeUsers:
              (usersData as any).data?.filter((u: any) => u.isActive).length ||
              0,
            totalStreams: (streamsData as any).data?.length || 0,
            activeStreams:
              (streamsData as any).data?.filter((s: any) => s.isLive).length ||
              0,
            totalViews:
              (streamsData as any).data?.reduce(
                (sum: number, s: any) => sum + (s.viewerCount || 0),
                0
              ) || 0,
            totalMessages: 0, // Would need to query chat messages
            topStreamers: [],
            streamStats: [],
            userGrowth: [],
          };

          setAnalytics(analyticsData);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setLoading(false);
        }
      };

      fetchAnalytics();
    }
  }, [authLoading, user, timeRange]);

  const memoizedStats = useMemo(() => {
    if (!analytics) return null;

    return {
      avgViewsPerStream:
        analytics.totalStreams > 0
          ? Math.round(analytics.totalViews / analytics.totalStreams)
          : 0,
      avgMessagesPerStream:
        analytics.totalStreams > 0
          ? Math.round(analytics.totalMessages / analytics.totalStreams)
          : 0,
      userEngagement:
        analytics.totalUsers > 0
          ? Math.round((analytics.activeUsers / analytics.totalUsers) * 100)
          : 0,
    };
  }, [analytics]);

  // NOW conditional returns
  if (authLoading) {
    return (
      <div className='flex items-center justify-center p-6'>
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-300'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <AuthWrapper
        requireAdmin={true}
        loadingText='Loading analytics...'
        unauthorizedText='Admin Access Required'
        className='p-6'
      >
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-500 mb-4'>
            Access Denied
          </h1>
          <p className='text-gray-300'>
            You need admin privileges to access this page.
          </p>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <LoadingWrapper
      isLoading={loading}
      loadingText='Loading analytics...'
      error={error}
      className='p-6'
    >
      <div className='text-white p-6 h-full'>
        <div className='h-full flex flex-col max-w-7xl mx-auto'>
          <div className='flex justify-between items-center mb-4'>
            <h1 className='text-2xl font-bold'>Analytics Dashboard</h1>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className='px-4 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='24h'>Last 24 Hours</option>
              <option value='7d'>Last 7 Days</option>
              <option value='30d'>Last 30 Days</option>
              <option value='90d'>Last 90 Days</option>
            </select>
          </div>

          {analytics && (
            <>
              {/* Key Metrics */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
                <div className='bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-2'>Total Users</h3>
                  <div className='text-3xl font-bold'>
                    {analytics.totalUsers.toLocaleString()}
                  </div>
                  <div className='text-sm opacity-80'>
                    {analytics.activeUsers} active
                  </div>
                </div>

                <div className='bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-2'>Total Streams</h3>
                  <div className='text-3xl font-bold'>
                    {analytics.totalStreams.toLocaleString()}
                  </div>
                  <div className='text-sm opacity-80'>
                    {analytics.activeStreams} live
                  </div>
                </div>

                <div className='bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-2'>Total Views</h3>
                  <div className='text-3xl font-bold'>
                    {analytics.totalViews.toLocaleString()}
                  </div>
                  <div className='text-sm opacity-80'>
                    {memoizedStats?.avgViewsPerStream} avg/stream
                  </div>
                </div>

                <div className='bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-2'>Total Messages</h3>
                  <div className='text-3xl font-bold'>
                    {analytics.totalMessages.toLocaleString()}
                  </div>
                  <div className='text-sm opacity-80'>
                    {memoizedStats?.avgMessagesPerStream} avg/stream
                  </div>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-2'>
                    User Engagement
                  </h3>
                  <div className='text-2xl font-bold text-blue-400'>
                    {memoizedStats?.userEngagement}%
                  </div>
                  <div className='text-sm text-gray-400'>
                    Active users ratio
                  </div>
                </div>

                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-2'>
                    Stream Success Rate
                  </h3>
                  <div className='text-2xl font-bold text-green-400'>
                    {analytics.totalStreams > 0
                      ? Math.round(
                          (analytics.activeStreams / analytics.totalStreams) *
                            100
                        )
                      : 0}
                    %
                  </div>
                  <div className='text-sm text-gray-400'>
                    Currently live streams
                  </div>
                </div>

                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-2'>
                    Avg Views/Stream
                  </h3>
                  <div className='text-2xl font-bold text-purple-400'>
                    {memoizedStats?.avgViewsPerStream.toLocaleString()}
                  </div>
                  <div className='text-sm text-gray-400'>
                    Average viewership
                  </div>
                </div>
              </div>

              {/* Top Streamers */}
              <div className='bg-gray-800 rounded-lg p-6 mb-8'>
                <h2 className='text-xl font-semibold mb-4'>Top Streamers</h2>
                <div className='space-y-4'>
                  {analytics.topStreamers.slice(0, 5).map((streamer, index) => (
                    <div
                      key={streamer.username}
                      className='flex items-center justify-between p-4 bg-gray-700 rounded-lg'
                    >
                      <div className='flex items-center'>
                        <div className='w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3'>
                          {index + 1}
                        </div>
                        <div>
                          <div className='font-medium'>{streamer.username}</div>
                          <div className='text-sm text-gray-400'>
                            {streamer.totalStreams} streams
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-green-400'>
                          {streamer.totalViews.toLocaleString()}
                        </div>
                        <div className='text-sm text-gray-400'>total views</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts Placeholder */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-4'>
                    Stream Activity
                  </h3>
                  <div className='h-64 flex items-center justify-center text-gray-400'>
                    <div className='text-center'>
                      <div className='text-4xl mb-2'>📊</div>
                      <p>Stream activity chart would be here</p>
                      <p className='text-sm'>
                        Integration with chart library needed
                      </p>
                    </div>
                  </div>
                </div>

                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold mb-4'>User Growth</h3>
                  <div className='h-64 flex items-center justify-center text-gray-400'>
                    <div className='text-center'>
                      <div className='text-4xl mb-2'>📈</div>
                      <p>User growth chart would be here</p>
                      <p className='text-sm'>
                        Integration with chart library needed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </LoadingWrapper>
  );
}
