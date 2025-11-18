/**
 * Configuration Store
 * Zustand store for dashboard configuration with validation and health monitoring
 */

import { getDashboardConfig } from "@/config/dashboard";
import type { ValidationResult } from "@/utils/configValidator";
import { getConfigurationHealth, validateAllConfigurations } from "@/utils/configValidator";
import type { DashboardConfig } from "@shared/types/dashboard";
import { create } from "zustand";

interface ConfigState {
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

  // Error handling
  error: Error | null;
}

interface ConfigActions {
  // Actions
  refreshConfig: () => void;
  validateConfiguration: () => ValidationResult;
  initialize: (options?: {
    onConfigError?: (error: Error) => void;
    onValidationError?: (validation: ValidationResult) => void;
  }) => void;
  setError: (error: Error | null) => void;
}

const initialValidation: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
};

const initialHealth = {
  status: "healthy" as const,
  message: "Configuration is healthy",
};

export const useConfigStore = create<ConfigState & ConfigActions>(set => ({
  // Initial state
  config: getDashboardConfig(),
  isLoading: false,
  isValid: true,
  validation: initialValidation,
  health: initialHealth,
  error: null,

  // Initialize configuration with validation
  initialize: (options = {}) => {
    const { onConfigError, onValidationError } = options;

    set({ isLoading: true, error: null });

    try {
      // Load configuration
      const newConfig = getDashboardConfig();

      // Validate configuration
      const validationResult = validateAllConfigurations({
        checkEnvironment: true,
        logResults: true,
      });

      // Get health status
      const healthStatus = getConfigurationHealth();

      set({
        config: newConfig,
        validation: validationResult,
        isValid: validationResult.isValid,
        health: {
          status: healthStatus.status,
          message: healthStatus.message,
        },
        isLoading: false,
        error: null,
      });

      // Handle validation errors
      if (!validationResult.isValid && onValidationError) {
        onValidationError(validationResult);
      }
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error("Unknown error");
      console.error("Failed to initialize configuration:", errorInstance);

      set({
        isLoading: false,
        error: errorInstance,
      });

      if (onConfigError) {
        onConfigError(errorInstance);
      }
    }
  },

  // Refresh configuration
  refreshConfig: () => {
    try {
      const newConfig = getDashboardConfig();

      const validationResult = validateAllConfigurations({
        checkEnvironment: true,
        logResults: false,
      });

      const healthStatus = getConfigurationHealth();

      set({
        config: newConfig,
        validation: validationResult,
        isValid: validationResult.isValid,
        health: {
          status: healthStatus.status,
          message: healthStatus.message,
        },
        error: null,
      });

      console.log("Configuration refreshed successfully");
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error("Unknown error");
      console.error("Failed to refresh configuration:", errorInstance);

      set({ error: errorInstance });
    }
  },

  // Validate configuration
  validateConfiguration: () => {
    const validationResult = validateAllConfigurations({
      checkEnvironment: true,
      logResults: true,
    });

    const healthStatus = getConfigurationHealth();

    set({
      validation: validationResult,
      isValid: validationResult.isValid,
      health: {
        status: healthStatus.status,
        message: healthStatus.message,
      },
    });

    return validationResult;
  },

  // Set error
  setError: (error: Error | null) => {
    set({ error });
  },
}));

// Selector hooks for specific parts of the config state
export function useConfig(): DashboardConfig {
  return useConfigStore(state => state.config);
}

export function useConfigReady(): boolean {
  return useConfigStore(state => !state.isLoading && state.isValid);
}

export function useConfigValidation(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  health: { status: "healthy" | "warning" | "error"; message: string };
} {
  return useConfigStore(state => ({
    isValid: state.validation.isValid,
    errors: state.validation.errors,
    warnings: state.validation.warnings,
    health: state.health,
  }));
}

export function useConfigActions(): Pick<
  ConfigActions,
  "refreshConfig" | "validateConfiguration" | "initialize"
> {
  return useConfigStore(state => ({
    refreshConfig: state.refreshConfig,
    validateConfiguration: state.validateConfiguration,
    initialize: state.initialize,
  }));
}
