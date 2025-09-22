import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, trim: true, maxlength: 500 })
  content: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Stream' })
  streamId: Types.ObjectId;

  @Prop()
  streamKey: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  avatar: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isModerator: boolean;

  @Prop({ default: false })
  isSubscriber: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
