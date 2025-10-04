import { Controller, Get, Param, Res, Header, Query, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { StreamsService } from '../streams/streams.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { 
  StreamNotFoundException, 
  StreamOfflineException 
} from '../../shared/exceptions';

@Controller('hls')
export class HlsController {
  constructor(private streamsService: StreamsService) {}

  // This route must come BEFORE the generic :streamKey route
  @Get(':streamKey/:filename')
  @UseGuards(JwtAuthGuard)
  async serveHlsSegment(
    @Param('streamKey') streamKey: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      console.log(`🎥 [HLS Controller] Serving segment: ${filename} for stream: ${streamKey}`);
      
      // Check if stream exists
      const stream = await this.streamsService.findByStreamKey(streamKey);
      if (!stream) {
        throw new StreamNotFoundException('Stream not found');
      }
      
      const segmentPath = join('/app', 'hls', streamKey, filename);
      
      if (!existsSync(segmentPath)) {
        console.log(`❌ [HLS Controller] Segment not found: ${segmentPath}`);
        throw new StreamNotFoundException('Segment not found');
      }

      // Set appropriate headers based on file type
      if (filename.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=10');
        res.setHeader('Pragma', 'public');
      } else if (filename.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Send file directly
      res.sendFile(segmentPath);
    } catch (error) {
      if (error instanceof StreamNotFoundException) {
        throw error;
      }
      
      console.error(`❌ [HLS Controller] Error serving segment ${filename} for ${streamKey}:`, error);
      throw new StreamNotFoundException('Segment not found');
    }
  }

  @Get(':streamKey')
  @UseGuards(JwtAuthGuard)
  async serveHlsPlaylist(
    @Param('streamKey') streamKey: string,
    @Res() res: Response,
  ) {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🎬 [HLS] Playlist request for stream: ${streamKey}`);
      }
      
      // Check if stream exists
      const stream = await this.streamsService.findByStreamKey(streamKey);
      if (!stream) {
        throw new StreamNotFoundException('Stream not found');
      }
      
      const playlistPath = join('/app', 'hls', streamKey, 'index.m3u8');
      
      // Check if HLS file exists first
      if (!existsSync(playlistPath)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`❌ [HLS] File not found: ${playlistPath}`);
        }
        throw new StreamOfflineException('Stream is currently offline');
      }

      // Set optimized headers for HLS playlist
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
           res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, Cache-Control, If-Range, If-Modified-Since, If-None-Match, Pragma');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Read playlist content and modify URLs to use correct base path
      let playlistContent = readFileSync(playlistPath, 'utf8');
      const originalContent = playlistContent;
      
      // Don't modify URLs if they're already absolute paths
      // Only replace relative filenames (like "1.ts", "segment1.ts") with absolute paths
      const lines = playlistContent.split('\n');
      const modifiedLines = lines.map(line => {
        // Only modify lines that end with .ts and don't already start with /api/v1/hls/
        if (line.endsWith('.ts') && !line.startsWith('/api/v1/hls/')) {
          return `/api/v1/hls/${streamKey}/${line}`;
        }
        return line;
      });
      playlistContent = modifiedLines.join('\n');
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📝 [HLS] Original: ${originalContent.replace(/\n/g, '\\n')}`);
        console.log(`📝 [HLS] Modified: ${playlistContent.replace(/\n/g, '\\n')}`);
      }
      
      res.send(playlistContent);
    } catch (error) {
      if (error instanceof StreamOfflineException) {
        throw error;
      }
      
      console.error(`❌ [HLS Controller] Error serving playlist for ${streamKey}:`, error);
      throw new StreamOfflineException('Stream is currently offline');
    }
  }

}