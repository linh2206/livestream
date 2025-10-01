import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller('hls')
export class HlsController {
  @Get(':streamKey/:filename')
  async serveHlsFile(
    @Param('streamKey') streamKey: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = join('/app', 'hls', streamKey, filename);
    
    if (!existsSync(filePath)) {
      throw new NotFoundException('HLS file not found');
    }

    // Set appropriate headers for HLS
    if (filename.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filename.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }

    res.sendFile(filePath);
  }

  @Get(':streamKey')
  async serveHlsPlaylist(
    @Param('streamKey') streamKey: string,
    @Res() res: Response,
  ) {
    const playlistPath = join('/app', 'hls', streamKey, 'index.m3u8');
    
    if (!existsSync(playlistPath)) {
      throw new NotFoundException('HLS playlist not found');
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(playlistPath);
  }
}
