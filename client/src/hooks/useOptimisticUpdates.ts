/**
 * Optimistic Updates Hooks
 *
 * Custom hooks for accessing optimistic updates context.
 * Separated from provider for Fast Refresh compatibility.
 */

import type { OptimisticUpdateManager } from "@/services/OptimisticUpdateManager";
import { createContext, useContext } from "react";

export interface OptimisticUpdatesContextValue {
  manager: OptimisticUpdateManager | null;
  isReady: boolean;
}

// Context for provider usage
export const OptimisticUpdatesContext = createContext<OptimisticUpdatesContextValue>({
  manager: null,
  isReady: false,
});

/**
 * Hook to access the optimistic updates context
 */
export const useOptimisticUpdatesContext = (): OptimisticUpdatesContextValue => {
  const context = useContext(OptimisticUpdatesContext);
  if (!context) {
    throw new Error("useOptimisticUpdatesContext must be used within OptimisticUpdatesProvider");
  }
  return context;
};

/**
 * Hook to check if optimistic updates are ready
 */
export const useOptimisticUpdatesReady = (): boolean => {
  const { isReady } = useOptimisticUpdatesContext();
  return isReady;
};
