/**
 * Configuration Context Provider (Backward Compatibility Wrapper)
 *
 * This file provides backward compatibility for components using ConfigProvider.
 * The actual state management is now handled by Zustand in useConfigStore.
 *
 * @deprecated Use useConfigStore directly instead of ConfigProvider
 */

import { useConfigStore } from "@/stores/useConfigStore";
import { useEffect } from "react";
import type { ConfigProviderProps } from "./ConfigContextTypes";

/**
 * Configuration Provider Component
 * Initializes the config store and handles callbacks
 */
export function ConfigProvider({
  children,
  onConfigError,
  onValidationError,
}: Readonly<ConfigProviderProps>): JSX.Element {
  const initialize = useConfigStore(state => state.initialize);
  const error = useConfigStore(state => state.error);
  const validation = useConfigStore(state => state.validation);

  // Initialize configuration on mount
  useEffect(() => {
    initialize({ onConfigError, onValidationError });
  }, [initialize, onConfigError, onValidationError]);

  // Handle errors
  useEffect(() => {
    if (error && onConfigError) {
      onConfigError(error);
    }
  }, [error, onConfigError]);

  // Handle validation errors
  useEffect(() => {
    if (!validation.isValid && onValidationError) {
      onValidationError(validation);
    }
  }, [validation, onValidationError]);

  return <>{children}</>;
}
