/**
 * ErrorHandlingManager Usage Examples
 *
 * This file demonstrates how to use the enhanced ErrorHandlingManager
 * with automatic retry, exponential backoff, and retry queue functionality.
 */

import {
  ErrorHandlingManager,
  type RetryConfig,
} from "../../client/src/services/ErrorHandlingManager";

// ================================
// BASIC USAGE
// ================================

/**
 * Example 1: Basic error handling with default retry configuration
 */
export function basicUsageExample(): void {
  const errorManager = new ErrorHandlingManager();

  // Handle an error - will automatically retry with exponential backoff
  async function performSyncOperation() {
    try {
      // Your sync operation here
      throw new Error("Network timeout");
    } catch (error) {
      await errorManager.handleError(error, {
        component: "DashboardSync",
        action: "sync_dashboard_data",
        userId: "user_123",
      });
    }
  }

  void performSyncOperation();
}

// ================================
// CUSTOM RETRY CONFIGURATION
// ================================

/**
 * Example 2: Custom retry configuration
 * Implements: 1s, 2s, 4s, 8s, 16s, 30s (capped at maxDelay)
 */
export function customRetryConfigExample(): void {
  const customRetryConfig: RetryConfig = {
    enabled: true,
    maxAttempts: 3, // Maximum 3 retry attempts
    initialDelay: 1000, // Start with 1 second
    maxDelay: 30000, // Cap at 30 seconds
    backoffMultiplier: 2, // Double the delay each time (exponential)
    jitterEnabled: true, // Add random jitter to prevent thundering herd
    jitterFactor: 0.1, // ±10% jitter
  };

  const errorManager = new ErrorHandlingManager({
    retry: customRetryConfig,
    maxRetryQueueSize: 100, // Allow up to 100 operations in retry queue
  });

  // Calculate backoff delays for demonstration
  console.log("Retry delays:");
  for (let attempt = 0; attempt < 5; attempt++) {
    const delay = errorManager.calculateExponentialBackoff(attempt);
    console.log(`Attempt ${attempt + 1}: ${delay}ms`);
  }
}

// ================================
// RETRY QUEUE USAGE
// ================================

/**
 * Example 3: Using the retry queue for multiple failed operations
 */
export function retryQueueExample(): void {
  const errorManager = new ErrorHandlingManager({
    retry: {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      jitterFactor: 0.1,
    },
    maxRetryQueueSize: 50,
  });

  // Note: Event listeners are available but specific retry events are not yet implemented
  // The ErrorHandlingManager extends BrowserEventEmitter and supports:
  // - errorManager.on(event, handler)
  // - errorManager.once(event, handler)
  // - errorManager.removeListener(event, handler)
  //
  // Future event types (not yet implemented):
  // - "retry_queued" - When an operation is queued for retry
  // - "retry_executing" - When a retry attempt starts
  // - "retry_success" - When a retry succeeds
  // - "retry_failed" - When a retry fails
  // - "retry_exhausted" - When all retry attempts are exhausted

  // Queue multiple operations for retry
  async function queueMultipleRetries() {
    const operations = [
      { name: "sync_favorites", priority: 10 },
      { name: "sync_downloads", priority: 5 },
      { name: "sync_orders", priority: 8 },
    ];

    for (const op of operations) {
      const error = await errorManager.handleError(new Error(`Failed to ${op.name}`), {
        component: "RetryQueue",
        action: op.name,
      });

      // Queue the operation for retry with priority
      const queueItemId = errorManager.queueRetry(
        error,
        async () => {
          console.log(`Retrying ${op.name}...`);
          const success = Math.random() > 0.3; // 70% success rate
          return success;
        },
        op.priority
      );

      console.log(`Queued ${op.name} with ID: ${queueItemId}`);
    }

    const status = errorManager.getRetryQueueStatus();
    console.log(`Retry queue status:`, status);
  }

  void queueMultipleRetries();
}

// ================================
// MANUAL RETRY CONTROL
// ================================

/**
 * Example 4: Manual retry control
 */
export function manualRetryControlExample(): void {
  const errorManager = new ErrorHandlingManager({
    autoRetry: false, // Disable automatic retries
    retry: {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      jitterFactor: 0.1,
    },
  });

  async function manualRetryFlow() {
    const error = await errorManager.handleError(new Error("Manual retry test"), {
      component: "ManualRetry",
      action: "manual_sync",
    });

    console.log(`Error handled: ${error.fingerprint}`);

    const queueItemId = errorManager.queueRetry(
      error,
      async () => {
        console.log("Executing manual retry...");
        return true;
      },
      10
    );

    console.log(`Manually queued retry: ${queueItemId}`);

    setTimeout(() => {
      const cancelled = errorManager.cancelRetry(queueItemId);
      console.log(`Retry cancelled: ${cancelled}`);
    }, 500);
  }

  void manualRetryFlow();
}

// ================================
// RECOVERY STATUS MONITORING
// ================================

/**
 * Example 5: Monitor recovery status and retry attempts
 */
export function recoveryStatusExample(): void {
  const errorManager = new ErrorHandlingManager();

  async function monitorRecovery() {
    const error = await errorManager.handleError(new Error("Test error"), {
      component: "RecoveryMonitor",
      action: "test_sync",
    });

    const status = errorManager.getRecoveryStatus(error.fingerprint);
    console.log("Recovery status:", {
      inProgress: status.inProgress,
      totalAttempts: status.attempts.length,
      canRetry: status.canRetry,
      nextAttemptAt: status.nextAttemptAt ? new Date(status.nextAttemptAt).toISOString() : "N/A",
    });

    const queueStatus = errorManager.getRetryQueueStatus();
    console.log("Retry queue:", {
      size: queueStatus.size,
      processing: queueStatus.processing,
      items: queueStatus.items,
    });
  }

  void monitorRecovery();
}

// ================================
// ERROR ANALYTICS WITH RETRY METRICS
// ================================

/**
 * Example 6: Analyze errors and retry patterns
 */
export function errorAnalyticsExample(): void {
  const errorManager = new ErrorHandlingManager();

  async function simulateErrors() {
    for (let i = 0; i < 10; i++) {
      await errorManager.handleError(new Error(`Test error ${i}`), {
        component: "Analytics",
        action: `test_operation_${i}`,
      });
    }

    const analytics = errorManager.getErrorAnalytics();
    console.log("Error Analytics:", {
      totalErrors: analytics.totalErrors,
      errorsByType: analytics.errorsByType,
      recoverySuccessRate: `${analytics.recoverySuccessRate.toFixed(2)}%`,
      averageRecoveryTime: `${analytics.averageRecoveryTime.toFixed(0)}ms`,
      topErrors: analytics.topErrorFingerprints,
    });
  }

  void simulateErrors();
}

// ================================
// CLEANUP AND LIFECYCLE
// ================================

/**
 * Example 7: Proper cleanup and lifecycle management
 */
export function lifecycleExample(): void {
  const errorManager = new ErrorHandlingManager();

  async function performCleanup() {
    await errorManager.handleError(new Error("Test error"), {
      component: "Lifecycle",
      action: "test",
    });

    errorManager.clearRetryQueue();
    errorManager.clearErrorHistory();
    errorManager.destroy();
  }

  void performCleanup();
}

// ================================
// INTEGRATION WITH DASHBOARD
// ================================

/**
 * Example 8: Integration with dashboard sync operations
 */
export function dashboardIntegrationExample(): void {
  const errorManager = new ErrorHandlingManager({
    retry: {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      jitterFactor: 0.1,
    },
    notifications: {
      showToasts: true,
      showRecoveryProgress: true,
      autoDismissTimeout: 5000,
    },
  });

  async function syncDashboardData() {
    try {
      const response = await fetch("/api/dashboard/sync");
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      const enhancedError = await errorManager.handleError(error, {
        component: "DashboardSync",
        action: "dashboard_sync",
        userId: "current_user_id",
      });

      if (!errorManager.getRecoveryStatus(enhancedError.fingerprint).inProgress) {
        errorManager.queueRetry(
          enhancedError,
          async () => {
            const retryResponse = await fetch("/api/dashboard/sync");
            return retryResponse.ok;
          },
          10
        );
      }

      throw enhancedError;
    }
  }

  void syncDashboardData();
}
