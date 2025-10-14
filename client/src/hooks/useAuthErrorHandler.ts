import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useState } from "react";

interface AuthErrorState {
  hasAuthError: boolean;
  authErrorMessage: string | null;
  isAuthLoading: boolean;
}

interface AuthErrorHandlerOptions {
  onAuthError?: (error: Error) => void;
  showToast?: boolean;
  logErrors?: boolean;
}

/**
 * Hook for handling authentication errors gracefully without blocking page rendering
 * Implements requirements 1.1, 1.3, 4.1, 4.3 from the mixing-mastering-access-fix spec
 */
export function useAuthErrorHandler(options: AuthErrorHandlerOptions = {}) {
  const { onAuthError, showToast = true, logErrors = true } = options;
  const { toast } = useToast();

  const [authErrorState, setAuthErrorState] = useState<AuthErrorState>({
    hasAuthError: false,
    authErrorMessage: null,
    isAuthLoading: false,
  });

  // Handle authentication errors gracefully
  const handleAuthError = useCallback(
    (error: Error, context?: string) => {
      const errorMessage = getAuthErrorMessage(error);

      if (logErrors) {
        console.error(`Authentication error in ${context || "component"}:`, {
          error: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          page: "mixing-mastering",
        });
      }

      setAuthErrorState({
        hasAuthError: true,
        authErrorMessage: errorMessage,
        isAuthLoading: false,
      });

      // Show user-friendly toast notification
      if (showToast) {
        toast({
          title: "Authentication Notice",
          description: errorMessage,
          variant: "default", // Not destructive since this is expected behavior
        });
      }

      // Call custom error handler if provided
      onAuthError?.(error);
    },
    [onAuthError, showToast, logErrors, toast]
  );

  // Handle authentication loading states
  const setAuthLoading = useCallback((loading: boolean) => {
    setAuthErrorState(prev => ({
      ...prev,
      isAuthLoading: loading,
    }));
  }, []);

  // Clear authentication errors
  const clearAuthError = useCallback(() => {
    setAuthErrorState({
      hasAuthError: false,
      authErrorMessage: null,
      isAuthLoading: false,
    });
  }, []);

  // Handle network errors that might affect authentication
  const handleNetworkError = useCallback(
    (error: Error, context?: string) => {
      if (logErrors) {
        console.error(`Network error in ${context || "component"}:`, {
          error: error.message,
          context,
          timestamp: new Date().toISOString(),
          page: "mixing-mastering",
        });
      }

      if (showToast) {
        toast({
          title: "Connection Issue",
          description:
            "Having trouble connecting. Please check your internet connection and try again.",
          variant: "destructive",
        });
      }
    },
    [logErrors, showToast, toast]
  );

  // Handle API errors with proper context
  const handleApiError = useCallback(
    (error: Error, context?: string) => {
      const isAuthError = isAuthenticationError(error);

      if (isAuthError) {
        handleAuthError(error, context);
        return "authentication";
      }

      const isNetworkError = isNetworkRelatedError(error);
      if (isNetworkError) {
        handleNetworkError(error, context);
        return "network";
      }

      // Generic API error
      if (logErrors) {
        console.error(`API error in ${context || "component"}:`, {
          error: error.message,
          context,
          timestamp: new Date().toISOString(),
          page: "mixing-mastering",
        });
      }

      if (showToast) {
        toast({
          title: "Request Failed",
          description: getApiErrorMessage(error),
          variant: "destructive",
        });
      }

      return "api";
    },
    [handleAuthError, handleNetworkError, logErrors, showToast, toast]
  );

  // Wrapper for async operations that might fail due to auth issues
  const withAuthErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>, context?: string): Promise<T | null> => {
      try {
        setAuthLoading(true);
        const result = await operation();
        clearAuthError(); // Clear any previous errors on success
        return result;
      } catch (error) {
        const errorType = handleApiError(error as Error, context);

        // For authentication errors, return null instead of throwing
        // This allows the component to continue rendering
        if (errorType === "authentication") {
          return null;
        }

        // For other errors, re-throw to let the component handle them
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [handleApiError, clearAuthError, setAuthLoading]
  );

  // Effect to handle global authentication state changes
  useEffect(() => {
    const handleGlobalAuthError = (event: CustomEvent) => {
      handleAuthError(new Error(event.detail.message), "global");
    };

    // Listen for global auth errors
    window.addEventListener("auth-error", handleGlobalAuthError as EventListener);

    return () => {
      window.removeEventListener("auth-error", handleGlobalAuthError as EventListener);
    };
  }, [handleAuthError]);

  return {
    // State
    ...authErrorState,

    // Handlers
    handleAuthError,
    handleNetworkError,
    handleApiError,
    clearAuthError,
    setAuthLoading,

    // Utilities
    withAuthErrorHandling,
  };
}

// Helper functions for error classification
function isAuthenticationError(error: Error): boolean {
  const authKeywords = ["auth", "authentication", "clerk", "unauthorized", "401"];
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  return authKeywords.some(
    keyword => errorMessage.includes(keyword) || errorName.includes(keyword)
  );
}

function isNetworkRelatedError(error: Error): boolean {
  const networkKeywords = ["network", "fetch", "connection", "timeout", "offline"];
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  return networkKeywords.some(
    keyword => errorMessage.includes(keyword) || errorName.includes(keyword)
  );
}

function getAuthErrorMessage(error: Error): string {
  if (error.message.includes("401") || error.message.includes("unauthorized")) {
    return "Please sign in to access this feature. You can still browse our services without signing in.";
  }

  if (error.message.includes("clerk")) {
    return "Authentication service is temporarily unavailable. You can still view our services.";
  }

  return "Authentication is required for this action. Sign in to continue or browse our services as a guest.";
}

function getApiErrorMessage(error: Error): string {
  if (error.message.includes("400")) {
    return "Please check your information and try again.";
  }

  if (error.message.includes("500")) {
    return "Our servers are experiencing issues. Please try again in a moment.";
  }

  if (error.message.includes("timeout")) {
    return "Request timed out. Please check your connection and try again.";
  }

  return "Something went wrong. Please try again later.";
}

// Utility function to emit global auth errors
export function emitAuthError(message: string) {
  const event = new CustomEvent("auth-error", { detail: { message } });
  window.dispatchEvent(event);
}
