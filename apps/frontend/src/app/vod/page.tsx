'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { LoadingWrapper } from '@/components/ui/LoadingWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { vodService, VodListResponse } from '@/lib/api/services/vod.service';
import { Stream } from '@/lib/api/types';

export default function VodPage() {
  const { user } = useAuth();
  const [vods, setVods] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const loadVods = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: VodListResponse = await vodService.getVodList({
        page,
        limit: pagination.limit,
      });

      setVods(response.vods);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load VODs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVods();
  }, []);

  const handlePageChange = (newPage: number) => {
    loadVods(newPage);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-7xl mx-auto'>
            <div className='mb-8'>
              <h1 className='text-3xl font-bold text-white mb-2'>
                Video on Demand
              </h1>
              <p className='text-gray-400'>
                Watch previously recorded live streams
              </p>
            </div>

            <LoadingWrapper
              isLoading={loading}
              loadingText='Loading VODs...'
              error={error}
              empty={vods.length === 0}
              emptyTitle='No VODs Available'
              emptyDescription='No recorded streams are available at the moment.'
            >
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {vods.map((vod) => (
                  <Card key={vod._id} className='overflow-hidden hover:scale-105 transition-transform duration-200'>
                    <div className='relative'>
                      {vod.vodThumbnail ? (
                        <img
                          src={vod.vodThumbnail}
                          alt={vod.title}
                          className='w-full h-48 object-cover'
                        />
                      ) : (
                        <div className='w-full h-48 bg-gray-700 flex items-center justify-center'>
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
                      {vod.vodDuration && (
                        <div className='absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded'>
                          {formatDuration(vod.vodDuration)}
                        </div>
                      )}

                      {/* Processing status */}
                      {vod.vodProcessing && (
                        <div className='absolute top-2 left-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded'>
                          Processing...
                        </div>
                      )}
                    </div>

                    <div className='p-4'>
                      <h3 className='text-white font-semibold mb-2 line-clamp-2'>
                        {vod.title}
                      </h3>
                      
                      {vod.description && (
                        <p className='text-gray-400 text-sm mb-3 line-clamp-2'>
                          {vod.description}
                        </p>
                      )}

                      <div className='flex items-center justify-between text-sm text-gray-500 mb-3'>
                        <span>{vod.user?.username || 'Unknown'}</span>
                        <span>{formatDate(vod.endTime || vod.updatedAt)}</span>
                      </div>

                      <div className='flex items-center justify-between text-xs text-gray-500 mb-4'>
                        <span>{vod.viewerCount} views</span>
                        {vod.vodFileSize && (
                          <span>{formatFileSize(vod.vodFileSize)}</span>
                        )}
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          onClick={() => window.open(`/vod/${vod._id}`, '_blank')}
                          className='flex-1'
                          disabled={vod.vodProcessing}
                        >
                          {vod.vodProcessing ? 'Processing...' : 'Watch'}
                        </Button>
                        
                        {user && user._id === vod.userId && (
                          <Button
                            variant='secondary'
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this VOD?')) {
                                try {
                                  await vodService.deleteVod(vod._id);
                                  loadVods(pagination.page);
                                } catch (err) {
                                  alert('Failed to delete VOD');
                                }
                              }
                            }}
                            disabled={vod.vodProcessing}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className='flex justify-center items-center mt-8 space-x-4'>
                  <Button
                    variant='secondary'
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    Previous
                  </Button>
                  
                  <span className='text-gray-400'>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <Button
                    variant='secondary'
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Next
                  </Button>
                </div>
              )}
            </LoadingWrapper>
          </div>
        </main>
      </div>
    </div>
  );
}
