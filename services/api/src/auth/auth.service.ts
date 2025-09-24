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
      if (!user) {
        return null;
      }
      
      const isPasswordValid = await this.usersService.validatePassword(password, user.password);
      if (isPasswordValid) {
        const { password: _, ...result } = user;
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

    const payload = { username: user.username, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        fullName: user.fullName,
        provider: user.provider,
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

  async googleLogin(googleUser: any) {
    try {
      // Check if user exists by email
      let user;
      try {
        user = await this.usersService.findByEmail(googleUser.email);
      } catch (error) {
        // User not found, create new one
        user = null;
      }
      
      if (!user) {
        // Create new user from Google data
        const newUser = await this.usersService.create({
          username: googleUser.username,
          email: googleUser.email,
          password: 'google_oauth_' + Math.random().toString(36).substring(7), // Random password
          avatar: googleUser.avatar,
        });
        user = newUser;
      } else {
        // Update avatar if changed
        if (googleUser.avatar && user.avatar !== googleUser.avatar) {
          user = await this.usersService.update(user._id, { avatar: googleUser.avatar });
        }
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
    } catch (error) {
      throw new UnauthorizedException('Google authentication failed');
    }
  }
}
