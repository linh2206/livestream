import { Controller, Post, Body, Get, Param, Res, Options, Header } from '@nestjs/common';
import { Response } from 'express';
import { RtmpService } from './rtmp.service';
import { CreateStreamDto } from './dto/create-stream.dto';

@Controller('rtmp')
export class RtmpController {
  constructor(private readonly rtmpService: RtmpService) {}

  @Get('health')
  async health() {
    return { status: 'ok', service: 'rtmp' };
  }

  @Post('publish')
  async onPublish(@Body() body: any) {
    console.log('RTMP Publish:', body);
    try {
      return await this.rtmpService.handlePublish(body);
    } catch (error) {
      console.error('RTMP Publish error:', error);
      return { status: 'ok' }; // Always allow
    }
  }

  @Post('publish_done')
  async onPublishDone(@Body() body: any) {
    console.log('RTMP Publish Done:', body);
    try {
      return await this.rtmpService.handlePublishDone(body);
    } catch (error) {
      console.error('RTMP Publish Done error:', error);
      return { status: 'ok' };
    }
  }

  @Post('play')
  async onPlay(@Body() body: any) {
    console.log('RTMP Play:', body);
    try {
      return await this.rtmpService.handlePlay(body);
    } catch (error) {
      console.error('RTMP Play error:', error);
      return { status: 'ok' };
    }
  }

  @Post('play_done')
  async onPlayDone(@Body() body: any) {
    console.log('RTMP Play Done:', body);
    try {
      return await this.rtmpService.handlePlayDone(body);
    } catch (error) {
      console.error('RTMP Play Done error:', error);
      return { status: 'ok' };
    }
  }

  @Get('hls/:streamKey')
  async getHlsStream(@Param('streamKey') streamKey: string, @Res() res: Response) {
    // Remove .m3u8 extension if present
    const cleanStreamKey = streamKey.replace('.m3u8', '');
    return this.rtmpService.serveHlsStream(cleanStreamKey, res);
  }

  @Get('hls/:streamKey/:filename')
  async getHlsNestedStream(
    @Param('streamKey') streamKey: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    return this.rtmpService.serveHlsNestedStream(streamKey, filename, res);
  }

  @Options('hls/:streamKey')
  async optionsHlsStream() {
    return { status: 'ok' };
  }

  @Options('hls/:streamKey/:filename')
  async optionsHlsNestedStream() {
    return { status: 'ok' };
  }

  @Get('hls')
  async getHlsStreams(@Res() res: Response) {
    return this.rtmpService.serveHlsDirectory(res);
  }

}
