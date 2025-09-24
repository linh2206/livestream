import { IsString, IsNotEmpty, MaxLength, MinLength, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  room: string;

  @IsString()
  @IsNotEmpty()
  streamId: string | Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  userId: string | Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
