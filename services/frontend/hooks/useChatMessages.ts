import { useSWRData, ChatMessage } from '../lib/api';

export const useChatMessages = (room: string = 'main', limit: number = 50) => {
  const { data, error, isLoading, mutate } = useSWRData<ChatMessage[]>(
    `/chat/messages?room=${room}&limit=${limit}`,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 10000, // Refresh every 10 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    messages: data || [],
    isLoading,
    isError: error,
    mutate, // Function to manually revalidate
  };
};
