import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
      error?: string;
      details?: unknown;
    };
    status?: number;
  };
  code?: string;
}

interface ErrorConfig {
  title?: string;
  message?: string;
  redirectTo?: string;
  showToast?: boolean;
}

export const useErrorHandler = () => {
  const router = useRouter();
  const { showError } = useToast();

  const handleError = (error: unknown, customConfig?: ErrorConfig) => {
    // eslint-disable-next-line no-console
    console.error('API Error:', error);
    
    const apiError = error as ApiError;
    const config = customConfig || {};
    
    let errorTitle = config.title || 'Error';
    let errorMessage = config.message || 'An unexpected error occurred';
    let shouldRedirect = false;
    let redirectPath = config.redirectTo;
    
    if (apiError.response?.status === 400) {
      errorTitle = 'Validation Error';
      errorMessage = apiError.response.data?.message || 'Please check your input and try again';
    } else if (apiError.response?.status === 401) {
      errorTitle = 'Authentication Required';
      errorMessage = 'Please log in again to continue';
      shouldRedirect = true;
      redirectPath = '/login';
    } else if (apiError.response?.status === 403) {
      errorTitle = 'Access Denied';
      errorMessage = 'You do not have permission to perform this action';
    } else if (apiError.response?.status === 404) {
      errorTitle = 'Not Found';
      errorMessage = apiError.response.data?.message || 'The requested resource was not found';
    } else if (apiError.response?.status === 409) {
      errorTitle = 'Conflict Error';
      errorMessage = apiError.response.data?.message || 'This resource already exists';
    } else if (apiError.response?.status && apiError.response.status >= 500) {
      errorTitle = 'Server Error';
      errorMessage = 'Server is temporarily unavailable. Please try again later';
    } else if (apiError.code === 'NETWORK_ERROR' || !apiError.response) {
      errorTitle = 'Connection Error';
      errorMessage = 'Cannot connect to server. Please check your internet connection';
    } else {
      errorMessage = apiError.response?.data?.message || apiError.message || errorMessage;
    }
    
    // Show error toast if enabled (default: true)
    if (config.showToast !== false) {
      showError(errorTitle, errorMessage);
    }
    
    // Redirect if needed
    if (shouldRedirect && redirectPath) {
      router.push(redirectPath);
    }
    
    return {
      title: errorTitle,
      message: errorMessage,
      status: apiError.response?.status,
      shouldRedirect,
      redirectPath,
    };
  };

  const handleStreamError = (error: unknown) => {
    return handleError(error, {
      title: 'Stream Error',
      message: 'Failed to process stream request'
    });
  };

  const handleAuthError = (error: unknown) => {
    return handleError(error, {
      title: 'Authentication Error',
      message: 'Please log in again',
      redirectTo: '/login'
    });
  };

  const handleValidationError = (error: unknown) => {
    return handleError(error, {
      title: 'Validation Error',
      message: 'Please check your input and try again'
    });
  };

  return {
    handleError,
    handleStreamError,
    handleAuthError,
    handleValidationError
  };
};
