import useSWR from 'swr';
import { apiClient } from '../lib/api';

// Generic fetcher function for SWR with axios
const fetcher = async (url: string) => {
  if (!url) return null;
  console.log('🔍 Fetcher called with URL:', url);
  try {
    const result = await apiClient.get(url);
    console.log('✅ Fetcher success for URL:', url, result.data);
    return result;
  } catch (error) {
    console.error('❌ Fetcher error for URL:', url, error);
    throw error;
  }
};

// SWR configuration options
export interface SWROptions<T> {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  refreshInterval?: number;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  dedupingInterval?: number;
  fallbackData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  shouldRetryOnError?: boolean;
}

// Main SWR hook - có thể dùng mọi nơi
export const useSWRData = <T = any>(
  endpoint: string | null,
  options?: SWROptions<T>
) => {
  console.log('🔍 useSWRData called with:', { endpoint, options });
  
  const {
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    refreshInterval = 0,
    errorRetryCount = 3,
    errorRetryInterval = 5000,
    dedupingInterval = 2000,
    fallbackData,
    onSuccess,
    onError,
    shouldRetryOnError = true,
  } = options || {};

  const { data, error, isLoading, mutate, isValidating } = useSWR<T>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus,
      revalidateOnReconnect,
      refreshInterval,
      errorRetryCount: shouldRetryOnError ? errorRetryCount : 0,
      errorRetryInterval,
      dedupingInterval,
      fallbackData,
      onSuccess,
      onError,
    }
  );

  const result = {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    isError: !!error,
  };
  
  console.log('🔍 useSWRData result:', { endpoint, result });
  
  return result;
};

// Utility hooks for common patterns
export const usePolling = <T = any>(
  endpoint: string,
  interval: number = 5000,
  options?: SWROptions<T>
) => {
  return useSWRData<T>(endpoint, {
    ...options,
    refreshInterval: interval,
    revalidateOnFocus: false,
  });
};

export const useOnce = <T = any>(
  endpoint: string,
  options?: SWROptions<T>
) => {
  return useSWRData<T>(endpoint, {
    ...options,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  });
};