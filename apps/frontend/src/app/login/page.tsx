'use client';

import { LoginForm } from '@/components/features/LoginForm';
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function LoginPage() {
  // Auth guard - redirect nếu đã login
  const authLoading = useAuthGuard({ requireAuth: false });

  if (authLoading) {
    return authLoading;
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
