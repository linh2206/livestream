import { apiClient } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    fullName: string;
    provider: string;
    role: string;
    isActive: boolean;
  };
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    role: string;
    fullName: string;
    provider: string;
    isActive: boolean;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  fullName: string;
  provider: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AuthService {
  /**
   * Login with username and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', credentials);
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', userData);
  }

  /**
   * Google OAuth login
   */
  async googleLogin(data: GoogleLoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/google', data);
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<UserProfile> {
    return apiClient.post<UserProfile>('/auth/profile');
  }

  /**
   * Validate token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Logout (client-side only)
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

// Export singleton instance
export const authService = new AuthService();
