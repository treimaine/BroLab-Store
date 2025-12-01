/**
 * Analytics Context Hook
 *
 * Provides access to the analytics context for privacy-compliant tracking.
 * Must be used within an AnalyticsProvider.
 */

import { AnalyticsConfig, PrivacySettings } from "@shared/types/analytics";
import { createContext, useContext } from "react";

export interface AnalyticsContextType {
  isInitialized: boolean;
  isTrackingEnabled: boolean;
  privacySettings: PrivacySettings | null;
  config: AnalyticsConfig | null;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateConfig: (config: Partial<AnalyticsConfig>) => void;
  requestConsent: () => Promise<boolean>;
  revokeConsent: () => Promise<void>;
  showPrivacyBanner: boolean;
  setShowPrivacyBanner: (show: boolean) => void;
}

export const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function useAnalyticsContext(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalyticsContext must be used within an AnalyticsProvider");
  }
  return context;
}
