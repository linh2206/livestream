import { Module, OnModuleInit } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// Import all schemas
import { DatabaseIndexes } from './indexes';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { Stream, StreamSchema } from './schemas/stream.schema';
import { User, UserSchema } from './schemas/user.schema';
import { Vod, VodSchema } from './schemas/vod.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Stream.name, schema: StreamSchema },
      { name: Vod.name, schema: VodSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Stream.name) private streamModel: Model<Stream>,
    @InjectModel(Vod.name) private vodModel: Model<Vod>,
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatMessage>
  ) {}

  async onModuleInit() {
    // Create database indexes on module initialization
    await DatabaseIndexes.createIndexes(
      this.userModel,
      this.streamModel,
      this.vodModel,
      this.chatModel
    );
  }
}
