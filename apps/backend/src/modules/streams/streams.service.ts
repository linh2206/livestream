import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Stream,
  StreamDocument,
} from '../../shared/database/schemas/stream.schema';
import { User, UserDocument } from '../../shared/database/schemas/user.schema';
import { CreateStreamDto, UpdateStreamDto } from './dto/stream.dto';
import { RedisService } from '../../shared/redis/redis.service';
import { WebSocketService } from '../../shared/websocket/websocket.service';

@Injectable()
export class StreamsService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private redisService: RedisService,
    private webSocketService: WebSocketService
  ) {}

  async create(
    createStreamDto: CreateStreamDto,
    userId: string
  ): Promise<Stream> {
    // Validate user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const streamKey = this.generateStreamKey();

    const stream = new this.streamModel({
      ...createStreamDto,
      userId: new Types.ObjectId(userId),
      streamKey,
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
  ): Promise<{ data: any[]; pagination: any }> {
    const skip = (page - 1) * limit;

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
        .limit(limit)
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
      likeCount: stream.likeCount || 0,
      user: stream.userId
        ? {
            _id: (stream.userId as any)._id,
            username: (stream.userId as any).username || 'Unknown User',
            avatar: (stream.userId as any).avatar,
          }
        : {
            _id: null,
            username: 'System',
            avatar: null,
          },
      createdAt: (stream as any).createdAt,
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
      throw new NotFoundException('Stream not found');
    }

    // Check if current user has liked this stream
    const isLikedByUser = userId
      ? stream.likedBy?.some(
          likedUserId => likedUserId.toString() === userId
        ) || false
      : false;

    // Ensure stream has proper default values
    return {
      ...stream.toObject(),
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
      throw new NotFoundException('Stream not found');
    }

    // Ensure stream has proper default values
    return {
      ...stream.toObject(),
      isLive: stream.isLive || false,
      status: stream.status || 'inactive',
      viewerCount: stream.viewerCount || 0,
      likeCount: stream.likeCount || 0,
      isPublic: stream.isPublic !== undefined ? stream.isPublic : true,
      requiresAuth:
        stream.requiresAuth !== undefined ? stream.requiresAuth : false,
      hlsUrl:
        stream.hlsUrl ||
        `${process.env.HLS_BASE_URL || 'http://localhost:8080/hls'}/${stream.streamKey}`,
      rtmpUrl:
        stream.rtmpUrl ||
        `${process.env.RTMP_BASE_URL || 'rtmp://localhost:1935'}/live/${stream.streamKey}`,
    } as Stream;
  }

  async findActiveStreams(): Promise<any[]> {
    return this.streamModel
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
      throw new NotFoundException('Stream not found');
    }

    // Check if user owns the stream or is admin
    if (stream.userId.toString() !== userId) {
      const user = await this.userModel.findById(userId);
      if (user.role !== 'admin') {
        throw new ForbiddenException('You can only update your own streams');
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
      throw new NotFoundException('Stream not found');
    }

    // Check if user owns the stream or is admin
    if (stream.userId.toString() !== userId) {
      const user = await this.userModel.findById(userId);
      if (user.role !== 'admin') {
        throw new ForbiddenException('You can only delete your own streams');
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

    await this.streamModel.findByIdAndUpdate((stream as any)._id, {
      isLive: true,
      status: 'active',
      startTime: new Date(),
    });

    // Broadcast stream start
    this.webSocketService.broadcastStreamStart((stream as any)._id.toString(), {
      id: (stream as any)._id,
      title: stream.title,
      userId: stream.userId,
      streamKey: stream.streamKey,
    });

    return stream;
  }

  async stopStream(streamKey: string): Promise<Stream> {
    const stream = await this.findByStreamKey(streamKey);

    stream.isLive = false;
    stream.status = 'ended';
    stream.endTime = new Date();

    await this.streamModel.findByIdAndUpdate((stream as any)._id, {
      isLive: false,
      status: 'ended',
      endTime: new Date(),
    });

    // Broadcast stream stop
    this.webSocketService.broadcastStreamStop((stream as any)._id.toString());

    return stream;
  }

  async updateViewerCount(streamKey: string, count: number): Promise<void> {
    const stream = await this.streamModel.findOneAndUpdate(
      { streamKey },
      { viewerCount: count },
      { new: true }
    );

    if (stream) {
      this.webSocketService.broadcastViewerCount(stream._id.toString(), count);
    }
  }

  async toggleLike(
    streamId: string,
    userId: string
  ): Promise<{ stream: Stream; isLiked: boolean }> {
    const stream = await this.streamModel.findById(streamId);
    if (!stream) {
      throw new NotFoundException('Stream not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const isCurrentlyLiked = stream.likedBy?.includes(userObjectId) || false;

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

  private generateStreamKey(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `stream_${timestamp}_${random}`;
  }

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
          console.log(
            `Stream ${streamKey} marked as live but HLS not available, marking as offline`
          );
          stream.isLive = false;
          stream.status = 'ended';
          stream.endTime = new Date();

          await this.streamModel.findByIdAndUpdate((stream as any)._id, {
            isLive: false,
            status: 'ended',
            endTime: new Date(),
          });

          // Broadcast stream end to frontend
          this.webSocketService.broadcastStreamStop(
            (stream as any)._id.toString()
          );

          console.log(
            `Stream status synchronized - marked as offline: ${streamKey}`
          );
        } else if (!stream.isLive && isActuallyLive) {
          // Stream is marked as offline but HLS is available, mark as live
          console.log(
            `Stream ${streamKey} marked as offline but HLS available, marking as live`
          );
          stream.isLive = true;
          stream.status = 'active';
          stream.startTime = stream.startTime || new Date();

          await this.streamModel.findByIdAndUpdate((stream as any)._id, {
            isLive: true,
            status: 'active',
            startTime: stream.startTime || new Date(),
          });

          // Broadcast stream start to frontend
          this.webSocketService.broadcastStreamStart(
            (stream as any)._id.toString(),
            {
              id: (stream as any)._id,
              title: stream.title,
              userId: stream.userId,
              streamKey: stream.streamKey,
            }
          );

          console.log(
            `Stream status synchronized - marked as live: ${streamKey}`
          );
        } else {
          console.log(`Stream ${streamKey} status is already correct`);
        }
      } catch (error) {
        // If we can't check HLS, assume stream is offline if it's marked as live
        if (stream.isLive) {
          console.log(`Cannot check HLS for ${streamKey}, marking as offline`);
          stream.isLive = false;
          stream.status = 'ended';
          stream.endTime = new Date();

          await this.streamModel.findByIdAndUpdate((stream as any)._id, {
            isLive: false,
            status: 'ended',
            endTime: new Date(),
          });

          // Broadcast stream end to frontend
          this.webSocketService.broadcastStreamStop(
            (stream as any)._id.toString()
          );
        }
      }
    } catch (error) {
      console.error(`Error syncing stream status for ${streamKey}:`, error);
      throw error;
    }
  }
}
