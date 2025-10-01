import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { WebSocketModule } from '../../shared/websocket/websocket.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [DatabaseModule, WebSocketModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}

