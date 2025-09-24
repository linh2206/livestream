import { apiClient } from './client';

export interface ChatMessage {
  _id: string;
  room: string;
  streamId: string;
  userId: string;
  username: string;
  message: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetMessagesRequest {
  room?: string;
  limit?: number;
  offset?: number;
}

export class ChatService {
  /**
   * Get chat messages
   */
  async getMessages(params: GetMessagesRequest = {}): Promise<ChatMessage[]> {
    const { room = 'main', limit = 50, offset = 0 } = params;
    return apiClient.get<ChatMessage[]>(`/chat/messages?room=${room}&limit=${limit}&offset=${offset}`);
  }

  /**
   * Get recent messages for a room
   */
  async getRecentMessages(room: string = 'main', limit: number = 50): Promise<ChatMessage[]> {
    return this.getMessages({ room, limit });
  }

  /**
   * Get messages by stream ID
   */
  async getMessagesByStream(streamId: string, limit: number = 50): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>(`/chat/messages/stream/${streamId}?limit=${limit}`);
  }

  /**
   * Delete message (Admin only)
   */
  async deleteMessage(messageId: string): Promise<void> {
    return apiClient.delete<void>(`/chat/messages/${messageId}`);
  }

  /**
   * Clear chat room (Admin only)
   */
  async clearRoom(room: string): Promise<void> {
    return apiClient.delete<void>(`/chat/rooms/${room}`);
  }
}

// Export singleton instance
export const chatService = new ChatService();
