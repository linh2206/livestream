import useSWR from 'swr';
import { userService } from '../api/services/user.service';
import { User, PaginatedResponse, PaginationParams } from '../api/types';

// Fetcher function for users list
const fetcher = (url: string, params?: PaginationParams) =>
  userService.getUsers(params);

export function useUsersList(params?: PaginationParams) {
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<User>>(
    ['/users', params],
    ([, params]: [string, PaginationParams | undefined]) =>
      fetcher('/users', params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
    }
  );

  return {
    users: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}
