'use client';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import React from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingText?: string;
}

/**
 * Component wrapper cho admin pages
 * Tự động kiểm tra authentication và admin role
 * Không overwrite logic của component con
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  fallback,
  loadingText = 'Loading...',
}) => {
  const { user, isLoading } = useAuth();
  const authLoading = useAuthGuard({ requireAuth: true });

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-400'>{loadingText}</p>
        </div>
      </div>
    );
  }

  // Check admin access
  const isAdmin = user?.role === 'admin';
  const hasAccess = !!user && isAdmin;

  // Access denied
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
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
          <h1 className='text-2xl font-bold text-red-500 mb-4'>
            Access Denied
          </h1>
          <p className='text-gray-300 mb-6'>
            {!user
              ? 'Please log in to access this page.'
              : !isAdmin
                ? 'You need administrator privileges to access this page.'
                : 'Access denied.'}
          </p>
          <Button
            onClick={() =>
              (window.location.href = !user ? '/login' : '/dashboard')
            }
            variant='primary'
          >
            {!user ? 'Go to Login' : 'Go to Dashboard'}
          </Button>
        </div>
      </div>
    );
  }

  // Render children if access granted
  return <>{children}</>;
};
