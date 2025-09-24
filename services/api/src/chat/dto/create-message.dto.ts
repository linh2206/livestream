import { IsString, IsNotEmpty, MaxLength, MinLength, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  room: string;

  @IsString()
  @IsNotEmpty()
  streamId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

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
