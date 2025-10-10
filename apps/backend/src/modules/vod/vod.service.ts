import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Response } from 'express';
import * as fs from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';
import { promisify } from 'util';
import { Stream } from '../../shared/database/schemas/stream.schema';
import { Vod } from '../../shared/database/schemas/vod.schema';

const exec = promisify(require('child_process').exec);

@Injectable()
export class VodService {
  private readonly logger = new Logger(VodService.name);

  constructor(
    @InjectModel(Stream.name) private streamModel: Model<Stream>,
    @InjectModel(Vod.name) private vodModel: Model<Vod>
  ) {}

  async createVodRecord(streamId: string): Promise<void> {
    try {
      const stream = await this.streamModel.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Check if VOD record already exists
      const existingVod = await this.vodModel.findOne({
        originalStreamId: streamId,
      });

      if (existingVod) {
        this.logger.log(`VOD record already exists for stream ${streamId}`);
        return;
      }

      // Create VOD record immediately (without vodUrl, will be updated after processing)
      const vodRecord = new this.vodModel({
        title: stream.title,
        description: stream.description,
        userId: stream.userId,
        vodUrl: null, // Will be set after processing
        vodDuration: 0, // Will be set after processing
        vodFileSize: 0, // Will be set after processing
        vodThumbnail: null, // Will be set after processing
        tags: stream.tags || [],
        category: (stream as any).category || null,
        viewerCount: stream.viewerCount || 0,
        totalViewerCount: stream.totalViewerCount || 0,
        likeCount: stream.likeCount || 0,
        likedBy: stream.likedBy || [],
        isPublic: stream.isPublic,
        allowedViewers: stream.allowedViewers || [],
        requiresAuth: stream.requiresAuth,
        originalStreamKey: stream.streamKey,
        originalStreamId: stream._id.toString(),
        startTime: stream.startTime,
        endTime: stream.endTime,
      });

      await vodRecord.save();
      this.logger.log(`Created VOD record for stream ${streamId}`);

      // Update stream to mark as VOD
      await this.streamModel.findByIdAndUpdate(streamId, {
        isVod: true,
        vodProcessing: true,
        vodProcessingStatus: 'processing',
      });
    } catch (error) {
      this.logger.error(
        `Error creating VOD record for stream ${streamId}:`,
        error
      );
      throw error;
    }
  }

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

      // Get recordings directory - always use /app/recordings in Docker
      const recordingsDir = '/app/recordings';

      if (!fs.existsSync(recordingsDir)) {
        throw new Error('Recordings directory not found');
      }

      // Find the recording file for this stream
      const recordingFiles = fs
        .readdirSync(recordingsDir)
        .filter(
          file => file.includes(stream.streamKey) && file.endsWith('.flv')
        )
        .sort();

      if (recordingFiles.length === 0) {
        throw new Error('No recording found for this stream');
      }

      // Use the most recent recording file
      const recordingFile = recordingFiles[recordingFiles.length - 1];
      const recordingPath = path.join(recordingsDir, recordingFile);

      // Create output directory structure: vod/{streamKey}/{date}/
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const vodDir = path.join(process.cwd(), 'vod', stream.streamKey, date);
      if (!fs.existsSync(vodDir)) {
        fs.mkdirSync(vodDir, { recursive: true });
      }

      // Create unique filename with timestamp to avoid overwriting
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueFileName = `stream_${timestamp}`;

      // Convert FLV recording to MP4 using FFmpeg
      const outputPath = path.join(vodDir, `${uniqueFileName}.mp4`);
      const ffmpegCommand = `ffmpeg -i "${recordingPath}" -c:v libx264 -c:a aac -movflags +faststart "${outputPath}"`;

      this.logger.log(`Processing VOD for stream ${streamId}...`);
      await exec(ffmpegCommand);

      // Get video duration and file size
      const stats = fs.statSync(outputPath);
      const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`;
      const { stdout: durationOutput } = await exec(durationCommand);
      const duration = Math.round(parseFloat(durationOutput.trim()));

      // Generate thumbnail with unique name
      const thumbnailPath = path.join(
        vodDir,
        `${uniqueFileName}_thumbnail.jpg`
      );
      const thumbnailCommand = `ffmpeg -i "${outputPath}" -ss 00:00:10 -vframes 1 "${thumbnailPath}"`;
      await exec(thumbnailCommand);

      // Update existing VOD record with processed data
      await this.vodModel.findOneAndUpdate(
        { originalStreamId: streamId },
        {
          vodUrl: `/vod/serve/${stream.streamKey}/${date}/${uniqueFileName}.mp4`,
          vodDuration: duration,
          vodFileSize: stats.size,
          vodThumbnail: `/vod/serve/${stream.streamKey}/${date}/${uniqueFileName}_thumbnail.jpg`,
        }
      );

      // Update stream with VOD information
      await this.streamModel.findByIdAndUpdate(streamId, {
        isVod: true,
        vodUrl: `/vod/serve/${stream.streamKey}/${date}/${uniqueFileName}.mp4`,
        vodDuration: duration,
        vodFileSize: stats.size,
        vodThumbnail: `/vod/serve/${stream.streamKey}/${date}/${uniqueFileName}_thumbnail.jpg`,
        vodProcessing: false,
        vodProcessingStatus: 'completed',
      });

      this.logger.log(`VOD processing completed for stream ${streamId}`);

      // Clean up recording file after successful processing
      try {
        fs.unlinkSync(recordingPath);
        this.logger.log(`Cleaned up recording file: ${recordingFile}`);
      } catch (error) {
        this.logger.warn(`Failed to clean up recording file: ${error.message}`);
      }
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

  async getVodList(
    userId?: string,
    page: number = 1,
    limit: number = 10,
    category?: string
  ) {
    const query: Record<string, unknown> = {
      isPublic: true, // Only show public VODs in general list
      // Remove vodUrl filter to show all VODs, even if processing
    };

    if (userId) {
      query.userId = userId;
    }

    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;

    const [vods, total] = await Promise.all([
      this.vodModel
        .find(query)
        .populate('userId', 'username avatar fullName')
        .select(
          'title description vodUrl vodDuration vodFileSize vodThumbnail category tags startTime endTime viewerCount totalViewerCount likeCount userId createdAt'
        )
        .sort({ endTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.vodModel.countDocuments(query),
    ]);

    // Format VOD data for frontend
    const formattedVods = vods.map(vod => ({
      _id: vod._id,
      title: vod.title,
      description: vod.description,
      thumbnail: vod.vodThumbnail,
      vodUrl: vod.vodUrl,
      duration: vod.vodDuration,
      fileSize: vod.vodFileSize,
      category: vod.category,
      tags: vod.tags || [],
      startTime: vod.startTime,
      endTime: vod.endTime,
      viewerCount: vod.viewerCount || 0,
      totalViewerCount: vod.totalViewerCount || 0,
      likeCount: vod.likeCount || 0,
      user: vod.userId,
      createdAt: (vod as any).createdAt || new Date(),
      // Calculate duration in human readable format
      durationFormatted: this.formatDuration(vod.vodDuration),
      // Calculate file size in human readable format
      fileSizeFormatted: this.formatFileSize(vod.vodFileSize),
    }));

    return {
      vods: formattedVods,
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

  private formatDuration(seconds: number): string {
    if (!seconds) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  async getVodById(vodId: string) {
    return this.vodModel
      .findOne({ _id: vodId })
      .populate('userId', 'username avatar')
      .lean();
  }

  async deleteVod(vodId: string, userId: string) {
    const vod = await this.vodModel.findOne({
      _id: vodId,
      userId: userId,
    });

    if (!vod) {
      throw new Error('VOD not found or access denied');
    }

    // Delete VOD files - extract date from vodUrl
    const vodUrlParts = vod.vodUrl.split('/');
    const date = vodUrlParts[vodUrlParts.length - 2]; // Get date from URL
    const vodDir = path.join(process.cwd(), 'vod', vod.originalStreamKey, date);
    if (fs.existsSync(vodDir)) {
      fs.rmSync(vodDir, { recursive: true, force: true });
    }

    // Delete VOD record
    await this.vodModel.findByIdAndDelete(vodId);

    return { message: 'VOD deleted successfully' };
  }

  async serveVodFile(
    streamKey: string,
    date: string,
    filename: string,
    res: Response
  ): Promise<void> {
    try {
      // Construct file path
      const filePath = path.join(
        process.cwd(),
        'vod',
        streamKey,
        date,
        filename
      );

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('VOD file not found');
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const range = res.req.headers.range;

      if (range) {
        // Handle range requests for video streaming
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.status(206);
        res.set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });

        file.pipe(res);
      } else {
        // Serve entire file
        res.set({
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
        });

        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      this.logger.error(`Error serving VOD file: ${error.message}`);
      throw new NotFoundException('VOD file not found');
    }
  }
}
