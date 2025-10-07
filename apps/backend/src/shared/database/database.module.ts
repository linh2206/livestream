import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// Import all schemas
import { User, UserSchema } from './schemas/user.schema';
import { Stream, StreamSchema } from './schemas/stream.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { DatabaseIndexes } from './indexes';

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
export class DatabaseModule implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Stream.name) private streamModel: Model<Stream>,
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatMessage>
  ) {}

  async onModuleInit() {
    // Create database indexes on module initialization
    await DatabaseIndexes.createIndexes(
      this.userModel,
      this.streamModel,
      this.chatModel
    );
  }
}
