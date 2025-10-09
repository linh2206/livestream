'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { vodService } from '@/lib/api/services/vod.service';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

interface VodItem {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  vodUrl: string;
  duration: number;
  durationFormatted: string;
  fileSizeFormatted: string;
  category?: string;
  tags: string[];
  startTime: string;
  endTime: string;
  viewerCount: number;
  totalViewerCount: number;
  likeCount: number;
  user: {
    _id: string;
    username: string;
    avatar?: string;
    fullName?: string;
  };
  createdAt: string;
}

interface VodListProps {
  userId?: string;
  category?: string;
  limit?: number;
}

export const VodList: React.FC<VodListProps> = ({
  userId,
  category,
  limit = 12,
}) => {
  const router = useRouter();
  const [vods, setVods] = useState<VodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchVods = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);
        const response = await vodService.getVodList({
          page: pageNum,
          limit,
          userId,
        });

        // Check if response has the expected structure
        if (response && response.vods && Array.isArray(response.vods)) {
          if (append) {
            setVods(prev => [
              ...prev,
              ...(response.vods as unknown as VodItem[]),
            ]);
          } else {
            setVods(response.vods as unknown as VodItem[]);
          }

          setHasMore(response.pagination?.hasNext || false);
          setPage(pageNum);
        } else {
          setError('Invalid response format from server');
        }
      } catch (err: unknown) {
        console.error('Error fetching VODs:', err);
        const errorMessage = (err as any)?.response?.data?.message || 
                           (err as Error).message || 
                           'Failed to load videos';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userId, limit]
  );

  useEffect(() => {
    fetchVods(1, false);
  }, [userId, category, limit, fetchVods]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchVods(page + 1, true);
    }
  };

  const handleVodClick = (vod: VodItem) => {
    router.push(`/streams/${vod._id}`);
  };

  if (loading && vods.length === 0) {
    return (
      <Card>
        <div className='text-center text-gray-400'>
          <Loading text='Loading videos...' />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className='text-center text-red-400'>
          <p>Error loading videos: {error}</p>
          <Button
            onClick={() => fetchVods(1, false)}
            className='mt-4'
            variant='secondary'
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (vods.length === 0) {
    return (
      <Card>
        <div className='text-center text-gray-400'>
          <div className='w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center'>
            <svg
              className='w-8 h-8'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-300 mb-2'>
            No Videos Found
          </h3>
          <p className='text-gray-400 text-sm'>
            {category
              ? `No videos found in ${category} category`
              : 'No videos available yet'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
        {vods.map(vod => (
          <VodCard
            key={vod._id}
            vod={vod}
            onClick={() => handleVodClick(vod)}
          />
        ))}
      </div>

      {hasMore && (
        <div className='text-center'>
          <Button
            onClick={handleLoadMore}
            loading={loading}
            disabled={loading}
            variant='secondary'
          >
            Load More Videos
          </Button>
        </div>
      )}
    </div>
  );
};

const VodCard: React.FC<{
  vod: VodItem;
  onClick: () => void;
}> = ({ vod, onClick }) => {
  return (
    <Card
      className='cursor-pointer hover:border-blue-500 transition-colors group'
      onClick={onClick}
    >
      <div className='space-y-4'>
        {/* Thumbnail */}
        <div className='aspect-video bg-gray-700 rounded-lg overflow-hidden relative'>
          {vod.thumbnail ? (
            <img
              src={vod.thumbnail}
              alt={vod.title}
              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center'>
              <svg
                className='w-12 h-12 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                />
              </svg>
            </div>
          )}

          {/* Duration badge */}
          <div className='absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium'>
            {vod.durationFormatted}
          </div>

          {/* VOD badge */}
          <div className='absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium'>
            VOD
          </div>
        </div>

        {/* Content */}
        <div className='space-y-2'>
          <h3 className='font-semibold text-white line-clamp-2 group-hover:text-blue-400 transition-colors'>
            {vod.title}
          </h3>

          {vod.description && (
            <p className='text-gray-400 text-sm line-clamp-2'>
              {vod.description}
            </p>
          )}

          {/* User info */}
          <div className='flex items-center space-x-2'>
            {vod.user.avatar ? (
              <img
                src={vod.user.avatar}
                alt={vod.user.username}
                className='w-6 h-6 rounded-full'
              />
            ) : (
              <div className='w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center'>
                <span className='text-xs text-white'>
                  {vod.user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className='text-sm text-gray-400'>{vod.user.username}</span>
          </div>

          {/* Stats */}
          <div className='flex items-center justify-between text-sm text-gray-400'>
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-1'>
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
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                  />
                </svg>
                <span>{vod.totalViewerCount}</span>
              </div>
              <div className='flex items-center space-x-1'>
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
                    d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                  />
                </svg>
                <span>{vod.likeCount}</span>
              </div>
            </div>
            <span className='text-xs'>{vod.fileSizeFormatted}</span>
          </div>

          {/* Tags */}
          {vod.tags.length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {vod.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className='px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded'
                >
                  {tag}
                </span>
              ))}
              {vod.tags.length > 3 && (
                <span className='px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded'>
                  +{vod.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
