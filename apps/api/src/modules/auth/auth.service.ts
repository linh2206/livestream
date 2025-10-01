import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { User, UserDocument } from '../../shared/database/schemas/user.schema';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: Partial<User>; token: string }> {
    const { username, email, password, fullName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new this.userModel({
      username,
      email,
      password: hashedPassword,
      fullName,
      provider: 'local',
    });

    await user.save();

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: Partial<User>; token: string }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last seen and online status
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, token };
  }

  async googleLogin(profile: any): Promise<{ user: Partial<User>; token: string }> {
    const { id, emails, name, photos } = profile;
    const email = emails[0].value;

    // Check if user exists
    let user = await this.userModel.findOne({ email });

    if (user) {
      // Update last seen and online status
      user.lastSeen = new Date();
      user.isOnline = true;
      await user.save();
    } else {
      // Create new user
      user = new this.userModel({
        username: `user_${id}`,
        email,
        fullName: `${name.givenName} ${name.familyName}`,
        avatar: photos[0]?.value,
        provider: 'google',
        isEmailVerified: true,
      });

      await user.save();
    }

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, token };
  }

  async validateUser(payload: any): Promise<User> {
    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });
  }

  async refreshToken(userId: string): Promise<{ token: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const token = this.generateToken(user);
    return { token };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: (user as any)._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
