import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Import all schemas
import { User, UserSchema } from './schemas/user.schema';
import { Stream, StreamSchema } from './schemas/stream.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Stream.name, schema: StreamSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
