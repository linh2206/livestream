import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Stream,
  StreamDocument,
} from '../../shared/database/schemas/stream.schema';
import { User, UserDocument } from '../../shared/database/schemas/user.schema';
import { Vod, VodDocument } from '../../shared/database/schemas/vod.schema';
import { RedisService } from '../../shared/redis/redis.service';
import { WebSocketService } from '../../shared/websocket/websocket.service';

export interface RealTimeMetrics {
  totalStreams: number;
  activeStreams: number;
  totalViewers: number;
  totalUsers: number;
  totalVods: number;
  averageViewerCount: number;
  topStreams: Array<{
    id: string;
    title: string;
    viewerCount: number;
    username: string;
  }>;
  recentActivity: Array<{
    type: 'stream_started' | 'stream_ended' | 'user_registered' | 'vod_created';
    timestamp: Date;
    data: any;
  }>;
}

export interface StreamAnalytics {
  streamId: string;
  title: string;
  viewerCount: number;
  likeCount: number;
  totalViewerCount: number;
  duration: number;
  startTime: Date;
  endTime?: Date;
  status: 'live' | 'ended' | 'scheduled';
  username: string;
  category?: string;
  tags: string[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Vod.name) private vodModel: Model<VodDocument>,
    private redisService: RedisService,
    private webSocketService: WebSocketService
  ) {}

  /**
   * Get real-time metrics with caching
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const cacheKey = 'analytics:realtime_metrics';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.calculateRealTimeMetrics();

    // Cache for 10 seconds for real-time feel
    await this.redisService.set(cacheKey, JSON.stringify(metrics), 10);

    return metrics;
  }

  /**
   * Calculate real-time metrics
   */
  private async calculateRealTimeMetrics(): Promise<RealTimeMetrics> {
    const [
      totalStreams,
      activeStreams,
      totalUsers,
      totalVods,
      topStreams,
      recentActivity,
    ] = await Promise.all([
      this.streamModel.countDocuments(),
      this.streamModel.countDocuments({ isLive: true, status: 'active' }),
      this.userModel.countDocuments({ isActive: true }),
      this.vodModel.countDocuments({ status: 'completed' }),
      this.getTopStreams(),
      this.getRecentActivity(),
    ]);

    // Calculate total viewers from active streams
    const activeStreamsData = await this.streamModel
      .find({ isLive: true, status: 'active' })
      .select('viewerCount')
      .lean();

    const totalViewers = activeStreamsData.reduce(
      (sum, stream) => sum + (stream.viewerCount || 0),
      0
    );

    const averageViewerCount =
      activeStreams > 0 ? Math.round(totalViewers / activeStreams) : 0;

    return {
      totalStreams,
      activeStreams,
      totalViewers,
      totalUsers,
      totalVods,
      averageViewerCount,
      topStreams,
      recentActivity,
    };
  }

  /**
   * Get top streams by viewer count
   */
  private async getTopStreams(): Promise<RealTimeMetrics['topStreams']> {
    const streams = await this.streamModel
      .find({ isLive: true, status: 'active' })
      .populate('userId', 'username')
      .select('title viewerCount')
      .sort({ viewerCount: -1 })
      .limit(5)
      .lean();

    return streams.map(stream => ({
      id: stream._id.toString(),
      title: stream.title,
      viewerCount: stream.viewerCount || 0,
      username: (stream.userId as any)?.username || 'Unknown',
    }));
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(): Promise<
    RealTimeMetrics['recentActivity']
  > {
    const [recentStreams, recentUsers, recentVods] = await Promise.all([
      this.streamModel
        .find()
        .populate('userId', 'username')
        .select('title startTime endTime status')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      this.userModel
        .find()
        .select('username createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      this.vodModel
        .find({ status: 'completed' })
        .populate('userId', 'username')
        .select('title createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const activities: RealTimeMetrics['recentActivity'] = [];

    // Add stream activities
    recentStreams.forEach(stream => {
      if (stream.status === 'active') {
        activities.push({
          type: 'stream_started',
          timestamp: stream.startTime || (stream as any).createdAt,
          data: {
            streamId: stream._id,
            title: stream.title,
            username: (stream.userId as any)?.username,
          },
        });
      } else if (stream.endTime) {
        activities.push({
          type: 'stream_ended',
          timestamp: stream.endTime,
          data: {
            streamId: stream._id,
            title: stream.title,
            username: (stream.userId as any)?.username,
          },
        });
      }
    });

    // Add user registrations
    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registered',
        timestamp: (user as any).createdAt,
        data: {
          userId: user._id,
          username: user.username,
        },
      });
    });

    // Add VOD creations
    recentVods.forEach(vod => {
      activities.push({
        type: 'vod_created',
        timestamp: (vod as any).createdAt,
        data: {
          vodId: vod._id,
          title: vod.title,
          username: (vod.userId as any)?.username,
        },
      });
    });

    // Sort by timestamp and return top 20
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }

  /**
   * Get detailed stream analytics
   */
  async getStreamAnalytics(streamId: string): Promise<StreamAnalytics | null> {
    const stream = await this.streamModel
      .findById(streamId)
      .populate('userId', 'username')
      .lean();

    if (!stream) {
      return null;
    }

    const duration = stream.endTime
      ? stream.endTime.getTime() - stream.startTime.getTime()
      : Date.now() - stream.startTime.getTime();

    return {
      streamId: stream._id.toString(),
      title: stream.title,
      viewerCount: stream.viewerCount || 0,
      likeCount: stream.likeCount || 0,
      totalViewerCount: stream.totalViewerCount || 0,
      duration: Math.floor(duration / 1000), // in seconds
      startTime: stream.startTime,
      endTime: stream.endTime,
      status: stream.isLive ? 'live' : stream.endTime ? 'ended' : 'scheduled',
      username: (stream.userId as any)?.username || 'Unknown',
      category: (stream as any).category,
      tags: stream.tags || [],
    };
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<{
    totalStreams: number;
    totalViewers: number;
    totalLikes: number;
    averageViewerCount: number;
    totalVods: number;
    recentStreams: Array<{
      id: string;
      title: string;
      viewerCount: number;
      startTime: Date;
      status: string;
    }>;
  }> {
    const [streams, vods] = await Promise.all([
      this.streamModel
        .find({ userId: new Types.ObjectId(userId) })
        .select('title viewerCount likeCount startTime isLive status')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      this.vodModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    const totalStreams = streams.length;
    const totalViewers = streams.reduce(
      (sum, stream) => sum + (stream.viewerCount || 0),
      0
    );
    const totalLikes = streams.reduce(
      (sum, stream) => sum + (stream.likeCount || 0),
      0
    );
    const averageViewerCount =
      totalStreams > 0 ? Math.round(totalViewers / totalStreams) : 0;

    return {
      totalStreams,
      totalViewers,
      totalLikes,
      averageViewerCount,
      totalVods: vods,
      recentStreams: streams.map(stream => ({
        id: stream._id.toString(),
        title: stream.title,
        viewerCount: stream.viewerCount || 0,
        startTime: stream.startTime,
        status: stream.isLive ? 'live' : stream.status,
      })),
    };
  }

  /**
   * Broadcast real-time metrics to connected clients
   */
  async broadcastMetrics(): Promise<void> {
    const metrics = await this.getRealTimeMetrics();
    this.webSocketService.broadcastToAll('analytics:metrics', metrics);
  }

  /**
   * Clear analytics cache
   */
  async clearCache(): Promise<void> {
    await this.redisService.del('analytics:realtime_metrics');
  }
}
