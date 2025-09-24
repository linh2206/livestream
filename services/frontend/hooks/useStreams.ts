import { useSWRData, usePolling, Stream } from '../lib/api';

export const useStreams = () => {
  return useSWRData<Stream[]>('/streams', {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // Refresh every 30 seconds
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });
};

export const useActiveStreams = () => {
  const result = usePolling<Stream[]>('/streams/active', 5000, {
    revalidateOnFocus: false,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });
  
  console.log('🔍 useActiveStreams result:', result);
  
  return result;
};

export const useStream = (id: string) => {
  return useSWRData<Stream>(id ? `/streams/${id}` : null, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 10000, // Refresh every 10 seconds
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });
};
