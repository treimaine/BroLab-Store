/**
 * BaseErrorBoundary - Consolidated Error Boundary Component
 *
 * This is a wrapper that provides a unified API for error boundaries.
 * It delegates to the appropriate specialized error boundary based on variant.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addBreadcrumb, errorTracker } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { AlertTriangle, ArrowLeft, Mail, RefreshCw, User } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";
import {
  ErrorBoundaryVariant,
  ErrorCategory,
  ErrorSeverity,
  getErrorBoundaryConfig,
  getErrorMessage,
  getErrorSeverity,
  getErrorType,
  getSeverityStyles,
} from "./errorBoundaryConfig";

export interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  variant?: ErrorBoundaryVariant;
  serviceName?: string;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onAuthError?: () => void;
  onGoBack?: () => void;
  enableLogging?: boolean;
  enablePerformanceTracking?: boolean;
  enableAutoRetry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: (ErrorInfo & { errorId?: string }) | null;
  errorCategory: ErrorCategory;
  retryCount: number;
  isRetrying: boolean;
}

export class BaseErrorBoundary extends Component<BaseErrorBoundaryProps, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private readonly retryDelays = [1000, 2000, 4000];
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCategory: "general",
    retryCount: 0,
    isRetrying: false,
  };
  private get config() {
    return getErrorBoundaryConfig(this.props.variant ?? "default");
  }
  private get maxRetries(): number {
    return this.props.maxRetries ?? this.config.maxRetries;
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const cat = BaseErrorBoundary.categorizeError(error);
    if (!BaseErrorBoundary.isCriticalError(error) && cat === "authentication") return {};
    return { hasError: true, error, errorCategory: cat };
  }

  private static categorizeError(error: Error): ErrorCategory {
    const m = error.message.toLowerCase(),
      n = error.name.toLowerCase();
    if (
      m.includes("authentication") ||
      m.includes("clerk") ||
      m.includes("auth") ||
      n === "clerkerror"
    )
      return "authentication";
    if (
      m.includes("network") ||
      m.includes("fetch") ||
      n === "networkerror" ||
      m.includes("failed to fetch")
    )
      return "network";
    if (
      n === "chunkloaderror" ||
      m.includes("loading chunk") ||
      m.includes("cannot read properties") ||
      m.includes("is not a function")
    )
      return "critical";
    return "general";
  }

  private static isCriticalError(error: Error): boolean {
    return (
      error.name === "ChunkLoadError" ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Cannot read properties") ||
      error.message.includes("is not a function") ||
      Boolean(error.stack?.includes("React")) ||
      Boolean(error.stack?.includes("render"))
    );
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (!this.state.hasError) return;
    const {
      enableLogging = true,
      enablePerformanceTracking = true,
      onError,
      onAuthError,
    } = this.props;
    const svc = this.props.serviceName ?? this.config.serviceName;
    const errorId = `${this.props.variant ?? "default"}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    if (enableLogging) {
      addBreadcrumb({
        category: "error",
        message: `Error boundary caught error in ${svc}`,
        level: "error",
        data: {
          errorName: error.name,
          errorMessage: error.message,
          componentStack: errorInfo.componentStack,
          serviceName: svc,
          variant: this.props.variant,
          retryCount: this.state.retryCount,
        },
      });
      errorTracker.trackError(error, {
        errorType: this.state.errorCategory,
        component: "base_error_boundary",
        action: "component_crash",
        page: svc,
        errorCode: `${this.props.variant?.toUpperCase() ?? "DEFAULT"}_ERROR`,
        recoverable: true,
        componentStack: errorInfo.componentStack,
        serviceName: svc,
        retryCount: this.state.retryCount,
      });
      logger.logError(`Error caught by error boundary: ${svc}`, error, {
        errorType: this.state.errorCategory,
        component: "base_error_boundary",
        action: "component_crash",
        page: svc,
        errorId,
        componentStack: errorInfo.componentStack,
        serviceName: svc,
        retryCount: this.state.retryCount,
      });
    }
    if (enablePerformanceTracking && performanceMonitor) {
      performanceMonitor.recordMetric("error_boundary_activation", performance.now(), "ms", {
        component: "base_error_boundary",
        errorType: error.name,
        serviceName: svc,
        variant: this.props.variant,
      });
    }
    this.setState(prev => {
      if (prev.errorCategory === "authentication") onAuthError?.();
      return { ...prev, errorInfo: { ...errorInfo, errorId } };
    });
    onError?.(error, errorInfo);
    if (this.props.enableAutoRetry && this.canRetry()) this.attemptAutoRetry();
  }

  private canRetry(): boolean {
    const et = getErrorType(this.state.error);
    return (
      this.state.retryCount < this.maxRetries && (et === "Network Error" || et === "Loading Error")
    );
  }

  private attemptAutoRetry(): void {
    const delay = this.retryDelays[Math.min(this.state.retryCount, this.retryDelays.length - 1)];
    this.setState({ isRetrying: true });
    this.retryTimeoutId = setTimeout(() => this.handleRetry(), delay);
  }

  private readonly handleRetry = (): void => {
    const svc = this.props.serviceName ?? this.config.serviceName;

    this.setState(prev => {
      const cnt = prev.retryCount + 1;

      if (this.props.enableLogging !== false) {
        logger.logInfo(`User initiated retry (${cnt}/${this.maxRetries})`, {
          component: "base_error_boundary",
          action: "retry_attempt",
          errorId: prev.errorInfo?.errorId,
          serviceName: svc,
          retryCount: cnt,
        });
        addBreadcrumb({
          category: "user_action",
          message: `User clicked retry (${cnt}/${this.maxRetries})`,
          level: "info",
          data: { errorId: prev.errorInfo?.errorId, serviceName: svc, retryCount: cnt },
        });
      }
      if (this.props.enablePerformanceTracking !== false && performanceMonitor) {
        performanceMonitor.trackUserInteraction("error_boundary_retry", "retry_button", undefined, {
          serviceName: svc,
          retryCount: cnt,
        });
      }
      this.props.onRetry?.();

      return {
        hasError: false,
        error: null,
        errorInfo: null,
        errorCategory: "general" as ErrorCategory,
        retryCount: cnt,
        isRetrying: false,
      };
    });
  };

  private readonly handleRefresh = (): void => {
    if (this.props.enableLogging !== false)
      logger.logInfo("User initiated page refresh", {
        component: "base_error_boundary",
        action: "page_refresh",
        errorId: this.state.errorInfo?.errorId,
        serviceName: this.props.serviceName ?? this.config.serviceName,
      });
    globalThis.location.reload();
  };

  private readonly handleGoBack = (): void => {
    if (this.props.enableLogging !== false)
      logger.logInfo("User clicked go back", {
        component: "base_error_boundary",
        action: "go_back",
        errorId: this.state.errorInfo?.errorId,
        serviceName: this.props.serviceName ?? this.config.serviceName,
      });
    if (this.props.onGoBack) {
      this.props.onGoBack();
    } else {
      globalThis.history.back();
    }
  };

  private readonly handleSignIn = (): void => {
    globalThis.location.href =
      "/login?redirect=" + encodeURIComponent(globalThis.location.pathname);
  };

  private readonly handleReportIssue = (): void => {
    const svc = this.props.serviceName ?? this.config.serviceName,
      eid = this.state.errorInfo?.errorId ?? "unknown";
    if (this.props.enableLogging !== false)
      logger.logInfo("User initiated error report", {
        component: "base_error_boundary",
        action: "report_issue",
        errorId: eid,
        serviceName: svc,
      });
    let sessionId = "unknown",
      pageLoadTime = 0,
      errorCount = 0;
    try {
      const ds = logger.getDebugSummary();
      sessionId = typeof ds.sessionId === "string" ? ds.sessionId : "unknown";
      pageLoadTime = typeof ds.pageLoadTime === "number" ? ds.pageLoadTime : 0;
      errorCount = typeof ds.errorCount === "number" ? ds.errorCount : 0;
    } catch {
      /* ignore */
    }
    const subj = encodeURIComponent(`Error Report - ${svc}`);
    const body = encodeURIComponent(
      `Error on ${svc}:\n\nError ID: ${eid}\nType: ${this.state.errorCategory}\nError: ${this.state.error?.message ?? "Unknown"}\nRetry: ${this.state.retryCount}\nPage: ${globalThis.location.pathname}\nTime: ${new Date().toISOString()}\nUA: ${navigator.userAgent}\nSession: ${sessionId}\nLoad: ${pageLoadTime}ms\nErrors: ${errorCount}\n\nStack:\n${this.state.errorInfo?.componentStack ?? "N/A"}\n\nDescribe what happened:`
    );
    globalThis.open(`mailto:${this.config.supportEmail}?subject=${subj}&body=${body}`);
  };

  public override componentWillUnmount(): void {
    if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
  }

  private renderAuthActions(): ReactNode {
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
  }

  private renderDefaultActions(): ReactNode {
    const canRetry = this.state.retryCount < this.maxRetries,
      left = this.maxRetries - this.state.retryCount;
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {canRetry && (
          <Button
            onClick={this.handleRetry}
            disabled={this.state.isRetrying}
            className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${this.state.isRetrying ? "animate-spin" : ""}`} />
            {this.state.isRetrying ? "Retrying..." : `Try Again (${left} left)`}
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
        {this.config.showGoBack && (
          <Button
            onClick={this.handleGoBack}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>
    );
  }

  private renderActions(): ReactNode {
    return this.state.errorCategory === "authentication"
      ? this.renderAuthActions()
      : this.renderDefaultActions();
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const sev: ErrorSeverity = getErrorSeverity(
        this.state.error,
        this.state.retryCount,
        this.maxRetries
      );
      const { title, description, suggestion } = getErrorMessage(
        this.state.error,
        this.state.errorCategory,
        this.props.serviceName ?? this.config.serviceName,
        sev
      );
      const st = getSeverityStyles(sev);
      return (
        <div className="min-h-screen bg-[var(--deep-black)] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center">
              <div
                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${st.bgColor}`}
              >
                <AlertTriangle className={`w-8 h-8 ${st.iconColor}`} />
              </div>
              <CardTitle className="text-xl text-white">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-3">
                <p className="text-gray-400">{description}</p>
                {suggestion && <p className="text-sm text-gray-500">{suggestion}</p>}
                {this.state.errorCategory === "authentication" && (
                  <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      💡 <strong>Good news:</strong> You can still browse our services. Sign in when
                      you&apos;re ready.
                    </p>
                  </div>
                )}
                {this.state.retryCount > 0 && this.state.retryCount < this.maxRetries && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-300 text-sm">
                      Retry attempt {this.state.retryCount} of {this.maxRetries}
                    </p>
                  </div>
                )}
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                      Error Details (Dev)
                    </summary>
                    <div className="mt-2 p-3 bg-zinc-800 rounded text-xs text-red-400 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                      Type: {this.state.errorCategory}
                      {"\n"}Error: {this.state.error.toString()}
                      {"\n"}Variant: {this.props.variant ?? "default"}
                      {"\n"}Retries: {this.state.retryCount}
                      {this.state.errorInfo?.componentStack && (
                        <>
                          {"\n"}Stack:{"\n"}
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </div>
                  </details>
                )}
              </div>
              {this.renderActions()}
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
                  {"Visit our "}
                  <a
                    href="/"
                    className="text-[var(--accent-purple)] hover:text-[var(--accent-purple)]/80 underline"
                  >
                    beats store
                  </a>
                  {" or "}
                  <a
                    href="/contact"
                    className="text-[var(--accent-purple)] hover:text-[var(--accent-purple)]/80 underline"
                  >
                    contact us
                  </a>.
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
