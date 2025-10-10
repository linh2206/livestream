import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Server } from 'socket.io';

import {
  ChatMessage,
  ChatMessageDocument,
} from '../../shared/database/schemas/chat-message.schema';
import {
  Stream,
  StreamDocument,
} from '../../shared/database/schemas/stream.schema';
import { User, UserDocument } from '../../shared/database/schemas/user.schema';
import { CreateChatMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>
  ) {}

  async createMessage(
    createChatMessageDto: CreateChatMessageDto,
    userId: string
  ): Promise<ChatMessage> {
    // Verify stream exists
    const stream = await this.streamModel.findById(
      createChatMessageDto.streamId
    );
    if (!stream) {
      throw new NotFoundException('Stream not found');
    }

    // Get user info
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const message = new this.chatMessageModel({
      ...createChatMessageDto,
      userId: new Types.ObjectId(userId),
      streamId: new Types.ObjectId(createChatMessageDto.streamId),
      username: user.username,
      avatar: user.avatar,
      room: `stream_${createChatMessageDto.streamId}`,
    });

    await message.save();
    return message;
  }

  async getMessagesByStream(
    streamId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const skip = (page - 1) * limit;

    return this.chatMessageModel
      .find({
        streamId: new Types.ObjectId(streamId),
        isDeleted: false,
      })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getRecentMessages(
    streamId: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    return this.chatMessageModel
      .find({
        streamId: new Types.ObjectId(streamId),
        isDeleted: false,
      })
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.chatMessageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user owns the message or is admin
    if (message.userId.toString() !== userId) {
      const user = await this.userModel.findById(userId);
      if (user.role !== 'admin') {
        throw new NotFoundException('You can only delete your own messages');
      }
    }

    message.isDeleted = true;
    await message.save();
  }

  async getMessageStats(
    streamId: string
  ): Promise<{ totalMessages: number; uniqueUsers: number }> {
    const [totalMessages, uniqueUsers] = await Promise.all([
      this.chatMessageModel.countDocuments({
        streamId: new Types.ObjectId(streamId),
        isDeleted: false,
      }),
      this.chatMessageModel
        .distinct('userId', {
          streamId: new Types.ObjectId(streamId),
          isDeleted: false,
        })
        .then(users => users.length),
    ]);

    return { totalMessages, uniqueUsers };
  }

  async getTopChatters(
    streamId: string,
    limit: number = 10
  ): Promise<
    Array<{
      user: { _id: string; username: string; avatar?: string };
      messageCount: number;
    }>
  > {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          streamId: new Types.ObjectId(streamId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$userId',
          messageCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          user: {
            _id: '$user._id',
            username: '$user.username',
            avatar: '$user.avatar',
          },
          messageCount: 1,
        },
      },
      {
        $sort: { messageCount: -1 },
      },
      {
        $limit: limit,
      },
    ];

    return this.chatMessageModel.aggregate(pipeline);
  }

  @OnEvent('chat.message.create')
  async handleChatMessageCreate(event: {
    streamId: string;
    content: string;
    userId: string;
    username: string;
    socket: Server;
    room: string;
  }) {
    try {
      const {
        streamId,
        content,
        userId,
        username: _username,
        socket,
        room,
      } = event;

      // Create message in database
      const message = await this.createMessage(
        {
          streamId,
          content,
        },
        userId
      );

      // Broadcast message to room
      socket.to(room).emit('chat:new_message', {
        id: (message as unknown as { _id: string })._id,
        content: message.content,
        userId: message.userId,
        username: message.username,
        avatar: message.avatar,
        timestamp: (message as unknown as { createdAt: Date }).createdAt,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to handle chat message creation:', error);
    }
  }
}
