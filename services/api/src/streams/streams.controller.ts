import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StreamsService } from './streams.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createStreamDto: CreateStreamDto, @Request() req: any) {
    return this.streamsService.create({
      ...createStreamDto,
      userId: req.user.id,
    });
  }

  @Get()
  findAll() {
    return this.streamsService.findAll();
  }

  @Get('active')
  findActive() {
    return this.streamsService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.streamsService.findOne(id);
  }

  @Get('key/:streamKey')
  findByStreamKey(@Param('streamKey') streamKey: string) {
    return this.streamsService.findByStreamKey(streamKey);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateStreamDto: UpdateStreamDto,
    @Request() req: any,
  ) {
    // Only allow stream owner to update
    return this.streamsService.update(id, updateStreamDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    // Only allow stream owner to delete
    return this.streamsService.remove(id);
  }
}
