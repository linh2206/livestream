import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StreamDocument = Stream & Document;

@Schema({ timestamps: true })
export class Stream {
  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({ trim: true, maxlength: 500 })
  description: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['active', 'inactive', 'ended'], default: 'inactive' })
  status: string;

  @Prop({ default: false })
  isLive: boolean;

  @Prop({ default: 0, min: 0 })
  viewerCount: number;

  @Prop({ default: 0, min: 0 })
  likeCount: number;

  @Prop({ unique: true })
  streamKey: string;

  @Prop()
  hlsUrl: string;

  @Prop()
  rtmpUrl: string;

  @Prop()
  thumbnail: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const StreamSchema = SchemaFactory.createForClass(Stream);
