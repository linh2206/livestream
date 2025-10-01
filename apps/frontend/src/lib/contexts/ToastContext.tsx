'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, ToastItem, ToastType } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  showSuccess: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showSuccessReplace: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showError: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showErrorReplace: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showWarning: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showWarningReplace: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showInfo: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showInfoReplace: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  showLoading: (title: string, message?: string, options?: Partial<ToastItem>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
  updateToast: (id: string, updates: Partial<ToastItem>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const MAX_TOASTS = 2; // Giới hạn tối đa 2 notifications

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = {
      id,
      duration: 5000,
      position: 'top-right',
      ...toast,
    };

    setToasts(prev => {
      let updatedToasts = [...prev];
      
      // Nếu có replaceId, loại bỏ notification cũ với ID đó
      if ('replaceId' in toast && toast.replaceId) {
        updatedToasts = updatedToasts.filter(t => t.id !== toast.replaceId);
      }
      
      // Nếu có replaceType, loại bỏ tất cả notifications cùng loại
      if ('replaceType' in toast && toast.replaceType) {
        updatedToasts = updatedToasts.filter(t => t.type !== toast.replaceType);
      }
      
      // Thêm notification mới
      updatedToasts.push(newToast);
      
      // Tự động loại bỏ notification cũ nhất nếu đã đạt giới hạn
      if (updatedToasts.length > MAX_TOASTS) {
        updatedToasts = updatedToasts.slice(-MAX_TOASTS);
      }
      
      return updatedToasts;
    });
  }, []);

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showToast({ 
      type: 'success', 
      title, 
      message, 
      duration: 4000,
      replaceType: 'success', // Mặc định thay thế notification cũ cùng loại
      ...options 
    });
  }, [showToast]);

  // Helper function để thay thế notification cũ cùng loại (alias)
  const showSuccessReplace = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showSuccess(title, message, options);
  }, [showSuccess]);

  const showError = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showToast({ 
      type: 'error', 
      title, 
      message, 
      duration: 6000,
      replaceType: 'error', // Mặc định thay thế notification cũ cùng loại
      ...options 
    });
  }, [showToast]);

  const showErrorReplace = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showError(title, message, options);
  }, [showError]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showToast({ 
      type: 'warning', 
      title, 
      message, 
      duration: 5000,
      replaceType: 'warning', // Mặc định thay thế notification cũ cùng loại
      ...options 
    });
  }, [showToast]);

  const showWarningReplace = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showWarning(title, message, options);
  }, [showWarning]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showToast({ 
      type: 'info', 
      title, 
      message, 
      duration: 4000,
      replaceType: 'info', // Mặc định thay thế notification cũ cùng loại
      ...options 
    });
  }, [showToast]);

  const showInfoReplace = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showInfo(title, message, options);
  }, [showInfo]);

  const showLoading = useCallback((title: string, message?: string, options?: Partial<ToastItem>) => {
    showToast({ 
      type: 'loading', 
      title, 
      message, 
      duration: 0, // Loading toasts don't auto-dismiss
      replaceType: 'loading', // Thay thế loading notification cũ
      ...options 
    });
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastItem>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    showToast,
    showSuccess,
    showSuccessReplace,
    showError,
    showErrorReplace,
    showWarning,
    showWarningReplace,
    showInfo,
    showInfoReplace,
    showLoading,
    removeToast,
    clearAll,
    updateToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
