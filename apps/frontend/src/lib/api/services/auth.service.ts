import { apiClient } from '../client';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User,
  ApiResponse 
} from '../types';

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (response.token) {
      apiClient.setAuthToken(response.token);
    }
    return response;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);
    if (response.token) {
      apiClient.setAuthToken(response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      apiClient.clearAuth();
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/refresh');
  }

  async getProfile(): Promise<User> {
    return apiClient.get<User>('/auth/profile');
  }

  async googleAuth(): Promise<void> {
    // Redirect to Google OAuth
    window.location.href = `/api/auth/google`;
  }

  async googleCallback(code: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google/callback', { code });
    if (response.token) {
      apiClient.setAuthToken(response.token);
    }
    return response;
  }

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }
}

export const authService = new AuthService();
