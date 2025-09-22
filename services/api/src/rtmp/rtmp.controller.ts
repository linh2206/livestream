import { Controller, Post, Body, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { RtmpService } from './rtmp.service';
import { CreateStreamDto } from './dto/create-stream.dto';

@Controller('rtmp')
export class RtmpController {
  constructor(private readonly rtmpService: RtmpService) {}

  @Post('publish')
  async onPublish(@Body() body: any) {
    console.log('RTMP Publish:', body);
    return this.rtmpService.handlePublish(body);
  }

  @Post('publish_done')
  async onPublishDone(@Body() body: any) {
    console.log('RTMP Publish Done:', body);
    return this.rtmpService.handlePublishDone(body);
  }

  @Post('play')
  async onPlay(@Body() body: any) {
    console.log('RTMP Play:', body);
    return this.rtmpService.handlePlay(body);
  }

  @Post('play_done')
  async onPlayDone(@Body() body: any) {
    console.log('RTMP Play Done:', body);
    return this.rtmpService.handlePlayDone(body);
  }

  @Get('hls/:streamKey')
  async getHlsStream(@Param('streamKey') streamKey: string, @Res() res: Response) {
    // Remove .m3u8 extension if present
    const cleanStreamKey = streamKey.replace('.m3u8', '');
    return this.rtmpService.serveHlsStream(cleanStreamKey, res);
  }

  @Get('hls')
  async getHlsStreams(@Res() res: Response) {
    return this.rtmpService.serveHlsDirectory(res);
  }
}
