import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CreateStreamDto, UpdateStreamDto } from './dto/stream.dto';
import { StreamStatusService } from './stream-status.service';
import { StreamsService } from './streams.service';

@Controller('streams')
export class StreamsController {
  constructor(
    private streamsService: StreamsService,
    private streamStatusService: StreamStatusService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createStreamDto: CreateStreamDto, @Req() req: Request) {
    return this.streamsService.create(
      createStreamDto,
      (req['user'] as any).sub
    );
  }

  @Get('create')
  @UseGuards(JwtAuthGuard)
  async getCreatePage(@Req() req: Request) {
    // Return empty response for GET /streams/create (frontend route)
    return { message: 'Create stream page' };
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.streamsService.findAll(pageNum, limitNum);
  }

  @Get('active')
  async findActiveStreams() {
    return this.streamsService.findActiveStreams();
  }

  @Get('search')
  async searchStreams(@Query('q') query: string) {
    if (!query) {
      return [];
    }
    return this.streamsService.searchStreams(query);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.streamsService.findByUserId(userId);
  }

  @Get('key/:streamKey')
  async findByStreamKey(@Param('streamKey') streamKey: string) {
    return this.streamsService.findByStreamKey(streamKey);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: Request) {
    // Get userId from JWT if authenticated, otherwise undefined
    const userId = (req['user'] as any)?.sub;
    return this.streamsService.findById(id, userId);
  }

  @Get('test/create')
  @UseGuards(JwtAuthGuard)
  async createTestStream(@Req() req: Request) {
    // This endpoint is for creating a new stream via GET (for testing)
    const createStreamDto = {
      title: 'Test Stream',
      description: 'Auto-created test stream',
    };
    return this.streamsService.create(
      createStreamDto,
      (req['user'] as any).sub
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateStreamDto: UpdateStreamDto,
    @Req() req: Request
  ) {
    return this.streamsService.update(
      id,
      updateStreamDto,
      (req['user'] as any).sub
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    await this.streamsService.delete(id, (req['user'] as any).sub);
    return { message: 'Stream deleted successfully' };
  }

  @Post('start/:streamKey')
  async startStream(@Param('streamKey') streamKey: string) {
    return this.streamsService.startStream(streamKey);
  }

  @Post('stop/:streamKey')
  async stopStream(@Param('streamKey') streamKey: string) {
    return this.streamsService.stopStream(streamKey);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('id') id: string, @Req() req: Request) {
    const userId = (req['user'] as any).sub;
    return this.streamsService.toggleLike(id, userId);
  }

  @Put('viewer-count/:streamKey')
  async updateViewerCount(
    @Param('streamKey') streamKey: string,
    @Body('count') count: number
  ) {
    await this.streamsService.updateViewerCount(streamKey, count);
    return { message: 'Viewer count updated successfully' };
  }

  @Post('sync-status/:streamKey')
  async syncStreamStatus(@Param('streamKey') streamKey: string) {
    await this.streamsService.syncStreamStatus(streamKey);
    return { message: 'Stream status synchronized successfully' };
  }

  @Post('force-sync/:streamKey')
  async forceSyncStreamStatus(@Param('streamKey') streamKey: string) {
    await this.streamStatusService.forceSyncStreamStatus(streamKey);
    return { message: 'Stream status force synchronized successfully' };
  }
}
