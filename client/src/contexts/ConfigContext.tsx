/**
 * Configuration Context Provider
 * Provides dashboard configuration throughout the React component tree
 */

import { getDashboardConfig } from "@/config/dashboard";
import type { ValidationResult } from "@/utils/configValidator";
import { getConfigurationHealth, validateAllConfigurations } from "@/utils/configValidator";
import type { DashboardConfig } from "@shared/types/dashboard";
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";

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

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export interface ConfigProviderProps {
  children: ReactNode;
  onConfigError?: (error: Error) => void;
  onValidationError?: (validation: ValidationResult) => void;
}

export function ConfigProvider({
  children,
  onConfigError,
  onValidationError,
}: ConfigProviderProps) {
  const [config, setConfig] = useState<DashboardConfig>(() => getDashboardConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  // Initialize configuration
  useEffect(() => {
    try {
      setIsLoading(true);

      // Load configuration
      const newConfig = getDashboardConfig();
      setConfig(newConfig);

      // Validate configuration
      const validationResult = validateAllConfigurations({
        checkEnvironment: true,
        logResults: true,
      });
      setValidation(validationResult);

      // Handle validation errors
      if (!validationResult.isValid && onValidationError) {
        onValidationError(validationResult);
      }
    } catch (error) {
      console.error("Failed to initialize configuration:", error);
      if (onConfigError && error instanceof Error) {
        onConfigError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onConfigError, onValidationError]);

  // Refresh configuration
  const refreshConfig = React.useCallback(() => {
    try {
      const newConfig = getDashboardConfig();
      setConfig(newConfig);

      const validationResult = validateAllConfigurations({
        checkEnvironment: true,
        logResults: false,
      });
      setValidation(validationResult);

      console.log("Configuration refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh configuration:", error);
      if (onConfigError && error instanceof Error) {
        onConfigError(error);
      }
    }
  }, [onConfigError]);

  // Validate configuration
  const validateConfiguration = React.useCallback(() => {
    const validationResult = validateAllConfigurations({
      checkEnvironment: true,
      logResults: true,
    });
    setValidation(validationResult);
    return validationResult;
  }, []);

  // Get health status
  const health = React.useMemo(() => {
    const healthStatus = getConfigurationHealth();
    return {
      status: healthStatus.status,
      message: healthStatus.message,
    };
  }, [validation]);

  const contextValue: ConfigContextValue = {
    config,
    isLoading,
    isValid: validation.isValid,
    validation,
    health,
    refreshConfig,
    validateConfiguration,
  };

  return <ConfigContext.Provider value={contextValue}>{children}</ConfigContext.Provider>;
}

/**
 * Hook to use configuration context
 */
export function useConfigContext(): ConfigContextValue {
  const context = useContext(ConfigContext);

  if (context === undefined) {
    throw new Error("useConfigContext must be used within a ConfigProvider");
  }

  return context;
}

/**
 * Hook to get configuration with error handling
 */
export function useConfig(): DashboardConfig {
  const { config, isLoading, isValid } = useConfigContext();

  if (isLoading) {
    // Return default configuration while loading
    return getDashboardConfig();
  }

  if (!isValid) {
    console.warn("Using configuration with validation errors");
  }

  return config;
}

/**
 * Hook to check if configuration is ready
 */
export function useConfigReady(): boolean {
  const { isLoading, isValid } = useConfigContext();
  return !isLoading && isValid;
}

/**
 * Hook to get configuration validation status
 */
export function useConfigValidation(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  health: { status: "healthy" | "warning" | "error"; message: string };
} {
  const { validation, health } = useConfigContext();

  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    health,
  };
}

/**
 * Higher-order component to provide configuration
 */
export function withConfig<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & { configProviderProps?: Partial<ConfigProviderProps> }> {
  return function WithConfigComponent({ configProviderProps, ...props }) {
    return (
      <ConfigProvider {...configProviderProps}>
        <Component {...(props as P)} />
      </ConfigProvider>
    );
  };
}
