import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Req() req: Request) {
    const currentUser = (req['user'] as any);
    return this.usersService.getAllUsers(currentUser.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createUser(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const currentUser = (req['user'] as any);
    return this.usersService.createUser(createUserDto, currentUser.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: Request) {
    const currentUser = (req['user'] as any);
    return this.usersService.updateUser(id, updateUserDto, currentUser.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string, @Req() req: Request) {
    const currentUser = (req['user'] as any);
    return this.usersService.deleteUser(id, currentUser.sub);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard)
  async toggleUserStatus(@Param('id') id: string, @Req() req: Request) {
    const currentUser = (req['user'] as any);
    return this.usersService.toggleUserStatus(id, currentUser.sub);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard)
  async changeUserRole(@Param('id') id: string, @Body() body: { role: string }, @Req() req: Request) {
    const currentUser = (req['user'] as any);
    return this.usersService.changeUserRole(id, body.role, currentUser.sub);
  }
}