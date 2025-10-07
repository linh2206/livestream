'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';
import { AuthWrapper } from '@/components/auth/AuthWrapper';
import { LoadingWrapper } from '@/components/ui/LoadingWrapper';

interface SystemStats {
  timestamp: string;
  system: {
    uptime: number;
    memory: {
      total: number;
      free: number;
      used: number;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
      usage: number;
    };
    disk: {
      total: number;
      free: number;
      used: number;
      percentage: number;
    };
  };
  application: {
    activeUsers: number;
    totalUsers: number;
    activeStreams: number;
    totalStreams: number;
    totalMessages: number;
    websocketConnections: number;
  };
  database: {
    connections: number;
    operations: number;
    responseTime: number;
  };
  redis: {
    connected: boolean;
    memory: number;
    keys: number;
  };
}

interface UserActivity {
  userId: string;
  username: string;
  lastLogin: string;
  totalStreams: number;
  totalViews: number;
  isOnline: boolean;
}

interface StreamAnalytics {
  streamId: string;
  title: string;
  streamer: string;
  startTime: string;
  duration: number;
  peakViewers: number;
  totalViews: number;
  totalMessages: number;
  status: string;
}

export default function AdminMonitoringPage() {
  // ALL HOOKS AT TOP - NEVER AFTER CONDITIONAL RETURNS
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [streamAnalytics, setStreamAnalytics] = useState<StreamAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect BEFORE conditional returns
  useEffect(() => {
    // Only fetch if authenticated and is admin
    if (!authLoading && user && user.role === 'admin') {
      const fetchData = async () => {
        try {
          const [statsData, usersData, streamsData] = await Promise.all([
            apiClient.get<SystemStats>('/monitoring/stats'),
            apiClient.get<UserActivity[]>('/monitoring/users/activity'),
            apiClient.get<StreamAnalytics[]>('/monitoring/streams/analytics'),
          ]);

          setStats(statsData);
          setUserActivity(usersData);
          setStreamAnalytics(streamsData);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setLoading(false);
        }
      };

      fetchData();
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [authLoading, user]);

  // NOW conditional returns are safe
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
        loadingText='Loading monitoring...'
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
      loadingText='Loading monitoring data...'
      error={error}
      className='p-6'
    >
      <div className='text-white p-6 h-full'>
        <div className='h-full flex flex-col max-w-7xl mx-auto'>
          <h1 className='text-2xl font-bold mb-4'>System Monitoring</h1>

          {/* System Stats */}
          {stats && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
              <div className='bg-gray-800 rounded-lg p-4'>
                <h3 className='text-xs font-medium text-gray-400 mb-1'>
                  CPU Usage
                </h3>
                <p className='text-2xl font-bold'>
                  {stats.system.cpu.usage.toFixed(1)}%
                </p>
              </div>
              <div className='bg-gray-800 rounded-lg p-4'>
                <h3 className='text-xs font-medium text-gray-400 mb-1'>
                  Memory Usage
                </h3>
                <p className='text-2xl font-bold'>
                  {stats.system.memory.percentage.toFixed(1)}%
                </p>
              </div>
              <div className='bg-gray-800 rounded-lg p-4'>
                <h3 className='text-xs font-medium text-gray-400 mb-1'>
                  Active Users
                </h3>
                <p className='text-2xl font-bold'>
                  {stats.application.activeUsers}
                </p>
              </div>
              <div className='bg-gray-800 rounded-lg p-4'>
                <h3 className='text-xs font-medium text-gray-400 mb-1'>
                  Active Streams
                </h3>
                <p className='text-2xl font-bold'>
                  {stats.application.activeStreams}
                </p>
              </div>
            </div>
          )}

          {/* User Activity */}
          <div className='bg-gray-800 rounded-lg p-4 mb-4'>
            <h2 className='text-lg font-bold mb-3'>User Activity</h2>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-700'>
                  <tr>
                    <th className='px-4 py-2 text-left'>Username</th>
                    <th className='px-4 py-2 text-left'>Last Login</th>
                    <th className='px-4 py-2 text-left'>Streams</th>
                    <th className='px-4 py-2 text-left'>Views</th>
                    <th className='px-4 py-2 text-left'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userActivity.map(user => (
                    <tr key={user.userId} className='border-t border-gray-700'>
                      <td className='px-4 py-2'>{user.username}</td>
                      <td className='px-4 py-2'>
                        {new Date(user.lastLogin).toLocaleString()}
                      </td>
                      <td className='px-4 py-2'>{user.totalStreams}</td>
                      <td className='px-4 py-2'>{user.totalViews}</td>
                      <td className='px-4 py-2'>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            user.isOnline ? 'bg-green-600' : 'bg-gray-600'
                          }`}
                        >
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stream Analytics */}
          <div className='bg-gray-800 rounded-lg p-4'>
            <h2 className='text-lg font-bold mb-3'>Stream Analytics</h2>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-700'>
                  <tr>
                    <th className='px-4 py-2 text-left'>Title</th>
                    <th className='px-4 py-2 text-left'>Streamer</th>
                    <th className='px-4 py-2 text-left'>Duration</th>
                    <th className='px-4 py-2 text-left'>Peak Viewers</th>
                    <th className='px-4 py-2 text-left'>Total Views</th>
                    <th className='px-4 py-2 text-left'>Messages</th>
                    <th className='px-4 py-2 text-left'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {streamAnalytics.map(stream => (
                    <tr
                      key={stream.streamId}
                      className='border-t border-gray-700'
                    >
                      <td className='px-4 py-2'>{stream.title}</td>
                      <td className='px-4 py-2'>{stream.streamer}</td>
                      <td className='px-4 py-2'>
                        {Math.floor(stream.duration / 60)}m
                      </td>
                      <td className='px-4 py-2'>{stream.peakViewers}</td>
                      <td className='px-4 py-2'>{stream.totalViews}</td>
                      <td className='px-4 py-2'>{stream.totalMessages}</td>
                      <td className='px-4 py-2'>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            stream.status === 'live'
                              ? 'bg-red-600'
                              : 'bg-gray-600'
                          }`}
                        >
                          {stream.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </LoadingWrapper>
  );
}
