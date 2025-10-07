import { apiClient } from '../client';
import { Stream } from '../types';

export interface VodListResponse {
  vods: Stream[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ProcessVodResponse {
  message: string;
}

export const vodService = {
  // Get all VODs with pagination
  async getVodList(params?: {
    page?: number;
    limit?: number;
    userId?: string;
  }): Promise<VodListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.userId) searchParams.append('userId', params.userId);

    const queryString = searchParams.toString();
    const url = queryString ? `/vod?${queryString}` : '/vod';
    
    return apiClient.get<VodListResponse>(url);
  },

  // Get current user's VODs
  async getMyVods(params?: {
    page?: number;
    limit?: number;
  }): Promise<VodListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/vod/my?${queryString}` : '/vod/my';
    
    return apiClient.get<VodListResponse>(url);
  },

  // Get specific VOD by ID
  async getVodById(vodId: string): Promise<Stream> {
    return apiClient.get<Stream>(`/vod/${vodId}`);
  },

  // Process stream to VOD
  async processStreamToVod(streamId: string): Promise<ProcessVodResponse> {
    return apiClient.post<ProcessVodResponse>(`/vod/process/${streamId}`);
  },

  // Delete VOD
  async deleteVod(vodId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/vod/${vodId}`);
  },

  // Admin delete VOD
  async adminDeleteVod(vodId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/vod/admin/${vodId}`);
  },
};
