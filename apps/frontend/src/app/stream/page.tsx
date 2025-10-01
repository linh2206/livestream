'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/ui/Loading';

export default function StreamRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /streams
    router.replace('/streams');
  }, [router]);

  return <Loading fullScreen text="Redirecting to streams..." />;
}






