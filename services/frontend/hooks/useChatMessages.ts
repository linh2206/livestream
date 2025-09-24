import { useSWRData, ChatMessage } from '../lib/api';

export const useChatMessages = (room: string = 'main', limit: number = 50) => {
  const endpoint = `/chat/messages?room=${room}&limit=${limit}`;
  console.log('🔍 useChatMessages fetching:', endpoint);
  
  const { data, error, isLoading, mutate } = useSWRData<ChatMessage[]>(
    endpoint,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 10000, // Refresh every 10 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  console.log('🔍 useChatMessages result:', { data, error, isLoading, messagesCount: data?.length || 0 });

  return {
    messages: data || [],
    isLoading,
    isError: error,
    mutate, // Function to manually revalidate
  };
};
