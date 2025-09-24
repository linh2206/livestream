'use client';

import { useAuth } from '../contexts/AuthContext';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export const useApi = () => {
  const { token, logout } = useAuth();

  const apiCall = async (url: string, options: ApiOptions = {}) => {
    const { requireAuth = true, ...fetchOptions } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (requireAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Auto logout on 401 Unauthorized
      if (response.status === 401) {
        console.log('Received 401, logging out user');
        logout();
        throw new Error('Session expired. Please login again.');
      }

      return response;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  return { apiCall };
};
