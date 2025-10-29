import { toast } from "@/hooks/use-toast";
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

export class ClerkErrorBoundary extends Component<Props, State> {
  private readonly retryTimeouts: number[] = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Clerk Error Boundary caught an error:", error, errorInfo);

    // Log authentication failure to Convex audit
    this.logAuthenticationFailure(error);

    // Show user-friendly error message
    this.showErrorToast(error);

    // Attempt automatic retry with exponential backoff
    if (this.state.retryCount < this.retryTimeouts.length) {
      this.attemptRetry();
    }
  }

  private logAuthenticationFailure(error: Error): void {
    try {
      // Extract error details
      const errorDetails = {
        endpoint: globalThis.location.pathname,
        statusCode: this.extractStatusCode(error),
        userAction: "authentication",
        errorMessage: error.message,
        errorStack: error.stack,
        userAgent: navigator.userAgent,
      };

      // Log to Convex audit using HTTP action (fire and forget)
      // We use fetch instead of Convex client because class components can't use hooks
      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (convexUrl) {
        fetch(`${convexUrl}/api/mutation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "audit:logAuthenticationError",
            args: errorDetails,
          }),
        }).catch(err => console.error("Failed to log audit event:", err));
      }
    } catch (err) {
      console.error("Error logging authentication failure:", err);
    }
  }

  private extractStatusCode(error: Error): number {
    // Try to extract status code from error message
    const regex = /status[:\s]+(\d+)/i;
    const match = regex.exec(error.message);
    if (match) {
      return Number.parseInt(match[1], 10);
    }

    // Check for 400 errors specifically
    if (error.message.includes("400") || error.message.includes("Bad Request")) {
      return 400;
    }

    return 500; // Default to 500 for unknown errors
  }

  private showErrorToast(error: Error): void {
    const statusCode = this.extractStatusCode(error);

    if (statusCode === 400) {
      toast({
        title: "Authentication Configuration Error",
        description:
          "There's an issue with the authentication setup. Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Authentication Error",
        description: "We're having trouble connecting to your account. Retrying automatically...",
        variant: "destructive",
      });
    }
  }

  private attemptRetry(): void {
    const delay = this.retryTimeouts[this.state.retryCount];

    this.setState({ isRetrying: true });

    setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));

      toast({
        title: "Retrying authentication...",
        description: `Attempt ${this.state.retryCount + 1} of ${this.retryTimeouts.length}`,
      });
    }, delay);
  }

  private readonly handleManualRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });
    globalThis.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const statusCode = this.state.error ? this.extractStatusCode(this.state.error) : 500;
      const is400Error = statusCode === 400;

      return (
        <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center">
          <div className="max-w-md w-full mx-auto text-center p-8">
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-red-200 mb-4">
                {is400Error ? "Authentication Configuration Error" : "BroLab Authentication Error"}
              </h2>
              <p className="text-red-200 mb-4">
                {is400Error
                  ? "There's an issue with the authentication configuration. This may be due to development environment limits or incorrect API keys."
                  : "We're having trouble connecting to your BroLab account. This may be a temporary issue with our authentication system."}
              </p>
              {this.state.isRetrying && (
                <div className="mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto mb-2" />
                  <p className="text-red-300 text-sm">
                    Retrying... (Attempt {this.state.retryCount + 1} of {this.retryTimeouts.length})
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={this.handleManualRetry}
                  disabled={this.state.isRetrying}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {this.state.isRetrying ? "Retrying..." : "Retry Now"}
                </button>
                {is400Error && (
                  <p className="text-xs text-red-300 mt-4">
                    If this error persists, please contact support or check your environment
                    configuration.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
