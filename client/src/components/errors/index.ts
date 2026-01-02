/**
 * Error Handling Module - Consolidated Exports
 *
 * This module provides a unified error boundary system that consolidates
 * 8 separate error boundary implementations into a single configurable component.
 *
 * Migration Guide:
 * - ErrorBoundary -> BaseErrorBoundary with variant="default"
 * - ClerkErrorBoundary -> BaseErrorBoundary with variant="auth"
 * - DashboardErrorBoundary -> BaseErrorBoundary with variant="dashboard"
 * - MixingMasteringErrorBoundary -> BaseErrorBoundary with variant="mixing"
 * - SafeMixingMasteringErrorBoundary -> BaseErrorBoundary with variant="safe-mixing"
 * - ReservationErrorBoundary -> BaseErrorBoundary with variant="reservation"
 */

// ============================================================================
// NEW CONSOLIDATED ERROR BOUNDARY
// ============================================================================
export { BaseErrorBoundary } from "./BaseErrorBoundary";
export type { BaseErrorBoundaryProps } from "./BaseErrorBoundary";
export {
  getErrorBoundaryConfig,
  getErrorMessage,
  getErrorSeverity,
  getErrorType,
  getSeverityStyles,
} from "./errorBoundaryConfig";
export type {
  ErrorBoundaryConfig,
  ErrorBoundaryVariant,
  ErrorSeverity,
} from "./errorBoundaryConfig";

// ============================================================================
// LEGACY EXPORTS - BACKWARD COMPATIBILITY
// These exports maintain compatibility with existing imports.
// They wrap the new BaseErrorBoundary with appropriate variants.
// ============================================================================

// Original ErrorBoundary from ErrorBoundary.tsx (used in App.tsx)
export { ErrorBoundary } from "./ErrorBoundary";

// Enhanced error handling system (Provider + Context)
export { EnhancedErrorProvider } from "./EnhancedErrorHandling";

// ============================================================================
// ERROR CONTEXT & TYPES
// ============================================================================
export { EnvConfigError } from "./EnvConfigError";
export { EnhancedErrorContext } from "./ErrorContext";
export { ErrorType } from "./ErrorTypes";
export type { EnhancedErrorContextType, ErrorInfo } from "./ErrorTypes";

// ============================================================================
// UTILITIES
// ============================================================================
export { validateClerkKeyFormat, validateEnvConfig } from "./envConfigUtils";
export {
  useErrorHandler,
  usePaymentErrorHandler,
  useValidationErrorHandler,
} from "./useErrorHandlers";
