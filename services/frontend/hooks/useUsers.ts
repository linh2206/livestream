import { useSWRData, User } from '../lib/api';

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useUsers = (page: number = 1, limit: number = 10, search: string = '') => {
  const endpoint = `/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWRData<UsersResponse>(endpoint, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // Refresh every 30 seconds
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  return {
    users: data?.users || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 0,
    isLoading,
    isError: error,
    mutate, // Function to manually revalidate
  };
};
