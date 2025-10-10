import { useCallback, useState } from 'react';
import { useErrorHandler } from './useErrorHandler';

interface UseApiCallOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
  showErrorToast?: boolean;
}

/**
 * Hook tối ưu cho API calls với error handling tự động
 * Không overwrite logic của component, chỉ cung cấp utilities
 */
export const useApiCall = (options: UseApiCallOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  const {
    onSuccess: _onSuccess,
    onError: _onError,
    showErrorToast = true,
  } = options;

  const execute = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      customOptions?: Partial<UseApiCallOptions>
    ): Promise<T | null> => {
      const finalOptions = { ...options, ...customOptions };

      setLoading(true);
      setError(null);

      try {
        const result = await apiCall();

        if (finalOptions.onSuccess) {
          finalOptions.onSuccess(result);
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);

        if (showErrorToast) {
          handleError(err);
        }

        if (finalOptions.onError) {
          finalOptions.onError(err);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError, showErrorToast, options]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    clearError,
  };
};
