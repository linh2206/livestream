import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateChatMessageDto {
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}

