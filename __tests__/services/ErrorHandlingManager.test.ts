/**
 * Error Handling Manager Tests
 *
 * Comprehensive test suite for the enhanced error handling and recovery system.
 * Tests error classification, recovery strategies, user actions, and logging.
 */

import { ErrorHandlingManager, type ErrorHandlingConfig } from "@/services/ErrorHandlingManager";

describe("ErrorHandlingManager", () => {
  let errorManager: ErrorHandlingManager;
  let mockConfig: Partial<ErrorHandlingConfig>;

  beforeEach(() => {
    mockConfig = {
      maxErrorHistory: 10,
      deduplicationWindow: 1000,
      autoRetry: true,
      maxAutoRetries: 2,
      baseRetryDelay: 100,
      maxRetryDelay: 1000,
      logging: {
        console: false,
        remote: false,
        logLevel: "error",
        includeStackTrace: true,
        includeUserData: false,
        maxLogEntries: 100,
      },
      notifications: {
        showToasts: false,
        showRecoveryProgress: false,
        autoDismissTimeout: 1000,
      },
    };

    errorManager = new ErrorHandlingManager(mockConfig);
  });

  afterEach(() => {
    errorManager.destroy();
  });

  describe("Error Classification", () => {
    it("should classify network errors correctly", async () => {
      const networkError = new Error("Network request failed");
      networkError.name = "NetworkError";

      const enhancedError = await errorManager.handleError(networkError, {
        component: "test_component",
        action: "test_action",
      });

      expect(enhancedError.type).toBe("network_error");
      expect(enhancedError.category).toBe("connection");
      expect(enhancedError.severity).toBe("low");
      expect(enhancedError.retryable).toBe(true);
      expect(enhancedError.recoveryStrategy).toBe("exponential_backoff");
    });

    it("should classify authentication errors correctly", async () => {
      const authError = new Error("Authentication failed: 401 Unauthorized");

      const enhancedError = await errorManager.handleError(authError, {
        component: "test_component",
        action: "test_action",
      });

      expect(enhancedError.type).toBe("auth_error");
      expect(enhancedError.category).toBe("auth");
      expect(enhancedError.severity).toBe("critical");
      expect(enhancedError.retryable).toBe(false);
      expect(enhancedError.recoveryStrategy).toBe("user_intervention");
    });

    it("should classify websocket errors correctly", async () => {
      const wsError = new Error("WebSocket connection failed");

      const enhancedError = await errorManager.handleError(wsError, {
        component: "test_component",
        action: "test_action",
      });

      expect(enhancedError.type).toBe("websocket_error");
      expect(enhancedError.category).toBe("connection");
      expect(enhancedError.severity).toBe("medium");
      expect(enhancedError.retryable).toBe(true);
      expect(enhancedError.recoveryStrategy).toBe("fallback_connection");
    });

    it("should classify data inconsistency errors correctly", async () => {
      const dataError = new Error("Data inconsistency detected: mismatch in user stats");

      const enhancedError = await errorManager.handleError(dataError, {
        component: "test_component",
        action: "test_action",
      });

      expect(enhancedError.type).toBe("data_inconsistency");
      expect(enhancedError.category).toBe("data");
      expect(enhancedError.severity).toBe("high");
      expect(enhancedError.retryable).toBe(true);
      expect(enhancedError.recoveryStrategy).toBe("force_sync");
    });

    it("should generate appropriate user messages", async () => {
      const networkError = new Error("Connection timeout");
      const enhancedError = await errorManager.handleError(networkError);

      expect(enhancedError.userMessage).toContain("Connection issue detected");
      expect(enhancedError.userActions).toHaveLength(2); // Dismiss + Retry
      expect(enhancedError.userActions.some(action => action.type === "retry")).toBe(true);
      expect(enhancedError.userActions.some(action => action.type === "dismiss")).toBe(true);
    });
  });

  describe("Error Deduplication", () => {
    it("should detect and skip duplicate errors within deduplication window", async () => {
      const error1 = new Error("Same error message");
      const error2 = new Error("Same error message");

      const enhancedError1 = await errorManager.handleError(error1);
      const enhancedError2 = await errorManager.handleError(error2);

      // Both should have the same fingerprint
      expect(enhancedError1.fingerprint).toBe(enhancedError2.fingerprint);

      // Analytics should show only one error due to deduplication
      const analytics = errorManager.getErrorAnalytics();
      expect(analytics.totalErrors).toBe(1);
    });

    it("should allow duplicate errors after deduplication window", async () => {
      const error1 = new Error("Same error message");

      await errorManager.handleError(error1);

      // Wait for deduplication window to pass
      await new Promise(resolve => setTimeout(resolve, mockConfig.deduplicationWindow! + 100));

      const error2 = new Error("Same error message");
      await errorManager.handleError(error2);

      const analytics = errorManager.getErrorAnalytics();
      expect(analytics.totalErrors).toBe(2);
    });
  });

  describe("Recovery Management", () => {
    it("should attempt automatic recovery for retryable errors", async () => {
      const retryableError = new Error("Temporary network issue");

      const recoveryStartedSpy = jest.fn();
      errorManager.on("recovery_started", recoveryStartedSpy);

      await errorManager.handleError(retryableError);

      // Should schedule recovery for retryable error
      expect(recoveryStartedSpy).toHaveBeenCalled();
    });

    it("should not attempt recovery for non-retryable errors", async () => {
      const nonRetryableError = new Error("Authentication failed: invalid token");

      const recoveryStartedSpy = jest.fn();
      errorManager.on("recovery_started", recoveryStartedSpy);

      await errorManager.handleError(nonRetryableError);

      // Should not schedule recovery for non-retryable error
      expect(recoveryStartedSpy).not.toHaveBeenCalled();
    });

    it("should track recovery attempts correctly", async () => {
      const error = new Error("Network timeout");
      const enhancedError = await errorManager.handleError(error);

      const success = await errorManager.attemptRecovery(enhancedError.fingerprint);
      expect(success).toBe(true);

      const recoveryStatus = errorManager.getRecoveryStatus(enhancedError.fingerprint);
      expect(recoveryStatus.attempts).toHaveLength(1);
      expect(recoveryStatus.attempts[0].strategy).toBe("exponential_backoff");
    });

    it("should respect maximum retry attempts", async () => {
      const error = new Error("Persistent network issue");
      const enhancedError = await errorManager.handleError(error);

      // Attempt recovery multiple times
      for (let i = 0; i < mockConfig.maxAutoRetries! + 2; i++) {
        await errorManager.attemptRecovery(enhancedError.fingerprint);
      }

      const recoveryStatus = errorManager.getRecoveryStatus(enhancedError.fingerprint);
      expect(recoveryStatus.attempts.length).toBeLessThanOrEqual(mockConfig.maxAutoRetries!);
      expect(recoveryStatus.canRetry).toBe(false);
    });
  });

  describe("User Actions", () => {
    it("should provide appropriate user actions for different error types", async () => {
      const networkError = new Error("Network connection failed");
      const enhancedError = await errorManager.handleError(networkError);

      const userActions = errorManager.getUserActions(enhancedError.fingerprint);

      expect(userActions).toHaveLength(2);
      expect(userActions.some(action => action.id === "retry")).toBe(true);
      expect(userActions.some(action => action.id === "dismiss")).toBe(true);
    });

    it("should execute user actions successfully", async () => {
      const error = new Error("Test error");
      const enhancedError = await errorManager.handleError(error);

      const userActionSpy = jest.fn();
      errorManager.on("user_action", userActionSpy);

      const success = await errorManager.executeUserAction(enhancedError.fingerprint, "dismiss");
      expect(success).toBe(true);
      expect(userActionSpy).toHaveBeenCalledWith({
        action: "dismiss",
        errorId: enhancedError.fingerprint,
      });
    });

    it("should handle invalid user actions gracefully", async () => {
      const error = new Error("Test error");
      const enhancedError = await errorManager.handleError(error);

      const success = await errorManager.executeUserAction(
        enhancedError.fingerprint,
        "invalid_action"
      );
      expect(success).toBe(false);
    });
  });

  describe("Error Analytics", () => {
    it("should provide comprehensive error analytics", async () => {
      // Create different types of errors
      await errorManager.handleError(new Error("Network error 1"));
      await errorManager.handleError(new Error("Network error 2"));
      await errorManager.handleError(new Error("Authentication failed: 401"));
      await errorManager.handleError(new Error("WebSocket connection lost"));

      const analytics = errorManager.getErrorAnalytics();

      expect(analytics.totalErrors).toBe(4);
      expect(analytics.errorsByType["network_error"]).toBe(2);
      expect(analytics.errorsByType["auth_error"]).toBe(1);
      expect(analytics.errorsByType["websocket_error"]).toBe(1);
      expect(analytics.errorsBySeverity["low"]).toBe(2); // Network errors
      expect(analytics.errorsBySeverity["critical"]).toBe(1); // Auth error
      expect(analytics.errorsBySeverity["medium"]).toBe(1); // WebSocket error
    });

    it("should calculate recovery success rate correctly", async () => {
      const error1 = new Error("Recoverable error 1");
      const error2 = new Error("Recoverable error 2");

      const enhancedError1 = await errorManager.handleError(error1);
      const enhancedError2 = await errorManager.handleError(error2);

      // Simulate successful recovery for first error
      await errorManager.attemptRecovery(enhancedError1.fingerprint);

      // Simulate failed recovery for second error
      await errorManager.attemptRecovery(enhancedError2.fingerprint);

      const analytics = errorManager.getErrorAnalytics();
      expect(analytics.recoverySuccessRate).toBeGreaterThan(0);
    });
  });

  describe("Error History Management", () => {
    it("should maintain error history within limits", async () => {
      // Create more errors than the maximum history limit
      for (let i = 0; i < mockConfig.maxErrorHistory! + 5; i++) {
        await errorManager.handleError(new Error(`Error ${i}`));
      }

      const analytics = errorManager.getErrorAnalytics();
      expect(analytics.totalErrors).toBe(mockConfig.maxErrorHistory);
    });

    it("should clear error history when requested", async () => {
      await errorManager.handleError(new Error("Test error 1"));
      await errorManager.handleError(new Error("Test error 2"));

      let analytics = errorManager.getErrorAnalytics();
      expect(analytics.totalErrors).toBe(2);

      errorManager.clearErrorHistory();

      analytics = errorManager.getErrorAnalytics();
      expect(analytics.totalErrors).toBe(0);
    });
  });

  describe("Technical Details", () => {
    it("should capture comprehensive technical details", async () => {
      const error = new Error("Test error with stack trace");
      const enhancedError = await errorManager.handleError(error, {
        component: "test_component",
        action: "test_action",
        userId: "test_user_123",
      });

      expect(enhancedError.technicalDetails).toBeDefined();
      expect(enhancedError.technicalDetails.environment).toBeDefined();
      expect(enhancedError.technicalDetails.environment.userAgent).toBeDefined();
      expect(enhancedError.technicalDetails.environment.url).toBeDefined();
      expect(enhancedError.technicalDetails.environment.onlineStatus).toBeDefined();
      expect(enhancedError.technicalDetails.additionalContext).toMatchObject({
        component: "test_component",
        action: "test_action",
        userId: "test_user_123",
      });
    });

    it("should generate unique error fingerprints", async () => {
      const error1 = new Error("Unique error message 1");
      const error2 = new Error("Unique error message 2");

      const enhancedError1 = await errorManager.handleError(error1);
      const enhancedError2 = await errorManager.handleError(error2);

      expect(enhancedError1.fingerprint).not.toBe(enhancedError2.fingerprint);
      expect(enhancedError1.fingerprint).toHaveLength(16);
      expect(enhancedError2.fingerprint).toHaveLength(16);
    });
  });

  describe("Event Emission", () => {
    it("should emit appropriate events during error handling", async () => {
      const errorSpy = jest.fn();
      const dashboardEventSpy = jest.fn();

      errorManager.on("error", errorSpy);
      errorManager.on("dashboard_event", dashboardEventSpy);

      const error = new Error("Test error");
      await errorManager.handleError(error);

      expect(errorSpy).toHaveBeenCalled();
      expect(dashboardEventSpy).toHaveBeenCalled();

      const dashboardEvent = dashboardEventSpy.mock.calls[0][0];
      expect(dashboardEvent.type).toBe("error.sync");
      expect(dashboardEvent.priority).toBe("high");
    });

    it("should emit recovery events", async () => {
      const recoveryStartedSpy = jest.fn();
      const recoverySuccessSpy = jest.fn();

      errorManager.on("recovery_started", recoveryStartedSpy);
      errorManager.on("recovery_success", recoverySuccessSpy);

      const error = new Error("Recoverable error");
      const enhancedError = await errorManager.handleError(error);

      await errorManager.attemptRecovery(enhancedError.fingerprint);

      expect(recoveryStartedSpy).toHaveBeenCalled();
      expect(recoverySuccessSpy).toHaveBeenCalled();
    });
  });

  describe("Lifecycle Management", () => {
    it("should handle destruction gracefully", () => {
      const error = new Error("Test error");

      expect(() => {
        errorManager.destroy();
      }).not.toThrow();

      // Should throw error when trying to use destroyed manager
      expect(async () => {
        await errorManager.handleError(error);
      }).rejects.toThrow("ErrorHandlingManager has been destroyed");
    });

    it("should clean up resources on destruction", () => {
      const listenerCount = errorManager.listenerCount("error");

      errorManager.destroy();

      expect(errorManager.listenerCount("error")).toBe(0);
    });
  });
});
