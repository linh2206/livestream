import useSWR from 'swr';
import { userService } from '../api/services/user.service';
import { User } from '../api/types';

// Fetcher function for online users list
const fetcher = (url: string) => userService.getOnlineUsers();

export function useOnlineUsersList() {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    '/users/online',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds for online users
      errorRetryCount: 3,
    }
  );

  return {
    users: data || [],
    isLoading,
    error,
    mutate,
  };
}
