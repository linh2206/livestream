import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { randomUUID } from 'crypto';

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
        console.log('✅ User validated:', { 
          id: (user as any)._id, 
          username: user.username, 
          email: user.email,
          role: user.role 
        });
        return {
          _id: (user as any)._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          fullName: user.fullName,
          provider: user.provider,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }
    } catch (error) {
      console.error('❌ Validate user error:', error);
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is already logged in elsewhere
    if (user.isOnline && user.currentSessionId) {
      throw new ConflictException('User is already logged in on another device');
    }

    // Generate new session ID and update user status
    const sessionId = randomUUID();
    await this.usersService.updateUserStatus((user as any)._id, {
      isOnline: true,
      currentSessionId: sessionId,
      lastSeen: new Date(),
    });

    console.log('🔐 Login user data:', user);

    const payload = { 
      username: user.username, 
      sub: (user as any)._id, 
      role: user.role,
      sessionId: sessionId 
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: (user as any)._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '',
        role: user.role || 'user',
        fullName: user.fullName || '',
        provider: user.provider || 'local',
        isActive: user.isActive || true,
        sessionId: sessionId,
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

  async logout(userId: string): Promise<void> {
    await this.usersService.logout(userId);
  }
}
