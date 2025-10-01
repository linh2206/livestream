export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'user';
  provider: 'local' | 'google' | 'facebook';
  isEmailVerified: boolean;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
