import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.usersService.findAll(pageNum, limitNum);
  }

  @Get('online')
  async getOnlineUsers() {
    return this.usersService.getOnlineUsers();
  }

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    if (!query) {
      return [];
    }
    return this.usersService.searchUsers(query);
  }

  @Get('role/:role')
  async getUsersByRole(@Param('role') role: string) {
    return this.usersService.getUsersByRole(role);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.updateUser(id, updateUserDto, req['user'].id);
  }

  @Put(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Req() req: Request,
  ) {
    return this.usersService.updateUserRole(id, role, req['user'].id);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.usersService.deleteUser(id, req['user'].id);
    return { message: 'User deleted successfully' };
  }
}
