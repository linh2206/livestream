'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Stream } from '@/types/stream';
import { streamService } from '@/services/stream.service';

export const StreamList: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const data = await streamService.getStreams();
      setStreams(data.streams);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch streams');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Loading streams..." />;
  }

  if (error) {
    return (
      <Card>
        <div className="text-center text-red-400">
          <p>{error}</p>
          <button
            onClick={fetchStreams}
            className="mt-2 text-blue-400 hover:text-blue-300"
          >
            Try again
          </button>
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
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
};

const StreamCard: React.FC<{ stream: Stream }> = ({ stream }) => {
  const handleClick = () => {
    window.location.href = `/stream/${stream.id}`;
  };

  return (
    <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={handleClick}>
      <div className="space-y-4">
        <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
          {stream.thumbnail ? (
            <img
              src={stream.thumbnail}
              alt={stream.title}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12l-4-4h8l-4 4z" />
              </svg>
              <p>No thumbnail</p>
            </div>
          )}
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
            
            <div className="flex items-center">
              {stream.isLive && (
                <span className="flex items-center text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" />
                  Live
                </span>
              )}
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
