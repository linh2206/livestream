'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { useStreamsList } from '@/lib/hooks/useStreamsList';
import { Stream } from '@/lib/api/types';
import { useSocketContext } from '@/lib/contexts/SocketContext';

export const StreamList: React.FC = () => {
  const { streams, isLoading, error, syncStreamStatus, mutate } = useStreamsList();
  const { socket } = useSocketContext();

  // Listen to WebSocket events for real-time updates
  useEffect(() => {
    if (socket) {
      // Listen for stream start events
      socket.on('stream:started', (streamData: any) => {
        // Refresh stream list to show new live stream
        mutate();
      });

      // Listen for stream end events
      socket.on('stream:ended', (data: any) => {
        // Refresh stream list to update status
        mutate();
      });

      // Listen for stream stop events
      socket.on('stream:stop', (data: any) => {
        // Refresh stream list to update status
        mutate();
      });

      // Listen for viewer count updates
      socket.on('stream:viewer_count_update', (data: any) => {
        // Refresh stream list to update viewer counts
        mutate();
      });

      // Cleanup event listeners
      return () => {
        socket.off('stream:started');
        socket.off('stream:ended');
        socket.off('stream:stop');
        socket.off('stream:viewer_count_update');
      };
    }
  }, [socket, mutate]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center text-gray-400">
          <Loading text="Loading streams..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center text-red-400">
          <p>Error loading streams: {error.message}</p>
        </div>
      </Card>
    );
  }

  if (streams.length === 0) {
    return (
      <Card>
        <div className="text-center text-gray-400">
          <p>No streams available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {streams.map((stream) => (
        <StreamCard 
          key={stream._id} 
          stream={stream} 
          onSyncStatus={syncStreamStatus}
        />
      ))}
    </div>
  );
};

const StreamCard: React.FC<{ stream: Stream; onSyncStatus?: (streamKey: string) => void }> = ({ stream, onSyncStatus }) => {
  const router = useRouter();
  
  const handleClick = () => {
    router.push(`/streams/${stream._id}`);
  };

  const handleSyncStatus = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking sync button
    if (onSyncStatus) {
      onSyncStatus(stream.streamKey);
    }
  };

  return (
    <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={handleClick}>
      <div className="space-y-4">
        <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <div className="text-4xl mb-2">📺</div>
            <div className="text-sm">Stream Preview</div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {stream.title}
          </h3>
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
            {stream.description || 'No description'}
          </p>
          
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {stream.viewerCount}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
                {stream.likeCount}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {stream.isLive ? (
                <span className="flex items-center text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center text-gray-500">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                  Offline
                </span>
              )}
              <button
                onClick={handleSyncStatus}
                className="text-gray-400 hover:text-blue-400 transition-colors"
                title="Sync stream status"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center">
              {stream.user?.avatar ? (
                <img
                  src={stream.user.avatar}
                  alt={stream.user.username}
                  className="w-6 h-6 rounded-full mr-2"
                />
              ) : (
                <div className="w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center">
                  <span className="text-xs text-white">
                    {stream.user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-gray-400">{stream.user?.username}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
