import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Stream, StreamDocument } from '../../shared/database/schemas/stream.schema';
import { RedisService } from '../../shared/redis/redis.service';
import { WebSocketService } from '../../shared/websocket/websocket.service';

@Injectable()
export class RtmpService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
    private redisService: RedisService,
    private webSocketService: WebSocketService,
  ) {}

  async onPublish(streamKey: string): Promise<void> {
    try {
      const stream = await this.streamModel.findOne({ streamKey });
      
      if (!stream) {
        throw new NotFoundException('Stream not found');
      }

      // Update stream status
      stream.isLive = true;
      stream.status = 'active';
      stream.startTime = new Date();
      stream.viewerCount = 0;
      
      await stream.save();

      // Store in Redis
      await this.redisService.set(`stream:${streamKey}:status`, 'live', 3600); // 1 hour TTL
      await this.redisService.set(`stream:${streamKey}:start_time`, new Date().toISOString(), 3600);

      // Broadcast stream start
      this.webSocketService.broadcastStreamStart(stream._id.toString(), {
        id: stream._id,
        title: stream.title,
        userId: stream.userId,
        streamKey: stream.streamKey,
        hlsUrl: stream.hlsUrl,
      });

      console.log(`Stream started: ${streamKey}`);
    } catch (error) {
      console.error(`Error starting stream ${streamKey}:`, error);
      throw error;
    }
  }

  async onPublishDone(streamKey: string): Promise<void> {
    try {
      const stream = await this.streamModel.findOne({ streamKey });
      
      if (!stream) {
        console.warn(`Stream not found for key: ${streamKey}`);
        return;
      }

      // Update stream status
      stream.isLive = false;
      stream.status = 'ended';
      stream.endTime = new Date();
      
      await stream.save();

      // Remove from Redis
      await this.redisService.del(`stream:${streamKey}:status`);
      await this.redisService.del(`stream:${streamKey}:start_time`);
      await this.redisService.del(`stream:${streamKey}:viewer_count`);

      // Broadcast stream stop
      this.webSocketService.broadcastStreamStop(stream._id.toString());

      console.log(`Stream stopped: ${streamKey}`);
    } catch (error) {
      console.error(`Error stopping stream ${streamKey}:`, error);
    }
  }

  async onPlay(streamKey: string): Promise<void> {
    try {
      // Increment viewer count
      const currentCount = await this.redisService.get(`stream:${streamKey}:viewer_count`);
      const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
      
      await this.redisService.set(`stream:${streamKey}:viewer_count`, newCount.toString(), 3600);

      // Update database
      const stream = await this.streamModel.findOne({ streamKey });
      if (stream) {
        stream.viewerCount = newCount;
        await stream.save();

        // Broadcast viewer count update
        this.webSocketService.broadcastViewerCount(stream._id.toString(), newCount);
      }

      console.log(`Viewer joined stream: ${streamKey}, count: ${newCount}`);
    } catch (error) {
      console.error(`Error handling play for stream ${streamKey}:`, error);
    }
  }

  async onPlayDone(streamKey: string): Promise<void> {
    try {
      // Decrement viewer count
      const currentCount = await this.redisService.get(`stream:${streamKey}:viewer_count`);
      const newCount = currentCount ? Math.max(0, parseInt(currentCount) - 1) : 0;
      
      await this.redisService.set(`stream:${streamKey}:viewer_count`, newCount.toString(), 3600);

      // Update database
      const stream = await this.streamModel.findOne({ streamKey });
      if (stream) {
        stream.viewerCount = newCount;
        await stream.save();

        // Broadcast viewer count update
        this.webSocketService.broadcastViewerCount(stream._id.toString(), newCount);
      }

      console.log(`Viewer left stream: ${streamKey}, count: ${newCount}`);
    } catch (error) {
      console.error(`Error handling play done for stream ${streamKey}:`, error);
    }
  }

  async getStreamStatus(streamKey: string): Promise<{ isLive: boolean; viewerCount: number; startTime?: string }> {
    const [status, viewerCount, startTime] = await Promise.all([
      this.redisService.get(`stream:${streamKey}:status`),
      this.redisService.get(`stream:${streamKey}:viewer_count`),
      this.redisService.get(`stream:${streamKey}:start_time`),
    ]);

    return {
      isLive: status === 'live',
      viewerCount: viewerCount ? parseInt(viewerCount) : 0,
      startTime: startTime || undefined,
    };
  }

  async getActiveStreams(): Promise<Array<{ streamKey: string; viewerCount: number; startTime: string }>> {
    const activeStreams: Array<{ streamKey: string; viewerCount: number; startTime: string }> = [];
    
    // Get all stream keys from Redis
    const keys = await this.redisService.getClient().keys('stream:*:status');
    
    for (const key of keys) {
      const streamKey = key.replace('stream:', '').replace(':status', '');
      const status = await this.redisService.get(key);
      
      if (status === 'live') {
        const [viewerCount, startTime] = await Promise.all([
          this.redisService.get(`stream:${streamKey}:viewer_count`),
          this.redisService.get(`stream:${streamKey}:start_time`),
        ]);

        activeStreams.push({
          streamKey,
          viewerCount: viewerCount ? parseInt(viewerCount) : 0,
          startTime: startTime || new Date().toISOString(),
        });
      }
    }

    return activeStreams;
  }

  async generateStreamKey(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `stream_${timestamp}_${random}`;
  }

  async validateStreamKey(streamKey: string): Promise<boolean> {
    const stream = await this.streamModel.findOne({ streamKey });
    return !!stream;
  }
}
