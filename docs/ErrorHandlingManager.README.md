# ErrorHandlingManager - Enhanced Retry System

## Overview

The `ErrorHandlingManager` provides comprehensive error handling with automatic retry, exponential backoff, and a retry queue for managing multiple failed operations. This implementation satisfies task 21.1 requirements for the dashboard real-time data sync feature.

## Key Features

### 1. Configurable Retry Strategies

The error manager supports multiple retry strategies with fine-grained configuration:

```typescript
interface RetryConfig {
  enabled: boolean; // Enable/disable automatic retries
  maxAttempts: number; // Maximum retry attempts (default: 3)
  initialDelay: number; // Initial delay in ms (default: 1000ms = 1s)
  maxDelay: number; // Maximum delay in ms (default: 30000ms = 30s)
  backoffMultiplier: number; // Backoff multiplier (default: 2 for exponential)
  jitterEnabled: boolean; // Add random jitter to prevent thundering herd
  jitterFactor: number; // Maximum jitter percentage (default: 0.1 = 10%)
  retryableErrorTypes?: SyncErrorType[]; // Specific error types to retry
}
```

### 2. Exponential Backoff Calculation

The system implements exponential backoff with the following delay progression:

- **Attempt 1**: 1 second (1000ms)
- **Attempt 2**: 2 seconds (2000ms)
- **Attempt 3**: 4 seconds (4000ms)
- **Attempt 4**: 8 seconds (8000ms)
- **Attempt 5**: 16 seconds (16000ms)
- **Attempt 6+**: 30 seconds (capped at maxDelay)

Formula: `delay = min(initialDelay × (backoffMultiplier ^ attemptNumber), maxDelay)`

With jitter enabled, a random variance of ±10% is added to prevent thundering herd problems.

### 3. Retry Queue

The retry queue manages multiple failed operations with priority-based scheduling:

```typescript
interface RetryQueueItem {
  id: string; // Unique identifier
  error: EnhancedSyncError; // Error that triggered retry
  strategy: RecoveryStrategy; // Recovery strategy to use
  attemptNumber: number; // Current attempt number
  scheduledAt: number; // Scheduled retry time
  operation: () => Promise<boolean>; // Operation to retry
  priority: number; // Priority level (higher = more urgent)
}
```

**Queue Features:**

- Priority-based ordering (higher priority operations execute first)
- Time-based scheduling (operations execute at scheduled time)
- Automatic queue processing
- Maximum queue size limit (default: 50 items)
- Lowest priority item removal when queue is full

### 4. Retry Limit

The system enforces a maximum of **3 retry attempts** before showing a permanent error to the user. This prevents infinite retry loops and provides a clear failure state.

## Usage Examples

### Basic Usage with Default Configuration

```typescript
import { ErrorHandlingManager } from "./ErrorHandlingManager";

const errorManager = new ErrorHandlingManager();

async function syncData() {
  try {
    // Your operation
    await fetchDashboardData();
  } catch (error) {
    // Automatically retries with exponential backoff
    await errorManager.handleError(error, {
      component: "Dashboard",
      action: "sync_data",
    });
  }
}
```

### Custom Retry Configuration

```typescript
const errorManager = new ErrorHandlingManager({
  retry: {
    enabled: true,
    maxAttempts: 3, // Max 3 attempts
    initialDelay: 1000, // Start at 1s
    maxDelay: 30000, // Cap at 30s
    backoffMultiplier: 2, // Exponential (2^n)
    jitterEnabled: true, // Add jitter
    jitterFactor: 0.1, // ±10% variance
  },
  maxRetryQueueSize: 100, // Allow 100 queued operations
});
```

### Manual Retry Queue Management

```typescript
// Queue an operation for retry
const queueItemId = errorManager.queueRetry(
  error,
  async () => {
    // Your retry operation
    return await retrySync();
  },
  10 // Priority (higher = more urgent)
);

// Check queue status
const status = errorManager.getRetryQueueStatus();
console.log(`Queue size: ${status.size}`);
console.log(`Processing: ${status.processing}`);

// Cancel a queued retry
errorManager.cancelRetry(queueItemId);

// Clear entire queue
errorManager.clearRetryQueue();
```

### Calculate Backoff Delays

```typescript
// Calculate delay for specific attempt
const delay = errorManager.calculateExponentialBackoff(attemptNumber);

// Example delays:
// Attempt 0: ~1000ms (1s)
// Attempt 1: ~2000ms (2s)
// Attempt 2: ~4000ms (4s)
// Attempt 3: ~8000ms (8s)
// Attempt 4: ~16000ms (16s)
// Attempt 5+: ~30000ms (30s, capped)
```

### Monitor Retry Events

```typescript
errorManager.on("retry_queued", ({ queueSize }) => {
  console.log(`Operation queued. Queue size: ${queueSize}`);
});

errorManager.on("retry_executing", ({ errorId, attemptNumber }) => {
  console.log(`Executing retry attempt ${attemptNumber}`);
});

errorManager.on("retry_success", ({ errorId, attemptNumber }) => {
  console.log(`Retry succeeded on attempt ${attemptNumber}`);
});

errorManager.on("retry_failed", ({ errorId, attemptNumber }) => {
  console.log(`Retry failed on attempt ${attemptNumber}`);
});

errorManager.on("retry_exhausted", ({ errorId, totalAttempts }) => {
  console.log(`All ${totalAttempts} attempts exhausted`);
  // Show permanent error to user
});
```

## Integration with Dashboard Sync

The ErrorHandlingManager integrates seamlessly with the dashboard real-time sync system:

```typescript
import { getErrorHandlingManager } from "./ErrorHandlingManager";

const errorManager = getErrorHandlingManager({
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

// In your sync service
async function syncDashboardData() {
  try {
    const response = await fetch("/api/dashboard/sync");
    if (!response.ok) throw new Error("Sync failed");
    return await response.json();
  } catch (error) {
    const enhancedError = await errorManager.handleError(error, {
      component: "DashboardSync",
      action: "sync_data",
      userId: currentUserId,
    });

    // Queue for retry with high priority
    errorManager.queueRetry(
      enhancedError,
      async () => {
        const retryResponse = await fetch("/api/dashboard/sync");
        return retryResponse.ok;
      },
      10 // High priority
    );

    throw enhancedError;
  }
}
```

## Recovery Status Monitoring

```typescript
// Get recovery status for an error
const status = errorManager.getRecoveryStatus(errorId);

console.log({
  inProgress: status.inProgress,
  totalAttempts: status.attempts.length,
  canRetry: status.canRetry,
  nextAttemptAt: status.nextAttemptAt,
});

// Get retry queue status
const queueStatus = errorManager.getRetryQueueStatus();

console.log({
  size: queueStatus.size,
  processing: queueStatus.processing,
  items: queueStatus.items,
});
```

## Error Analytics

```typescript
const analytics = errorManager.getErrorAnalytics();

console.log({
  totalErrors: analytics.totalErrors,
  errorsByType: analytics.errorsByType,
  recoverySuccessRate: analytics.recoverySuccessRate,
  averageRecoveryTime: analytics.averageRecoveryTime,
  topErrors: analytics.topErrorFingerprints,
});
```

## Lifecycle Management

```typescript
// Create instance
const errorManager = new ErrorHandlingManager();

// Use throughout application lifecycle
await errorManager.handleError(error);

// Clear retry queue when needed
errorManager.clearRetryQueue();

// Clear error history
errorManager.clearErrorHistory();

// Destroy when done (e.g., component unmount)
errorManager.destroy();
```

## Requirements Satisfied

This implementation satisfies all requirements from task 21.1:

✅ **Configurable retry strategies** - Full `RetryConfig` interface with all parameters  
✅ **Exponential backoff (1s, 2s, 4s, 8s, max 30s)** - Implemented with `calculateExponentialBackoff()`  
✅ **Retry queue for multiple operations** - Full `RetryQueue` implementation with priority scheduling  
✅ **Retry limit (max 3 attempts)** - Enforced via `maxAttempts` configuration  
✅ **Requirements 9.2, 10.2** - Automatic error recovery and graceful degradation

## API Reference

### Constructor

```typescript
new ErrorHandlingManager(config?: Partial<ErrorHandlingConfig>)
```

### Methods

- `handleError(error, context)` - Handle and classify an error
- `queueRetry(error, operation, priority)` - Queue an operation for retry
- `cancelRetry(queueItemId)` - Cancel a queued retry
- `getRetryQueueStatus()` - Get current queue status
- `clearRetryQueue()` - Clear all queued retries
- `calculateExponentialBackoff(attemptNumber)` - Calculate backoff delay
- `getRecoveryStatus(errorId)` - Get recovery status for an error
- `getErrorAnalytics()` - Get error statistics and patterns
- `clearErrorHistory()` - Clear error history
- `destroy()` - Cleanup and destroy manager

### Events

- `retry_queued` - Operation queued for retry
- `retry_executing` - Retry execution started
- `retry_success` - Retry succeeded
- `retry_failed` - Retry failed
- `retry_exhausted` - All retry attempts exhausted
- `retry_cancelled` - Retry cancelled
- `retry_queue_cleared` - Queue cleared
- `retry_error` - Error during retry execution

## Best Practices

1. **Use singleton pattern** - Use `getErrorHandlingManager()` for consistent instance
2. **Set appropriate priorities** - Higher priority for critical operations (dashboard sync)
3. **Monitor retry events** - Listen to events for user feedback
4. **Clean up on unmount** - Call `destroy()` when component unmounts
5. **Configure for your use case** - Adjust retry config based on operation type
6. **Handle exhausted retries** - Show permanent error UI when retries are exhausted

## See Also

- [ErrorHandlingManager.example.ts](../examples/ErrorHandlingManager.example.ts) - Comprehensive usage examples
- [Task 21.1 Specification](../.kiro/specs/dashboard-realtime-data-sync/tasks.md) - Original requirements
- [Design Document](../.kiro/specs/dashboard-realtime-data-sync/design.md) - Architecture details
