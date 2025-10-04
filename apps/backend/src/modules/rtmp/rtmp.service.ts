import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

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
      let stream = await this.streamModel.findOne({ streamKey });
      
      // If stream doesn't exist, create a new one automatically
      if (!stream) {
        console.log(`Creating new stream for key: ${streamKey}`);
        
        stream = new this.streamModel({
          title: `Live Stream - ${streamKey}`,
          description: 'Auto-created stream from OBS',
          userId: null,
          streamKey,
          hlsUrl: `${process.env.HLS_BASE_URL || 'http://183.182.104.226:24190/api/v1'}/hls/${streamKey}`,
          rtmpUrl: `${process.env.RTMP_BASE_URL || 'rtmp://localhost:1935'}/live/${streamKey}`,
          status: 'inactive',
          isLive: false,
          viewerCount: 0,
          likeCount: 0,
        });
        
        await stream.save();
        console.log(`Auto-created stream: ${stream._id}`);
      }

      // Update stream status
      stream.isLive = true;
      stream.status = 'active';
      stream.startTime = new Date();
      stream.viewerCount = 0;
      
      await stream.save();

      // Store in Redis for real-time status
      await this.redisService.set(`stream:${streamKey}:status`, 'live', 3600);
      await this.redisService.set(`stream:${streamKey}:start_time`, new Date().toISOString(), 3600);

      // Broadcast stream start to frontend
      this.webSocketService.broadcastToAll('stream:started', {
        streamId: stream._id.toString(),
        title: stream.title,
        userId: stream.userId,
        streamKey: stream.streamKey,
        hlsUrl: stream.hlsUrl,
        timestamp: new Date(),
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

      // Broadcast stream end to frontend
      this.webSocketService.broadcastToAll('stream:ended', {
        streamId: stream._id.toString(),
        streamKey: stream.streamKey,
        timestamp: new Date(),
      });

      console.log(`Stream stopped: ${streamKey}`);

      // Auto-delete stream after 5 minutes if it's not a user-created stream
      if (!stream.userId) {
        setTimeout(async () => {
          try {
            await this.deleteOfflineStream(streamKey);
          } catch (error) {
            console.error(`Error auto-deleting stream ${streamKey}:`, error);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    } catch (error) {
      console.error(`Error stopping stream ${streamKey}:`, error);
    }
  }

  async onPlay(streamKey: string): Promise<void> {
    try {
      // Update database
      await this.streamModel.updateOne(
        { streamKey },
        { $inc: { viewerCount: 1 } }
      );

      console.log(`Viewer joined stream: ${streamKey}`);
    } catch (error) {
      console.error(`Error handling play for ${streamKey}:`, error);
    }
  }

  async onPlayDone(streamKey: string): Promise<void> {
    try {
      // Update database
      await this.streamModel.updateOne(
        { streamKey },
        { $inc: { viewerCount: -1 } }
      );

      console.log(`Viewer left stream: ${streamKey}`);
    } catch (error) {
      console.error(`Error handling play done for ${streamKey}:`, error);
    }
  }

  async getStreamStatus(streamKey: string): Promise<{ isLive: boolean; viewerCount: number }> {
    try {
      const stream = await this.streamModel.findOne({ streamKey });
      
      if (!stream) {
        return { isLive: false, viewerCount: 0 };
      }

      return {
        isLive: stream.isLive,
        viewerCount: stream.viewerCount,
      };
    } catch (error) {
      console.error(`Error getting stream status for ${streamKey}:`, error);
      return { isLive: false, viewerCount: 0 };
    }
  }

  async getActiveStreams(): Promise<Array<{ streamKey: string; viewerCount: number; startTime: string }>> {
    try {
      const streams = await this.streamModel.find({ isLive: true });
      
      return streams.map(stream => ({
        streamKey: stream.streamKey,
        viewerCount: stream.viewerCount,
        startTime: stream.startTime?.toISOString() || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error getting active streams:', error);
      return [];
    }
  }

  async validateStreamKey(streamKey: string): Promise<boolean> {
    try {
      const stream = await this.streamModel.findOne({ streamKey });
      return !!stream;
    } catch (error) {
      console.error(`Error validating stream key ${streamKey}:`, error);
      return false;
    }
  }

  async deleteOfflineStream(streamKey: string): Promise<void> {
    try {
      const stream = await this.streamModel.findOne({ streamKey });
      
      if (!stream) {
        console.log(`Stream ${streamKey} not found for deletion`);
        return;
      }

      // Only delete if stream is offline and not user-created
      if (!stream.isLive && !stream.userId) {
        await this.streamModel.deleteOne({ streamKey });
        
        // Clean up HLS files
        const hlsDir = path.join('/app', 'hls', streamKey);
        
        if (fs.existsSync(hlsDir)) {
          fs.rmSync(hlsDir, { recursive: true, force: true });
          console.log(`Deleted HLS files for stream: ${streamKey}`);
        }

        // Broadcast deletion to frontend
        this.webSocketService.broadcastToAll('stream:deleted', {
          streamId: stream._id.toString(),
          streamKey: stream.streamKey,
          timestamp: new Date(),
        });

        console.log(`Auto-deleted offline stream: ${streamKey}`);
      }
    } catch (error) {
      console.error(`Error deleting offline stream ${streamKey}:`, error);
      throw error;
    }
  }
}