import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, Loader2, Shield, Upload, User } from "lucide-react";
import { ReactNode } from "react";

interface LoadingStateProps {
  readonly isVisible: boolean;
}

interface ProgressStepProps {
  readonly step: number;
  readonly totalSteps: number;
  readonly currentStep: number;
  readonly title: string;
  readonly description: string;
  readonly icon: ReactNode;
  readonly status: "pending" | "active" | "completed" | "error";
}

interface FormSubmissionProgressProps {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly steps: ReadonlyArray<{
    readonly title: string;
    readonly description: string;
    readonly icon: ReactNode;
  }>;
  readonly error?: string | null;
  readonly isComplete?: boolean;
}

/**
 * Authentication loading state with helpful tips
 */
export function AuthenticationLoading({ isVisible }: LoadingStateProps) {
  if (!isVisible) return null;

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
      <div className="flex items-center justify-center text-blue-300">
        <Loader2 className="animate-spin h-6 w-6 mr-4" />
        <div className="text-center">
          <p className="font-medium text-lg">Loading authentication...</p>
          <p className="text-sm text-blue-400 mt-2">
            Preparing your personalized experience and auto-filling your information
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Auto-fill</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Fast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Form validation loading state
 */
export function FormValidationLoading({ isVisible }: LoadingStateProps) {
  if (!isVisible) return null;

  return (
    <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
      <div className="flex items-center text-yellow-300">
        <Loader2 className="animate-spin h-4 w-4 mr-2" />
        <p className="text-sm">Validating form data...</p>
      </div>
    </div>
  );
}

/**
 * File upload progress indicator
 */
export function FileUploadProgress({
  isVisible,
  fileName,
  progress,
  status,
}: LoadingStateProps & {
  readonly fileName?: string;
  readonly progress?: number;
  readonly status?: "uploading" | "scanning" | "completed" | "error";
}) {
  if (!isVisible) return null;

  const getStatusInfo = () => {
    if (status === "uploading") {
      return {
        icon: <Upload className="w-4 h-4 text-blue-400" />,
        text: "Uploading file...",
        color: "blue",
      };
    }
    if (status === "scanning") {
      return {
        icon: <Shield className="w-4 h-4 text-yellow-400" />,
        text: "Scanning for security...",
        color: "yellow",
      };
    }
    if (status === "completed") {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
        text: "Upload completed",
        color: "green",
      };
    }
    if (status === "error") {
      return {
        icon: <AlertCircle className="w-4 h-4 text-red-400" />,
        text: "Upload failed",
        color: "red",
      };
    }
    return {
      icon: <Loader2 className="animate-spin w-4 h-4 text-blue-400" />,
      text: "Processing...",
      color: "blue",
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      className={`mb-4 p-4 bg-${statusInfo.color}-900/20 border border-${statusInfo.color}-500/30 rounded-lg`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {statusInfo.icon}
          <div className="flex-1">
            <p className={`text-${statusInfo.color}-300 font-medium`}>{statusInfo.text}</p>
            {fileName && <p className="text-xs text-gray-400 mt-1">{fileName}</p>}
          </div>
        </div>

        {progress !== undefined && status !== "completed" && status !== "error" && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-400 text-right">{progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Progress step component for multi-step processes
 */
function ProgressStep({
  step,
  totalSteps,
  currentStep,
  title,
  description,
  icon,
  status,
}: ProgressStepProps) {
  const getStepStatus = () => {
    if (status === "error") return "error";
    if (step < currentStep) return "completed";
    if (step === currentStep) return "active";
    return "pending";
  };

  const stepStatus = getStepStatus();

  const getStatusStyles = () => {
    if (stepStatus === "completed") {
      return {
        circle: "bg-green-500 text-white",
        text: "text-green-300",
        line: "bg-green-500",
      };
    }
    if (stepStatus === "active") {
      return {
        circle: "bg-[var(--accent-purple)] text-white animate-pulse",
        text: "text-white",
        line: "bg-gray-600",
      };
    }
    if (stepStatus === "error") {
      return {
        circle: "bg-red-500 text-white",
        text: "text-red-300",
        line: "bg-gray-600",
      };
    }
    return {
      circle: "bg-gray-600 text-gray-400",
      text: "text-gray-400",
      line: "bg-gray-600",
    };
  };

  const styles = getStatusStyles();

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.circle}`}>
          {(() => {
            if (stepStatus === "completed") {
              return <CheckCircle className="w-5 h-5" />;
            }
            if (stepStatus === "error") {
              return <AlertCircle className="w-5 h-5" />;
            }
            if (stepStatus === "active") {
              return <Loader2 className="animate-spin w-5 h-5" />;
            }
            return icon;
          })()}
        </div>
        {step < totalSteps && <div className={`w-0.5 h-8 mt-2 ${styles.line}`} />}
      </div>

      <div className="flex-1 pb-8">
        <h4 className={`font-medium ${styles.text}`}>{title}</h4>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

/**
 * Form submission progress with detailed steps
 */
export function FormSubmissionProgress({
  currentStep,
  totalSteps,
  steps,
  error,
  isComplete,
}: FormSubmissionProgressProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {(() => {
            if (isComplete) {
              return <CheckCircle className="w-5 h-5 text-green-400" />;
            }
            if (error) {
              return <AlertCircle className="w-5 h-5 text-red-400" />;
            }
            return <Loader2 className="animate-spin w-5 h-5 text-[var(--accent-purple)]" />;
          })()}
          {(() => {
            if (isComplete) return "Reservation Complete!";
            if (error) return "Submission Error";
            return "Processing Reservation";
          })()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-0">
            {steps.map((step, index) => (
              <ProgressStep
                key={`step-${step.title}-${index}`}
                step={index + 1}
                totalSteps={totalSteps}
                currentStep={currentStep}
                title={step.title}
                description={step.description}
                icon={step.icon}
                status={error && index + 1 === currentStep ? "error" : "pending"}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Retry attempt indicator
 */
export function RetryIndicator({
  isVisible,
  attempt,
  maxAttempts,
  nextRetryIn,
}: LoadingStateProps & {
  readonly attempt?: number;
  readonly maxAttempts?: number;
  readonly nextRetryIn?: number;
}) {
  if (!isVisible) return null;

  return (
    <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-yellow-400" />
        <div className="flex-1">
          <p className="text-yellow-300 font-medium">
            Retrying request... (Attempt {attempt} of {maxAttempts})
          </p>
          {nextRetryIn && (
            <p className="text-xs text-yellow-400 mt-1">Next retry in {nextRetryIn} seconds</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Success state with next steps
 */
export function SuccessState({
  isVisible,
  title,
  description,
  nextSteps,
}: LoadingStateProps & {
  readonly title?: string;
  readonly description?: string;
  readonly nextSteps?: readonly string[];
}) {
  if (!isVisible) return null;

  return (
    <div className="mb-8 p-6 bg-green-900/20 border border-green-500/30 rounded-lg">
      <div className="flex items-start gap-4">
        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-green-300 font-semibold text-lg">{title || "Success!"}</h3>
          <p className="text-green-200 mt-2">
            {description || "Your request has been processed successfully."}
          </p>

          {nextSteps && nextSteps.length > 0 && (
            <div className="mt-4">
              <p className="text-green-300 font-medium mb-2">What happens next:</p>
              <ul className="space-y-1">
                {nextSteps.map(step => (
                  <li
                    key={`next-step-${step}`}
                    className="text-sm text-green-200 flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Submission progress indicator for multi-step forms
 */
export function SubmissionProgress({
  isVisible,
  currentStep,
  totalSteps,
  progress,
  stepName,
}: LoadingStateProps & {
  readonly currentStep?: number;
  readonly totalSteps?: number;
  readonly progress?: number;
  readonly stepName?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className="mb-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin w-5 h-5 text-purple-400" />
          <div className="flex-1">
            <p className="text-purple-300 font-medium">
              {stepName || "Processing your request..."}
            </p>
            {currentStep !== undefined && totalSteps !== undefined && (
              <p className="text-xs text-gray-400 mt-1">
                Step {currentStep} of {totalSteps}
              </p>
            )}
          </div>
        </div>

        {progress !== undefined && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-400 text-right">{progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
