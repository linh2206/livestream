import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateStreamDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresAuth?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  streamKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(['camera', 'screen'])
  streamType?: 'camera' | 'screen';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

export class UpdateStreamDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresAuth?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  streamKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(['camera', 'screen'])
  streamType?: 'camera' | 'screen';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
