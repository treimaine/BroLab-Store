import { createContext } from "react";

export interface LoadingStateContextType {
  globalLoading: boolean;
  loadingStates: Record<string, unknown>;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: Error | null) => void;
  setData: (key: string, data: unknown) => void;
  clearState: (key: string) => void;
  withLoading: <T>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      clearOnSuccess?: boolean;
    }
  ) => Promise<T>;
  isLoadingAny: () => boolean;
  hasErrors: () => boolean;
  getLoadingKeys: () => string[];
  getErrorKeys: () => string[];
}

export const LoadingStateContext = createContext<LoadingStateContextType | null>(null);
