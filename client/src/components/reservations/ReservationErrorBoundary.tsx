import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addBreadcrumb, errorTracker } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { AlertTriangle, ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  serviceName?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: (ErrorInfo & { errorId?: string }) | null;
  retryCount: number;
}

/**
 * Enhanced error boundary specifically for reservation forms
 * Provides comprehensive error handling with retry mechanisms and user guidance
 */
export class ReservationErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Catch all rendering errors in reservation forms
    const isReservationError =
      error.name === "ChunkLoadError" ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Cannot read properties") ||
      error.message.includes("is not a function") ||
      error.message.includes("reservation") ||
      error.message.includes("form") ||
      error.stack?.includes("React") ||
      error.stack?.includes("render");

    if (isReservationError) {
      return {
        hasError: true,
        error,
      };
    }

    return {};
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.state.hasError) {
      // Add breadcrumb for error boundary activation
      addBreadcrumb({
        category: "error",
        message: `Reservation error boundary caught error in ${this.props.serviceName || "reservation form"}`,
        level: "error",
        data: {
          errorName: error.name,
          errorMessage: error.message,
          componentStack: errorInfo.componentStack,
          serviceName: this.props.serviceName,
          retryCount: this.state.retryCount,
        },
      });

      // Track the error with comprehensive context
      const errorId = errorTracker.trackError(error, {
        errorType: "critical",
        component: "reservation_error_boundary",
        action: "form_crash",
        page: this.props.serviceName || "reservation",
        errorCode: "RESERVATION_FORM_CRASH",
        recoverable: true,
        componentStack: errorInfo.componentStack,
        serviceName: this.props.serviceName,
        retryCount: this.state.retryCount,
      });

      // Log detailed error information
      logger.logError(
        `Reservation form error caught by error boundary: ${this.props.serviceName}`,
        error,
        {
          errorType: "critical",
          component: "reservation_error_boundary",
          action: "form_crash",
          page: this.props.serviceName || "reservation",
          errorId,
          componentStack: errorInfo.componentStack,
          serviceName: this.props.serviceName,
          retryCount: this.state.retryCount,
        }
      );

      // Record performance impact
      performanceMonitor.recordMetric(
        "reservation_error_boundary_activation",
        performance.now(),
        "ms",
        {
          component: "reservation_error_boundary",
          errorType: error.name,
          serviceName: this.props.serviceName,
        }
      );

      // Store error ID for potential reporting
      this.setState(prevState => ({
        ...prevState,
        errorInfo: {
          ...errorInfo,
          errorId,
        },
      }));
    }
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    // Log retry attempt
    logger.logInfo(
      `User initiated reservation error boundary retry (${newRetryCount}/${this.maxRetries})`,
      {
        component: "reservation_error_boundary",
        action: "retry_attempt",
        errorId: this.state.errorInfo?.errorId,
        serviceName: this.props.serviceName,
        retryCount: newRetryCount,
      }
    );

    // Add breadcrumb for retry
    addBreadcrumb({
      category: "user_action",
      message: `User clicked retry after reservation error (${newRetryCount}/${this.maxRetries})`,
      level: "info",
      data: {
        errorId: this.state.errorInfo?.errorId,
        serviceName: this.props.serviceName,
        retryCount: newRetryCount,
      },
    });

    // Record retry performance metric
    performanceMonitor.trackUserInteraction(
      "reservation_error_boundary_retry",
      "retry_button",
      undefined,
      {
        serviceName: this.props.serviceName,
        retryCount: newRetryCount,
      }
    );

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount,
    });
  };

  private handleRefresh = () => {
    // Log refresh attempt
    logger.logInfo("User initiated page refresh from reservation error boundary", {
      component: "reservation_error_boundary",
      action: "page_refresh",
      errorId: this.state.errorInfo?.errorId,
      serviceName: this.props.serviceName,
    });

    // Add breadcrumb for refresh
    addBreadcrumb({
      category: "user_action",
      message: "User clicked refresh after reservation error",
      level: "info",
      data: {
        errorId: this.state.errorInfo?.errorId,
        serviceName: this.props.serviceName,
      },
    });

    // Record refresh performance metric
    performanceMonitor.trackUserInteraction(
      "reservation_error_boundary_refresh",
      "refresh_button",
      undefined,
      {
        serviceName: this.props.serviceName,
      }
    );

    window.location.reload();
  };

  private handleGoBack = () => {
    // Log go back attempt
    logger.logInfo("User clicked go back from reservation error boundary", {
      component: "reservation_error_boundary",
      action: "go_back",
      errorId: this.state.errorInfo?.errorId,
      serviceName: this.props.serviceName,
    });

    // Add breadcrumb for go back
    addBreadcrumb({
      category: "user_action",
      message: "User clicked go back after reservation error",
      level: "info",
      data: {
        errorId: this.state.errorInfo?.errorId,
        serviceName: this.props.serviceName,
      },
    });

    // Record go back performance metric
    performanceMonitor.trackUserInteraction(
      "reservation_error_boundary_go_back",
      "go_back_button",
      undefined,
      {
        serviceName: this.props.serviceName,
      }
    );

    if (this.props.onGoBack) {
      this.props.onGoBack();
    } else {
      window.history.back();
    }
  };

  private handleReportIssue = () => {
    // Log issue report attempt
    logger.logInfo("User initiated error report from reservation error boundary", {
      component: "reservation_error_boundary",
      action: "report_issue",
      errorId: this.state.errorInfo?.errorId,
      serviceName: this.props.serviceName,
    });

    // Add breadcrumb for issue report
    addBreadcrumb({
      category: "user_action",
      message: "User clicked report issue after reservation error",
      level: "info",
      data: {
        errorId: this.state.errorInfo?.errorId,
        serviceName: this.props.serviceName,
      },
    });

    // Record issue report performance metric
    performanceMonitor.trackUserInteraction(
      "reservation_error_boundary_report",
      "report_button",
      undefined,
      {
        serviceName: this.props.serviceName,
      }
    );

    const errorId = this.state.errorInfo?.errorId || "unknown";
    const debugSummary = logger.getDebugSummary();
    const serviceName = this.props.serviceName || "Reservation Service";

    const subject = encodeURIComponent(`Critical Error - ${serviceName}`);
    const body = encodeURIComponent(
      `I encountered a critical error on the ${serviceName} page:\n\n` +
        `Error ID: ${errorId}\n` +
        `Service: ${serviceName}\n` +
        `Error: ${this.state.error?.message}\n` +
        `Retry Count: ${this.state.retryCount}\n` +
        `Page: ${window.location.pathname}\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `User Agent: ${navigator.userAgent}\n` +
        `Session ID: ${debugSummary.sessionId}\n` +
        `Page Load Time: ${debugSummary.pageLoadTime}ms\n` +
        `Error Count: ${debugSummary.errorCount}\n\n` +
        `Component Stack:\n${this.state.errorInfo?.componentStack || "Not available"}\n\n` +
        `Please describe what you were trying to do when this error occurred:`
    );

    window.open(`mailto:support@brolabentertainment.com?subject=${subject}&body=${body}`);
  };

  private getErrorSeverity(): "low" | "medium" | "high" {
    if (!this.state.error) return "low";

    const error = this.state.error;

    // High severity errors
    if (
      error.name === "ChunkLoadError" ||
      error.message.includes("Loading chunk") ||
      this.state.retryCount >= this.maxRetries
    ) {
      return "high";
    }

    // Medium severity errors
    if (
      error.message.includes("Cannot read properties") ||
      error.message.includes("is not a function") ||
      this.state.retryCount > 0
    ) {
      return "medium";
    }

    return "low";
  }

  private getErrorMessage(): { title: string; description: string; suggestion: string } {
    const severity = this.getErrorSeverity();
    const serviceName = this.props.serviceName || "reservation service";

    switch (severity) {
      case "high":
        return {
          title: "Service Temporarily Unavailable",
          description: `We're experiencing technical difficulties with the ${serviceName}. This appears to be a system-level issue that requires immediate attention.`,
          suggestion: "Please try refreshing the page or contact support if the problem persists.",
        };

      case "medium":
        return {
          title: "Form Loading Issue",
          description: `There was a problem loading the ${serviceName} form. This might be due to a temporary network issue or browser compatibility problem.`,
          suggestion:
            "Please try again or refresh the page. If the issue continues, try using a different browser.",
        };

      default:
        return {
          title: "Temporary Glitch",
          description: `We encountered a minor issue with the ${serviceName}. This is usually a temporary problem that resolves quickly.`,
          suggestion: "Please try again. The issue should resolve automatically.",
        };
    }
  }

  public override render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description, suggestion } = this.getErrorMessage();
      const severity = this.getErrorSeverity();
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center">
              <div
                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  severity === "high"
                    ? "bg-red-500/20"
                    : severity === "medium"
                      ? "bg-yellow-500/20"
                      : "bg-blue-500/20"
                }`}
              >
                <AlertTriangle
                  className={`w-8 h-8 ${
                    severity === "high"
                      ? "text-red-400"
                      : severity === "medium"
                        ? "text-yellow-400"
                        : "text-blue-400"
                  }`}
                />
              </div>
              <CardTitle className="text-xl text-white">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-3">
                <p className="text-gray-400">{description}</p>
                <p className="text-sm text-gray-500">{suggestion}</p>

                {this.state.retryCount > 0 && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-300 text-sm">
                      Retry attempt {this.state.retryCount} of {this.maxRetries}
                    </p>
                  </div>
                )}

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                      Error Details (Development)
                    </summary>
                    <div className="mt-2 p-3 bg-zinc-800 rounded text-xs text-red-400 overflow-auto max-h-32">
                      <div className="font-mono whitespace-pre-wrap">
                        <strong>Error:</strong> {this.state.error.toString()}
                        {"\n"}
                        <strong>Service:</strong> {this.props.serviceName || "Unknown"}
                        {"\n"}
                        <strong>Retry Count:</strong> {this.state.retryCount}
                        {"\n"}
                        {this.state.errorInfo?.componentStack && (
                          <>
                            <strong>Component Stack:</strong>
                            {"\n"}
                            {this.state.errorInfo.componentStack}
                          </>
                        )}
                      </div>
                    </div>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}

                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>

                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={this.handleReportIssue}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-500">
                  You can also visit our{" "}
                  <a
                    href="/"
                    className="text-[var(--accent-purple)] hover:text-[var(--accent-purple)]/80 underline"
                  >
                    beats store
                  </a>{" "}
                  or{" "}
                  <a
                    href="/contact"
                    className="text-[var(--accent-purple)] hover:text-[var(--accent-purple)]/80 underline"
                  >
                    contact us
                  </a>{" "}
                  directly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
