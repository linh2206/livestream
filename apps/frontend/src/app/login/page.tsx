'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginForm } from '@/components/features/LoginForm';
import { Loading } from '@/components/ui/Loading';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <Loading fullScreen text='Loading...' />;
  }

  if (user) {
    return <Loading fullScreen text='Redirecting to dashboard...' />;
  }

  return (
    <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gradient mb-2'>
            Livestream Platform
          </h1>
          <p className='text-gray-400'>
            Sign in to start streaming and watching
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
