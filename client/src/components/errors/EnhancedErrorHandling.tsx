import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { EnhancedErrorContext } from "./ErrorContext";
import type { ErrorInfo } from "./ErrorTypes";
import { ErrorType } from "./ErrorTypes";
import { useErrorHandler } from "./useErrorHandlers";

// Error Display Component
const ErrorDisplay: React.FC = () => {
  const { errors, removeError } = useErrorHandler();

  const getErrorIcon = (type: ErrorType): React.ReactNode => {
    switch (type) {
      case ErrorType.NETWORK:
        return <WifiOff className="w-4 h-4" />;
      case ErrorType.PAYMENT:
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getErrorColor = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.NETWORK:
        return "border-orange-600 bg-orange-900/20 text-orange-300";
      case ErrorType.PAYMENT:
        return "border-red-600 bg-red-900/20 text-red-300";
      case ErrorType.VALIDATION:
        return "border-yellow-600 bg-yellow-900/20 text-yellow-300";
      default:
        return "border-red-600 bg-red-900/20 text-red-300";
    }
  };

  const getErrorTitle = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.NETWORK:
        return "Connection Issue";
      case ErrorType.PAYMENT:
        return "Payment Error";
      case ErrorType.VALIDATION:
        return "Validation Error";
      case ErrorType.SERVER:
        return "Server Error";
      case ErrorType.AUTHENTICATION:
        return "Authentication Error";
      case ErrorType.GEOLOCATION:
        return "Location Detection Failed";
      default:
        return "Error";
    }
  };

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error: ErrorInfo) => (
        <Alert
          key={`${error.type}-${error.timestamp.getTime()}`}
          className={getErrorColor(error.type)}
        >
          {getErrorIcon(error.type)}
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <strong>{getErrorTitle(error.type)}</strong>
                <button
                  onClick={() => removeError(errors.indexOf(error))}
                  className="text-current hover:opacity-70"
                >
                  ×
                </button>
              </div>
              <p className="text-sm">{error.message}</p>
              {error.details && <p className="text-xs opacity-75">{error.details}</p>}
              {error.retry && (
                <Button
                  size="sm"
                  onClick={error.retry}
                  variant="outline"
                  className="border-current text-current hover:bg-current hover:text-black"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {error.actionLabel || "Retry"}
                </Button>
              )}
              <p className="text-xs opacity-50">{error.timestamp.toLocaleTimeString()}</p>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

// Network Status Indicator
const NetworkStatusIndicator: React.FC = () => {
  const { networkStatus } = useErrorHandler();

  if (networkStatus === "online") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Alert
        className={
          networkStatus === "offline"
            ? "border-red-600 bg-red-900/20 text-red-300"
            : "border-yellow-600 bg-yellow-900/20 text-yellow-300"
        }
      >
        {networkStatus === "offline" ? (
          <WifiOff className="w-4 h-4" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        <AlertDescription>
          {networkStatus === "offline"
            ? "You are offline. Some features may not work."
            : "Slow connection detected. Loading may take longer."}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export const EnhancedErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline" | "slow">("online");

  const removeError = useCallback((index: number): void => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = (): void => setNetworkStatus("online");
    const handleOffline = (): void => setNetworkStatus("offline");

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);

    const checkConnectionSpeed = (): void => {
      const start = Date.now();
      fetch("/api/health-check", { cache: "no-cache" })
        .then(() => {
          const duration = Date.now() - start;
          setNetworkStatus(duration > 2000 ? "slow" : "online");
        })
        .catch(() => setNetworkStatus("offline"));
    };

    const speedCheckInterval = setInterval(checkConnectionSpeed, 30000);

    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
      clearInterval(speedCheckInterval);
    };
  }, []);

  // Auto-remove errors after 10 seconds (except critical ones)
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    errors.forEach((error, index) => {
      if (error.type !== ErrorType.PAYMENT && error.type !== ErrorType.AUTHENTICATION) {
        const timeout = setTimeout(() => {
          removeError(index);
        }, 10000);
        timeouts.push(timeout);
      }
    });
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [errors, removeError]);

  const addError = useCallback((error: ErrorInfo): void => {
    setErrors(prev => [...prev, { ...error, timestamp: new Date() }]);
  }, []);

  const clearErrors = useCallback((): void => {
    setErrors([]);
  }, []);

  const contextValue = useMemo(
    () => ({
      errors,
      addError,
      removeError,
      clearErrors,
      networkStatus,
    }),
    [errors, addError, removeError, clearErrors, networkStatus]
  );

  return (
    <EnhancedErrorContext.Provider value={contextValue}>
      {children}
      <ErrorDisplay />
      <NetworkStatusIndicator />
    </EnhancedErrorContext.Provider>
  );
};

// Global Error Boundary
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Error Boundary caught an error:", error, errorInfo);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--dark-bg)] flex items-center justify-center p-4">
          <Card className="border-red-600 bg-red-900/20 max-w-md">
            <CardHeader>
              <CardTitle className="text-red-300 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-red-200">
                An unexpected error occurred. Please refresh the page or try again later.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => globalThis.location.reload()}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
                <Button
                  onClick={() => (globalThis.location.href = "/")}
                  variant="outline"
                  className="w-full border-red-600 text-red-300"
                >
                  Go to Home
                </Button>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="text-xs text-red-400 bg-red-950/50 p-2 rounded">
                  <summary>Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
