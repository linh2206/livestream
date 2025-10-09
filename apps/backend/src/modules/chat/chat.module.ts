import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '../../shared/database/database.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
@Module({
  imports: [DatabaseModule, EventEmitterModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
