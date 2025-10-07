'use client';

import React from 'react';
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';

interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  minHeight?: string;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  error = null,
  empty = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There is no data to display at the moment.',
  emptyAction,
  className = '',
  minHeight = 'min-h-[400px]',
}) => {
  // Show loading state
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${minHeight} ${className}`}
      >
        <Loading fullScreen text={loadingText} />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${minHeight} ${className}`}
      >
        <EmptyState
          icon={
            <svg
              className='w-8 h-8 text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          }
          title='Error'
          description={error}
          action={emptyAction}
        />
      </div>
    );
  }

  // Show empty state
  if (empty) {
    return (
      <div
        className={`flex items-center justify-center ${minHeight} ${className}`}
      >
        <EmptyState
          icon={
            <svg
              className='w-8 h-8 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
              />
            </svg>
          }
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  // Show content
  return <>{children}</>;
};
