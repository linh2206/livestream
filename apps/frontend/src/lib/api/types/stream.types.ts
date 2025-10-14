export interface Stream {
  _id: string;
  title: string;
  description?: string;
  status: 'live' | 'offline' | 'scheduled' | 'ended' | 'inactive' | 'active';
  streamUrl?: string;
  streamKey: string;
  hlsUrl?: string;
  rtmpUrl?: string;
  vodUrl?: string;
  userId: string;
  user?: {
    _id: string;
    username: string;
    avatar?: string;
    fullName?: string;
  };
  category?: string;
  tags?: string[];
  viewerCount?: number;
  likeCount?: number;
  isLiked?: boolean;
  isLikedByUser?: boolean;
  isVod?: boolean;
  isLive?: boolean;
  vodProcessing?: boolean;
  vodProcessingStatus?: 'processing' | 'completed' | 'failed';
  totalViewerCount?: number;
  streamType?: 'camera' | 'screen';
  createdAt: string;
  updatedAt: string;
  // Additional properties that might exist
  [key: string]: unknown;
}
