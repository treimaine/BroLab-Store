/**
 * Loading State Provider
 * Provides centralized loading state management across the application
 */

import { LoadingStateContext } from "@/contexts/LoadingStateContext";
import { useLoadingState } from "@/hooks/useLoadingState";
import { useLoadingStateContext } from "@/hooks/useLoadingStateContext";
import { ReactNode } from "react";

interface LoadingStateProviderProps {
  readonly children: ReactNode;
}

function LoadingStateProviderComponent({ children }: Readonly<LoadingStateProviderProps>) {
  const loadingManager = useLoadingState();

  return (
    <LoadingStateContext.Provider value={loadingManager}>{children}</LoadingStateContext.Provider>
  );
}

export const LoadingStateProvider = LoadingStateProviderComponent;

// Global loading indicator component
export function GlobalLoadingIndicator(): JSX.Element | null {
  const { globalLoading, getLoadingKeys } = useLoadingStateContext();

  if (!globalLoading) {
    return null;
  }

  const loadingKeys = getLoadingKeys();

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-1">
        <div className="h-full bg-white/30 animate-pulse" />
      </div>
      <div className="bg-black/80 text-white text-xs px-4 py-2 text-center">
        Loading {loadingKeys.length > 1 ? `${loadingKeys.length} operations` : loadingKeys[0]}...
      </div>
    </div>
  );
}

// Error boundary for loading states
export function LoadingErrorBoundary({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const { hasErrors, getErrorKeys, clearState } = useLoadingStateContext();

  if (!hasErrors()) {
    return <>{children}</>;
  }

  const errorKeys = getErrorKeys();

  return (
    <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
      <h3 className="text-red-300 font-medium mb-2">Loading Errors</h3>
      <div className="space-y-2">
        {errorKeys.map(key => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-red-200">Failed to load: {key}</span>
            <button
              onClick={() => clearState(key)}
              className="text-red-400 hover:text-red-300 underline"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
