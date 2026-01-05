/**
 * Convex Visibility Hooks
 *
 * Hooks for accessing Convex visibility state from ConvexVisibilityProvider.
 * Separated from provider component to enable Fast Refresh.
 */

import {
  ConvexVisibilityContext,
  type ConvexVisibilityContextValue,
} from "@/contexts/ConvexVisibilityContext";
import { useContext } from "react";

// Re-export type for convenience
export type { ConvexVisibilityContextValue } from "@/contexts/ConvexVisibilityContext";

/**
 * Hook to access Convex visibility state
 */
export function useConvexVisibility(): ConvexVisibilityContextValue {
  return useContext(ConvexVisibilityContext);
}

/**
 * Hook that returns whether a Convex query should be active
 * Use this to conditionally skip Convex queries when tab is hidden
 */
export function useConvexQueryEnabled(): boolean {
  const { isConvexEnabled } = useConvexVisibility();
  return isConvexEnabled;
}
