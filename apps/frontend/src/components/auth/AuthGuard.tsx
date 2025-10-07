'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  redirectTo = '/login',
  requireAuth = true,
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && requireAuth && !user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo, requireAuth]);

  if (isLoading) {
    return fallback || <Loading fullScreen text='Loading...' />;
  }

  if (requireAuth && !user) {
    return fallback || <Loading fullScreen text='Redirecting to login...' />;
  }

  return <>{children}</>;
}

// Specific auth components for common use cases
export function RequireAuth({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAuth={true}>{children}</AuthGuard>;
}

export function AuthRequired({
  title = 'Authentication Required',
  message = 'Please log in to access this page.',
  buttonText = 'Go to Login',
  onLoginClick,
}: {
  title?: string;
  message?: string;
  buttonText?: string;
  onLoginClick?: () => void;
}) {
  const router = useRouter();

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      router.push('/login');
    }
  };

  return (
    <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-4xl font-bold text-white mb-4'>{title}</h1>
        <p className='text-gray-400 mb-6'>{message}</p>
        <button
          onClick={handleLoginClick}
          className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors'
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
