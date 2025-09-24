import { useSWRData, User } from '../lib/api';

export const useUsers = () => {
  const { data, error, isLoading, mutate } = useSWRData<User[]>('/users', {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // Refresh every 30 seconds
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    users: data || [],
    isLoading,
    isError: error,
    mutate, // Function to manually revalidate
  };
};
