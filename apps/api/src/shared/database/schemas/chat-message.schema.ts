import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true, trim: true, maxlength: 500 })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Stream', required: true })
  streamId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  room: string;

  @Prop({ required: true, trim: true })
  username: string;

  @Prop({ default: null })
  avatar?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isModerator: boolean;

  @Prop({ default: false })
  isSubscriber: boolean;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
