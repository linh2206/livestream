import { apiClient } from '../client';
import { 
  User, 
  UpdateUserRequest,
  PaginatedResponse,
  PaginationParams,
  ApiResponse 
} from '../types';

class UserService {
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);

    const url = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get<PaginatedResponse<User>>(url);
  }

  async getUser(id: string): Promise<User> {
    return apiClient.get<User>(`/users/${id}`);
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, data);
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    return apiClient.patch<User>(`/users/${id}/role`, { role });
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  async getOnlineUsers(): Promise<User[]> {
    return apiClient.get<User[]>('/users/online');
  }

  async getUserAnalytics(id: string): Promise<any> {
    return apiClient.get(`/users/${id}/analytics`);
  }

  async searchUsers(query: string): Promise<User[]> {
    return apiClient.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  async createUser(data: {
    username: string;
    email: string;
    fullName: string;
    password: string;
    role?: 'user' | 'admin' | 'manager';
  }): Promise<User> {
    return apiClient.post<User>('/users', data);
  }
}

export const userService = new UserService();

