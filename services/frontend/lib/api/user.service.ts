import { apiClient } from './client';

export interface User {
  _id: string;
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

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  avatar?: string;
  role?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  fullName?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
}

export class UserService {
  /**
   * Get all users (Admin only)
   */
  async getUsers(): Promise<User[]> {
    return apiClient.get<User[]>('/users');
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User> {
    return apiClient.get<User>(`/users/${id}`);
  }

  /**
   * Create new user (Admin only)
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    return apiClient.post<User>('/users', userData);
  }

  /**
   * Update user (Admin only)
   */
  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, userData);
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(id: string): Promise<void> {
    return apiClient.delete<void>(`/users/${id}`);
  }

  /**
   * Update user status (Admin only)
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, { isActive });
  }

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(id: string, role: string): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, { role });
  }
}

// Export singleton instance
export const userService = new UserService();
