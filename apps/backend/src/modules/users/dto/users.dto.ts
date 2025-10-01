import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(['user', 'admin', 'moderator'])
  role?: 'user' | 'admin' | 'moderator';
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(['user', 'admin', 'moderator'])
  role?: 'user' | 'admin' | 'moderator';

  @IsOptional()
  isActive?: boolean;
}



