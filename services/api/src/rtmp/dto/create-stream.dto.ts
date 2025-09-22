import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateStreamDto {
  @IsString()
  streamKey: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isLive?: boolean;
}
