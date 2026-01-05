/**
 * Convex Visibility Context
 *
 * Context definition for Convex visibility state.
 * Separated from provider component to enable Fast Refresh.
 */

import { createContext } from "react";

/**
 * Context value interface for Convex visibility state
 */
export interface ConvexVisibilityContextValue {
  /** Whether Convex subscriptions should be active */
  isConvexEnabled: boolean;
  /** Whether the tab is currently visible */
  isTabVisible: boolean;
  /** Force enable Convex (bypass visibility check) */
  forceEnable: () => void;
  /** Force disable Convex */
  forceDisable: () => void;
}

const defaultContextValue: ConvexVisibilityContextValue = {
  isConvexEnabled: true,
  isTabVisible: true,
  forceEnable: () => {},
  forceDisable: () => {},
};

export const ConvexVisibilityContext =
  createContext<ConvexVisibilityContextValue>(defaultContextValue);
