import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Stream, StreamDocument } from '../../shared/database/schemas/stream.schema';
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
    private webSocketService: WebSocketService,
  ) {}

  async create(createStreamDto: CreateStreamDto, userId: string): Promise<Stream> {
    const streamKey = this.generateStreamKey();
    
    const stream = new this.streamModel({
      ...createStreamDto,
      userId: new Types.ObjectId(userId),
      streamKey,
      hlsUrl: `${process.env.HLS_BASE_URL || 'http://localhost:8080'}/hls/${streamKey}/index.m3u8`,
      rtmpUrl: `${process.env.RTMP_BASE_URL || 'rtmp://localhost:1935'}/live/${streamKey}`,
    });

    await (stream as any).save();
    return stream;
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ streams: Stream[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [streams, total] = await Promise.all([
      this.streamModel
        .find()
        .populate('userId', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.streamModel.countDocuments().exec(),
    ]);

    return { streams, total };
  }

  async findById(id: string): Promise<Stream> {
    const stream = await this.streamModel
      .findById(id)
      .populate('userId', 'username avatar')
      .exec();
    
    if (!stream) {
      throw new NotFoundException('Stream not found');
    }
    
    return stream;
  }

  async findByStreamKey(streamKey: string): Promise<Stream> {
    const stream = await this.streamModel
      .findOne({ streamKey })
      .populate('userId', 'username avatar')
      .exec();
    
    if (!stream) {
      throw new NotFoundException('Stream not found');
    }
    
    return stream;
  }

  async findActiveStreams(): Promise<Stream[]> {
    return this.streamModel
      .find({ isLive: true, status: 'active' })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUserId(userId: string): Promise<Stream[]> {
    return this.streamModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateStreamDto: UpdateStreamDto, userId: string): Promise<Stream> {
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

    const updatedStream = await this.streamModel.findByIdAndUpdate(
      id,
      { ...updateStreamDto, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('userId', 'username avatar');

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
    
    await (stream as any).save();

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
    
    await (stream as any).save();

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

  async likeStream(streamKey: string): Promise<Stream> {
    const stream = await this.streamModel.findOneAndUpdate(
      { streamKey },
      { $inc: { likeCount: 1 } },
      { new: true }
    ).populate('userId', 'username avatar');

    if (stream) {
      this.webSocketService.broadcastStreamLike(stream._id.toString(), stream.likeCount);
    }

    return stream;
  }

  async searchStreams(query: string): Promise<Stream[]> {
    return this.streamModel
      .find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } },
        ]
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
}
