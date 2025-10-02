import useSWR from 'swr';
import { chatService } from '../api/services/chat.service';
import { ChatMessage, PaginatedResponse, PaginationParams } from '../api/types';

// Fetcher function for chat messages list
const fetcher = (url: string, streamId: string, params?: PaginationParams) => 
  chatService.getStreamMessages(streamId, params);

export function useChatMessagesList(streamId: string, params?: PaginationParams) {
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<ChatMessage>>(
    streamId ? ['/chat/messages', streamId, params] : null,
    ([, streamId, params]: [string, string, PaginationParams | undefined]) => fetcher('/chat/messages', streamId, params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds for chat messages
      errorRetryCount: 3,
    }
  );

  return {
    messages: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}
