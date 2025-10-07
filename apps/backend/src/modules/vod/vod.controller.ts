import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { VodService } from './vod.service';

@Controller('vod')
export class VodController {
  constructor(private readonly vodService: VodService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getVodList(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('userId') userId?: string
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return this.vodService.getVodList(userId, pageNum, limitNum);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyVods(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return this.vodService.getVodList(req.user._id, pageNum, limitNum);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getVodById(@Param('id') id: string) {
    return this.vodService.getVodById(id);
  }

  @Post('process/:streamId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async processStreamToVod(@Param('streamId') streamId: string) {
    await this.vodService.processStreamToVod(streamId);
    return { message: 'VOD processing started' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteVod(@Param('id') id: string, @Request() req: any) {
    return this.vodService.deleteVod(id, req.user._id);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminDeleteVod(@Param('id') id: string) {
    // Admin can delete any VOD
    const vod = await this.vodService.getVodById(id);
    if (!vod) {
      throw new Error('VOD not found');
    }

    return this.vodService.deleteVod(id, vod.userId.toString());
  }
}
