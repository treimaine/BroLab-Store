import { useToast } from "@/hooks/use-toast";
import { addBreadcrumb } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";
import { performanceMonitor, startTimer } from "@/lib/performanceMonitor";
import { useAuth } from "@clerk/clerk-react";
import { useCallback, useState } from "react";

export interface FormSubmissionState {
  isSubmitting: boolean;
  isValidating: boolean;
  currentStep: number;
  totalSteps: number;
  progress: number;
  lastSubmissionTime?: number;
}

export interface SubmissionStep {
  name: string;
  description: string;
  action: () => Promise<unknown>;
  canRetry?: boolean;
  timeout?: number;
}

export interface UseEnhancedFormSubmissionOptions {
  serviceName: string;
  maxRetries?: number;
  showProgressToast?: boolean;
  autoRetryTransientErrors?: boolean;
  onStepComplete?: (step: number, result: unknown) => void;
  onSubmissionComplete?: (result: unknown) => void;
  onSubmissionError?: (error: unknown) => void;
}

// Helper function to extract error message safely
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return "An unexpected error occurred";
}

// Helper function to convert unknown error to Error instance
function toError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }
  return new Error(getErrorMessage(err));
}

/**
 * Enhanced form submission hook with comprehensive error handling,
 * progress tracking, and retry mechanisms for reservation forms
 */
export function useEnhancedFormSubmission(options: UseEnhancedFormSubmissionOptions) {
  const {
    serviceName,
    maxRetries = 3,
    showProgressToast = true,
    onStepComplete,
    onSubmissionComplete,
    onSubmissionError,
  } = options;

  const { toast } = useToast();
  const { getToken } = useAuth();

  const [state, setState] = useState<FormSubmissionState>({
    isSubmitting: false,
    isValidating: false,
    currentStep: 0,
    totalSteps: 0,
    progress: 0,
  });

  // Inline error handling state
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  // Handle errors with toast notifications
  const handleError = useCallback(
    (err: unknown, context?: string) => {
      setHasError(true);
      setError(err);

      const errorMessage = getErrorMessage(err);
      const contextSuffix = context ? ` (${context})` : "";
      const logMessage = `Error in ${serviceName}${contextSuffix}`;
      const errorForLog = toError(err);

      logger.logError(logMessage, errorForLog, {
        errorType: "api",
        component: "enhanced_form_submission",
        serviceName,
        context,
      });

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      if (onSubmissionError) {
        onSubmissionError(err);
      }

      return { canRetry: true, message: errorMessage };
    },
    [serviceName, toast, onSubmissionError]
  );

  // Retry function
  const retry = useCallback(async () => {
    setIsRecovering(true);
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setError(null);

    // Reset submission state on recovery
    setState(prev => ({
      ...prev,
      currentStep: 0,
      progress: 0,
    }));

    setIsRecovering(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setHasError(false);
    setError(null);
    setRetryCount(0);
  }, []);

  // Get error display message
  const getErrorDisplay = useCallback(() => {
    if (!error) return null;
    return {
      message: getErrorMessage(error),
      canRetry: retryCount < maxRetries,
    };
  }, [error, retryCount, maxRetries]);

  /**
   * Log and track step start
   */
  const logStepStart = useCallback(
    (step: SubmissionStep, stepIndex: number, totalSteps: number): void => {
      logger.logInfo(`Starting submission step: ${step.name}`, {
        component: "enhanced_form_submission",
        action: "step_start",
        serviceName,
        stepIndex,
        stepName: step.name,
        totalSteps,
      });

      addBreadcrumb({
        category: "user_action",
        message: `Starting submission step: ${step.name}`,
        level: "info",
        data: { serviceName, stepIndex, stepName: step.name, totalSteps },
      });
    },
    [serviceName]
  );

  /**
   * Log and track step completion
   */
  const logStepComplete = useCallback(
    (step: SubmissionStep, stepIndex: number, stepTime: number): void => {
      logger.logInfo(`Completed submission step: ${step.name}`, {
        component: "enhanced_form_submission",
        action: "step_complete",
        serviceName,
        stepIndex,
        stepName: step.name,
        stepTime,
      });

      addBreadcrumb({
        category: "user_action",
        message: `Completed submission step: ${step.name}`,
        level: "info",
        data: { serviceName, stepIndex, stepName: step.name, stepTime },
      });

      performanceMonitor.recordMetric(`${serviceName}_step_${stepIndex}_time`, stepTime, "ms", {
        component: "enhanced_form_submission",
        serviceName,
        stepName: step.name,
      });
    },
    [serviceName]
  );

  /**
   * Log and track step error
   */
  const logStepError = useCallback(
    (step: SubmissionStep, stepIndex: number, stepTime: number, err: unknown): void => {
      logger.logError(`Failed submission step: ${step.name}`, err, {
        errorType: "api",
        component: "enhanced_form_submission",
        action: "step_error",
        serviceName,
        stepIndex,
        stepName: step.name,
        stepTime,
      });

      addBreadcrumb({
        category: "error",
        message: `Failed submission step: ${step.name}`,
        level: "error",
        data: {
          serviceName,
          stepIndex,
          stepName: step.name,
          stepTime,
          errorMessage: getErrorMessage(err),
        },
      });

      performanceMonitor.recordMetric(
        `${serviceName}_step_${stepIndex}_error_time`,
        stepTime,
        "ms",
        {
          component: "enhanced_form_submission",
          serviceName,
          stepName: step.name,
          errorType: err instanceof Error ? err.name : "unknown",
        }
      );
    },
    [serviceName]
  );

  /**
   * Execute step action with timeout
   */
  const executeStepWithTimeout = useCallback(async (step: SubmissionStep): Promise<unknown> => {
    const timeoutMs = step.timeout ?? 30000;
    const stepPromise = step.action();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Step "${step.name}" timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    });

    return Promise.race([stepPromise, timeoutPromise]);
  }, []);

  /**
   * Execute a single submission step with error handling and timeout
   */
  const executeStep = useCallback(
    async (step: SubmissionStep, stepIndex: number, totalSteps: number): Promise<unknown> => {
      const stepTimer = startTimer(`${serviceName}_step_${stepIndex}`);

      try {
        logStepStart(step, stepIndex, totalSteps);

        setState(prev => ({
          ...prev,
          currentStep: stepIndex + 1,
          progress: Math.round(((stepIndex + 0.5) / totalSteps) * 100),
        }));

        const result = await executeStepWithTimeout(step);
        const stepTime = stepTimer();

        logStepComplete(step, stepIndex, stepTime);

        setState(prev => ({
          ...prev,
          progress: Math.round(((stepIndex + 1) / totalSteps) * 100),
        }));

        if (onStepComplete) {
          onStepComplete(stepIndex, result);
        }

        return result;
      } catch (err) {
        const stepTime = stepTimer();
        logStepError(step, stepIndex, stepTime, err);
        throw err;
      }
    },
    [
      serviceName,
      onStepComplete,
      logStepStart,
      logStepComplete,
      logStepError,
      executeStepWithTimeout,
    ]
  );

  /**
   * Log submission start
   */
  const logSubmissionStart = useCallback(
    (steps: SubmissionStep[]): void => {
      logger.logInfo(`Starting form submission for ${serviceName}`, {
        component: "enhanced_form_submission",
        action: "submission_start",
        serviceName,
        totalSteps: steps.length,
        stepNames: steps.map(s => s.name),
      });

      addBreadcrumb({
        category: "user_action",
        message: `Starting form submission for ${serviceName}`,
        level: "info",
        data: {
          serviceName,
          totalSteps: steps.length,
          stepNames: steps.map(s => s.name),
        },
      });
    },
    [serviceName]
  );

  /**
   * Log submission success
   */
  const logSubmissionSuccess = useCallback(
    (submissionTime: number, totalSteps: number): void => {
      logger.logInfo(`Form submission completed successfully for ${serviceName}`, {
        component: "enhanced_form_submission",
        action: "submission_success",
        serviceName,
        submissionTime,
        totalSteps,
      });

      addBreadcrumb({
        category: "user_action",
        message: `Form submission completed successfully for ${serviceName}`,
        level: "info",
        data: { serviceName, submissionTime, totalSteps },
      });

      performanceMonitor.recordMetric(`${serviceName}_submission_success`, submissionTime, "ms", {
        component: "enhanced_form_submission",
        serviceName,
        totalSteps,
      });
    },
    [serviceName]
  );

  /**
   * Log submission error
   */
  const logSubmissionError = useCallback(
    (err: unknown, submissionTime: number, currentStep: number, totalSteps: number): void => {
      logger.logError(`Form submission failed for ${serviceName}`, err, {
        errorType: "api",
        component: "enhanced_form_submission",
        action: "submission_error",
        serviceName,
        submissionTime,
        currentStep,
        totalSteps,
      });

      addBreadcrumb({
        category: "error",
        message: `Form submission failed for ${serviceName}`,
        level: "error",
        data: {
          serviceName,
          submissionTime,
          currentStep,
          totalSteps,
          errorMessage: getErrorMessage(err),
        },
      });

      performanceMonitor.recordMetric(`${serviceName}_submission_error`, submissionTime, "ms", {
        component: "enhanced_form_submission",
        serviceName,
        errorType: err instanceof Error ? err.name : "unknown",
        currentStep,
      });
    },
    [serviceName]
  );

  /**
   * Execute step with retry logic
   */
  const executeStepWithRetry = useCallback(
    async (step: SubmissionStep, stepIndex: number, totalSteps: number): Promise<unknown> => {
      try {
        return await executeStep(step, stepIndex, totalSteps);
      } catch (stepError) {
        const categorizedError = handleError(stepError, `step_${stepIndex}_${step.name}`);
        const canRetryStep =
          step.canRetry !== false && categorizedError.canRetry && retryCount < maxRetries;

        if (!canRetryStep) {
          throw stepError;
        }

        logger.logInfo(`Retrying failed step: ${step.name}`, {
          component: "enhanced_form_submission",
          action: "step_retry",
          serviceName,
          stepIndex,
          stepName: step.name,
          retryCount: retryCount + 1,
        });

        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));

        try {
          return await executeStep(step, stepIndex, totalSteps);
        } catch (retryError) {
          handleError(retryError, `step_${stepIndex}_${step.name}_retry`);
          throw retryError;
        }
      }
    },
    [executeStep, handleError, retryCount, maxRetries, serviceName]
  );

  /**
   * Submit form with multi-step process and comprehensive error handling
   */
  const submitForm = useCallback(
    async (steps: SubmissionStep[]): Promise<unknown> => {
      if (state.isSubmitting) {
        logger.logWarning("Form submission already in progress", {
          component: "enhanced_form_submission",
          action: "submit_blocked",
          serviceName,
        });
        return;
      }

      const submissionTimer = startTimer(`${serviceName}_full_submission`);
      clearError();

      setState(prev => ({
        ...prev,
        isSubmitting: true,
        currentStep: 0,
        totalSteps: steps.length,
        progress: 0,
        lastSubmissionTime: Date.now(),
      }));

      logSubmissionStart(steps);

      if (showProgressToast) {
        toast({
          title: "Processing Request",
          description: `Starting ${serviceName} submission...`,
          variant: "default",
        });
      }

      try {
        let lastResult: unknown;

        for (let i = 0; i < steps.length; i++) {
          lastResult = await executeStepWithRetry(steps[i], i, steps.length);
        }

        const submissionTime = submissionTimer();
        logSubmissionSuccess(submissionTime, steps.length);

        setState(prev => ({
          ...prev,
          isSubmitting: false,
          progress: 100,
        }));

        if (showProgressToast) {
          toast({
            title: "Success!",
            description: `Your ${serviceName} has been submitted successfully.`,
            variant: "default",
          });
        }

        if (onSubmissionComplete) {
          onSubmissionComplete(lastResult);
        }

        return lastResult;
      } catch (err) {
        const submissionTime = submissionTimer();
        logSubmissionError(err, submissionTime, state.currentStep, steps.length);

        setState(prev => ({
          ...prev,
          isSubmitting: false,
        }));

        handleError(err, "form_submission");
        throw err;
      }
    },
    [
      state.isSubmitting,
      state.currentStep,
      serviceName,
      clearError,
      showProgressToast,
      toast,
      executeStepWithRetry,
      handleError,
      onSubmissionComplete,
      logSubmissionStart,
      logSubmissionSuccess,
      logSubmissionError,
    ]
  );

  /**
   * Validate form data before submission
   */
  const validateForm = useCallback(
    async (validationFn: () => Promise<boolean> | boolean): Promise<boolean> => {
      setState(prev => ({ ...prev, isValidating: true }));

      try {
        const isValid = await validationFn();

        if (!isValid) {
          handleError(new Error("Form validation failed"), "validation");
        }

        return isValid;
      } catch (error) {
        handleError(error, "validation");
        return false;
      } finally {
        setState(prev => ({ ...prev, isValidating: false }));
      }
    },
    [handleError]
  );

  /**
   * Create standard reservation submission steps
   */
  const createReservationSteps = useCallback(
    (
      formData: unknown,
      options: {
        createPaymentIntent?: boolean;
        uploadFiles?: File[];
        customSteps?: SubmissionStep[];
      } = {}
    ): SubmissionStep[] => {
      const { createPaymentIntent = true, uploadFiles = [], customSteps = [] } = options;

      const steps: SubmissionStep[] = [
        {
          name: "validate_auth",
          description: "Validating authentication",
          action: async () => {
            const token = await getToken();
            if (!token) {
              throw new Error("Authentication required");
            }
            return token;
          },
          canRetry: false,
          timeout: 10000,
        },
        {
          name: "create_reservation",
          description: "Creating reservation",
          action: async () => {
            const token = await getToken();
            const response = await fetch("/api/reservations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(formData),
              credentials: "include", // Required for Clerk __session cookie
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.message || `HTTP ${response.status}: ${response.statusText}`
              );
            }

            return response.json();
          },
          canRetry: true,
          timeout: 30000,
        },
      ];

      // Add file upload step if files are provided
      if (uploadFiles.length > 0) {
        steps.push({
          name: "upload_files",
          description: "Uploading files",
          action: async () => {
            // File upload logic would go here
            // This is a placeholder for the actual file upload implementation
            return { uploadedFiles: uploadFiles.length };
          },
          canRetry: true,
          timeout: 60000,
        });
      }

      // Add payment intent creation step if enabled
      if (createPaymentIntent) {
        steps.push({
          name: "create_payment_intent",
          description: "Setting up payment",
          action: async () => {
            const token = await getToken();
            const response = await fetch("/api/payment/stripe/create-payment-intent", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                // Payment intent data would be derived from formData
                amount: 10000, // This would be calculated from the form
                currency: "usd",
                metadata: {
                  type: "service_reservation",
                  service: serviceName,
                },
              }),
              credentials: "include", // Required for Clerk __session cookie
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `Payment setup failed: ${response.statusText}`);
            }

            return response.json();
          },
          canRetry: true,
          timeout: 30000,
        });
      }

      // Add any custom steps
      steps.push(...customSteps);

      return steps;
    },
    [getToken, serviceName]
  );

  return {
    // State
    ...state,
    hasError,
    error,
    retryCount,
    isRecovering,

    // Actions
    submitForm,
    validateForm,
    retry,
    clearError,

    // Utilities
    getErrorDisplay,
    createReservationSteps,
  };
}
