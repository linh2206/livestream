import { Controller, Post, Body, UseGuards, Request, Get, Res, Req, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    
    // Set HTTP-only cookie
    res.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
      // Remove domain to allow cross-subdomain cookies
    });
    
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.sub);
    
    // Clear cookie
    res.clearCookie('auth_token', { path: '/' });
    
    return { message: 'Logged out successfully' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {
    // This will redirect to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.googleLogin(req.user);
      
      // Return HTML that closes the popup and sends result to parent
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Login</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 10px;
              backdrop-filter: blur(10px);
              max-width: 400px;
              margin: 0 auto;
            }
            .success { color: #4CAF50; }
            .error { color: #f44336; }
            .spinner {
              border: 3px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top: 3px solid white;
              width: 30px;
              height: 30px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🎉 Login Successful!</h2>
            <div class="spinner"></div>
            <p>Welcome, ${result.user.username}!</p>
            <p>Redirecting you back to the application...</p>
          </div>
          <script>
            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                data: ${JSON.stringify(result)}
              }, '*');
              
              // Close popup after a short delay
              setTimeout(() => {
                window.close();
              }, 2000);
            } else {
              // If no opener, redirect to main app
              window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3000'}?token=' + encodeURIComponent('${result.access_token}');
            }
          </script>
        </body>
        </html>
      `;
      res.send(html);
    } catch (error) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Login Error</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              margin: 0;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 10px;
              backdrop-filter: blur(10px);
              max-width: 400px;
              margin: 0 auto;
            }
            .error { color: #ffeb3b; }
            .retry-btn {
              background: rgba(255,255,255,0.2);
              border: 1px solid white;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 20px;
            }
            .retry-btn:hover {
              background: rgba(255,255,255,0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>❌ Login Failed</h2>
            <p class="error">${error.message}</p>
            <button class="retry-btn" onclick="window.close()">Close Window</button>
          </div>
          <script>
            // Send error message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: '${error.message}'
              }, '*');
            }
          </script>
        </body>
        </html>
      `;
      res.send(html);
    }
  }
}