/**
 * Configuration Context Exports
 * Re-exports for backward compatibility
 */

// Re-export types
export type { ConfigContextValue } from "@/hooks/useConfigContext";
export type { ConfigProviderProps } from "./ConfigContextTypes";

// Re-export hooks
export { useConfigContext } from "@/hooks/useConfigContext";
export { useConfig, useConfigReady, useConfigValidation } from "@/stores/useConfigStore";
