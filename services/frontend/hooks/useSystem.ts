import { useSWRData, usePolling, HealthStatus, BandwidthStats } from '../lib/api';

export const useHealthCheck = () => {
  return usePolling<HealthStatus>('/health', 30000, {
    revalidateOnFocus: false,
    errorRetryCount: 3,
    errorRetryInterval: 10000,
  });
};

export const useBandwidthStats = () => {
  return usePolling<BandwidthStats>('/bandwidth', 5000, {
    revalidateOnFocus: false,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });
};

export const useSystemInfo = () => {
  return useSWRData<any>('/system/info', {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 60000, // Refresh every minute
    errorRetryCount: 3,
    errorRetryInterval: 10000,
  });
};
