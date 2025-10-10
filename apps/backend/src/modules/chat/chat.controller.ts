import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  async createMessage(
    @Body() createChatMessageDto: CreateChatMessageDto,
    @Req() req: Request
  ) {
    return this.chatService.createMessage(
      createChatMessageDto,
      (req['user'] as { sub: string }).sub
    );
  }

  @Get('messages/stream/:streamId')
  async getMessagesByStream(
    @Param('streamId') streamId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.chatService.getMessagesByStream(streamId, pageNum, limitNum);
  }

  @Get('messages/stream/:streamId/recent')
  async getRecentMessages(
    @Param('streamId') streamId: string,
    @Query('limit') limit: string = '20'
  ) {
    const limitNum = parseInt(limit, 10);
    return this.chatService.getRecentMessages(streamId, limitNum);
  }

  @Get('messages/stream/:streamId/stats')
  async getMessageStats(@Param('streamId') streamId: string) {
    return this.chatService.getMessageStats(streamId);
  }

  @Get('messages/stream/:streamId/top-chatters')
  async getTopChatters(
    @Param('streamId') streamId: string,
    @Query('limit') limit: string = '10'
  ) {
    const limitNum = parseInt(limit, 10);
    return this.chatService.getTopChatters(streamId, limitNum);
  }

  @Delete('messages/:messageId')
  @UseGuards(JwtAuthGuard)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: Request
  ) {
    await this.chatService.deleteMessage(
      messageId,
      (req['user'] as { sub: string }).sub
    );
    return { message: 'Message deleted successfully' };
  }
}
