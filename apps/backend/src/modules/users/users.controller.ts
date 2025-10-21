import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Req() req: AuthenticatedRequest) {
    const currentUser = req.user;
    return this.usersService.getAllUsers(currentUser.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() req: AuthenticatedRequest
  ) {
    const currentUser = req.user;
    return this.usersService.createUser(createUserDto, currentUser.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthenticatedRequest
  ) {
    const currentUser = req.user;
    return this.usersService.updateUser(id, updateUserDto, currentUser.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const currentUser = req.user;
    return this.usersService.deleteUser(id, currentUser.sub);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard)
  async toggleUserStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    const currentUser = req.user;
    return this.usersService.toggleUserStatus(id, currentUser.sub);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard)
  async changeUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
    @Req() req: AuthenticatedRequest
  ) {
    const currentUser = req.user;
    return this.usersService.changeUserRole(id, body.role, currentUser.sub);
  }
}
