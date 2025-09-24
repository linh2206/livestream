import { Controller, Get, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(
    @Query('room') room: string,
    @Query('limit') limit: string = '50',
  ) {
    const limitNum = parseInt(limit, 10) || 50;
    const messages = await this.chatService.findByRoom(room, limitNum);
    
    // Format messages for frontend
    return messages.map(msg => ({
      _id: (msg as any)._id,
      username: msg.username,
      message: msg.content,
      createdAt: msg.createdAt,
    }));
  }
}
