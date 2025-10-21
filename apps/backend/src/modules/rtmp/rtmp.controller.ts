import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RtmpService } from './rtmp.service';

interface RtmpRequestBody {
  name?: string;
  streamKey?: string;
}

@Controller('rtmp')
export class RtmpController {
  constructor(private rtmpService: RtmpService) {}

  @Post('publish')
  async onPublish(@Body() body: RtmpRequestBody) {
    const streamKey = body.name || body.streamKey;
    await this.rtmpService.onPublish(streamKey);
    return { message: 'Stream started successfully' };
  }

  @Post('publish-done')
  async onPublishDone(@Body() body: RtmpRequestBody) {
    const streamKey = body.name || body.streamKey;
    await this.rtmpService.onPublishDone(streamKey);
    return { message: 'Stream stopped successfully' };
  }

  @Post('play')
  async onPlay(@Body() body: RtmpRequestBody) {
    const streamKey = body.name || body.streamKey;
    await this.rtmpService.onPlay(streamKey);
    return { message: 'Viewer joined stream' };
  }

  @Post('play-done')
  async onPlayDone(@Body() body: RtmpRequestBody) {
    const streamKey = body.name || body.streamKey;
    await this.rtmpService.onPlayDone(streamKey);
    return { message: 'Viewer left stream' };
  }

  @Get('status/:streamKey')
  async getStreamStatus(@Param('streamKey') streamKey: string) {
    return this.rtmpService.getStreamStatus(streamKey);
  }

  @Get('active-streams')
  async getActiveStreams() {
    return this.rtmpService.getActiveStreams();
  }

  @Post('validate/:streamKey')
  async validateStreamKey(@Param('streamKey') streamKey: string) {
    const isValid = await this.rtmpService.validateStreamKey(streamKey);
    return { valid: isValid };
  }

  @Post('check-offline/:streamKey')
  async checkStreamOffline(@Param('streamKey') streamKey: string) {
    // Check if stream is still live by looking at the status
    const status = await this.rtmpService.getStreamStatus(streamKey);
    if (!status.isLive) {
      await this.rtmpService.onPublishDone(streamKey);
    }
    return { message: 'Stream offline check completed', isLive: status.isLive };
  }

  @Post('delete-offline/:streamKey')
  async deleteOfflineStream(@Param('streamKey') streamKey: string) {
    await this.rtmpService.deleteOfflineStream(streamKey);
    return { message: 'Stream deleted successfully' };
  }
}
