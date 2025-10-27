import { useState } from "react";

interface LoadingStateItem {
  loading?: boolean;
  error?: Error | null;
  data?: unknown;
}

/**
 * Simple loading state hook
 */
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingStateItem>>({});

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: { loading } }));
  };

  const setError = (key: string, error: Error | null) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { ...prev[key], error },
    }));
  };

  const setData = (key: string, data: unknown) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { ...prev[key], data },
    }));
  };

  const clearState = (key: string) => {
    setLoadingStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const withLoading = async <T>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      clearOnSuccess?: boolean;
    }
  ): Promise<T> => {
    setLoading(key, true);
    try {
      const result = await operation();
      setData(key, result);
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      if (options?.clearOnSuccess) {
        clearState(key);
      }
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(key, err);
      if (options?.onError) {
        options.onError(err);
      }
      throw err;
    } finally {
      setLoading(key, false);
    }
  };

  const isLoadingAny = () => {
    return Object.values(loadingStates).some((state: LoadingStateItem) => state.loading);
  };

  const hasErrors = () => {
    return Object.values(loadingStates).some((state: LoadingStateItem) => state.error);
  };

  const getLoadingKeys = () => {
    return Object.keys(loadingStates).filter(key => loadingStates[key].loading);
  };

  const getErrorKeys = () => {
    return Object.keys(loadingStates).filter(key => loadingStates[key].error);
  };

  return {
    isLoading,
    setIsLoading,
    startLoading: () => setIsLoading(true),
    stopLoading: () => setIsLoading(false),
    globalLoading: isLoadingAny(),
    loadingStates,
    setLoading,
    setError,
    setData,
    clearState,
    withLoading,
    isLoadingAny,
    hasErrors,
    getLoadingKeys,
    getErrorKeys,
  };
}
