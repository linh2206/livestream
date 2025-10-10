import { Module, OnModuleInit } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// Import all schemas
import { DatabaseIndexes } from './indexes';
import { DatabaseOptimization } from './optimization';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { Stream, StreamDocument, StreamSchema } from './schemas/stream.schema';
import { User, UserDocument, UserSchema } from './schemas/user.schema';
import { Vod, VodDocument, VodSchema } from './schemas/vod.schema';

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
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
    @InjectModel(Vod.name) private vodModel: Model<VodDocument>,
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

    // Create optimization indexes
    await DatabaseOptimization.createAllIndexes({
      streamModel: this.streamModel,
      userModel: this.userModel,
      vodModel: this.vodModel,
    });
  }
}
