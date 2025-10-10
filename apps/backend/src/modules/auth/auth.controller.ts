import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(registerDto);

    // Return token for localStorage - no cookie needed
    return res.json({
      ...result,
      message: 'Store this token in localStorage',
    });
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto);

    // Return token for localStorage - no cookie needed
    return res.json({
      ...result,
      message: 'Store this token in localStorage',
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.authService.logout((req['user'] as { sub: string }).sub);

    // No need to clear cookie - frontend will clear localStorage
    return res.json({
      message: 'Logged out successfully - clear localStorage token',
    });
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() req: Request) {
    return this.authService.refreshToken((req['user'] as { sub: string }).sub);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    const userId = (req['user'] as { sub: string }).sub;
    return this.authService.getUserProfile(userId);
  }
}
