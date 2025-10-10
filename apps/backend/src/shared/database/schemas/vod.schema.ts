import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VodDocument = Vod & Document;

@Schema({ timestamps: true })
export class Vod {
  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({ trim: true, maxlength: 1000 })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  vodUrl: string;

  @Prop({ required: true })
  vodDuration: number; // in seconds

  @Prop({ required: true })
  vodFileSize: number; // in bytes

  @Prop({ default: null })
  vodThumbnail?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: null })
  category?: string;

  @Prop({ default: 0 })
  viewerCount: number;

  @Prop({ default: 0 })
  totalViewerCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  likedBy: Types.ObjectId[];

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  allowedViewers: Types.ObjectId[];

  @Prop({ default: false })
  requiresAuth: boolean;

  // Original stream information (for reference)
  @Prop({ default: null })
  originalStreamKey?: string;

  @Prop({ default: null })
  originalStreamId?: string;

  @Prop({ default: null })
  startTime?: Date;

  @Prop({ default: null })
  endTime?: Date;
}

export const VodSchema = SchemaFactory.createForClass(Vod);
