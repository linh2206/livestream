import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Loading } from '@/components/ui/Loading';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  loadingText?: string;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const {
    redirectTo = '/login',
    requireAuth = true,
    loadingText = 'Redirecting to login...'
  } = options;

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        router.push(redirectTo);
      } else if (!requireAuth && user) {
        // Nếu không cần auth nhưng user đã login, redirect về home
        router.push('/');
      }
    }
  }, [user, isLoading, requireAuth, redirectTo, router]);

  // Return loading component nếu đang check auth
  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  // Return loading component nếu cần auth nhưng chưa có user
  if (requireAuth && !user) {
    return <Loading fullScreen text={loadingText} />;
  }

  // Return loading component nếu không cần auth nhưng đã có user
  if (!requireAuth && user) {
    return <Loading fullScreen text="Redirecting..." />;
  }

  return null; // Không cần loading, component có thể render
};
