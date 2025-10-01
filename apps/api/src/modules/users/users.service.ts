import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../shared/database/schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { RedisService } from '../../shared/redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private redisService: RedisService,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.userModel.find().select('-password').skip(skip).limit(limit).exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return { users, total };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, currentUserId: string): Promise<User> {
    // Check if user is updating themselves or is admin
    if (id !== currentUserId) {
      const currentUser = await this.userModel.findById(currentUserId);
      if (currentUser.role !== 'admin') {
        throw new ForbiddenException('You can only update your own profile');
      }
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { ...updateUserDto, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    // Check if user is admin
    const currentUser = await this.userModel.findById(currentUserId);
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }

    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove from Redis if online
    await this.redisService.srem('online_users', id);
    await this.redisService.hdel('user_sessions', id);
  }

  async getOnlineUsers(): Promise<User[]> {
    const onlineUserIds = await this.redisService.smembers('online_users');
    
    if (onlineUserIds.length === 0) {
      return [];
    }

    const users = await this.userModel.find({
      _id: { $in: onlineUserIds }
    }).select('-password');

    return users;
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date(),
    });
  }

  async updateUserRole(id: string, role: string, currentUserId: string): Promise<User> {
    // Check if current user is admin
    const currentUser = await this.userModel.findById(currentUserId);
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can update user roles');
    }

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { role, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.userModel.find({ role }).select('-password');
  }

  async searchUsers(query: string): Promise<User[]> {
    return this.userModel.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } },
      ]
    }).select('-password').limit(20);
  }
}
