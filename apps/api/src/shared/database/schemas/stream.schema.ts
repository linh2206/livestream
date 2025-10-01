import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StreamDocument = Stream & Document;

@Schema({ timestamps: true })
export class Stream {
  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({ trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['active', 'inactive', 'ended'], 
    default: 'inactive' 
  })
  status: string;

  @Prop({ default: false })
  isLive: boolean;

  @Prop({ default: 0 })
  viewerCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ required: true, unique: true })
  streamKey: string;

  @Prop({ default: null })
  hlsUrl?: string;

  @Prop({ default: null })
  rtmpUrl?: string;

  @Prop({ default: null })
  thumbnail?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: null })
  startTime?: Date;

  @Prop({ default: null })
  endTime?: Date;
}

export const StreamSchema = SchemaFactory.createForClass(Stream);
