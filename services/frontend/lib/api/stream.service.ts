import { apiClient } from './client';

export interface Stream {
  _id: string;
  title: string;
  description: string;
  streamKey: string;
  userId: string;
  isActive: boolean;
  viewerCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStreamRequest {
  title: string;
  description: string;
  userId: string;
}

export interface UpdateStreamRequest {
  title?: string;
  description?: string;
  isActive?: boolean;
}

export class StreamService {
  /**
   * Get all active streams
   */
  async getActiveStreams(): Promise<Stream[]> {
    return apiClient.get<Stream[]>('/streams/active');
  }

  /**
   * Get all streams (Admin only)
   */
  async getStreams(): Promise<Stream[]> {
    return apiClient.get<Stream[]>('/streams');
  }

  /**
   * Get stream by ID
   */
  async getStream(id: string): Promise<Stream> {
    return apiClient.get<Stream>(`/streams/${id}`);
  }

  /**
   * Create new stream
   */
  async createStream(streamData: CreateStreamRequest): Promise<Stream> {
    return apiClient.post<Stream>('/streams', streamData);
  }

  /**
   * Update stream
   */
  async updateStream(id: string, streamData: UpdateStreamRequest): Promise<Stream> {
    return apiClient.patch<Stream>(`/streams/${id}`, streamData);
  }

  /**
   * Delete stream
   */
  async deleteStream(id: string): Promise<void> {
    return apiClient.delete<void>(`/streams/${id}`);
  }

  /**
   * Start stream
   */
  async startStream(id: string): Promise<Stream> {
    return apiClient.patch<Stream>(`/streams/${id}/start`);
  }

  /**
   * Stop stream
   */
  async stopStream(id: string): Promise<Stream> {
    return apiClient.patch<Stream>(`/streams/${id}/stop`);
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(id: string): Promise<any> {
    return apiClient.get<any>(`/streams/${id}/stats`);
  }
}

// Export singleton instance
export const streamService = new StreamService();
