import { Types } from 'mongoose';
import { StreamStatus, UserRole } from '../constants';

/**
 * Base entity interface
 */
export interface BaseEntity {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User interface
 */
export interface IUser extends BaseEntity {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
}

/**
 * Stream interface
 */
export interface IStream extends BaseEntity {
  title: string;
  description?: string;
  userId?: Types.ObjectId;
  status: StreamStatus;
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
  isPublic: boolean;
  allowedViewers: Types.ObjectId[];
  requiresAuth: boolean;
}

/**
 * Chat message interface
 */
export interface IChatMessage extends BaseEntity {
  streamId: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;
  message: string;
  timestamp: Date;
}

/**
 * Pagination interface
 */
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * API Response interface
 */
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: IPagination;
}

/**
 * Stream metrics interface
 */
export interface IStreamMetrics {
  streamId: string;
  viewerCount: number;
  bandwidth: number;
  bitrate: number;
  timestamp: Date;
}

/**
 * System metrics interface
 */
export interface ISystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  timestamp: Date;
}

/**
 * JWT Payload interface
 */
export interface IJwtPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Request with user interface
 */
export interface IRequestWithUser extends Request {
  user?: IJwtPayload;
  stream?: IStream;
}

/**
 * HLS segment interface
 */
export interface IHlsSegment {
  filename: string;
  duration: number;
  url: string;
  sequence: number;
}

/**
 * HLS playlist interface
 */
export interface IHlsPlaylist {
  version: number;
  targetDuration: number;
  mediaSequence: number;
  segments: IHlsSegment[];
}

/**
 * RTMP callback data interface
 */
export interface IRtmpCallbackData {
  app: string;
  name: string;
  addr: string;
  flashver: string;
  swfurl: string;
  tcurl: string;
  pageurl: string;
}

/**
 * WebSocket event interface
 */
export interface IWebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

/**
 * Cache interface
 */
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
}




