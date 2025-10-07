import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Stream,
  StreamDocument,
} from '../../shared/database/schemas/stream.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RtmpCleanupService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOfflineStreams() {
    try {
      // Find streams that have been offline for more than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const offlineStreams = await this.streamModel.find({
        isLive: false,
        userId: null, // Only auto-created streams
        endTime: { $lt: oneHourAgo },
      });

      for (const stream of offlineStreams) {
        try {
          await this.deleteStreamAndFiles(stream.streamKey);
        } catch (error) {}
      }
    } catch (error) {}
  }

  private async deleteStreamAndFiles(streamKey: string): Promise<void> {
    // Delete from database
    await this.streamModel.deleteOne({ streamKey });

    // Clean up HLS files
    const hlsDir = path.join('/app', 'hls', streamKey);

    if (fs.existsSync(hlsDir)) {
      fs.rmSync(hlsDir, { recursive: true, force: true });
    }
  }
}
