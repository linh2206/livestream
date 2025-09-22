import { IsString, IsOptional, IsArray, MaxLength, MinLength } from 'class-validator';

export class CreateStreamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  @IsOptional()
  userId?: string;
}
