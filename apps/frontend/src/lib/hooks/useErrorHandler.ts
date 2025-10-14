import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';

export interface SocketError {
  message: string;
  code: string;
  event?: string;
}

export function useErrorHandler() {
  const { showError, showWarning } = useToast();

  const handleSocketError = useCallback(
    (error: SocketError) => {
      const { message, code } = error;

      switch (code) {
        case 'CONNECTION_ERROR':
          showError(
            'Connection Error',
            'Failed to connect to server. Please check your internet connection.',
            {
              replaceType: 'loading',
            }
          );
          break;
        case 'CONNECTION_LIMIT_EXCEEDED':
          showError(
            'Connection Limit',
            'Too many connections. Please try again later.',
            {
              replaceType: 'loading',
            }
          );
          break;
        case 'INVALID_AUTH':
          showError('Authentication Error', 'Please log in again.', {
            replaceType: 'loading',
          });
          break;
        case 'RATE_LIMITED':
          showWarning('Rate Limited', 'Too many requests. Please slow down.', {
            replaceType: 'loading',
          });
          break;
        default:
          showError('Socket Error', message || 'An unexpected error occurred', {
            replaceType: 'loading',
          });
      }
    },
    [showError, showWarning]
  );

  const handleApiError = useCallback(
    (error: unknown) => {
      const errorObj = error as Record<string, unknown>;
      if (errorObj?.response && typeof errorObj.response === 'object') {
        const response = errorObj.response as Record<string, unknown>;
        if (response?.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>;
          if (data?.message) {
            showError('API Error', data.message as string, {
              replaceType: 'loading',
            });
          }
        }
      } else if (errorObj?.message) {
        showError('API Error', errorObj.message as string, {
          replaceType: 'loading',
        });
      } else {
        showError('API Error', 'An unexpected error occurred', {
          replaceType: 'loading',
        });
      }
    },
    [showError]
  );

  const handleNetworkError = useCallback(
    (error: unknown) => {
      const errorObj = error as Record<string, unknown>;
      if (errorObj?.code === 'NETWORK_ERROR') {
        showError('Network Error', 'Please check your internet connection', {
          replaceType: 'loading',
        });
      } else if (
        errorObj?.message &&
        typeof errorObj.message === 'string' &&
        errorObj.message.includes('timeout')
      ) {
        showError('Timeout Error', 'Request timed out. Please try again.', {
          replaceType: 'loading',
        });
      } else {
        showError('Network Error', 'Network connection failed', {
          replaceType: 'loading',
        });
      }
    },
    [showError]
  );

  const handleError = useCallback(
    (error: unknown) => {
      const errorObj = error as Record<string, unknown>;
      if (errorObj?.code && typeof errorObj.code === 'string') {
        // Socket error
        handleSocketError(error as SocketError);
      } else if (errorObj?.response) {
        // API error
        handleApiError(error);
      } else if (
        errorObj?.code === 'NETWORK_ERROR' ||
        (errorObj?.message &&
          typeof errorObj.message === 'string' &&
          errorObj.message.includes('timeout'))
      ) {
        // Network error
        handleNetworkError(error);
      } else {
        // Generic error
        const message =
          (errorObj?.message as string) || 'An unexpected error occurred';
        showError('Error', message, {
          replaceType: 'loading',
        });
      }
    },
    [handleSocketError, handleApiError, handleNetworkError, showError]
  );

  return {
    handleSocketError,
    handleApiError,
    handleNetworkError,
    handleError,
  };
}
