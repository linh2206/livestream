import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

import { ChatMessage, ChatMessageSchema } from '../../shared/database/schemas/chat-message.schema';
import { User, UserSchema } from '../../shared/database/schemas/user.schema';
import { Stream, StreamSchema } from '../../shared/database/schemas/stream.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Stream.name, schema: StreamSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
