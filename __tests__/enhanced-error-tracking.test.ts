import { ErrorType } from "../shared/constants/errors";
import {
  ErrorBoundaryManagerImpl,
  NetworkError,
  SystemError,
  ValidationError,
  createErrorContext,
} from "../shared/utils/error-handler";
import { PerformanceMonitorImpl } from "../shared/utils/system-manager";

describe("Enhanced Error Tracking and Analytics", () => {
  let errorBoundaryManager: ErrorBoundaryManagerImpl;
  let performanceMonitor: PerformanceMonitorImpl;

  beforeEach(() => {
    errorBoundaryManager = new ErrorBoundaryManagerImpl();
    performanceMonitor = new PerformanceMonitorImpl();
    errorBoundaryManager.setPerformanceMonitor(performanceMonitor);

    // Clear any existing errors
    errorBoundaryManager.clearErrors();
  });

  describe("Error Pattern Detection", () => {
    it("should detect recurring error patterns", async () => {
      const context = createErrorContext("TestComponent", "test_action");
      const error = new NetworkError("Connection timeout");

      // Generate multiple similar errors to create a pattern
      for (let i = 0; i < 5; i++) {
        errorBoundaryManager.captureError(error, context);
        // Small delay to simulate time between errors
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const topErrors = await errorBoundaryManager.getTopErrors(5);
      expect(topErrors).toHaveLength(1);
      expect(topErrors[0].count).toBe(5);
      expect(topErrors[0].error).toContain("Connection timeout");
    });

    it("should categorize errors by type and component", async () => {
      const networkContext = createErrorContext("NetworkComponent", "fetch_data");
      const validationContext = createErrorContext("FormComponent", "validate_input");

      // Create different types of errors
      errorBoundaryManager.captureError(new NetworkError("Network failed"), networkContext);
      errorBoundaryManager.captureError(new ValidationError("Invalid email"), validationContext);
      errorBoundaryManager.captureError(new NetworkError("Timeout"), networkContext);

      const timeRange = {
        start: Date.now() - 60000, // 1 minute ago
        end: Date.now(),
      };

      const stats = await errorBoundaryManager.getErrorStats(timeRange);

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBe(2);
      expect(stats.errorsByType[ErrorType.VALIDATION_ERROR]).toBe(1);
      expect(stats.errorsByComponent["NetworkComponent"]).toBe(2);
      expect(stats.errorsByComponent["FormComponent"]).toBe(1);
    });

    it("should track error trends over time", async () => {
      const context = createErrorContext("TrendComponent", "trend_action");
      const baseTime = Date.now();

      // Create errors at different times
      for (let i = 0; i < 3; i++) {
        const error = new SystemError(ErrorType.SERVER_ERROR, `Server error ${i}`);
        errorBoundaryManager.captureError(error, {
          ...context,
          timestamp: baseTime + i * 60000, // 1 minute apart
        });
      }

      const timeRange = {
        start: baseTime - 60000,
        end: baseTime + 180000,
      };

      const trends = await errorBoundaryManager.getErrorTrends(timeRange);
      expect(trends.length).toBeGreaterThan(0);

      const serverErrorTrends = trends.filter(trend => trend.errorType === ErrorType.SERVER_ERROR);
      expect(serverErrorTrends.length).toBeGreaterThan(0);
    });
  });

  describe("Enhanced Recovery Options", () => {
    it("should provide enhanced recovery options for recurring errors", async () => {
      const context = createErrorContext("RecurringComponent", "recurring_action");
      const error = new NetworkError("Recurring network issue");

      // Create multiple occurrences to trigger pattern detection
      for (let i = 0; i < 4; i++) {
        errorBoundaryManager.captureError(error, context);
      }

      const recoveryOptions = errorBoundaryManager.getErrorRecoveryOptions(error);

      // Should include both base and enhanced recovery options
      expect(recoveryOptions.length).toBeGreaterThan(1);

      const patternFix = recoveryOptions.find(option => option.id === "pattern_fix");
      const networkCheck = recoveryOptions.find(option => option.id === "check_connection");

      expect(patternFix).toBeDefined();
      expect(networkCheck).toBeDefined();
    });

    it("should provide component-specific recovery options", async () => {
      const context = createErrorContext("NetworkComponent", "api_call");
      const networkError = new NetworkError("fetch failed");

      const recoveryOptions = errorBoundaryManager.getErrorRecoveryOptions(networkError);

      const checkConnection = recoveryOptions.find(option => option.id === "check_connection");
      expect(checkConnection).toBeDefined();
      expect(checkConnection?.label).toBe("Check Connection");
    });
  });

  describe("Performance Integration", () => {
    it("should track error metrics in performance monitor", async () => {
      const context = createErrorContext("MetricsComponent", "track_error");
      const error = new SystemError(ErrorType.VALIDATION_ERROR, "Validation failed");

      errorBoundaryManager.captureError(error, context);

      // Get metrics from performance monitor
      const metrics = await performanceMonitor.getMetrics();

      const errorMetrics = metrics.filter(metric => metric.name === "error_occurred");
      expect(errorMetrics.length).toBeGreaterThan(0);

      const errorMetric = errorMetrics[0];
      expect(errorMetric.tags.error_type).toBe(ErrorType.VALIDATION_ERROR);
      expect(errorMetric.tags.component).toBe("MetricsComponent");
    });

    it("should track critical errors separately", async () => {
      const context = createErrorContext("CriticalComponent", "critical_action");
      const criticalError = new SystemError(ErrorType.SERVER_ERROR, "Critical server failure");

      errorBoundaryManager.captureError(criticalError, context);

      const metrics = await performanceMonitor.getMetrics();
      const criticalMetrics = metrics.filter(metric => metric.name === "critical_error_occurred");

      expect(criticalMetrics.length).toBeGreaterThan(0);
    });

    it("should track error resolution metrics", async () => {
      const context = createErrorContext("ResolutionComponent", "resolve_error");
      const error = new ValidationError("Input validation failed");

      errorBoundaryManager.captureError(error, context);

      const errorHistory = await errorBoundaryManager.getErrorHistory(1);
      const errorId = errorHistory[0].id;

      await errorBoundaryManager.markErrorResolved(errorId, "Fixed validation logic");

      const metrics = await performanceMonitor.getMetrics();
      const resolutionMetrics = metrics.filter(metric => metric.name === "error_resolved");

      expect(resolutionMetrics.length).toBeGreaterThan(0);

      // Check if has_notes tag exists and is "true"
      const resolutionMetric = resolutionMetrics.find(m => m.tags.has_notes === "true");
      expect(resolutionMetric).toBeDefined();
    });
  });

  describe("Error Statistics and Analytics", () => {
    it("should calculate accurate error statistics", async () => {
      // Clear any existing errors first
      errorBoundaryManager.clearErrors();

      const context = createErrorContext("StatsComponent", "stats_action");
      const timeRange = {
        start: Date.now() - 60000,
        end: Date.now(),
      };

      // Create a mix of resolved and unresolved errors
      errorBoundaryManager.captureError(new NetworkError("Network error 1"), context);
      errorBoundaryManager.captureError(new ValidationError("Validation error 1"), context);
      errorBoundaryManager.captureError(
        new SystemError(ErrorType.SERVER_ERROR, "Critical error"),
        context
      );

      // Resolve one error
      const history = await errorBoundaryManager.getErrorHistory();
      await errorBoundaryManager.markErrorResolved(history[0].id, "Fixed");

      const stats = await errorBoundaryManager.getErrorStats(timeRange);

      expect(stats.totalErrors).toBe(3);
      expect(stats.resolutionRate).toBeCloseTo(33.33, 1); // 1 out of 3 resolved
      expect(stats.criticalErrors).toBe(1);
      expect(stats.recentErrors).toBe(3); // All are recent
    });

    it("should filter errors by component", async () => {
      const context1 = createErrorContext("Component1", "action1");
      const context2 = createErrorContext("Component2", "action2");

      errorBoundaryManager.captureError(new NetworkError("Error in component 1"), context1);
      errorBoundaryManager.captureError(
        new ValidationError("Error in component 1 again"),
        context1
      );
      errorBoundaryManager.captureError(
        new SystemError(ErrorType.SERVER_ERROR, "Error in component 2"),
        context2
      );

      const component1Errors = await errorBoundaryManager.getErrorsByComponent("Component1");
      const component2Errors = await errorBoundaryManager.getErrorsByComponent("Component2");

      expect(component1Errors).toHaveLength(2);
      expect(component2Errors).toHaveLength(1);
    });
  });

  describe("Error Notification System", () => {
    it("should notify when error trends are detected", done => {
      const context = createErrorContext("TrendComponent", "trend_detection");
      let notificationReceived = false;

      // Set up notification callback
      errorBoundaryManager.onErrorTrend((error, trend) => {
        if (!notificationReceived) {
          expect(error).toBeDefined();
          expect(trend).toBeDefined();
          expect(trend.errorType).toBe(ErrorType.NETWORK_ERROR);
          expect(trend.component).toBe("TrendComponent");
          notificationReceived = true;
          done();
        }
      });

      // Generate enough errors to trigger trend notification
      // This simulates a high-frequency error pattern
      for (let i = 0; i < 15; i++) {
        errorBoundaryManager.captureError(new NetworkError("Frequent network error"), context);
      }

      // If no notification is received within 1 second, fail the test
      setTimeout(() => {
        if (!notificationReceived) {
          done(new Error("Expected error trend notification was not received"));
        }
      }, 1000);
    });
  });

  describe("Error Resolution Workflow", () => {
    it("should track resolution time accurately", async () => {
      const context = createErrorContext("WorkflowComponent", "resolution_workflow");
      const error = new ValidationError("Workflow validation error");

      errorBoundaryManager.captureError(error, context);

      // Wait a bit to simulate resolution time
      await new Promise(resolve => setTimeout(resolve, 100));

      const history = await errorBoundaryManager.getErrorHistory(1);
      const errorId = history[0].id;

      await errorBoundaryManager.markErrorResolved(errorId, "Applied validation fix");

      const metrics = await performanceMonitor.getMetrics();
      const resolutionTimeMetrics = metrics.filter(
        metric => metric.name === "error_resolution_time"
      );

      expect(resolutionTimeMetrics.length).toBeGreaterThan(0);
      expect(resolutionTimeMetrics[0].value).toBeGreaterThan(100); // Should be at least 100ms
    });

    it("should provide suggested fixes for recurring patterns", async () => {
      const context = createErrorContext("PatternComponent", "pattern_action");
      const error = new NetworkError("Pattern network error");

      // Create enough occurrences to establish a pattern
      for (let i = 0; i < 5; i++) {
        errorBoundaryManager.captureError(error, context);
      }

      const topErrors = await errorBoundaryManager.getTopErrors(1);
      expect(topErrors[0].pattern).toBeDefined();
      expect(topErrors[0].pattern?.isRecurring).toBe(true);
      expect(topErrors[0].pattern?.suggestedFix).toBeDefined();
    });
  });
});
