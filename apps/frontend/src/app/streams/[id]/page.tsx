'use client';

// import { RequireAuth } from '@/components/auth/AuthGuard';
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
  const { on, off, emit, isConnected } = useSocketContext();
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [_totalViewerCount, setTotalViewerCount] = useState(0);
  const [isStreamLive, setIsStreamLive] = useState(false);

  const streamId = params?.id as string;

  const fetchStream = useCallback(async () => {
    if (!streamId) return;

    try {
      setLoading(true);
      const data = await streamService.getStream(streamId);
      setStream(data);

      // Use API response for like status (real-time updates will come via WebSocket)
      const isLikedByUser = (data as unknown as Record<string, unknown>)
        .isLikedByUser as boolean;
      // eslint-disable-next-line no-console
      console.log('🔍 [Debug] Stream data:', {
        streamId,
        streamKey: data.streamKey,
        hlsUrl: data.hlsUrl,
        isLikedByUser,
        likeCount: data.likeCount,
        status: data.status,
        isLive: data.isLive,
        data,
      });
      setIsLiked(isLikedByUser);

      setViewerCount(data.viewerCount || 0);
      setTotalViewerCount(data.totalViewerCount || 0);
      setIsStreamLive(data.status === 'active');
    } catch (err) {
      setError('Failed to load stream');
      // eslint-disable-next-line no-console
      console.error('Error fetching stream:', err);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  useEffect(() => {
    if (!streamId || !user) return;

    // Debug: Log WebSocket connection status
    // eslint-disable-next-line no-console
    console.log('🔌 [Debug] Attempting to join stream:', {
      streamId,
      userId: user._id,
      isConnected,
    });

    // Only emit if connected
    if (isConnected) {
      // Join stream room for real-time updates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emit('join_stream', { streamId, userId: user._id } as any);
      // eslint-disable-next-line no-console
      console.log('🔌 [Debug] Emitted join_stream event');
    } else {
      // eslint-disable-next-line no-console
      console.log('🔌 [Debug] WebSocket not connected, skipping join_stream');
    }

    // Listen for real-time stream updates
    const handleStreamStarted = (streamData: Record<string, unknown>) => {
      if (streamData._id === streamId) {
        setIsStreamLive(true);
        setStream(streamData as unknown as Stream);
      }
    };

    const handleStreamEnded = (data: Record<string, unknown>) => {
      if (data.streamId === streamId) {
        setIsStreamLive(false);
      }
    };

    const handleViewerCountUpdate = (data: Record<string, unknown>) => {
      if (data.streamId === streamId) {
        setViewerCount(data.viewerCount as number);
      }
    };

    const handleLikeUpdate = (data: Record<string, unknown>) => {
      if (data.streamId === streamId) {
        setStream(prev =>
          prev ? { ...prev, likeCount: data.likeCount as number } : null
        );
      }
    };

    // Register event listeners
    on('stream:started', handleStreamStarted);
    on('stream:ended', handleStreamEnded);
    on('stream:viewer_count_update', handleViewerCountUpdate);
    on('stream:like_update', handleLikeUpdate);

    return () => {
      // Clean up event listeners
      off('stream:started', handleStreamStarted);
      off('stream:ended', handleStreamEnded);
      off('stream:viewer_count_update', handleViewerCountUpdate);
      off('stream:like_update', handleLikeUpdate);

      // Leave stream room
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emit('leave_stream', { streamId, userId: user._id } as any);
    };
  }, [streamId, user, on, off, emit, isConnected]);

  const handleLike = async () => {
    if (!stream || !user) return;

    try {
      // eslint-disable-next-line no-console
      console.log('❤️ [Debug] Attempting to like stream:', stream._id);

      // Call API to like/unlike (this will trigger WebSocket broadcast)
      const result = await streamService.likeStream(stream._id);
      const isLikedResult = (result as Record<string, unknown>)
        .isLiked as boolean;
      const updatedStream = (result as Record<string, unknown>)
        .stream as Stream;

      // Update local state immediately
      setIsLiked(isLikedResult);
      setStream(updatedStream);

      // eslint-disable-next-line no-console
      console.log('❤️ [Debug] Like result:', result);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error liking stream:', err);
    }
  };

  const _handleShare = async () => {
    if (!stream) return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    } catch (err) {
      // TODO: Handle share error properly
      // console.error('Error sharing stream:', err);
    }
  };

  const _handleDownload = async () => {
    if (!stream) return;

    try {
      // Implement download logic
      // TODO: Implement download logic
      // console.log('Downloading stream:', stream._id);
    } catch (err) {
      // TODO: Handle download error properly
      // console.error('Error downloading stream:', err);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-900'>
        <Header />
        <div className='flex'>
          <Sidebar />
          <main className='flex-1 p-6'>
            <div className='max-w-7xl mx-auto'>
              <Loading />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className='min-h-screen bg-gray-900'>
        <Header />
        <div className='flex'>
          <Sidebar />
          <main className='flex-1 p-6'>
            <div className='max-w-7xl mx-auto'>
              <Card>
                <div className='p-6 text-center'>
                  <h2 className='text-xl font-semibold text-white mb-4'>
                    Stream Not Found
                  </h2>
                  <p className='text-gray-400 mb-6'>
                    {error || 'The stream you are looking for does not exist.'}
                  </p>
                  <Button onClick={() => router.push('/streams')}>
                    Back to Streams
                  </Button>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-7xl mx-auto'>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 h-full'>
              {/* Video Player */}
              <div className='lg:col-span-2 flex flex-col'>
                <Card className='flex-1 relative'>
                  <div className='p-6 h-full'>
                    <VideoPlayer
                      streamKey={stream.streamKey}
                      hlsUrl={stream.hlsUrl}
                      isVod={false}
                      isLive={isStreamLive}
                      viewerCount={viewerCount}
                      className='h-full'
                    />
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className='absolute top-2 left-2 bg-black/80 text-white text-xs p-2 rounded'>
                        <div>StreamKey: {stream.streamKey}</div>
                        <div>HLS URL: {stream.hlsUrl}</div>
                        <div>Is Live: {isStreamLive ? 'Yes' : 'No'}</div>
                      </div>
                    )}

                    {/* Like button at bottom of player */}
                    <div className='absolute bottom-4 right-4'>
                      <Button
                        variant={isLiked ? 'primary' : 'secondary'}
                        onClick={handleLike}
                        className='flex items-center space-x-2 bg-black/60 backdrop-blur-sm hover:bg-black/70 transition-all duration-200 px-4 py-2 rounded-full shadow-lg'
                      >
                        <span className='text-lg'>{isLiked ? '❤️' : '🤍'}</span>
                        <span className='font-medium'>
                          {((stream as unknown as Record<string, unknown>)
                            .likeCount as number) || 0}
                        </span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Chat */}
              <div className='lg:col-span-1 h-full'>
                <Chat streamId={stream._id} className='h-full' />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
