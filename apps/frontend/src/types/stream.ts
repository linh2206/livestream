export interface Stream {
  id: string;
  title: string;
  description?: string;
  userId: string;
  status: 'active' | 'inactive' | 'ended';
  isLive: boolean;
  viewerCount: number;
  likeCount: number;
  streamKey: string;
  hlsUrl?: string;
  rtmpUrl?: string;
  thumbnail?: string;
  tags: string[];
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export interface CreateStreamRequest {
  title: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
}

export interface UpdateStreamRequest {
  title?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
}
