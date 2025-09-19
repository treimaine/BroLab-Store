/**
 * Dashboard Error Boundary Component
 *
 * Implements proper error boundaries with actionable error messages and retry mechanisms.
 * Requirements addressed:
 * - 9.3: Actionable error messages with retry options
 * - 9.4: Escalation paths or support contact
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink, Mail, RefreshCw } from "lucide-react";
import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string;
}

interface DashboardErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
  maxRetries?: number;
}

export class DashboardErrorBoundary extends Component<
  DashboardErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: this.generateErrorId(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
      errorId: this.generateErrorId(),
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("Dashboard Error Boundary caught an error:", error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // This would typically send to an error reporting service like Sentry
    // For now, we'll just log it
    console.error("Error reported:", {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));

    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: this.generateErrorId(),
      });
    }, delay);
  };

  private handleRefresh = (): void => {
    window.location.reload();
  };

  private handleContactSupport = (): void => {
    const subject = encodeURIComponent(`Dashboard Error - ${this.state.errorId}`);
    const body = encodeURIComponent(
      `Error ID: ${this.state.errorId}\n` +
        `Error Message: ${this.state.error?.message || "Unknown error"}\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `User Agent: ${navigator.userAgent}\n\n` +
        `Please describe what you were doing when this error occurred:`
    );

    window.open(`mailto:support@brolab.com?subject=${subject}&body=${body}`);
  };

  private getErrorType(error: Error): string {
    if (error.name === "ChunkLoadError") return "Network Error";
    if (error.message.includes("Loading chunk")) return "Loading Error";
    if (error.message.includes("Network")) return "Network Error";
    if (error.message.includes("Authentication")) return "Authentication Error";
    return "Application Error";
  }

  private getErrorMessage(error: Error): string {
    const errorType = this.getErrorType(error);

    switch (errorType) {
      case "Network Error":
        return "Unable to connect to our servers. Please check your internet connection and try again.";
      case "Loading Error":
        return "Failed to load dashboard components. This might be due to a network issue.";
      case "Authentication Error":
        return "Your session has expired. Please refresh the page to sign in again.";
      default:
        return "An unexpected error occurred while loading your dashboard.";
    }
  }

  private canRetry(error: Error): boolean {
    const { maxRetries = 3 } = this.props;
    const errorType = this.getErrorType(error);

    return (
      this.state.retryCount < maxRetries &&
      (errorType === "Network Error" || errorType === "Loading Error")
    );
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const errorType = error ? this.getErrorType(error) : "Unknown Error";
      const errorMessage = error ? this.getErrorMessage(error) : "An unknown error occurred.";
      const canRetry = error ? this.canRetry(error) : false;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-900/50 border-gray-700/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <CardTitle className="text-white text-lg">{errorType}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm text-center">{errorMessage}</p>

              {import.meta.env.DEV && error && (
                <details className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded">
                  <summary className="cursor-pointer mb-2">Technical Details</summary>
                  <div className="space-y-2">
                    <div>
                      <strong>Error:</strong> {error.message}
                    </div>
                    <div>
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="text-xs mt-1 overflow-auto">{error.stack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={this.retryTimeoutId !== null}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {this.retryTimeoutId
                      ? "Retrying..."
                      : `Retry (${this.props.maxRetries! - this.state.retryCount} left)`}
                  </Button>
                )}

                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>

                <Button
                  onClick={this.handleContactSupport}
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-gray-300"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </div>

              <div className="text-center">
                <a
                  href="https://status.brolab.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gray-300 inline-flex items-center"
                >
                  Check System Status
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier usage with hooks
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<DashboardErrorBoundaryProps, "children">
) {
  return function WrappedComponent(props: P) {
    return (
      <DashboardErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </DashboardErrorBoundary>
    );
  };
}

// Hook for error reporting from functional components
export function useErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    console.error(`Error in ${context || "component"}:`, error);

    // In production, send to error reporting service
    if (import.meta.env.PROD) {
      // This would typically send to Sentry or similar service
      console.error("Error reported:", {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return { reportError };
}
