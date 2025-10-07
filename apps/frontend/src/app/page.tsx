'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return <Loading fullScreen text='Redirecting...' />;
}
