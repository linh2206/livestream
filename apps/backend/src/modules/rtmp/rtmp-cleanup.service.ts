import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Stream, StreamDocument } from '../../shared/database/schemas/stream.schema';

@Injectable()
export class RtmpCleanupService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOfflineStreams() {
    try {
      console.log('Starting cleanup of offline streams...');
      
      // Find streams that have been offline for more than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const offlineStreams = await this.streamModel.find({
        isLive: false,
        userId: null, // Only auto-created streams
        endTime: { $lt: oneHourAgo },
      });

      console.log(`Found ${offlineStreams.length} offline streams to clean up`);

      for (const stream of offlineStreams) {
        try {
          await this.deleteStreamAndFiles(stream.streamKey);
          console.log(`Cleaned up stream: ${stream.streamKey}`);
        } catch (error) {
          console.error(`Error cleaning up stream ${stream.streamKey}:`, error);
        }
      }

      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during stream cleanup:', error);
    }
  }

  private async deleteStreamAndFiles(streamKey: string): Promise<void> {
    // Delete from database
    await this.streamModel.deleteOne({ streamKey });

    // Clean up HLS files
    const fs = require('fs');
    const path = require('path');
    const hlsDir = path.join('/app', 'hls', streamKey);
    
    if (fs.existsSync(hlsDir)) {
      fs.rmSync(hlsDir, { recursive: true, force: true });
      console.log(`Deleted HLS files for stream: ${streamKey}`);
    }
  }
}

