'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  fullName?: string;
  role: string;
  provider?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  googleLogin: (data: any) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';

  // Check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If can't parse, consider expired
    }
  };

  // Validate token with server
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      await authService.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Load auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');
      
      if (savedToken && savedUser) {
        // Check if token is expired locally first
        if (isTokenExpired(savedToken)) {
          console.log('Token expired locally, clearing auth state');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setToken(null);
          setUser(null);
        } else {
          // Validate token with server
          const isValid = await validateToken(savedToken);
          if (isValid) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          } else {
            console.log('Token invalid on server, clearing auth state');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setToken(null);
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await authService.login({ username, password });
      setToken(data.access_token);
      setUser(data.user);
      
      // Save to localStorage
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      await authService.register({ username, email, password });
      // Auto login after successful registration
      return await login(username, password);
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const googleLogin = async (data: any): Promise<boolean> => {
    try {
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      return true;
    } catch (error) {
      console.error('Google login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  // Auto logout when token expires
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = () => {
      if (isTokenExpired(token)) {
        console.log('Token expired during session, logging out');
        logout();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiry, 30000);
    
    return () => clearInterval(interval);
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    register,
    googleLogin,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
