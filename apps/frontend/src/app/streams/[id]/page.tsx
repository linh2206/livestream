'use client';

import { RequireAuth } from '@/components/auth/AuthGuard';
import { Chat } from '@/components/features/Chat';
import { VideoPlayer } from '@/components/features/VideoPlayer';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { streamService } from '@/lib/api/services/stream.service';
import { Stream } from '@/lib/api/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSocketContext } from '@/lib/contexts/SocketContext';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function StreamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { socket, joinStreamChat, leaveStreamChat, joinStream, leaveStream } =
    useSocketContext();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [totalViewerCount, setTotalViewerCount] = useState(0);
  const [vodProcessing, setVodProcessing] = useState(false);

  const streamId = params?.id as string;

  const fetchStream = useCallback(async () => {
    if (!streamId) return;

    try {
      setLoading(true);
      const data: any = await streamService.getStream(streamId);
      setStream(data);
      // Set isLiked from backend response (server-side truth)
      setIsLiked(data.isLikedByUser || false);
      // Set VOD processing status
      setVodProcessing(data.vodProcessing || false);
      // Set viewer counts
      setViewerCount(data.viewerCount || 0);
      setTotalViewerCount(data.totalViewerCount || 0);
    } catch (err) {
      console.error('Error fetching stream:', err);
      setError('Failed to load stream');
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  // Join chat room and stream room
  useEffect(() => {
    if (stream && user && socket) {
      // Join chat room
      joinStreamChat(stream._id);

      // Join stream room for viewer count
      joinStream(stream._id);

      // Listen for viewer count updates
      const handleViewerCountUpdate = (data: any) => {
        if (data.streamId === stream._id) {
          setViewerCount(data.viewerCount);
          // Update stream state
          setStream(prev =>
            prev ? { ...prev, viewerCount: data.viewerCount } : null
          );
        }
      };

      // Listen for like updates (REALTIME)
      const handleLikeUpdate = (data: any) => {
        if (data.streamId === stream._id) {
          setStream(prev =>
            prev ? { ...prev, likeCount: data.likeCount } : null
          );
        }
      };

      // Listen for VOD processing updates
      const handleVodProcessing = (data: any) => {
        if (data.streamId === stream._id) {
          setVodProcessing(true);
          setStream(prev => (prev ? { ...prev, vodProcessing: true } : null));
        }
      };

      const handleVodCompleted = (data: any) => {
        if (data.streamId === stream._id) {
          setVodProcessing(false);
          // Refresh stream data to get VOD URL
          fetchStream();
        }
      };

      const handleVodFailed = (data: any) => {
        if (data.streamId === stream._id) {
          setVodProcessing(false);
          setStream(prev =>
            prev
              ? { ...prev, vodProcessing: false, vodProcessingStatus: 'failed' }
              : null
          );
        }
      };

      socket.on('stream:viewer_count_update', handleViewerCountUpdate);
      socket.on('stream:like', handleLikeUpdate);
      socket.on('vod:processing', handleVodProcessing);
      socket.on('vod:completed', handleVodCompleted);
      socket.on('vod:failed', handleVodFailed);

      return () => {
        leaveStreamChat(stream._id);
        leaveStream(stream._id);
        socket.off('stream:viewer_count_update', handleViewerCountUpdate);
        socket.off('stream:like', handleLikeUpdate);
        socket.off('vod:processing', handleVodProcessing);
        socket.off('vod:completed', handleVodCompleted);
        socket.off('vod:failed', handleVodFailed);
      };
    }
  }, [
    stream?._id,
    user?._id,
    socket,
    joinStreamChat,
    leaveStreamChat,
    joinStream,
    leaveStream,
  ]);

  const handleLike = async () => {
    if (!stream || !user) return;

    // Optimistic update for better UX
    const previousIsLiked = isLiked;
    const previousLikeCount = stream.likeCount || 0;

    setIsLiked(!isLiked);
    setStream(prev =>
      prev
        ? {
            ...prev,
            likeCount: isLiked ? previousLikeCount - 1 : previousLikeCount + 1,
          }
        : null
    );

    try {
      const result: any = await streamService.likeStream(stream._id);
      // Update with actual server response
      setIsLiked(result.isLiked);
      setStream(prev =>
        prev ? { ...prev, likeCount: result.stream.likeCount } : null
      );
    } catch (error) {
      console.error('Error liking stream:', error);
      // Rollback on error
      setIsLiked(previousIsLiked);
      setStream(prev =>
        prev ? { ...prev, likeCount: previousLikeCount } : null
      );
    }
  };

  // TẤT CẢ đều cần auth - kể cả video player
  if (loading) {
    return <Loading fullScreen text='Loading stream...' />;
  }

  // Check authentication first - TẤT CẢ cần auth

  if (error || !stream) {
    return (
      <div className='min-h-screen bg-gray-900'>
        <Header />
        <div className='flex'>
          <Sidebar />
          <div className='flex-1 flex items-center justify-center p-6'>
            <Card className='max-w-md mx-auto'>
              <div className='text-center text-red-400'>
                <p>{error || 'Stream not found'}</p>
                <Button
                  onClick={() => router.push('/streams')}
                  className='mt-4'
                >
                  Back to Streams
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className='min-h-screen bg-gray-900'>
        <Header />
        <div className='flex'>
          <Sidebar />
          <main className='flex-1 p-6'>
            <div className='max-w-7xl mx-auto'>
              <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                {/* Video Player */}
                <div className='lg:col-span-2'>
                  <Card>
                    <VideoPlayer
                      streamKey={stream.streamKey}
                      hlsUrl={stream.hlsUrl}
                      className='aspect-video'
                      autoPlay
                      muted={false}
                      controls
                      vodUrl={stream.vodUrl}
                      isVod={stream.isVod}
                      isLive={stream.isLive}
                      vodProcessing={stream.vodProcessing}
                      vodProcessingStatus={stream.vodProcessingStatus}
                    />

                    <div className='mt-4'>
                      <h1 className='text-2xl font-bold text-white mb-2'>
                        {stream.title}
                      </h1>
                      <p className='text-gray-300 mb-4'>{stream.description}</p>

                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                          <div className='flex items-center space-x-2'>
                            <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg'>
                              <span className='text-white font-bold text-sm'>
                                {stream.user?.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className='text-white font-medium'>
                              {stream.user?.username}
                            </span>
                          </div>

                          <div className='flex items-center space-x-2 text-gray-400'>
                            <svg
                              className='w-4 h-4'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path d='M10 12a2 2 0 100-4 2 2 0 000 4z' />
                              <path
                                fillRule='evenodd'
                                d='M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z'
                                clipRule='evenodd'
                              />
                            </svg>
                            <span>
                              {stream?.isLive ? (
                                <>
                                  {viewerCount} watching now
                                  {totalViewerCount > viewerCount && (
                                    <span className='text-gray-500 ml-1'>
                                      ({totalViewerCount} total)
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {totalViewerCount} total views
                                  {viewerCount > 0 && (
                                    <span className='text-gray-500 ml-1'>
                                      ({viewerCount} watching VOD)
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={handleLike}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                              isLiked
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600'
                            }`}
                          >
                            <svg
                              className='w-4 h-4'
                              fill={isLiked ? 'currentColor' : 'none'}
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                              />
                            </svg>
                            <span>{stream.likeCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Chat */}
                <div className='lg:col-span-1'>
                  <Chat streamId={stream._id} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
