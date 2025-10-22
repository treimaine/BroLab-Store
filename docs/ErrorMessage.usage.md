# ErrorMessage Component Usage Guide

## Overview

The `ErrorMessage` component displays user-friendly error messages with actionable recovery options for dashboard sync errors.

## Basic Usage

```tsx
import { ErrorMessage } from "@/components/dashboard/ErrorMessage";
import { SyncErrorType, type EnhancedSyncError } from "@shared/types/sync";

function MyComponent() {
  const error: EnhancedSyncError = {
    type: SyncErrorType.NETWORK_ERROR,
    message: "Failed to connect to server",
    timestamp: Date.now(),
    context: {},
    retryable: true,
    retryCount: 1,
    maxRetries: 3,
    fingerprint: "net_err_001",
    severity: "medium",
    category: "connection",
    recoveryStrategy: "exponential_backoff",
    userMessage: "Connection issue detected.",
    userActions: [],
    technicalDetails: {
      /* ... */
    },
  };

  return (
    <ErrorMessage
      error={error}
      onAction={async actionId => {
        console.log("Action executed:", actionId);
      }}
      onDismiss={() => {
        console.log("Error dismissed");
      }}
    />
  );
}
```

## Compact Mode

For displaying errors in a compact format (e.g., in a notification bar):

```tsx
<ErrorMessage error={error} compact={true} onAction={handleAction} onDismiss={handleDismiss} />
```

## With Technical Details

To show technical details by default:

```tsx
<ErrorMessage error={error} showTechnicalDetails={true} onAction={handleAction} />
```

## Integration with ErrorHandlingManager

```tsx
import { getErrorHandlingManager } from "@/services/ErrorHandlingManager";

function DashboardWithErrors() {
  const errorManager = getErrorHandlingManager();
  const [errors, setErrors] = useState<EnhancedSyncError[]>([]);

  useEffect(() => {
    const handleError = (error: EnhancedSyncError) => {
      setErrors(prev => [...prev, error]);
    };

    errorManager.on("error", handleError);
    return () => errorManager.off("error", handleError);
  }, []);

  const handleAction = async (error: EnhancedSyncError, actionId: string) => {
    switch (actionId) {
      case "retry":
        await errorManager.attemptRecovery(error.fingerprint);
        break;
      case "refresh":
        // Trigger data refresh
        break;
      case "dismiss":
        setErrors(prev => prev.filter(e => e.fingerprint !== error.fingerprint));
        break;
    }
  };

  return (
    <div className="space-y-4">
      {errors.map(error => (
        <ErrorMessage
          key={error.fingerprint}
          error={error}
          onAction={actionId => handleAction(error, actionId)}
          onDismiss={() => handleAction(error, "dismiss")}
        />
      ))}
    </div>
  );
}
```

## Error Types and Messages

The component automatically maps error types to user-friendly messages:

- **NETWORK_ERROR**: "Connection Lost" - Connection issues with automatic retry
- **WEBSOCKET_ERROR**: "Real-time Connection Issue" - WebSocket failures with fallback
- **AUTHENTICATION_ERROR**: "Session Expired" - Authentication failures requiring sign-in
- **DATA_INCONSISTENCY**: "Data Sync Issue" - Data mismatches with automatic fixing
- **VALIDATION_ERROR**: "Data Validation Failed" - Validation failures requiring refresh
- **CONFLICT_ERROR**: "Data Conflict Detected" - Concurrent modification conflicts
- **TIMEOUT_ERROR**: "Request Timed Out" - Timeout errors with automatic retry

## Recovery Actions

Each error type has specific recovery actions:

- **Retry Now**: Immediately retry the failed operation
- **Refresh Data**: Reload all dashboard data from the server
- **Reload Page**: Completely reload the page
- **Contact Support**: Open support dialog or redirect
- **Dismiss**: Hide the error message

## Styling

The component uses severity-based styling:

- **info**: Blue colors for informational messages
- **warning**: Yellow colors for warnings
- **error**: Red colors for errors
- **critical**: Dark red colors for critical errors

## Props

```typescript
interface ErrorMessageProps {
  error: EnhancedSyncError;
  onAction?: (actionId: string) => void | Promise<void>;
  onDismiss?: () => void;
  compact?: boolean;
  showTechnicalDetails?: boolean;
  className?: string;
}
```

## Best Practices

1. **Always provide onAction handler**: Handle user actions appropriately
2. **Use compact mode for notifications**: Better for non-intrusive error display
3. **Show technical details in development**: Helps with debugging
4. **Implement proper error recovery**: Connect actions to actual recovery logic
5. **Clear errors after successful recovery**: Remove errors from the UI when resolved
