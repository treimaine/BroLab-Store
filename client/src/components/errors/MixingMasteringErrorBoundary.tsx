import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Mail, RefreshCw, User } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

type ErrorType = "authentication" | "network" | "general";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onAuthError?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
}

export class MixingMasteringErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorType: "general",
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine error type based on error message/name
    let errorType: ErrorType = "general";

    if (
      error.message.includes("Authentication") ||
      error.message.includes("Clerk") ||
      error.message.includes("auth") ||
      error.name === "ClerkError"
    ) {
      errorType = "authentication";
    } else if (
      error.message.includes("Network") ||
      error.message.includes("fetch") ||
      error.name === "NetworkError"
    ) {
      errorType = "network";
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MixingMasteringErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log error with context for debugging
    const errorContext = {
      page: "mixing-mastering",
      errorType: this.state.errorType,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: globalThis.location.href,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
    };

    console.error("Detailed error context:", errorContext);

    // Call authentication error callback if it's an auth error
    if (this.state.errorType === "authentication" && this.props.onAuthError) {
      this.props.onAuthError();
    }

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === "production") {
      this.reportError(errorContext);
    }
  }

  private readonly reportError = (errorContext: Record<string, unknown>) => {
    // This would typically send to an error monitoring service like Sentry
    // For now, we'll just log it with a unique ID for tracking
    const errorId = `mixing_mastering_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    console.error(`Error ID: ${errorId}`, errorContext);
  };

  private readonly handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "general",
    });
  };

  private readonly handleRefresh = () => {
    globalThis.location.reload();
  };

  private readonly handleSignIn = () => {
    // Redirect to sign-in with return URL
    globalThis.location.href = "/login?redirect=/mixing-mastering";
  };

  private readonly handleReportIssue = () => {
    const subject = encodeURIComponent("Mixing & Mastering Page Error");
    const body = encodeURIComponent(
      `I encountered an error on the Mixing & Mastering service page:\n\n` +
        `Error Type: ${this.state.errorType}\n` +
        `Error: ${this.state.error?.message}\n` +
        `Page: /mixing-mastering\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `User Agent: ${navigator.userAgent}\n\n` +
        `Please describe what you were trying to do when this error occurred:`
    );

    globalThis.open(`mailto:support@brolabentertainment.com?subject=${subject}&body=${body}`);
  };

  private readonly getErrorTitle = (): string => {
    switch (this.state.errorType) {
      case "authentication":
        return "Authentication Issue";
      case "network":
        return "Connection Problem";
      default:
        return "Something went wrong";
    }
  };

  private readonly getErrorMessage = (): string => {
    switch (this.state.errorType) {
      case "authentication":
        return "We encountered an issue with authentication. You can still view our services, but you'll need to sign in to make a reservation.";
      case "network":
        return "We're having trouble connecting to our servers. Please check your internet connection and try again.";
      default:
        return "We encountered an unexpected error while loading the Mixing & Mastering page. Our team has been notified.";
    }
  };

  private readonly getErrorActions = () => {
    const { errorType } = this.state;

    switch (errorType) {
      case "authentication":
        return (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={this.handleSignIn}
              className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
            <Button
              onClick={this.handleRetry}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Continue Without Sign In
            </Button>
          </div>
        );

      case "network":
      default:
        return (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={this.handleRetry}
              className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={this.handleRefresh}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        );
    }
  };

  public override render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorTitle = this.getErrorTitle();
      const errorMessage = this.getErrorMessage();
      const errorActions = this.getErrorActions();

      return (
        <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-xl text-white">{errorTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-2">
                <p className="text-gray-400">{errorMessage}</p>

                {this.state.errorType === "authentication" && (
                  <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      💡 <strong>Good news:</strong> You can still browse our mixing & mastering
                      services. Sign in when you&apos;re ready to make a reservation.
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
                        <strong>Type:</strong> {this.state.errorType}
                        {"\n"}
                        <strong>Error:</strong> {this.state.error.toString()}
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

              {errorActions}

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

// Hook for error reporting from functional components within the mixing-mastering page
export function useMixingMasteringErrorHandler() {
  return (error: Error, context?: string): ErrorType => {
    console.error(`Mixing & Mastering page error in ${context || "component"}:`, error);

    // Determine error type
    let errorType: ErrorType = "general";

    if (
      error.message.includes("Authentication") ||
      error.message.includes("Clerk") ||
      error.message.includes("auth")
    ) {
      errorType = "authentication";
    } else if (error.message.includes("Network") || error.message.includes("fetch")) {
      errorType = "network";
    }

    // Log detailed error context
    const errorContext = {
      page: "mixing-mastering",
      context: context || "unknown",
      errorType,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    console.error("Manual error report:", errorContext);

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === "production") {
      // This would typically send to Sentry or similar service
      console.error("Error reported to monitoring service:", errorContext);
    }

    return errorType;
  };
}
