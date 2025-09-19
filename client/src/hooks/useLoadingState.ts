/**
 * Centralized loading state management hook
 * Provides consistent loading state handling across the application
 */

import { useCallback, useRef, useState } from "react";

interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  data: any;
}

interface LoadingStateManager {
  // Global loading states
  globalLoading: boolean;
  loadingStates: Record<string, LoadingState>;

  // State management
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: Error | null) => void;
  setData: (key: string, data: any) => void;
  clearState: (key: string) => void;

  // Async operation wrapper
  withLoading: <T>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      clearOnSuccess?: boolean;
    }
  ) => Promise<T>;

  // Convenience methods
  isLoadingAny: () => boolean;
  hasErrors: () => boolean;
  getLoadingKeys: () => string[];
  getErrorKeys: () => string[];
}

export function useLoadingState(): LoadingStateManager {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});
  const operationsRef = useRef<Set<string>>(new Set());

  // Set loading state for a specific key
  const setLoading = useCallback((key: string, loading: boolean) => {
    if (loading) {
      operationsRef.current.add(key);
    } else {
      operationsRef.current.delete(key);
    }

    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: loading,
        error: loading ? null : prev[key]?.error || null,
        data: prev[key]?.data || null,
      },
    }));
  }, []);

  // Set error state for a specific key
  const setError = useCallback((key: string, error: Error | null) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        error,
        data: prev[key]?.data || null,
      },
    }));

    if (error) {
      operationsRef.current.delete(key);
    }
  }, []);

  // Set data for a specific key
  const setData = useCallback((key: string, data: any) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        error: null,
        data,
      },
    }));
  }, []);

  // Clear state for a specific key
  const clearState = useCallback((key: string) => {
    operationsRef.current.delete(key);
    setLoadingStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  // Wrap async operations with loading state management
  const withLoading = useCallback(
    async <T>(
      key: string,
      operation: () => Promise<T>,
      options: {
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
        clearOnSuccess?: boolean;
      } = {}
    ): Promise<T> => {
      const { onSuccess, onError, clearOnSuccess = false } = options;

      try {
        setLoading(key, true);
        const result = await operation();

        if (clearOnSuccess) {
          clearState(key);
        } else {
          setData(key, result);
        }

        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setError(key, errorObj);
        onError?.(errorObj);
        throw errorObj;
      }
    },
    [setLoading, setData, setError, clearState]
  );

  // Check if any operation is loading
  const isLoadingAny = useCallback(() => {
    return operationsRef.current.size > 0;
  }, []);

  // Check if there are any errors
  const hasErrors = useCallback(() => {
    return Object.values(loadingStates).some(state => state.error !== null);
  }, [loadingStates]);

  // Get keys of currently loading operations
  const getLoadingKeys = useCallback(() => {
    return Array.from(operationsRef.current);
  }, []);

  // Get keys of operations with errors
  const getErrorKeys = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([, state]) => state.error !== null)
      .map(([key]) => key);
  }, [loadingStates]);

  // Calculate global loading state
  const globalLoading = operationsRef.current.size > 0;

  return {
    globalLoading,
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

// Hook for specific loading operations
export function useAsyncOperation<T>(
  key: string,
  operation: () => Promise<T>,
  dependencies: any[] = []
) {
  const loadingManager = useLoadingState();
  const [result, setResult] = useState<T | null>(null);

  const execute = useCallback(async () => {
    try {
      const data = await loadingManager.withLoading(key, operation);
      setResult(data);
      return data;
    } catch (error) {
      setResult(null);
      throw error;
    }
  }, [key, operation, loadingManager, ...dependencies]);

  const state = loadingManager.loadingStates[key] || {
    isLoading: false,
    error: null,
    data: null,
  };

  return {
    ...state,
    result,
    execute,
    clear: () => loadingManager.clearState(key),
  };
}

// Hook for loading state of multiple operations
export function useMultipleLoadingStates(keys: string[]) {
  const loadingManager = useLoadingState();

  const states = keys.reduce(
    (acc, key) => {
      acc[key] = loadingManager.loadingStates[key] || {
        isLoading: false,
        error: null,
        data: null,
      };
      return acc;
    },
    {} as Record<string, LoadingState>
  );

  const isAnyLoading = keys.some(key => states[key].isLoading);
  const hasAnyError = keys.some(key => states[key].error !== null);
  const allCompleted = keys.every(key => !states[key].isLoading && states[key].data !== null);

  return {
    states,
    isAnyLoading,
    hasAnyError,
    allCompleted,
    loadingManager,
  };
}
