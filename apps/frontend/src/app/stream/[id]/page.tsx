'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/features/VideoPlayer';
import { Chat } from '@/components/features/Chat';
import { Stream } from '@/types/stream';
import { streamService } from '@/services/stream.service';
import { Loading } from '@/components/ui/Loading';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';

export default function StreamDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { socket, joinStreamChat, leaveStreamChat, sendMessage, likeStream } = useSocket();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchStream(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    if (stream && user) {
      joinStreamChat(stream.id);
      return () => {
        leaveStreamChat(stream.id);
      };
    }
  }, [stream, user, joinStreamChat, leaveStreamChat]);

  const fetchStream = async (id: string) => {
    try {
      setLoading(true);
      const data = await streamService.getStream(id);
      setStream(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stream');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!stream || !user) return;
    
    try {
      await streamService.likeStream(stream.id);
      likeStream(stream.id);
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Failed to like stream:', err);
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading stream..." />;
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <div className="text-center text-red-400">
            <p>{error || 'Stream not found'}</p>
            <Button
              onClick={() => window.location.href = '/'}
              className="mt-4"
            >
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card>
              <VideoPlayer
                streamKey={stream.streamKey}
                className="aspect-video"
                autoPlay
                muted={false}
                controls
              />
              
              <div className="mt-4">
                <h1 className="text-2xl font-bold text-white mb-2">
                  {stream.title}
                </h1>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12l-4-4h8l-4 4z" />
                      </svg>
                      <span className="text-gray-300">{stream.viewerCount} viewers</span>
                    </div>
                    
                    <button
                      onClick={handleLike}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${
                        isLiked
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      <span>{stream.likeCount}</span>
                    </button>
                  </div>
                  
                  {stream.user && (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {stream.user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-300">{stream.user.username}</span>
                    </div>
                  )}
                </div>
                
                {stream.description && (
                  <p className="text-gray-300">{stream.description}</p>
                )}
              </div>
            </Card>
          </div>
          
          {/* Chat */}
          <div className="lg:col-span-1">
            <Chat streamId={stream.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
