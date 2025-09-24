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
  console.log('🎯 AuthProvider component rendered');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Set to false by default

  const isAuthenticated = !!user; // Only check user, not token since we use cookie
  const isAdmin = user?.role === 'admin';
  
  console.log('🔍 AuthProvider state:', { user, token, loading, isAuthenticated, isAdmin });

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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      await Promise.race([authService.getProfile(), timeoutPromise]);
      return true;
    } catch (error) {
      console.log('Token validation failed:', error);
      return false;
    }
  };

  // Load auth state from server on mount
  useEffect(() => {
    console.log('🚀 AuthContext useEffect triggered');
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking authentication via cookie...');
        
        // Try to get profile from server (cookie will be sent automatically)
        const userData = await authService.getProfile();
        console.log('✅ User authenticated via cookie:', userData);
        setToken('cookie'); // Dummy token since we use cookie
        setUser(userData);
      } catch (error: any) {
        console.log('❌ No valid session found:', error?.response?.status);
        // If 401, clear any stale cookies by calling logout
        if (error?.response?.status === 401) {
          console.log('🧹 Clearing stale session');
          try {
            await authService.logout();
          } catch (logoutError) {
            console.log('Logout error (expected):', logoutError);
          }
        }
        setToken(null);
        setUser(null);
      } finally {
        console.log('✅ Auth initialization complete');
        setLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('⏰ Auth initialization timeout');
      setLoading(false);
    }, 3000);

    initializeAuth().finally(() => {
      clearTimeout(timeout);
    });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await authService.login({ username, password });
      setToken('cookie'); // Cookie is set by server
      setUser(data.user);
      
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
      setToken('cookie'); // Cookie is set by server
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Google login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      // Force reload to clear any cached state
      window.location.reload();
    }
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
