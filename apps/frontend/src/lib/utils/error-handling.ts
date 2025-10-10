// Error handling utilities for maintainable code

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
}

export const handleApiError = (error: unknown): ApiError => {
  // eslint-disable-next-line no-console
  console.error('API Error:', error);

  // Network error
  if (!(error as { response?: unknown }).response) {
    return {
      message: 'Network error. Please check your connection.',
      statusCode: 0,
      code: 'NETWORK_ERROR',
    };
  }

  // API error with response
  const response = (
    error as {
      response: {
        data?: { message?: string; error?: string; code?: string };
        status: number;
      };
    }
  ).response;
  const message =
    response.data?.message ||
    response.data?.error ||
    'An unexpected error occurred';

  return {
    message,
    statusCode: response.status,
    code: response.data?.code || 'API_ERROR',
  };
};

export const getErrorMessage = (error: unknown): string => {
  const apiError = handleApiError(error);
  return apiError.message;
};

export const isNetworkError = (error: unknown): boolean => {
  return (
    !(error as { response?: unknown; code?: string }).response ||
    (error as { code?: string }).code === 'NETWORK_ERROR'
  );
};

export const isAuthError = (error: unknown): boolean => {
  return (
    (error as { response?: { status?: number } }).response?.status === 401 ||
    (error as { response?: { status?: number } }).response?.status === 403
  );
};

export const isValidationError = (error: unknown): boolean => {
  return (error as { response?: { status?: number } }).response?.status === 400;
};

export const isServerError = (error: unknown): boolean => {
  return (
    ((error as { response?: { status?: number } }).response?.status || 0) >= 500
  );
};

// Error logging utility
export const logError = (error: unknown, context?: string) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: (error as { message?: string }).message || 'Unknown error',
    stack: (error as { stack?: string }).stack,
    response: (error as { response?: { data?: unknown } }).response?.data,
  };

  // eslint-disable-next-line no-console
  console.error(
    `[${timestamp}] Error${context ? ` in ${context}` : ''}:`,
    errorInfo
  );
};
