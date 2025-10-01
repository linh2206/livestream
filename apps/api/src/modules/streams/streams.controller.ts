import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';

import { StreamsService } from './streams.service';
import { CreateStreamDto, UpdateStreamDto } from './dto/stream.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Controller('streams')
export class StreamsController {
  constructor(private streamsService: StreamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createStreamDto: CreateStreamDto, @Req() req: Request) {
    return this.streamsService.create(createStreamDto, req['user'].id);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
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
  async findById(@Param('id') id: string) {
    return this.streamsService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateStreamDto: UpdateStreamDto,
    @Req() req: Request,
  ) {
    return this.streamsService.update(id, updateStreamDto, req['user'].id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: Request) {
    await this.streamsService.delete(id, req['user'].id);
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

  @Post('like/:streamKey')
  async likeStream(@Param('streamKey') streamKey: string) {
    return this.streamsService.likeStream(streamKey);
  }

  @Put('viewer-count/:streamKey')
  async updateViewerCount(
    @Param('streamKey') streamKey: string,
    @Body('count') count: number,
  ) {
    await this.streamsService.updateViewerCount(streamKey, count);
    return { message: 'Viewer count updated successfully' };
  }
}
