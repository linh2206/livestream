// Error handling utilities for maintainable code

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
}

export const handleApiError = (error: any): ApiError => {
  console.error('API Error:', error);
  
  // Network error
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection.',
      statusCode: 0,
      code: 'NETWORK_ERROR'
    };
  }
  
  // API error with response
  const { response } = error;
  const message = response.data?.message || response.data?.error || 'An unexpected error occurred';
  
  return {
    message,
    statusCode: response.status,
    code: response.data?.code || 'API_ERROR'
  };
};

export const getErrorMessage = (error: any): string => {
  const apiError = handleApiError(error);
  return apiError.message;
};

export const isNetworkError = (error: any): boolean => {
  return !error.response || error.code === 'NETWORK_ERROR';
};

export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401 || error.response?.status === 403;
};

export const isValidationError = (error: any): boolean => {
  return error.response?.status === 400;
};

export const isServerError = (error: any): boolean => {
  return error.response?.status >= 500;
};

// Error logging utility
export const logError = (error: any, context?: string) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: error.message || 'Unknown error',
    stack: error.stack,
    response: error.response?.data
  };
  
  console.error(`[${timestamp}] Error${context ? ` in ${context}` : ''}:`, errorInfo);
};
