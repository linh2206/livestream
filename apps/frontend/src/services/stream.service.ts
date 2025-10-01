import { apiClient } from './api.client';
import { Stream, CreateStreamRequest, UpdateStreamRequest } from '@/types/stream';

class StreamService {
  async getStreams(page: number = 1, limit: number = 10): Promise<{ streams: Stream[]; total: number }> {
    return apiClient.get<{ streams: Stream[]; total: number }>(`/streams?page=${page}&limit=${limit}`);
  }

  async getActiveStreams(): Promise<Stream[]> {
    return apiClient.get<Stream[]>('/streams/active');
  }

  async getStream(id: string): Promise<Stream> {
    return apiClient.get<Stream>(`/streams/${id}`);
  }

  async getStreamByKey(streamKey: string): Promise<Stream> {
    return apiClient.get<Stream>(`/streams/key/${streamKey}`);
  }

  async createStream(data: CreateStreamRequest): Promise<Stream> {
    return apiClient.post<Stream>('/streams', data);
  }

  async updateStream(id: string, data: UpdateStreamRequest): Promise<Stream> {
    return apiClient.put<Stream>(`/streams/${id}`, data);
  }

  async deleteStream(id: string): Promise<void> {
    return apiClient.delete<void>(`/streams/${id}`);
  }

  async likeStream(streamKey: string): Promise<Stream> {
    return apiClient.post<Stream>(`/streams/like/${streamKey}`);
  }

  async searchStreams(query: string): Promise<Stream[]> {
    return apiClient.get<Stream[]>(`/streams/search?q=${encodeURIComponent(query)}`);
  }
}

export const streamService = new StreamService();
