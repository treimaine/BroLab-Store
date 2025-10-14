/**
 * Enhanced error tracking system for comprehensive error monitoring and debugging
 * Provides detailed error context, recovery suggestions, and debugging information
 */

import { logger, type ErrorContext } from "./logger";

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: Error | unknown;
  context: ErrorContext;
  userAgent: string;
  url: string;
  stackTrace?: string;
  breadcrumbs: Breadcrumb[];
  recoveryActions: RecoveryAction[];
  severity: "low" | "medium" | "high" | "critical";
  tags: string[];
}

export interface Breadcrumb {
  timestamp: string;
  category: "navigation" | "user_action" | "api_call" | "state_change" | "error";
  message: string;
  data?: Record<string, unknown>;
  level: "info" | "warning" | "error";
}

export interface RecoveryAction {
  action: string;
  description: string;
  automated: boolean;
  priority: number;
}

export interface ErrorPattern {
  type: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  frequency: number;
  commonContext: Record<string, unknown>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private breadcrumbs: Breadcrumb[] = [];
  private errorReports: ErrorReport[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private maxBreadcrumbs = 50;
  private maxErrorReports = 100;

  private constructor() {
    this.initializeErrorTracking();
  }

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private initializeErrorTracking(): void {
    // Track unhandled errors
    window.addEventListener("error", event => {
      this.trackError(event.error || new Error(event.message), {
        errorType: "critical",
        component: "global",
        action: "unhandled_error",
        errorCode: "UNHANDLED_ERROR",
        recoverable: false,
      });
    });

    // Track unhandled promise rejections
    window.addEventListener("unhandledrejection", event => {
      this.trackError(event.reason, {
        errorType: "critical",
        component: "global",
        action: "unhandled_promise_rejection",
        errorCode: "UNHANDLED_PROMISE_REJECTION",
        recoverable: false,
      });
    });

    // Track navigation for breadcrumbs
    this.addBreadcrumb({
      category: "navigation",
      message: "Page loaded",
      level: "info",
      data: {
        url: window.location.href,
        referrer: document.referrer,
      },
    });
  }

  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }

    logger.logInfo(`Breadcrumb: ${breadcrumb.message}`, {
      component: "error_tracker",
      breadcrumb: fullBreadcrumb,
    });
  }

  public trackError(error: Error | unknown, context: ErrorContext): string {
    const errorId = this.generateErrorId();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;

    // Determine error severity
    const severity = this.determineSeverity(error, context);

    // Generate recovery actions
    const recoveryActions = this.generateRecoveryActions(error, context);

    // Create error report
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace,
      breadcrumbs: [...this.breadcrumbs],
      recoveryActions,
      severity,
      tags: this.generateErrorTags(error, context),
    };

    // Store error report
    this.errorReports.push(errorReport);
    if (this.errorReports.length > this.maxErrorReports) {
      this.errorReports = this.errorReports.slice(-this.maxErrorReports);
    }

    // Track error patterns
    this.updateErrorPatterns(error, context);

    // Log comprehensive error information
    logger.logError(`Error tracked: ${errorMessage}`, error, {
      ...context,
      errorId,
      severity,
      recoveryActions: recoveryActions.map(a => a.action),
    });

    // Add error breadcrumb
    this.addBreadcrumb({
      category: "error",
      message: `Error: ${errorMessage}`,
      level: "error",
      data: {
        errorId,
        errorType: context.errorType,
        component: context.component,
        severity,
      },
    });

    // Execute automated recovery actions
    this.executeAutomatedRecovery(recoveryActions, errorReport);

    return errorId;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(
    error: Error | unknown,
    context: ErrorContext
  ): "low" | "medium" | "high" | "critical" {
    // Critical errors that break core functionality
    if (
      context.errorType === "critical" ||
      (error instanceof Error && error.name === "ChunkLoadError")
    ) {
      return "critical";
    }

    // High severity for authentication and API errors
    if (context.errorType === "authentication" || context.errorType === "api") {
      return "high";
    }

    // Medium severity for validation and file upload errors
    if (context.errorType === "validation" || context.errorType === "file_upload") {
      return "medium";
    }

    // Low severity for network and other recoverable errors
    return "low";
  }

  private generateRecoveryActions(error: Error | unknown, context: ErrorContext): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (context.errorType) {
      case "authentication":
        actions.push(
          {
            action: "retry_authentication",
            description: "Retry authentication process",
            automated: true,
            priority: 1,
          },
          {
            action: "clear_auth_cache",
            description: "Clear authentication cache and retry",
            automated: false,
            priority: 2,
          },
          {
            action: "redirect_to_signin",
            description: "Redirect user to sign-in page",
            automated: false,
            priority: 3,
          }
        );
        break;

      case "api":
        actions.push(
          {
            action: "retry_request",
            description: "Retry API request with exponential backoff",
            automated: true,
            priority: 1,
          },
          {
            action: "fallback_to_cache",
            description: "Use cached data if available",
            automated: true,
            priority: 2,
          },
          {
            action: "show_offline_mode",
            description: "Switch to offline mode",
            automated: false,
            priority: 3,
          }
        );
        break;

      case "validation":
        actions.push(
          {
            action: "highlight_invalid_fields",
            description: "Highlight invalid form fields",
            automated: true,
            priority: 1,
          },
          {
            action: "show_validation_help",
            description: "Show validation help messages",
            automated: true,
            priority: 2,
          }
        );
        break;

      case "file_upload":
        actions.push(
          {
            action: "retry_upload",
            description: "Retry file upload",
            automated: true,
            priority: 1,
          },
          {
            action: "suggest_alternative_upload",
            description: "Suggest alternative upload methods",
            automated: true,
            priority: 2,
          },
          {
            action: "allow_form_submission_without_files",
            description: "Allow form submission without files",
            automated: true,
            priority: 3,
          }
        );
        break;

      case "network":
        actions.push(
          {
            action: "check_connectivity",
            description: "Check network connectivity",
            automated: true,
            priority: 1,
          },
          {
            action: "retry_with_timeout",
            description: "Retry with increased timeout",
            automated: true,
            priority: 2,
          }
        );
        break;

      case "critical":
        actions.push(
          {
            action: "reload_page",
            description: "Reload the page",
            automated: false,
            priority: 1,
          },
          {
            action: "clear_local_storage",
            description: "Clear local storage and reload",
            automated: false,
            priority: 2,
          },
          {
            action: "report_to_support",
            description: "Report error to support team",
            automated: false,
            priority: 3,
          }
        );
        break;
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  private generateErrorTags(error: Error | unknown, context: ErrorContext): string[] {
    const tags: string[] = [context.errorType, context.component || "unknown"];

    if (context.action) {
      tags.push(`action:${context.action}`);
    }

    if (context.errorCode) {
      tags.push(`code:${context.errorCode}`);
    }

    if (context.recoverable) {
      tags.push("recoverable");
    } else {
      tags.push("non-recoverable");
    }

    if (error instanceof Error) {
      tags.push(`error_name:${error.name}`);
    }

    return tags;
  }

  private updateErrorPatterns(error: Error | unknown, context: ErrorContext): void {
    const patternKey = `${context.errorType}_${context.component}_${context.action}`;
    const existing = this.errorPatterns.get(patternKey);
    const now = new Date().toISOString();

    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      existing.frequency =
        existing.count / ((Date.now() - new Date(existing.firstSeen).getTime()) / (1000 * 60)); // errors per minute
    } else {
      this.errorPatterns.set(patternKey, {
        type: patternKey,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        frequency: 0,
        commonContext: { ...context },
      });
    }
  }

  private executeAutomatedRecovery(actions: RecoveryAction[], errorReport: ErrorReport): void {
    const automatedActions = actions.filter(action => action.automated);

    automatedActions.forEach(action => {
      try {
        switch (action.action) {
          case "highlight_invalid_fields":
            this.highlightInvalidFields(errorReport);
            break;
          case "show_validation_help":
            this.showValidationHelp(errorReport);
            break;
          case "suggest_alternative_upload":
            this.suggestAlternativeUpload(errorReport);
            break;
          case "allow_form_submission_without_files":
            this.allowFormSubmissionWithoutFiles(errorReport);
            break;
          default:
            logger.logInfo(`Automated recovery action not implemented: ${action.action}`, {
              component: "error_tracker",
              errorId: errorReport.id,
            });
        }
      } catch (recoveryError) {
        logger.logError(`Recovery action failed: ${action.action}`, recoveryError, {
          errorType: "critical",
          component: "error_tracker",
          action: "automated_recovery",
          originalErrorId: errorReport.id,
        });
      }
    });
  }

  private highlightInvalidFields(errorReport: ErrorReport): void {
    // This would be implemented to highlight invalid form fields
    logger.logInfo("Automated recovery: Highlighting invalid fields", {
      component: "error_tracker",
      errorId: errorReport.id,
    });
  }

  private showValidationHelp(errorReport: ErrorReport): void {
    // This would be implemented to show validation help
    logger.logInfo("Automated recovery: Showing validation help", {
      component: "error_tracker",
      errorId: errorReport.id,
    });
  }

  private suggestAlternativeUpload(errorReport: ErrorReport): void {
    // This would be implemented to suggest alternative upload methods
    logger.logInfo("Automated recovery: Suggesting alternative upload methods", {
      component: "error_tracker",
      errorId: errorReport.id,
    });
  }

  private allowFormSubmissionWithoutFiles(errorReport: ErrorReport): void {
    // This would be implemented to allow form submission without files
    logger.logInfo("Automated recovery: Allowing form submission without files", {
      component: "error_tracker",
      errorId: errorReport.id,
    });
  }

  public getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.find(report => report.id === errorId);
  }

  public getErrorReports(filter?: {
    severity?: "low" | "medium" | "high" | "critical";
    errorType?: string;
    component?: string;
    limit?: number;
  }): ErrorReport[] {
    let reports = [...this.errorReports];

    if (filter) {
      if (filter.severity) {
        reports = reports.filter(report => report.severity === filter.severity);
      }
      if (filter.errorType) {
        reports = reports.filter(report => report.context.errorType === filter.errorType);
      }
      if (filter.component) {
        reports = reports.filter(report => report.context.component === filter.component);
      }
      if (filter.limit) {
        reports = reports.slice(-filter.limit);
      }
    }

    return reports.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values()).sort((a, b) => b.frequency - a.frequency);
  }

  public getBreadcrumbs(limit?: number): Breadcrumb[] {
    const crumbs = [...this.breadcrumbs];
    return limit ? crumbs.slice(-limit) : crumbs;
  }

  public clearErrorReports(): void {
    this.errorReports = [];
    this.errorPatterns.clear();
    logger.logInfo("Error reports cleared", {
      component: "error_tracker",
    });
  }

  public getDebugInfo(): Record<string, unknown> {
    return {
      totalErrors: this.errorReports.length,
      errorsByType: this.getErrorsByType(),
      errorsBySeverity: this.getErrorsBySeverity(),
      topErrorPatterns: this.getErrorPatterns().slice(0, 5),
      recentBreadcrumbs: this.getBreadcrumbs(10),
      timestamp: new Date().toISOString(),
    };
  }

  private getErrorsByType(): Record<string, number> {
    const byType: Record<string, number> = {};
    this.errorReports.forEach(report => {
      const type = report.context.errorType;
      byType[type] = (byType[type] || 0) + 1;
    });
    return byType;
  }

  private getErrorsBySeverity(): Record<string, number> {
    const bySeverity: Record<string, number> = {};
    this.errorReports.forEach(report => {
      const severity = report.severity;
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    });
    return bySeverity;
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Export convenience functions
export const trackError = (error: Error | unknown, context: ErrorContext): string =>
  errorTracker.trackError(error, context);

export const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, "timestamp">): void =>
  errorTracker.addBreadcrumb(breadcrumb);

export const getErrorReport = (errorId: string): ErrorReport | undefined =>
  errorTracker.getErrorReport(errorId);

export const getErrorReports = (
  filter?: Parameters<typeof errorTracker.getErrorReports>[0]
): ErrorReport[] => errorTracker.getErrorReports(filter);

export const getErrorPatterns = (): ErrorPattern[] => errorTracker.getErrorPatterns();

export const getBreadcrumbs = (limit?: number): Breadcrumb[] => errorTracker.getBreadcrumbs(limit);

export const getDebugInfo = (): Record<string, unknown> => errorTracker.getDebugInfo();

// Make error tracker available globally in development
if (process.env.NODE_ENV === "development") {
  (window as any).errorTracker = {
    getErrorReports,
    getErrorPatterns,
    getBreadcrumbs,
    getDebugInfo,
    clearReports: () => errorTracker.clearErrorReports(),
  };
}
