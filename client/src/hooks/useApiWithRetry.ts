import { useToast } from "@/hooks/use-toast";
import { addBreadcrumb, errorTracker } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { ApiError, ApiRequestOptions, enhancedApiRequest } from "@/lib/queryClient";
import { useCallback, useState } from "react";

export interface UseApiWithRetryOptions extends ApiRequestOptions {
  showToastOnError?: boolean;
  showToastOnRetry?: boolean;
  customErrorMessages?: Record<number, string>;
  getAuthToken?: () => Promise<string | null>;
}

export interface ApiState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

export function useApiWithRetry(options: UseApiWithRetryOptions = {}) {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    showToastOnError = true,
    showToastOnRetry = false,
    customErrorMessages = {},
    getAuthToken,
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<ApiState>({
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  const makeRequest = useCallback(
    async <T = unknown>(method: string, url: string, data?: unknown): Promise<T> => {
      const requestStartTime = performance.now();

      // Log API request start
      logger.logApiRequest(method, url, {
        component: "api_with_retry",
        requestData: data ? Object.keys(data as Record<string, unknown>) : undefined,
      });

      // Add breadcrumb for API request
      addBreadcrumb({
        category: "api_call",
        message: `API request: ${method} ${url}`,
        level: "info",
        data: { method, url, hasData: !!data },
      });

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        retryCount: 0,
      }));

      try {
        // Get auth token if available
        const authToken = getAuthToken ? await getAuthToken() : null;
        const headers: Record<string, string> = {};

        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        const response = await enhancedApiRequest(method, url, data, {
          retries,
          retryDelay,
          timeout,
          headers,
          // Use "include" to ensure cookies (__session) are sent for Clerk auth
          credentials: "include",
          onRetry: (attempt, error) => {
            setState(prev => ({ ...prev, retryCount: attempt }));

            // Log retry attempt
            logger.logApiError(`API retry attempt ${attempt}`, error, {
              component: "api_with_retry",
              action: "retry_attempt",
              url,
              method,
              retryCount: attempt,
            });

            // Add breadcrumb for retry
            addBreadcrumb({
              category: "api_call",
              message: `API retry attempt ${attempt}: ${method} ${url}`,
              level: "warning",
              data: { method, url, attempt, error: error.message },
            });

            if (showToastOnRetry) {
              toast({
                title: "Retrying Request",
                description: `Attempt ${attempt} of ${retries}. ${error.message}`,
                variant: "default",
              });
            }
          },
        });

        const result = await response.json();
        const requestEndTime = performance.now();
        const responseTime = requestEndTime - requestStartTime;

        // Track successful API performance
        performanceMonitor.trackApiPerformance(url, method, responseTime, response.status);

        // Log successful API request
        logger.logInfo(`API request successful: ${method} ${url}`, {
          component: "api_with_retry",
          responseTime,
          status: response.status,
        });

        // Add success breadcrumb
        addBreadcrumb({
          category: "api_call",
          message: `API request successful: ${method} ${url}`,
          level: "info",
          data: { method, url, responseTime, status: response.status },
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const requestEndTime = performance.now();
        const responseTime = requestEndTime - requestStartTime;
        const apiError = error instanceof ApiError ? error : new Error(String(error));

        // Track failed API performance
        const status = apiError instanceof ApiError ? apiError.status : 0;
        performanceMonitor.trackApiPerformance(url, method, responseTime, status, state.retryCount);

        // Track the error with comprehensive context
        const errorId = errorTracker.trackError(apiError, {
          errorType: "api",
          component: "api_with_retry",
          action: "api_request_failed",
          url,
          method,
          errorCode: status,
          recoverable: status >= 500 || status === 408 || status === 429,
          retryCount: state.retryCount,
          responseTime,
        });

        // Log API error
        logger.logApiError(`API request failed: ${method} ${url}`, apiError, {
          component: "api_with_retry",
          url,
          method,
          status,
          responseTime,
          retryCount: state.retryCount,
          errorId,
        });

        // Add error breadcrumb
        addBreadcrumb({
          category: "api_call",
          message: `API request failed: ${method} ${url}`,
          level: "error",
          data: {
            method,
            url,
            status,
            responseTime,
            retryCount: state.retryCount,
            errorId,
            errorMessage: apiError.message,
          },
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: apiError,
        }));

        if (showToastOnError) {
          const errorMessage =
            apiError instanceof ApiError
              ? customErrorMessages[apiError.status] || getDefaultErrorMessage(apiError.status)
              : apiError.message;

          toast({
            title: "Request Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }

        throw apiError;
      }
    },
    [
      retries,
      retryDelay,
      timeout,
      showToastOnError,
      showToastOnRetry,
      customErrorMessages,
      toast,
      state.retryCount,
      getAuthToken,
    ]
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
    });
  }, []);

  return {
    ...state,
    makeRequest,
    reset,
  };
}

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid request. Please check your input and try again.";
    case 401:
      return "Authentication required. Please sign in and try again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 408:
      return "Request timeout. Please try again.";
    case 409:
      return "Conflict with existing data. Please refresh and try again.";
    case 422:
      return "Invalid data provided. Please check your input.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "Server error. Please try again later.";
    case 502:
      return "Service temporarily unavailable. Please try again.";
    case 503:
      return "Service maintenance in progress. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

// Specialized hook for form submissions with authentication handling
export function useFormSubmissionWithRetry(options: UseApiWithRetryOptions = {}) {
  const apiHook = useApiWithRetry({
    ...options,
    customErrorMessages: {
      401: "Please sign in to submit the form.",
      422: "Please check your form data and try again.",
      ...options.customErrorMessages,
    },
  });

  const submitForm = useCallback(
    async (url: string, formData: unknown, onSuccess?: () => void) => {
      const result = await apiHook.makeRequest("POST", url, formData);

      if (onSuccess) {
        onSuccess();
      }

      return result;
    },
    [apiHook]
  );

  return {
    ...apiHook,
    submitForm,
  };
}
