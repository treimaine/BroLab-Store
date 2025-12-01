import React from "react";
import { EnhancedErrorContext } from "./ErrorContext";
import type { EnhancedErrorContextType } from "./ErrorTypes";
import { ErrorType } from "./ErrorTypes";

export const useErrorHandler = (): EnhancedErrorContextType => {
  const context = React.useContext(EnhancedErrorContext);
  if (!context) {
    throw new Error("useErrorHandler must be used within EnhancedErrorProvider");
  }
  return context;
};

// Payment Error Handler
export const usePaymentErrorHandler = (): { handlePaymentError: (error: unknown) => void } => {
  const { addError } = useErrorHandler();

  const handlePaymentError = (error: unknown): void => {
    // Type guard for error object
    const isErrorObject = (
      err: unknown
    ): err is { type?: string; message?: string; code?: string } => {
      return typeof err === "object" && err !== null;
    };

    addError({
      type: ErrorType.PAYMENT,
      message: "Payment failed",
      details: isErrorObject(error) ? error.message : undefined,
      retry: () => globalThis.location.reload(),
      actionLabel: "Refresh Page",
      timestamp: new Date(),
    });
  };

  return { handlePaymentError };
};

// Validation Error Handler
export const useValidationErrorHandler = (): { handleValidationError: () => void } => {
  const { addError } = useErrorHandler();

  const handleValidationError = (): void => {
    addError({
      type: ErrorType.VALIDATION,
      message: "Validation error",
      details: "Please correct the highlighted field and try again",
      timestamp: new Date(),
    });
  };

  return { handleValidationError };
};
