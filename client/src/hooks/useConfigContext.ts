/**
 * Configuration Context Hook (Backward Compatibility)
 *
 * This hook provides backward compatibility for components using the old ConfigContext.
 * It wraps the new Zustand-based useConfigStore.
 *
 * @deprecated Use useConfigStore, useConfig, or useConfigActions directly instead
 */

import { useConfigStore } from "@/stores/useConfigStore";
import type { ValidationResult } from "@/utils/configValidator";
import type { DashboardConfig } from "@shared/types/dashboard";

export interface ConfigContextValue {
  // Configuration
  config: DashboardConfig;
  isLoading: boolean;
  isValid: boolean;

  // Validation
  validation: ValidationResult;
  health: {
    status: "healthy" | "warning" | "error";
    message: string;
  };

  // Actions
  refreshConfig: () => void;
  validateConfiguration: () => ValidationResult;
}

/**
 * Hook to use configuration context (backward compatibility)
 * @deprecated Use useConfigStore directly instead
 */
export function useConfigContext(): ConfigContextValue {
  const config = useConfigStore(state => state.config);
  const isLoading = useConfigStore(state => state.isLoading);
  const isValid = useConfigStore(state => state.isValid);
  const validation = useConfigStore(state => state.validation);
  const health = useConfigStore(state => state.health);
  const refreshConfig = useConfigStore(state => state.refreshConfig);
  const validateConfiguration = useConfigStore(state => state.validateConfiguration);

  return {
    config,
    isLoading,
    isValid,
    validation,
    health,
    refreshConfig,
    validateConfiguration,
  };
}
