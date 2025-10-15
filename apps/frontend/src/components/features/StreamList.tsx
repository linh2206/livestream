'use client';

import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Loading } from '@/components/ui/Loading';
import { streamService } from '@/lib/api/services/stream.service';
import { Stream } from '@/lib/api/types';
import { useAuth } from '@/lib/contexts/AuthContext';
// import { useSocketContext } from '@/lib/contexts/SocketContext'; // TODO: Implement socket functionality
import { useToast } from '@/lib/contexts/ToastContext';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { useStreamsList } from '@/lib/hooks/useStreamsList';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';

export const StreamList: React.FC = () => {
  const { streams, isLoading, error, syncStreamStatus, mutate } =
    useStreamsList();
  // const { socket } = useSocketContext(); // TODO: Implement socket functionality
  const { showError: _showError } = useToast();

  // Memoize the refresh function to prevent infinite re-renders
  const _refreshStreams = useCallback(() => {
    mutate();
  }, [mutate]);

  // Listen to WebSocket events for real-time updates
  // TODO: Implement socket listeners for real-time updates
  // useEffect(() => {
  //   if (socket && typeof socket === 'object' && socket !== null) {
  //     const socketObj = socket as {
  //       on: (event: string, callback: (data: unknown) => void) => void;
  //       off: (event: string) => void;
  //     };
  //
  //     // Listen for stream start events
  //     socketObj.on('stream:started', (_streamData: unknown) => {
  //       // Refresh stream list to show new live stream
  //       refreshStreams();
  //     });
  //
  //     // Listen for stream end events
  //     socketObj.on('stream:ended', (_data: unknown) => {
  //       // Refresh stream list to update status
  //       refreshStreams();
  //     });
  //
  //     // Listen for stream stop events
  //     socketObj.on('stream:stop', (_data: unknown) => {
  //       // Refresh stream list to update status
  //       refreshStreams();
  //     });
  //
  //     // Listen for viewer count updates
  //     socketObj.on('stream:viewer_count_update', (_data: unknown) => {
  //       // Refresh stream list to update viewer counts
  //       refreshStreams();
  //     });
  //
  //     // Cleanup event listeners
  //     return () => {
  //       socketObj.off('stream:started');
  //       socketObj.off('stream:ended');
  //       socketObj.off('stream:stop');
  //       socketObj.off('stream:viewer_count_update');
  //     };
  //   }
  // }, [socket, refreshStreams]);

  if (isLoading) {
    return (
      <Card>
        <div className='text-center text-gray-400'>
          <Loading text='Loading streams...' />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className='text-center text-red-400'>
          <p>Error loading streams: {error.message}</p>
        </div>
      </Card>
    );
  }

  if (streams.length === 0) {
    return (
      <Card>
        <div className='text-center text-gray-400'>
          <p>No streams available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
      {streams.map(stream => (
        <StreamCard
          key={stream._id}
          stream={stream}
          onSyncStatus={syncStreamStatus}
        />
      ))}
    </div>
  );
};

const StreamCard: React.FC<{
  stream: Stream;
  onSyncStatus?: (streamKey: string) => void;
}> = ({ stream, onSyncStatus }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const { showError } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleClick = () => {
    router.push(`/streams/${stream._id}`);
  };

  const handleSyncStatus = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking sync button
    if (onSyncStatus) {
      onSyncStatus(stream.streamKey);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete button
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await streamService.deleteStream(stream._id);
      setShowDeleteModal(false);
      // Refresh the stream list
      window.location.reload();
    } catch (error) {
      handleError(error);
      showError('Delete Failed', 'Failed to delete stream. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if user can delete this stream (owner or admin)
  const canDelete =
    user && (user._id === stream.userId || user.role === 'admin');

  return (
    <Card
      className='cursor-pointer hover:border-blue-500 transition-colors relative'
      onClick={handleClick}
    >
      {/* Delete button - only show if user can delete */}
      {canDelete && (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className='absolute top-2 right-2 z-10 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-50'
          title='Delete stream'
        >
          {isDeleting ? '...' : '×'}
        </button>
      )}

      <div className='space-y-4'>
        <div className='aspect-video bg-gray-700 rounded-lg flex items-center justify-center'>
          <div className='text-gray-400 text-center'>
            <div className='text-4xl mb-2'>📺</div>
            <div className='text-sm'>Stream Preview</div>
          </div>
        </div>

        <div>
          <h3 className='text-lg font-semibold text-white mb-2 line-clamp-2'>
            {stream.title}
          </h3>
          <p className='text-gray-400 text-sm mb-3 line-clamp-2'>
            {stream.description || 'No description'}
          </p>

          <div className='flex items-center justify-between text-sm text-gray-400'>
            <div className='flex items-center space-x-4'>
              <span className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-1'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z' />
                </svg>
                {stream.likeCount}
              </span>
            </div>

            <div className='flex items-center space-x-2'>
              {stream.isLive ? (
                <span className='flex items-center text-red-400'>
                  <div className='w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse' />
                  Live
                </span>
              ) : (
                <span className='flex items-center text-gray-500'>
                  <div className='w-2 h-2 bg-gray-500 rounded-full mr-2' />
                  Offline
                </span>
              )}
              <button
                onClick={handleSyncStatus}
                className='text-gray-400 hover:text-blue-400 transition-colors'
                title='Sync stream status'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className='mt-3 flex items-center justify-between'>
            <div className='flex items-center'>
              {stream.user?.avatar ? (
                <Image
                  src={stream.user.avatar}
                  alt={stream.user.username}
                  width={24}
                  height={24}
                  className='w-6 h-6 rounded-full mr-2'
                />
              ) : (
                <div className='w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center'>
                  <span className='text-xs text-white'>
                    {stream.user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className='text-sm text-gray-400'>
                {stream.user?.username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title='Delete Stream'
        message={`Are you sure you want to delete "${stream.title}"? This action cannot be undone and will permanently remove the stream and all its data.`}
        confirmText='Delete'
        cancelText='Cancel'
        isLoading={isDeleting}
        variant='danger'
      />
    </Card>
  );
};
