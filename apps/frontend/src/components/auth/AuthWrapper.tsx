'use client';

import React from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  loadingText?: string;
  unauthorizedText?: string;
  className?: string;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  fallback,
  requireAuth = true,
  requireAdmin = false,
  loadingText = 'Loading...',
  unauthorizedText = 'Access denied',
  className = '',
}) => {
  const { user, isLoading } = useAuth();

  // Show loading while auth is being checked
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
      >
        <Loading fullScreen text={loadingText} />
      </div>
    );
  }

  // Show fallback if provided and no user
  if (!user && requireAuth) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
      >
        <div className='text-center'>
          <div className='w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center'>
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
                d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-300 mb-2'>
            {unauthorizedText}
          </h3>
          <p className='text-gray-400 text-sm'>
            Please log in to access this page
          </p>
        </div>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && user && user.role !== 'admin') {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
      >
        <div className='text-center'>
          <div className='w-16 h-16 mx-auto mb-4 bg-red-900/20 rounded-full flex items-center justify-center'>
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
          </div>
          <h3 className='text-lg font-medium text-red-300 mb-2'>
            Admin Access Required
          </h3>
          <p className='text-gray-400 text-sm'>
            You need administrator privileges to access this page
          </p>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};
