import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    if (typeof window !== "undefined") {
      // You can integrate with error monitoring services here
      // e.g., Sentry, LogRocket, etc.
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReportIssue = () => {
    const subject = encodeURIComponent("BroLab App Error Report");
    const body = encodeURIComponent(
      `I encountered an error while using the BroLab app:\n\n` +
      `Error: ${this.state.error?.message}\n` +
      `Stack: ${this.state.error?.stack}\n` +
      `Component Stack: ${this.state.errorInfo?.componentStack}\n` +
      `URL: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `Timestamp: ${new Date().toISOString()}`
    );
    
    window.open(`mailto:support@brolabentertainment.com?subject=${subject}&body=${body}`);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-xl text-white">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-2">
                <p className="text-gray-400">
                  We encountered an unexpected error. This has been logged and our team will investigate.
                </p>
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                      Error Details (Development)
                    </summary>
                    <div className="mt-2 p-3 bg-zinc-800 rounded text-xs text-red-400 overflow-auto max-h-32">
                      <div className="font-mono whitespace-pre-wrap">
                        {this.state.error.toString()}
                        {this.state.errorInfo?.componentStack}
                      </div>
                    </div>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-alt)]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleReportIssue}
                  className="border-zinc-700 hover:border-[var(--color-accent)]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-500">
                  You can also try refreshing the page or navigating back to the{" "}
                  <a 
                    href="/" 
                    className="text-[var(--color-accent)] hover:text-[var(--color-accent-alt)] underline"
                  >
                    home page
                  </a>
                  .
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

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error("Manual error report:", error, errorInfo);
    
    // You can integrate with error monitoring services here
    if (typeof window !== "undefined") {
      // Report to monitoring service
    }
  };
}