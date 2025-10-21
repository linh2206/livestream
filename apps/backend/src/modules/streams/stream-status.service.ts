import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';

import {
  Stream,
  StreamDocument,
} from '../../shared/database/schemas/stream.schema';
import { WebSocketService } from '../../shared/websocket/websocket.service';

@Injectable()
export class StreamStatusService {
  private readonly logger = new Logger(StreamStatusService.name);

  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
    private webSocketService: WebSocketService
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncAllStreamStatuses(): Promise<void> {
    try {
      // Find all streams that are marked as live
      const liveStreams = await this.streamModel.find({ isLive: true }).lean();

      for (const stream of liveStreams) {
        await this.checkAndUpdateStreamStatus(
          stream as unknown as StreamDocument
        );
      }

      this.logger.debug(
        `Checked status for ${liveStreams.length} live streams`
      );
    } catch (error) {
      this.logger.error('Error syncing stream statuses:', error);
    }
  }

  private async checkAndUpdateStreamStatus(
    stream: StreamDocument
  ): Promise<void> {
    try {
      // Check if HLS stream is actually available
      const hlsPath = path.join('/app', 'hls', stream.streamKey, 'index.m3u8');
      const isActuallyLive = fs.existsSync(hlsPath);

      if (!isActuallyLive) {
        // Stream is marked as live but HLS is not available
        this.logger.log(
          `Stream ${stream.streamKey} marked as live but HLS not available, processing cleanup`
        );

        // If stream has VOD, keep the VOD but delete the stream
        if (stream.isVod && stream.vodUrl) {
          this.logger.log(
            `Stream ${stream.streamKey} has VOD, keeping VOD and deleting stream`
          );

          // Delete the stream from database but keep VOD files
          await this.streamModel.findByIdAndDelete(stream._id);

          // Clean up HLS files
          const hlsDir = path.join('/app', 'hls', stream.streamKey);
          if (fs.existsSync(hlsDir)) {
            fs.rmSync(hlsDir, { recursive: true, force: true });
            this.logger.log(
              `Cleaned up HLS files for stream: ${stream.streamKey}`
            );
          }
        } else {
          // No VOD, just mark as ended
          await this.streamModel.findByIdAndUpdate(stream._id, {
            isLive: false,
            status: 'ended',
            endTime: new Date(),
          });
        }

        // Broadcast stream end to frontend
        this.webSocketService.broadcastStreamStop(stream._id.toString());

        this.logger.log(`Stream cleanup completed for: ${stream.streamKey}`);
      }
    } catch (error) {
      this.logger.error(
        `Error checking stream status for ${stream.streamKey}:`,
        error
      );
    }
  }

  async forceSyncStreamStatus(streamKey: string): Promise<void> {
    try {
      const stream = await this.streamModel.findOne({ streamKey }).lean();

      if (!stream) {
        throw new Error(`Stream not found for key: ${streamKey}`);
      }

      await this.checkAndUpdateStreamStatus(
        stream as unknown as StreamDocument
      );
    } catch (error) {
      this.logger.error(
        `Error force syncing stream status for ${streamKey}:`,
        error
      );
      throw error;
    }
  }
}
