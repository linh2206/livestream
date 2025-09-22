import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const user = await this.usersService.findByUsername(username);
      const isPasswordValid = await this.usersService.validatePassword(password, user.password);
      
      if (isPasswordValid) {
        const { password, ...result } = user;
        return result;
      }
    } catch (error) {
      // User not found or other error
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const { password, ...result } = user;
    
    const payload = { username: result.username, sub: (user as any)._id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: (user as any)._id,
        username: result.username,
        email: result.email,
        avatar: result.avatar,
      },
    };
  }
}
