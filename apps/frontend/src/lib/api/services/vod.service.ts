import { apiClient } from '../client';

export interface VodListParams {
  page?: number;
  limit?: number;
  userId?: string;
  category?: string;
}

export interface VodItem {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  vodUrl: string;
  duration: number;
  durationFormatted: string;
  fileSizeFormatted: string;
  category?: string;
  tags: string[];
  startTime: string;
  endTime: string;
  viewerCount: number;
  totalViewerCount: number;
  likeCount: number;
  user: {
    _id: string;
    username: string;
    avatar?: string;
    fullName?: string;
  };
  createdAt: string;
}

export interface VodListResponse {
  vods: VodItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const vodService = {
  async getVodList(params: VodListParams = {}): Promise<VodListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.category) searchParams.append('category', params.category);

    const response = await apiClient.get(`/vod?${searchParams.toString()}`);
    return (response as any).data;
  },

  async getMyVods(
    params: Omit<VodListParams, 'userId'> = {}
  ): Promise<VodListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.category) searchParams.append('category', params.category);

    const response = await apiClient.get(`/vod/my?${searchParams.toString()}`);
    return (response as any).data;
  },

  async getVodById(vodId: string): Promise<VodItem> {
    const response = await apiClient.get(`/vod/${vodId}`);
    return (response as any).data;
  },

  async deleteVod(vodId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/vod/${vodId}`);
    return (response as any).data;
  },

  async processStreamToVod(streamId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/vod/process/${streamId}`);
    return (response as any).data;
  },

  getVodStreamUrl(vodUrl: string): string {
    // Convert VOD URL to streaming URL
    if (vodUrl.startsWith('/vod/')) {
      return `${process.env.NEXT_PUBLIC_API_URL}${vodUrl}`;
    }
    return vodUrl;
  },

  getVodThumbnailUrl(thumbnailUrl?: string): string | undefined {
    if (!thumbnailUrl) return undefined;

    if (thumbnailUrl.startsWith('/vod/')) {
      return `${process.env.NEXT_PUBLIC_API_URL}${thumbnailUrl}`;
    }
    return thumbnailUrl;
  },
};
