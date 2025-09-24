import useSWR from 'swr';
import { apiClient } from '../lib/api';

// Generic fetcher function for SWR with axios
const fetcher = async (url: string) => {
  if (!url) return null;
  return await apiClient.get(url);
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

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    isError: !!error,
  };
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