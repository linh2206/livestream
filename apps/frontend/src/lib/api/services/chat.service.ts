import { apiClient } from '../client';
import { ChatMessage, PaginatedResponse, PaginationParams } from '../types';

class ChatService {
  async getStreamMessages(
    streamId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<ChatMessage>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);

    const url = `/chat/streams/${streamId}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<ChatMessage>>(url);
  }

  async createMessage(data: {
    streamId: string;
    content: string;
  }): Promise<ChatMessage> {
    return apiClient.post<ChatMessage>('/chat/messages', data);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/chat/messages/${messageId}`);
  }

  async getMessageHistory(
    streamId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>(
      `/chat/streams/${streamId}/history?limit=${limit}`
    );
  }

  async getMessagesBefore(
    streamId: string,
    beforeId: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>(
      `/chat/messages/stream/${streamId}?limit=${limit}&before=${beforeId}`
    );
  }
}

export const chatService = new ChatService();
