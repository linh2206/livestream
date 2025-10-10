'use client';

import { useRouter } from 'next/navigation';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authService } from '../api/services/auth.service';
import { LoginRequest, RegisterRequest, User } from '../api/types';
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
      // ONLY LOCALSTORAGE - simpler and more reliable
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const userData = await authService.getProfile();
      setUser(userData);
    } catch (error: unknown) {
      setUser(null);
      // Clear invalid token from localStorage
      localStorage.removeItem('auth_token');

      // Redirect to login for ALL routes that need auth
      const publicRoutes = ['/login', '/register', '/'];
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : '';
      const isPublicRoute = publicRoutes.some(
        route => currentPath === route || currentPath.startsWith(route)
      );

      // Only redirect on 401 (unauthorized), not 404 (not found)
      if (!isPublicRoute && (error as { response?: { status?: number } }).response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginRequest) => {
    try {
      const { user: userData, token } = await authService.login(credentials);

      // Store token in localStorage
      if (token) {
        localStorage.setItem('auth_token', token);
      }

      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      setUser(null);
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const { user: newUser, token } = await authService.register(userData);

      // Store token in localStorage
      if (token) {
        localStorage.setItem('auth_token', token);
      }

      setUser(newUser);
    } catch (error) {
      // Clear any invalid token on registration failure
      localStorage.removeItem('auth_token');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      showInfo('Logged Out', 'You have been successfully logged out');
    } catch (error) {
    } finally {
      setUser(null);
      // Clear token from localStorage
      localStorage.removeItem('auth_token');
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
