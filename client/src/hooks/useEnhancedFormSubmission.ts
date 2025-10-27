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
  retryable?: boolean;
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

      const errorMessage = err instanceof Error ? err.message : String(err);
      const contextSuffix = context ? ` (${context})` : "";
      const logMessage = `Error in ${serviceName}${contextSuffix}`;
      const errorForLog = err instanceof Error ? err : new Error(errorMessage);

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

      return { retryable: true, message: errorMessage };
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      message: errorMessage,
      canRetry: retryCount < maxRetries,
    };
  }, [error, retryCount, maxRetries]);

  /**
   * Execute a single submission step with error handling and timeout
   */
  const executeStep = useCallback(
    async (step: SubmissionStep, stepIndex: number, totalSteps: number): Promise<unknown> => {
      const stepTimer = startTimer(`${serviceName}_step_${stepIndex}`);

      try {
        // Log step start
        logger.logInfo(`Starting submission step: ${step.name}`, {
          component: "enhanced_form_submission",
          action: "step_start",
          serviceName,
          stepIndex,
          stepName: step.name,
          totalSteps,
        });

        // Add breadcrumb for step start
        addBreadcrumb({
          category: "user_action",
          message: `Starting submission step: ${step.name}`,
          level: "info",
          data: {
            serviceName,
            stepIndex,
            stepName: step.name,
            totalSteps,
          },
        });

        // Update progress
        setState(prev => ({
          ...prev,
          currentStep: stepIndex + 1,
          progress: Math.round(((stepIndex + 0.5) / totalSteps) * 100),
        }));

        // Execute step with timeout
        const timeoutMs = step.timeout || 30000; // 30 second default timeout
        const stepPromise = step.action();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error(`Step "${step.name}" timed out after ${timeoutMs}ms`)),
            timeoutMs
          );
        });

        const result = await Promise.race([stepPromise, timeoutPromise]);
        const stepTime = stepTimer();

        // Log step completion
        logger.logInfo(`Completed submission step: ${step.name}`, {
          component: "enhanced_form_submission",
          action: "step_complete",
          serviceName,
          stepIndex,
          stepName: step.name,
          stepTime,
        });

        // Add breadcrumb for step completion
        addBreadcrumb({
          category: "user_action",
          message: `Completed submission step: ${step.name}`,
          level: "info",
          data: {
            serviceName,
            stepIndex,
            stepName: step.name,
            stepTime,
          },
        });

        // Track step performance
        performanceMonitor.recordMetric(`${serviceName}_step_${stepIndex}_time`, stepTime, "ms", {
          component: "enhanced_form_submission",
          serviceName,
          stepName: step.name,
        });

        // Update progress to completed for this step
        setState(prev => ({
          ...prev,
          progress: Math.round(((stepIndex + 1) / totalSteps) * 100),
        }));

        // Call step completion callback
        if (onStepComplete) {
          onStepComplete(stepIndex, result);
        }

        return result;
      } catch (error) {
        const stepTime = stepTimer();

        // Log step error
        logger.logError(`Failed submission step: ${step.name}`, error, {
          errorType: "api",
          component: "enhanced_form_submission",
          action: "step_error",
          serviceName,
          stepIndex,
          stepName: step.name,
          stepTime,
        });

        // Add breadcrumb for step error
        addBreadcrumb({
          category: "error",
          message: `Failed submission step: ${step.name}`,
          level: "error",
          data: {
            serviceName,
            stepIndex,
            stepName: step.name,
            stepTime,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });

        // Track step error performance
        performanceMonitor.recordMetric(
          `${serviceName}_step_${stepIndex}_error_time`,
          stepTime,
          "ms",
          {
            component: "enhanced_form_submission",
            serviceName,
            stepName: step.name,
            errorType: error instanceof Error ? error.name : "unknown",
          }
        );

        throw error;
      }
    },
    [serviceName, onStepComplete]
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

      try {
        // Clear any previous errors
        clearError();

        // Initialize submission state
        setState(prev => ({
          ...prev,
          isSubmitting: true,
          currentStep: 0,
          totalSteps: steps.length,
          progress: 0,
          lastSubmissionTime: Date.now(),
        }));

        // Log submission start
        logger.logInfo(`Starting form submission for ${serviceName}`, {
          component: "enhanced_form_submission",
          action: "submission_start",
          serviceName,
          totalSteps: steps.length,
          stepNames: steps.map(s => s.name),
        });

        // Add breadcrumb for submission start
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

        // Show progress toast if enabled
        if (showProgressToast) {
          toast({
            title: "Processing Request",
            description: `Starting ${serviceName} submission...`,
            variant: "default",
          });
        }

        let lastResult: unknown;

        // Execute each step sequentially
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];

          try {
            lastResult = await executeStep(step, i, steps.length);
          } catch (stepError) {
            // Handle step-specific error
            const categorizedError = handleError(stepError, `step_${i}_${step.name}`);

            // If step is retryable and we haven't exceeded max retries, retry the step
            if (step.retryable !== false && categorizedError.retryable && retryCount < maxRetries) {
              logger.logInfo(`Retrying failed step: ${step.name}`, {
                component: "enhanced_form_submission",
                action: "step_retry",
                serviceName,
                stepIndex: i,
                stepName: step.name,
                retryCount: retryCount + 1,
              });

              // Wait with exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));

              // Retry the step
              try {
                lastResult = await executeStep(step, i, steps.length);
              } catch (retryError) {
                // If retry also fails, handle as final error
                handleError(retryError, `step_${i}_${step.name}_retry`);
                throw retryError;
              }
            } else {
              // Step is not retryable or max retries exceeded
              throw stepError;
            }
          }
        }

        const submissionTime = submissionTimer();

        // Log successful submission
        logger.logInfo(`Form submission completed successfully for ${serviceName}`, {
          component: "enhanced_form_submission",
          action: "submission_success",
          serviceName,
          submissionTime,
          totalSteps: steps.length,
        });

        // Add breadcrumb for successful submission
        addBreadcrumb({
          category: "user_action",
          message: `Form submission completed successfully for ${serviceName}`,
          level: "info",
          data: {
            serviceName,
            submissionTime,
            totalSteps: steps.length,
          },
        });

        // Track successful submission performance
        performanceMonitor.recordMetric(`${serviceName}_submission_success`, submissionTime, "ms", {
          component: "enhanced_form_submission",
          serviceName,
          totalSteps: steps.length,
        });

        // Update state to completed
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          progress: 100,
        }));

        // Show success toast if enabled
        if (showProgressToast) {
          toast({
            title: "Success!",
            description: `Your ${serviceName} has been submitted successfully.`,
            variant: "default",
          });
        }

        // Call completion callback
        if (onSubmissionComplete) {
          onSubmissionComplete(lastResult);
        }

        return lastResult;
      } catch (error) {
        const submissionTime = submissionTimer();

        // Log submission error
        logger.logError(`Form submission failed for ${serviceName}`, error, {
          errorType: "api",
          component: "enhanced_form_submission",
          action: "submission_error",
          serviceName,
          submissionTime,
          currentStep: state.currentStep,
          totalSteps: steps.length,
        });

        // Add breadcrumb for submission error
        addBreadcrumb({
          category: "error",
          message: `Form submission failed for ${serviceName}`,
          level: "error",
          data: {
            serviceName,
            submissionTime,
            currentStep: state.currentStep,
            totalSteps: steps.length,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });

        // Track failed submission performance
        performanceMonitor.recordMetric(`${serviceName}_submission_error`, submissionTime, "ms", {
          component: "enhanced_form_submission",
          serviceName,
          errorType: error instanceof Error ? error.name : "unknown",
          currentStep: state.currentStep,
        });

        // Update state to error
        setState(prev => ({
          ...prev,
          isSubmitting: false,
        }));

        // Handle the error (this will show appropriate toast and track error)
        handleError(error, "form_submission");

        throw error;
      }
    },
    [
      state.isSubmitting,
      state.currentStep,
      serviceName,
      clearError,
      showProgressToast,
      toast,
      executeStep,
      handleError,
      retryCount,
      maxRetries,
      onSubmissionComplete,
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
          retryable: false,
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
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.message || `HTTP ${response.status}: ${response.statusText}`
              );
            }

            return response.json();
          },
          retryable: true,
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
          retryable: true,
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
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `Payment setup failed: ${response.statusText}`);
            }

            return response.json();
          },
          retryable: true,
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
