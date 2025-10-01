import { apiClient } from './api.client';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types/user';

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', { email, password });
  }

  async register(username: string, email: string, password: string, fullName?: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', { username, email, password, fullName });
  }

  async logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout');
  }

  async getProfile(): Promise<User> {
    return apiClient.get<User>('/auth/profile');
  }

  async refreshToken(): Promise<{ token: string }> {
    return apiClient.post<{ token: string }>('/auth/refresh');
  }

  async googleLogin(): Promise<void> {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/v1'}/auth/google`;
  }
}

export const authService = new AuthService();
