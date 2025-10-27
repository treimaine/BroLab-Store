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
 * Simple error handling hook for reservations
 */
export function useReservationErrorHandling(options: UseReservationErrorHandlingOptions) {
  const { maxRetries = 3, showToastOnError = true, onError, onRecovery } = options;
  const { toast } = useToast();

  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleError = useCallback(
    (err: unknown, _context?: string) => {
      setHasError(true);
      setError(err);

      const errorMessage = err instanceof Error ? err.message : String(err);

      if (showToastOnError) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }

      if (onError) {
        const errorForCallback = err instanceof Error ? err : new Error(errorMessage);
        onError(errorForCallback);
      }

      return { retryable: true, message: errorMessage };
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
    setError(null);

    if (onRecovery) {
      onRecovery();
    }

    setIsRecovering(false);
  }, [retryCount, maxRetries, onRecovery]);

  const clearError = useCallback(() => {
    setHasError(false);
    setError(null);
    setRetryCount(0);
  }, []);

  const getErrorDisplay = useCallback(() => {
    if (!error) return null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      message: errorMessage,
      canRetry: retryCount < maxRetries,
      title: "Error",
      userMessage: errorMessage,
      suggestions: [],
      maxRetries,
    };
  }, [error, retryCount, maxRetries]);

  return {
    hasError,
    error,
    retryCount,
    isRecovering,
    handleError,
    retry,
    clearError,
    getErrorDisplay,
    canRetry: retryCount < maxRetries,
  };
}
