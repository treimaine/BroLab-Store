import { useCallback, useState } from "react";

/**
 * Loading state hook for components
 */
export function useComponentLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<Error | null>(null);

  const withLoading = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    setIsLoading,
    setError,
    withLoading,
  };
}
