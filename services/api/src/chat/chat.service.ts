import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const createdMessage = new this.messageModel(createMessageDto);
    return createdMessage.save();
  }

  async findByStreamId(streamId: string, limit: number = 50): Promise<Message[]> {
    return this.messageModel
      .find({ streamId, isDeleted: false })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async deleteMessage(messageId: string, userId: string): Promise<Message> {
    return this.messageModel
      .findOneAndUpdate(
        { _id: messageId, userId },
        { isDeleted: true },
        { new: true }
      )
      .exec();
  }
}
