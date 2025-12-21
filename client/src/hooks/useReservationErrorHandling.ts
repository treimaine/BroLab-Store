import { useToast } from "@/hooks/use-toast";
import { useCallback, useState } from "react";

interface UseReservationErrorHandlingOptions {
  serviceName: string;
  maxRetries?: number;
  showToastOnError?: boolean;
  autoRetryTransientErrors?: boolean;
  onError?: (error: unknown) => void;
  onRecovery?: () => void;
}

/**
 * Safely extracts an error message from an unknown error type
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err === "object" && err !== null) {
    const errorObj = err as Record<string, unknown>;
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
    try {
      return JSON.stringify(errorObj);
    } catch {
      return "An unknown error occurred";
    }
  }
  if (err === null || err === undefined) {
    return "An unknown error occurred";
  }
  // For primitives like number, boolean, bigint, symbol
  if (typeof err === "number" || typeof err === "boolean" || typeof err === "bigint") {
    return String(err);
  }
  return "An unknown error occurred";
}

/**
 * Simple error handling hook for reservations
 */
export function useReservationErrorHandling(options: UseReservationErrorHandlingOptions) {
  const { maxRetries = 3, showToastOnError = true, onError, onRecovery } = options;
  const { toast } = useToast();

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleError = useCallback(
    (err: unknown, _context?: string) => {
      setHasError(true);
      const message = getErrorMessage(err);
      setErrorMessage(message);

      if (showToastOnError) {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }

      if (onError) {
        const errorForCallback = err instanceof Error ? err : new Error(message);
        onError(errorForCallback);
      }

      return { retryable: true, message };
    },
    [showToastOnError, toast, onError]
  );

  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setIsRecovering(true);
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setErrorMessage(null);

    if (onRecovery) {
      onRecovery();
    }

    setIsRecovering(false);
  }, [retryCount, maxRetries, onRecovery]);

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage(null);
    setRetryCount(0);
  }, []);

  const getErrorDisplay = useCallback(() => {
    if (!errorMessage) return null;

    return {
      message: errorMessage,
      canRetry: retryCount < maxRetries,
      title: "Error",
      userMessage: errorMessage,
      suggestions: [],
      maxRetries,
    };
  }, [errorMessage, retryCount, maxRetries]);

  return {
    hasError,
    error: errorMessage,
    retryCount,
    isRecovering,
    handleError,
    retry,
    clearError,
    getErrorDisplay,
    canRetry: retryCount < maxRetries,
  };
}
