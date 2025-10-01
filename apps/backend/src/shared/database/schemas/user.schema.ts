import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: null })
  avatar?: string;

  @Prop({ default: null })
  fullName?: string;

  @Prop({ 
    type: String, 
    enum: ['admin', 'manager', 'user'], 
    default: 'user' 
  })
  role: string;

  @Prop({ 
    type: String, 
    enum: ['local', 'google', 'facebook'], 
    default: 'local' 
  })
  provider: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: null })
  currentSessionId?: string;

  @Prop({ default: Date.now })
  lastSeen: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

