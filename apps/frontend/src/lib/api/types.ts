// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error Types
export interface ApiError {
  message: string;
  statusCode: number;
  error: string;
}

// Base Entity Types
export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// User Types
export interface User extends BaseEntity {
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'manager';
  provider: 'local' | 'google';
  isEmailVerified: boolean;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string;
  currentSessionId?: string;
}

// Stream Types
export interface Stream extends BaseEntity {
  title: string;
  description?: string;
  streamKey: string;
  streamType?: 'camera' | 'screen';
  hlsUrl?: string;
  rtmpUrl?: string;
  status: 'inactive' | 'active' | 'ended';
  isLive: boolean;
  viewerCount: number;
  totalViewerCount: number;
  likeCount: number;
  category?: string;
  tags: string[];
  userId: string;
  user?: User;
  startTime?: string;
  endTime?: string;

  // VOD (Video on Demand) fields
  isVod: boolean;
  vodUrl?: string;
  vodDuration?: number; // in seconds
  vodFileSize?: number; // in bytes
  vodThumbnail?: string;
  vodProcessing: boolean;
  vodProcessingStatus?: 'processing' | 'completed' | 'failed';
  vodProcessingError?: string;
  isLikedByUser?: boolean;
}

// Chat Types
export interface ChatMessage extends BaseEntity {
  content: string;
  userId: string | { _id: string; username: string; avatar?: string };
  username: string;
  avatar?: string;
  streamId: string;
  streamKey: string;
  timestamp: string;
  createdAt: string;
  isModerator?: boolean;
}

// Auth Types
export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Stream Creation Types
export interface CreateStreamRequest {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateStreamRequest {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: 'inactive' | 'active' | 'ended';
}

// User Management Types
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  fullName?: string;
  avatar?: string;
  isActive?: boolean;
}

// Analytics Types
export interface StreamAnalytics {
  streamId: string;
  totalViews: number;
  totalLikes: number;
  averageViewTime: number;
  peakViewers: number;
  totalMessages: number;
}

export interface UserAnalytics {
  userId: string;
  totalStreams: number;
  totalViewers: number;
  totalLikes: number;
  averageStreamDuration: number;
}

// Bandwidth Types
export interface BandwidthStats {
  streamId: string;
  streamKey: string;
  bitrate: number;
  resolution: string;
  fps: number;
  timestamp: string;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    api: ServiceHealth;
  };
  timestamp: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message: string;
}
