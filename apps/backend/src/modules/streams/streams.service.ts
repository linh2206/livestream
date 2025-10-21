import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  StreamNotFoundException,
  UnauthorizedStreamAccessException,
} from '../../shared/exceptions/custom.exceptions';
import { DatabaseUtil } from '../../shared/utils/database.util';
import { ValidationUtil } from '../../shared/utils/validation.util';

import {
  Stream,
  StreamDocument,
} from '../../shared/database/schemas/stream.schema';
import { User, UserDocument } from '../../shared/database/schemas/user.schema';
import { RedisService } from '../../shared/redis/redis.service';
import { WebSocketService } from '../../shared/websocket/websocket.service';
import { VodService } from '../vod/vod.service';
import { CreateStreamDto, UpdateStreamDto } from './dto/stream.dto';

@Injectable()
export class StreamsService implements OnModuleInit {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private redisService: RedisService,
    private webSocketService: WebSocketService,
    private vodService: VodService,
    private eventEmitter: EventEmitter2
  ) {}

  onModuleInit() {
    // Listen for viewer join/leave events from WebSocket gateway
    this.eventEmitter.on(
      'stream.viewer_joined',
      (data: { streamId: string; viewerCount: number }) => {
        this.updateViewerCountById(data.streamId, data.viewerCount);
      }
    );

    this.eventEmitter.on(
      'stream.viewer_left',
      (data: { streamId: string; viewerCount: number }) => {
        this.updateViewerCountById(data.streamId, data.viewerCount);
      }
    );
  }

  // Helper methods to avoid type casting issues
  private getStreamId(stream: Stream | StreamDocument): string {
    return (
      (stream as { _id?: { toString(): string } })._id?.toString() ||
      (stream as { id?: { toString(): string } }).id?.toString() ||
      ''
    );
  }

  private getStreamIdForUpdate(stream: Stream | StreamDocument): string {
    return (
      (stream as { _id?: string })._id || (stream as { id?: string }).id || ''
    );
  }

  async create(
    createStreamDto: CreateStreamDto,
    userId: string
  ): Promise<Stream> {
    // Validate user exists
    await ValidationUtil.validateUserExists(userId, this.userModel);

    // Validate stream key if provided
    if (createStreamDto.streamKey) {
      ValidationUtil.validateStreamKey(createStreamDto.streamKey);
      await ValidationUtil.checkStreamKeyExists(
        createStreamDto.streamKey,
        this.streamModel
      );
    }

    // Use provided streamKey or generate a new one
    const streamKey =
      createStreamDto.streamKey ||
      (await ValidationUtil.generateUniqueStreamKey(this.streamModel));

    const stream = new this.streamModel({
      ...createStreamDto,
      userId: new Types.ObjectId(userId),
      streamKey,
      streamType: createStreamDto.streamType || 'camera',
      hlsUrl: `${process.env.HLS_BASE_URL || 'http://localhost:9000/api/v1'}/hls/${streamKey}`,
      rtmpUrl: `${process.env.RTMP_BASE_URL || 'rtmp://localhost:1935'}/live/${streamKey}`,
    });

    await stream.save();

    // Populate user data before returning
    return this.streamModel
      .findById(stream._id)
      .populate({
        path: 'userId',
        select: 'username avatar fullName',
        options: { strictPopulate: false },
      })
      .exec();
  }

  async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: Stream[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { skip, limit: queryLimit } = DatabaseUtil.buildPaginationQuery(
      page,
      limit
    );

    const [streams, total] = await Promise.all([
      this.streamModel
        .find(
          {},
          {
            _id: 1,
            title: 1,
            description: 1,
            streamKey: 1,
            status: 1,
            isLive: 1,
            viewerCount: 1,
            likeCount: 1,
            userId: 1,
            createdAt: 1,
            startTime: 1,
            endTime: 1,
          }
        )
        .populate({
          path: 'userId',
          select: 'username avatar',
          options: { strictPopulate: false },
        })
        .sort({ isLive: -1, createdAt: -1 }) // Live streams first
        .skip(skip)
        .limit(queryLimit)
        .lean() // Use lean for better performance
        .exec(),
      this.streamModel.countDocuments().exec(),
    ]);

    // Process streams with optimized data structure
    const processedStreams = streams.map(stream => ({
      _id: stream._id,
      title: stream.title || 'Untitled Stream',
      description: stream.description || '',
      streamKey: stream.streamKey,
      status: stream.status || 'inactive',
      isLive: stream.isLive || false,
      viewerCount: stream.viewerCount || 0,
      totalViewerCount: stream.totalViewerCount || 0,
      likeCount: stream.likeCount || 0,
      tags: stream.tags || [],
      isPublic: stream.isPublic !== undefined ? stream.isPublic : true,
      allowedViewers: stream.allowedViewers || [],
      requiresAuth: stream.requiresAuth || false,
      likedBy: (stream as { likedBy?: Types.ObjectId[] }).likedBy || [],
      isVod: stream.isVod || false,
      vodProcessing: stream.vodProcessing || false,
      user: stream.userId
        ? {
            _id: (stream.userId as unknown as { _id: string })._id,
            username:
              (stream.userId as { username?: string }).username ||
              'Unknown User',
            avatar: (stream.userId as { avatar?: string }).avatar,
          }
        : {
            _id: null,
            username: 'System',
            avatar: null,
          },
      createdAt: (stream as unknown as { createdAt: Date }).createdAt,
      startTime: stream.startTime,
      endTime: stream.endTime,
      // Only include URLs if stream is live
      ...(stream.isLive && {
        hlsUrl: `${process.env.HLS_BASE_URL || 'http://localhost:8080/hls'}/${stream.streamKey}`,
      }),
    }));

    return {
      data: processedStreams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findById(
    id: string,
    userId?: string
  ): Promise<Stream & { isLikedByUser?: boolean }> {
    const stream = await this.streamModel
      .findById(id)
      .populate({
        path: 'userId',
        select: 'username avatar',
        options: { strictPopulate: false },
      })
      .exec();

    if (!stream) {
      throw new StreamNotFoundException(id);
    }

    // Check if current user has liked this stream
    const isLikedByUser = userId
      ? (stream as { likedBy?: Types.ObjectId[] }).likedBy?.some(
          likedUserId => likedUserId.toString() === userId
        ) || false
      : false;

    // Ensure stream has proper default values
    return {
      ...(stream.toObject() as unknown as Record<string, unknown>),
      isLive: stream.isLive || false,
      status: stream.status || 'inactive',
      viewerCount: stream.viewerCount || 0,
      likeCount: stream.likeCount || 0,
      hlsUrl:
        stream.hlsUrl ||
        `${process.env.HLS_BASE_URL || 'http://localhost:8080/hls'}/${stream.streamKey}`,
      rtmpUrl:
        stream.rtmpUrl ||
        `${process.env.RTMP_BASE_URL || 'rtmp://localhost:1935'}/live/${stream.streamKey}`,
      isLikedByUser,
    } as Stream & { isLikedByUser?: boolean };
  }

  async findByStreamKey(streamKey: string): Promise<Stream> {
    const stream = await this.streamModel
      .findOne({ streamKey })
      .populate({
        path: 'userId',
        select: 'username avatar',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'allowedViewers',
        select: 'username avatar',
        options: { strictPopulate: false },
      })
      .exec();

    if (!stream) {
      throw new StreamNotFoundException(streamKey);
    }

    // Ensure stream has proper default values
    return {
      ...(stream.toObject() as unknown as Record<string, unknown>),
      isLive: stream.isLive || false,
      status: stream.status || 'inactive',
      viewerCount: stream.viewerCount || 0,
      likeCount: stream.likeCount || 0,
      isPublic: stream.isPublic !== undefined ? stream.isPublic : true,
      requiresAuth:
        stream.requiresAuth !== undefined ? stream.requiresAuth : false,
      hlsUrl:
        stream.hlsUrl ||
        `${process.env.HLS_BASE_URL || 'http://localhost:9000/api/hls'}/${stream.streamKey}`,
      rtmpUrl:
        stream.rtmpUrl ||
        `${process.env.RTMP_BASE_URL || 'rtmp://localhost:1935'}/live/${stream.streamKey}`,
    } as Stream;
  }

  async findByStreamId(streamId: string): Promise<Stream | null> {
    // Try cache first
    const cacheKey = `stream:${streamId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const stream = await this.streamModel.findById(streamId).lean();

    if (stream) {
      // Cache for 5 minutes
      await this.redisService.set(cacheKey, JSON.stringify(stream), 300);
    }

    return stream;
  }

  async findActiveStreams(): Promise<Stream[]> {
    // Try cache first (cache for 30 seconds for live data)
    const cacheKey = 'active_streams';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const streams = await this.streamModel
      .find(
        { isLive: true, status: 'active' },
        {
          _id: 1,
          title: 1,
          streamKey: 1,
          viewerCount: 1,
          likeCount: 1,
          userId: 1,
          startTime: 1,
        }
      )
      .populate({
        path: 'userId',
        select: 'username avatar',
        options: { strictPopulate: false },
      })
      .sort({ viewerCount: -1, startTime: -1 }) // Most viewed first
      .limit(20) // Limit to prevent large responses
      .lean()
      .exec();

    // Cache for 30 seconds
    await this.redisService.set(cacheKey, JSON.stringify(streams), 30);

    return streams;
  }

  async findByUserId(userId: string): Promise<Stream[]> {
    return this.streamModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    updateStreamDto: UpdateStreamDto,
    userId: string
  ): Promise<Stream> {
    const stream = await this.streamModel.findById(id);

    if (!stream) {
      throw new StreamNotFoundException(id);
    }

    // Check if user owns the stream or is admin
    if (stream.userId.toString() !== userId) {
      const user = await this.userModel.findById(userId);
      if (user.role !== 'admin') {
        throw new UnauthorizedStreamAccessException(id, userId);
      }
    }

    const updatedStream = await this.streamModel
      .findByIdAndUpdate(
        id,
        { ...updateStreamDto, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
      .populate('userId', 'username avatar');

    return updatedStream;
  }

  async delete(id: string, userId: string): Promise<void> {
    const stream = await this.streamModel.findById(id);

    if (!stream) {
      throw new StreamNotFoundException(id);
    }

    // Check if user owns the stream or is admin
    if (stream.userId.toString() !== userId) {
      const user = await this.userModel.findById(userId);
      if (user.role !== 'admin') {
        throw new UnauthorizedStreamAccessException(id, userId);
      }
    }

    await this.streamModel.findByIdAndDelete(id);
  }

  async startStream(streamKey: string): Promise<Stream> {
    const stream = await this.findByStreamKey(streamKey);

    stream.isLive = true;
    stream.status = 'active';
    stream.startTime = new Date();
    stream.viewerCount = 0;

    await this.streamModel.findByIdAndUpdate(
      this.getStreamIdForUpdate(stream),
      {
        isLive: true,
        status: 'active',
        startTime: new Date(),
      }
    );

    // Broadcast stream start
    this.webSocketService.broadcastStreamStart(this.getStreamId(stream), {
      id: this.getStreamIdForUpdate(stream),
      title: stream.title,
      userId: stream.userId,
      streamKey: stream.streamKey,
    });

    return stream;
  }

  async stopStream(streamKey: string): Promise<Stream> {
    const stream = await this.findByStreamKey(streamKey);

    // Save final viewer count as total viewer count
    const finalViewerCount = stream.viewerCount || 0;

    stream.isLive = false;
    stream.status = 'ended';
    stream.endTime = new Date();

    await this.streamModel.findByIdAndUpdate(
      this.getStreamIdForUpdate(stream),
      {
        isLive: false,
        status: 'ended',
        endTime: new Date(),
        // Set total viewer count to the peak live viewer count
        totalViewerCount: Math.max(
          stream.totalViewerCount || 0,
          finalViewerCount
        ),
      }
    );

    // Broadcast stream stop
    this.webSocketService.broadcastStreamStop(this.getStreamId(stream));

    // Create VOD record immediately
    try {
      await this.vodService.createVodRecord(this.getStreamId(stream));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create VOD record:', error);
    }

    // Automatically process stream to VOD after a short delay
    // This allows HLS segments to be finalized
    setTimeout(async () => {
      try {
        await this.vodService.processStreamToVod(this.getStreamId(stream));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to process VOD:', error);
      }
    }, 5000); // 5 second delay

    return stream;
  }

  async updateViewerCount(streamKey: string, count: number): Promise<void> {
    const stream = await this.streamModel.findOneAndUpdate(
      { streamKey },
      {
        viewerCount: count,
        // Update total viewer count if current count is higher
        $max: { totalViewerCount: count },
      },
      { new: true }
    );

    if (stream) {
      this.webSocketService.broadcastViewerCount(stream._id.toString(), count);
    }
  }

  async updateViewerCountById(streamId: string, count: number): Promise<void> {
    const stream = await this.streamModel.findByIdAndUpdate(
      streamId,
      {
        viewerCount: count,
        // Update total viewer count if current count is higher
        $max: { totalViewerCount: count },
      },
      { new: true }
    );

    if (stream) {
      this.webSocketService.broadcastViewerCount(streamId, count);
    }
  }

  async incrementTotalViewerCount(streamId: string): Promise<void> {
    await this.streamModel.findByIdAndUpdate(
      streamId,
      { $inc: { totalViewerCount: 1 } },
      { new: true }
    );
  }

  async toggleLike(
    streamId: string,
    userId: string
  ): Promise<{ stream: Stream; isLiked: boolean }> {
    const stream = await ValidationUtil.validateStreamExists(
      streamId,
      this.streamModel
    );

    const userObjectId = new Types.ObjectId(userId);
    const isCurrentlyLiked =
      (stream as { likedBy?: Types.ObjectId[] }).likedBy?.includes(
        userObjectId
      ) || false;

    let updatedStream: Stream;
    let isLiked: boolean;

    if (isCurrentlyLiked) {
      // Unlike: remove user from likedBy array and decrement likeCount
      updatedStream = await this.streamModel
        .findByIdAndUpdate(
          streamId,
          {
            $pull: { likedBy: userObjectId },
            $inc: { likeCount: -1 },
          },
          { new: true }
        )
        .populate('userId', 'username avatar');
      isLiked = false;
    } else {
      // Like: add user to likedBy array and increment likeCount
      updatedStream = await this.streamModel
        .findByIdAndUpdate(
          streamId,
          {
            $addToSet: { likedBy: userObjectId },
            $inc: { likeCount: 1 },
          },
          { new: true }
        )
        .populate('userId', 'username avatar');
      isLiked = true;
    }

    // Broadcast the like update via WebSocket
    this.webSocketService.broadcastStreamLike(
      streamId,
      updatedStream.likeCount
    );

    return { stream: updatedStream, isLiked };
  }

  async searchStreams(query: string): Promise<Stream[]> {
    return this.streamModel
      .find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } },
        ],
      })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }

  // Removed - using ValidationUtil.generateUniqueStreamKey instead

  async syncStreamStatus(streamKey: string): Promise<void> {
    try {
      const stream = await this.findByStreamKey(streamKey);

      if (!stream) {
        throw new Error(`Stream not found for key: ${streamKey}`);
      }

      // Check if HLS stream is actually available by checking file existence
      const fs = require('fs');
      const path = require('path');
      const hlsPath = path.join('/app', 'hls', streamKey, 'index.m3u8');

      try {
        const isActuallyLive = fs.existsSync(hlsPath);

        if (stream.isLive && !isActuallyLive) {
          // Stream is marked as live but HLS is not available, mark as offline
          // eslint-disable-next-line no-console
          // eslint-disable-next-line no-console
          console.log(
            `Stream ${streamKey} marked as live but HLS not available, marking as offline`
          );
          stream.isLive = false;
          stream.status = 'ended';
          stream.endTime = new Date();

          await this.streamModel.findByIdAndUpdate(
            this.getStreamIdForUpdate(stream),
            {
              isLive: false,
              status: 'ended',
              endTime: new Date(),
            }
          );

          // Broadcast stream end to frontend
          this.webSocketService.broadcastStreamStop(this.getStreamId(stream));

          // eslint-disable-next-line no-console
          console.log(
            `Stream status synchronized - marked as offline: ${streamKey}`
          );
        } else if (!stream.isLive && isActuallyLive) {
          // Stream is marked as offline but HLS is available, mark as live
          // eslint-disable-next-line no-console
          console.log(
            `Stream ${streamKey} marked as offline but HLS available, marking as live`
          );
          stream.isLive = true;
          stream.status = 'active';
          stream.startTime = stream.startTime || new Date();

          await this.streamModel.findByIdAndUpdate(
            this.getStreamIdForUpdate(stream),
            {
              isLive: true,
              status: 'active',
              startTime: stream.startTime || new Date(),
            }
          );

          // Broadcast stream start to frontend
          this.webSocketService.broadcastStreamStart(this.getStreamId(stream), {
            id: this.getStreamIdForUpdate(stream),
            title: stream.title,
            userId: stream.userId,
            streamKey: stream.streamKey,
          });

          // eslint-disable-next-line no-console
          console.log(
            `Stream status synchronized - marked as live: ${streamKey}`
          );
        } else {
          // eslint-disable-next-line no-console
          console.log(`Stream ${streamKey} status is already correct`);
        }
      } catch (error) {
        // If we can't check HLS, assume stream is offline if it's marked as live
        if (stream.isLive) {
          // eslint-disable-next-line no-console
          console.log(`Cannot check HLS for ${streamKey}, marking as offline`);
          stream.isLive = false;
          stream.status = 'ended';
          stream.endTime = new Date();

          await this.streamModel.findByIdAndUpdate(
            this.getStreamIdForUpdate(stream),
            {
              isLive: false,
              status: 'ended',
              endTime: new Date(),
            }
          );

          // Broadcast stream end to frontend
          this.webSocketService.broadcastStreamStop(this.getStreamId(stream));
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error syncing stream status for ${streamKey}:`, error);
      throw error;
    }
  }
}
