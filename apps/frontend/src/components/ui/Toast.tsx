'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
  show?: boolean;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  action?: {
    label: string;
    onClick: () => void;
  };
  replaceId?: string; // ID của notification cũ cần thay thế
  replaceType?: ToastType; // Loại notification cũ cần thay thế
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const typeStyles = {
  success: {
    container:
      'bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-400/20',
    icon: 'text-emerald-100',
    title: 'text-white',
    message: 'text-emerald-100/90',
    progress: 'bg-emerald-200/30',
  },
  error: {
    container: 'bg-gradient-to-r from-red-500 to-rose-600 border-red-400/20',
    icon: 'text-red-100',
    title: 'text-white',
    message: 'text-red-100/90',
    progress: 'bg-red-200/30',
  },
  warning: {
    container:
      'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400/20',
    icon: 'text-amber-100',
    title: 'text-white',
    message: 'text-amber-100/90',
    progress: 'bg-amber-200/30',
  },
  info: {
    container:
      'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400/20',
    icon: 'text-blue-100',
    title: 'text-white',
    message: 'text-blue-100/90',
    progress: 'bg-blue-200/30',
  },
  loading: {
    container: 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500/20',
    icon: 'text-gray-100',
    title: 'text-white',
    message: 'text-gray-100/90',
    progress: 'bg-gray-200/30',
  },
};

export const Toast: React.FC<ToastProps> = ({
  id: _id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  show = true,
  position = 'top-right',
  action,
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [progress, setProgress] = useState(100);
  const Icon = icons[type];
  const styles = typeStyles[type];

  useEffect(() => {
    if (duration > 0 && type !== 'loading') {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - 100 / (duration / 100);
          if (newProgress <= 0) {
            clearInterval(interval);
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration, onClose, type]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-5 left-4';
      case 'top-center':
        return 'top-5 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-5 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-20 right-4';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed z-50 w-80 md:w-80 sm:w-full transition-all duration-300 ease-in-out',
        getPositionClasses(),
        isVisible
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-full opacity-0 scale-95'
      )}
      style={{
        position: 'fixed',
        zIndex: 9999,
        width: window.innerWidth < 768 ? 'calc(100vw - 32px)' : '320px',
        top: '20px',
        right: window.innerWidth < 768 ? '16px' : '16px',
        left: window.innerWidth < 768 ? '16px' : 'auto',
      }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border shadow-2xl backdrop-blur-sm',
          styles.container
        )}
      >
        {/* Progress bar */}
        {duration > 0 && type !== 'loading' && (
          <div className='absolute top-0 left-0 h-1 w-full bg-black/10'>
            <div
              className={cn(
                'h-full transition-all duration-100 ease-linear',
                styles.progress
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className='p-4'>
          <div className='flex items-start gap-3'>
            <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
              {type === 'loading' ? (
                <Icon className='h-5 w-5 animate-spin' />
              ) : (
                <Icon className='h-5 w-5' />
              )}
            </div>

            <div className='flex-1 min-w-0'>
              <h4
                className={cn(
                  'font-semibold text-sm leading-tight',
                  styles.title
                )}
              >
                {title}
              </h4>
              {message && (
                <p
                  className={cn('text-xs mt-1 leading-relaxed', styles.message)}
                >
                  {message}
                </p>
              )}

              {action && (
                <button
                  onClick={action.onClick}
                  className='mt-2 text-xs font-medium underline hover:no-underline transition-all'
                >
                  {action.label}
                </button>
              )}
            </div>

            <button
              onClick={handleClose}
              className='flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors duration-200'
            >
              <X className='h-4 w-4 text-white/70 hover:text-white' />
            </button>
          </div>
        </div>

        {/* Shine effect */}
        <div className='absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
      </div>
    </div>
  );
};

// Toast Container for managing multiple toasts
export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: ToastProps['position'];
  action?: ToastProps['action'];
  replaceId?: string; // ID của notification cũ cần thay thế
  replaceType?: ToastType; // Loại notification cũ cần thay thế
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  position?: ToastProps['position'];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
  position = 'top-right',
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-5 left-4';
      case 'top-center':
        return 'top-5 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-5 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-20 right-4';
    }
  };

  return (
    <div
      className={cn(
        'fixed z-50 space-y-2 w-80 md:w-80 sm:w-full',
        getPositionClasses()
      )}
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className='transform transition-all duration-300 ease-out'
          style={{
            transform: `translateY(${index * 2}px) scale(${1 - index * 0.02})`,
            zIndex: 1000 - index,
            opacity: 1 - index * 0.05,
          }}
        >
          <Toast
            {...toast}
            position={toast.position || position}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};
