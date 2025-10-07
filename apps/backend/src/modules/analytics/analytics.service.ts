import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../shared/database/schemas/user.schema';
import { Stream } from '../../shared/database/schemas/stream.schema';
import { ChatMessage } from '../../shared/database/schemas/chat-message.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Stream.name) private streamModel: Model<Stream>,
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatMessage>,
  ) {}

  async getOverview(timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);
    
    const [
      totalUsers,
      activeUsers,
      totalStreams,
      activeStreams,
      totalViews,
      totalMessages,
      totalLikes,
      newUsersThisPeriod,
      newStreamsThisPeriod,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.streamModel.countDocuments(),
      this.streamModel.countDocuments({ isLive: true }),
      this.streamModel.aggregate([
        { $group: { _id: null, total: { $sum: '$viewerCount' } } }
      ]).then(r => r[0]?.total || 0),
      this.chatModel.countDocuments(),
      this.streamModel.aggregate([
        { $group: { _id: null, total: { $sum: '$likeCount' } } }
      ]).then(r => r[0]?.total || 0),
      this.userModel.countDocuments(dateFilter),
      this.streamModel.countDocuments(dateFilter),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalStreams,
      activeStreams,
      totalViews,
      totalMessages,
      totalLikes,
      newUsersThisPeriod,
      newStreamsThisPeriod,
      userGrowthRate: totalUsers > 0 ? (newUsersThisPeriod / totalUsers) * 100 : 0,
      streamGrowthRate: totalStreams > 0 ? (newStreamsThisPeriod / totalStreams) * 100 : 0,
    };
  }

  async getUserAnalytics(timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);
    
    const userGrowth = await this.userModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const userStatus = await this.userModel.aggregate([
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 },
        },
      },
    ]);

    const userRoles = await this.userModel.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      userGrowth,
      userStatus,
      userRoles,
    };
  }

  async getStreamAnalytics(timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);
    
    const streamStats = await this.streamModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          streams: { $sum: 1 },
          totalViews: { $sum: '$viewerCount' },
          totalLikes: { $sum: '$likeCount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const streamStatus = await this.streamModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const averageViewerCount = await this.streamModel.aggregate([
      { $match: { isLive: true } },
      {
        $group: {
          _id: null,
          average: { $avg: '$viewerCount' },
        },
      },
    ]);

    return {
      streamStats,
      streamStatus,
      averageViewerCount: averageViewerCount[0]?.average || 0,
    };
  }

  async getRealtimeData() {
    const [
      onlineUsers,
      activeStreams,
      totalViewers,
      recentMessages,
    ] = await Promise.all([
      this.userModel.countDocuments({ isOnline: true }),
      this.streamModel.countDocuments({ isLive: true }),
      this.streamModel.aggregate([
        { $match: { isLive: true } },
        { $group: { _id: null, total: { $sum: '$viewerCount' } } }
      ]).then(r => r[0]?.total || 0),
      this.chatModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      }),
    ]);

    return {
      onlineUsers,
      activeStreams,
      totalViewers,
      recentMessages,
      timestamp: new Date(),
    };
  }

  async getTopStreamers(limit: number = 10) {
    return this.streamModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$user.username' },
          avatar: { $first: '$user.avatar' },
          totalStreams: { $sum: 1 },
          totalViews: { $sum: '$viewerCount' },
          totalLikes: { $sum: '$likeCount' },
          averageViewers: { $avg: '$viewerCount' },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: limit },
    ]);
  }

  async getChatStats(timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);
    
    const messageStats = await this.chatModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          messages: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const topChatters = await this.chatModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          messageCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          avatar: '$user.avatar',
          messageCount: 1,
        },
      },
      { $sort: { messageCount: -1 } },
      { $limit: 10 },
    ]);

    return {
      messageStats,
      topChatters,
    };
  }

  private getDateFilter(timeRange: string) {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { createdAt: { $gte: startDate } };
  }
}
