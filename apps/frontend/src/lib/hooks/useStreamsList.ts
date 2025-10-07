import useSWR from 'swr';
import { streamService } from '../api/services/stream.service';
import { Stream, PaginatedResponse, PaginationParams } from '../api/types';

// Fetcher function for streams list
const fetcher = (url: string, params?: PaginationParams) =>
  streamService.getStreams(params);

export function useStreamsList(params?: PaginationParams) {
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Stream>>(
    ['/streams', params],
    ([, params]: [string, PaginationParams | undefined]) =>
      fetcher('/streams', params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Auto-refresh every 30 seconds (reduced)
      dedupingInterval: 10000, // 10 seconds (increased)
      errorRetryCount: 2, // Reduced retry count
      revalidateIfStale: false, // Don't revalidate if data is stale
    }
  );

  const syncStreamStatus = async (streamKey: string) => {
    try {
      await streamService.syncStreamStatus(streamKey);
      // Revalidate data after sync
      mutate();
    } catch (error) {
      console.error('Failed to sync stream status:', error);
    }
  };

  const checkStreamOffline = async (streamKey: string) => {
    try {
      await streamService.checkStreamOffline(streamKey);
      // Revalidate data after check
      mutate();
    } catch (error) {
      console.error('Failed to check stream offline:', error);
    }
  };

  return {
    streams: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
    syncStreamStatus,
    checkStreamOffline,
  };
}
