import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Stream } from '../../shared/database/schemas/stream.schema';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

@Injectable()
export class VodService {
  private readonly logger = new Logger(VodService.name);

  constructor(
    @InjectModel(Stream.name) private streamModel: Model<Stream>,
  ) {}

  async processStreamToVod(streamId: string): Promise<void> {
    try {
      const stream = await this.streamModel.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Mark as processing
      await this.streamModel.findByIdAndUpdate(streamId, {
        vodProcessing: true,
        vodProcessingStatus: 'processing',
      });

      // Get HLS segments directory
      const hlsDir = path.join(process.cwd(), 'hls', 'stream', stream.streamKey);
      
      if (!fs.existsSync(hlsDir)) {
        throw new Error('HLS directory not found');
      }

      // Find all .ts segments
      const segments = fs.readdirSync(hlsDir)
        .filter(file => file.endsWith('.ts'))
        .sort();

      if (segments.length === 0) {
        throw new Error('No segments found');
      }

      // Create output directory for VOD
      const vodDir = path.join(process.cwd(), 'vod', stream.streamKey);
      if (!fs.existsSync(vodDir)) {
        fs.mkdirSync(vodDir, { recursive: true });
      }

      // Create segments list file for FFmpeg
      const segmentsListPath = path.join(vodDir, 'segments.txt');
      const segmentsList = segments.map(segment => 
        `file '${path.join(hlsDir, segment)}'`
      ).join('\n');
      
      fs.writeFileSync(segmentsListPath, segmentsList);

      // Create unique filename with timestamp to avoid overwriting
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueFileName = `${stream.streamKey}_${timestamp}`;
      
      // Convert segments to MP4 using FFmpeg
      const outputPath = path.join(vodDir, `${uniqueFileName}.mp4`);
      const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${segmentsListPath}" -c copy "${outputPath}"`;

      this.logger.log(`Processing VOD for stream ${streamId}...`);
      await exec(ffmpegCommand);

      // Get video duration and file size
      const stats = fs.statSync(outputPath);
      const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`;
      const { stdout: durationOutput } = await exec(durationCommand);
      const duration = Math.round(parseFloat(durationOutput.trim()));

      // Generate thumbnail with unique name
      const thumbnailPath = path.join(vodDir, `${uniqueFileName}_thumbnail.jpg`);
      const thumbnailCommand = `ffmpeg -i "${outputPath}" -ss 00:00:10 -vframes 1 "${thumbnailPath}"`;
      await exec(thumbnailCommand);

      // Update stream with VOD information
      await this.streamModel.findByIdAndUpdate(streamId, {
        isVod: true,
        vodUrl: `/vod/${stream.streamKey}/${uniqueFileName}.mp4`,
        vodDuration: duration,
        vodFileSize: stats.size,
        vodThumbnail: `/vod/${stream.streamKey}/${uniqueFileName}_thumbnail.jpg`,
        vodProcessing: false,
        vodProcessingStatus: 'completed',
      });

      this.logger.log(`VOD processing completed for stream ${streamId}`);

      // Clean up segments list file
      fs.unlinkSync(segmentsListPath);

    } catch (error) {
      this.logger.error(`VOD processing failed for stream ${streamId}:`, error);
      
      await this.streamModel.findByIdAndUpdate(streamId, {
        vodProcessing: false,
        vodProcessingStatus: 'failed',
        vodProcessingError: error.message,
      });

      throw error;
    }
  }

  async getVodList(userId?: string, page: number = 1, limit: number = 10) {
    const query: any = { isVod: true, vodProcessingStatus: 'completed' };
    
    if (userId) {
      query.userId = userId;
    }

    const skip = (page - 1) * limit;
    
    const [vods, total] = await Promise.all([
      this.streamModel
        .find(query)
        .populate('userId', 'username avatar')
        .sort({ endTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.streamModel.countDocuments(query),
    ]);

    return {
      vods,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getVodById(vodId: string) {
    return this.streamModel
      .findOne({ _id: vodId, isVod: true })
      .populate('userId', 'username avatar')
      .lean();
  }

  async deleteVod(vodId: string, userId: string) {
    const vod = await this.streamModel.findOne({ 
      _id: vodId, 
      isVod: true,
      userId: userId 
    });

    if (!vod) {
      throw new Error('VOD not found or access denied');
    }

    // Delete VOD files
    const vodDir = path.join(process.cwd(), 'vod', vod.streamKey);
    if (fs.existsSync(vodDir)) {
      fs.rmSync(vodDir, { recursive: true, force: true });
    }

    // Update stream to remove VOD
    await this.streamModel.findByIdAndUpdate(vodId, {
      isVod: false,
      vodUrl: null,
      vodDuration: null,
      vodFileSize: null,
      vodThumbnail: null,
      vodProcessing: false,
      vodProcessingStatus: null,
      vodProcessingError: null,
    });

    return { message: 'VOD deleted successfully' };
  }
}
