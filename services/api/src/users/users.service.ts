import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Cron } from '@nestjs/schedule';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return createdUser.save();
  }

  async findAll(page: number = 1, limit: number = 10, search: string = ''): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = search 
      ? {
          isActive: true,
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : { isActive: true };

    const [users, total] = await Promise.all([
      this.userModel
        .find(searchQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(searchQuery)
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateUserStatus(userId: string, statusData: { isOnline?: boolean; currentSessionId?: string; lastSeen?: Date }): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        ...statusData,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(
      userId,
      { 
        isOnline: false,
        currentSessionId: null,
        lastSeen: new Date(),
        updatedAt: new Date()
      }
    );
  }

  // Check user activity every 2 minutes
  @Cron('0 */2 * * * *') // Every 2 minutes
  async checkUserActivity() {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    // Mark users as offline if they haven't been active in the last 2 minutes
    const result = await this.userModel.updateMany(
      {
        isOnline: true,
        lastSeen: { $lt: twoMinutesAgo }
      },
      {
        isOnline: false,
        currentSessionId: null,
        updatedAt: new Date()
      }
    );

    console.log(`[UserActivity] Marked ${result.modifiedCount} users as offline due to inactivity`);
  }

  // Get online users (users who have been active in the last 2 minutes)
  async getOnlineUsers(): Promise<User[]> {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      const users = await this.userModel.find({
        isActive: true,
        isOnline: true,
        lastSeen: { $gte: twoMinutesAgo }
      }).select('-password').lean().exec();
      
      return users as User[];
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }
}
