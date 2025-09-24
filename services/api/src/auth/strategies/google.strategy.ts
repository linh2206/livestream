import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:9000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;
      
      // Generate unique username from Google profile
      const baseUsername = `${name.givenName}_${name.familyName}`.toLowerCase().replace(/\s+/g, '_');
      const timestamp = Date.now();
      const username = `${baseUsername}_${timestamp}`;
      
      const user = {
        googleId: id,
        email: emails[0].value,
        username: username,
        fullName: `${name.givenName} ${name.familyName}`,
        avatar: photos[0]?.value || '',
        accessToken,
        refreshToken,
        provider: 'google',
        isEmailVerified: emails[0].verified || false,
      };

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
