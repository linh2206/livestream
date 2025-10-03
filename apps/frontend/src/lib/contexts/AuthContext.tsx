'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../api/services/auth.service';
import { User, LoginRequest, RegisterRequest } from '../api/types';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showInfo } = useToast();
  const router = useRouter();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;
  const isAuthenticated = !!user;

  const checkAuth = useCallback(async () => {
    try {
      // ONLY COOKIE - as requested
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
      
      console.log('🔐 [Auth] Checking auth, token:', token ? 'exists' : 'missing');
      
      if (!token) {
        console.log('🔐 [Auth] No token found');
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      console.log('🔐 [Auth] Token found, fetching profile...');
      const userData = await authService.getProfile();
      console.log('🔐 [Auth] Profile fetched:', userData?.username);
      console.log('🔐 [Auth] Full user data:', userData);
      setUser(userData);
    } catch (error: any) {
      console.log('🔐 [Auth] Auth check failed:', error);
      setUser(null);
      // Clear invalid token
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Redirect to login for ALL routes that need auth
      const publicRoutes = ['/login', '/register', '/'];
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = publicRoutes.some(route => currentPath === route || currentPath.startsWith(route));
      
      if (!isPublicRoute && (error.response?.status === 401 || error.response?.status === 404)) {
        console.log('🔐 [Auth] Token invalid, redirecting to login...');
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const { user: userData, token } = await authService.login(credentials);
      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      console.error('Login failed:', error);
      setUser(null);
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const { user: newUser, token } = await authService.register(userData);
      setUser(newUser);
    } catch (error) {
      console.error('Registration failed:', error);
      // Clear any invalid token on registration failure
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      showInfo('Logged Out', 'You have been successfully logged out');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAdmin,
    isManager,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
