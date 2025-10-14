import { apiClient } from '../client';
import {
  ApiResponse,
  CreateStreamRequest,
  PaginatedResponse,
  PaginationParams,
  Stream,
  UpdateStreamRequest,
} from '../types';

class StreamService {
  async getStreams(
    params?: PaginationParams
  ): Promise<PaginatedResponse<Stream>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);

    const url = `/streams${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<Stream>>(url);
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
    return apiClient.patch<Stream>(`/streams/${id}`, data);
  }

  async deleteStream(id: string): Promise<void> {
    await apiClient.delete(`/streams/${id}`);
  }

  async getMyStreams(): Promise<Stream[]> {
    return apiClient.get<Stream[]>('/streams/my');
  }

  async getActiveStreams(): Promise<Stream[]> {
    return apiClient.get<Stream[]>('/streams/active');
  }

  async likeStream(id: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/streams/${id}/like`);
  }

  async getStreamAnalytics(id: string): Promise<Record<string, unknown>> {
    return apiClient.get(`/streams/${id}/analytics`);
  }

  async getStreamStatus(
    streamKey: string
  ): Promise<{ isLive: boolean; viewerCount: number }> {
    return apiClient.get(`/rtmp/status/${streamKey}`);
  }

  async syncStreamStatus(streamKey: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/streams/sync-status/${streamKey}`);
  }

  async checkStreamOffline(streamKey: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/rtmp/check-offline/${streamKey}`);
  }

  async updateViewerCount(
    streamKey: string,
    count: number
  ): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(`/streams/viewer-count/${streamKey}`, {
      count,
    });
  }

  async updateViewerCountById(id: string, count: number): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(`/streams/viewer-count-by-id/${id}`, {
      count,
    });
  }
}

export const streamService = new StreamService();
