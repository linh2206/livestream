import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError } from './types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/v1',
      timeout: 10000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token from cookie if available
        const token = this.getCookie('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access - NEVER redirect, let the app handle it
          this.clearAuthToken();
          console.log('Unauthorized access, clearing token');
        } else if (error.response?.status === 404) {
          // Don't reload on 404, just return the error
          console.warn('Resource not found:', error.config?.url);
        }
        return Promise.reject(error);
      }
    );
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private clearAuthToken() {
    const isProduction = process.env.NODE_ENV === 'production';
    const clearCookieString = `auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax${isProduction ? '; secure' : ''}`;
    document.cookie = clearCookieString;
    console.log('Clearing auth token cookie:', clearCookieString);
  }

  // Generic HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  // Utility methods
  setAuthToken(token: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieString = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax${isProduction ? '; secure' : ''}`;
    document.cookie = cookieString;
    console.log('Setting auth token cookie:', cookieString);
  }

  clearAuth() {
    this.clearAuthToken();
  }

  isAuthenticated(): boolean {
    return !!this.getCookie('auth_token');
  }
}

export const apiClient = new ApiClient();
