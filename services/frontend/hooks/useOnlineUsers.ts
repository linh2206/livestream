import useSWR from 'swr';
import { userService, User } from '../lib/api/user.service';

export const useOnlineUsers = () => {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    '/users/online',
    () => userService.getOnlineUsers(),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 10000, // Refresh every 10 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    onlineUsers: data || [],
    isLoading,
    isError: error,
    mutate, // Function to manually revalidate
  };
};
