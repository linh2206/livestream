import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { User, UserDocument } from '../../shared/database/schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getAllUsers(currentUserId: string) {
    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const users = await this.userModel
      .find({}, { password: 0 })
      .sort({ createdAt: -1 });
    return { data: users };
  }

  async createUser(createUserDto: CreateUserDto, currentUserId: string) {
    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // Create user
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || 'user',
      isActive: true,
    });

    await user.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  }

  async getUserById(id: string) {
    const user = await this.userModel.findById(id, { password: 0 });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string
  ) {
    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email/username already exists (excluding current user)
    if (updateUserDto.email || updateUserDto.username) {
      const existingUser = await this.userModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateUserDto.email ? [{ email: updateUserDto.email }] : []),
          ...(updateUserDto.username
            ? [{ username: updateUserDto.username }]
            : []),
        ],
      });

      if (existingUser) {
        throw new ConflictException('Email or username already exists');
      }
    }

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      { new: true, select: '-password' }
    );

    return updatedUser;
  }

  async deleteUser(id: string, currentUserId: string) {
    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Prevent self-deletion
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndDelete(id);
    return { message: 'User deleted successfully' };
  }

  async toggleUserStatus(id: string, currentUserId: string) {
    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Prevent self-deactivation
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = !user.isActive;
    await user.save();

    return {
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive,
    };
  }

  async changeUserRole(id: string, role: string, currentUserId: string) {
    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Prevent self-role change
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = role as 'user' | 'admin' | 'moderator';
    await user.save();

    return {
      message: `User role changed to ${role} successfully`,
      role: user.role,
    };
  }
}
