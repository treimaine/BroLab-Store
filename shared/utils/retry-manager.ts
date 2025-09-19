// Retry manager with exponential backoff for system optimization

import { DEFAULT_RETRY_CONFIG, calculateBackoffDelay } from "../constants/errors";
import { RetryAttempt, RetryConfig, RetryManager } from "../types/system-optimization";
import { NetworkError } from "./error-handler";

// ================================
// RETRY MANAGER IMPLEMENTATION
// ================================

export class RetryManagerImpl implements RetryManager {
  private defaultConfig: RetryConfig;
  private retryHistory: Map<string, RetryAttempt[]> = new Map();
  private maxHistorySize = 1000;

  constructor(defaultConfig?: Partial<RetryConfig>) {
    this.defaultConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...defaultConfig,
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const operationId = this.generateOperationId();
    const attempts: RetryAttempt[] = [];

    let lastError: Error;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      const attemptStart = Date.now();

      try {
        const result = await operation();

        // Record successful attempt
        const successAttempt: RetryAttempt = {
          attemptNumber: attempt + 1,
          delay: 0,
          timestamp: attemptStart,
          success: true,
        };
        attempts.push(successAttempt);
        this.addToHistory(operationId, attempts);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const attemptEnd = Date.now();
        const attemptDuration = attemptEnd - attemptStart;

        // Record failed attempt
        const failedAttempt: RetryAttempt = {
          attemptNumber: attempt + 1,
          delay: attemptDuration,
          error: lastError,
          timestamp: attemptStart,
          success: false,
        };
        attempts.push(failedAttempt);

        // Check if we should retry
        if (attempt < finalConfig.maxRetries && finalConfig.retryCondition(lastError)) {
          const delay = calculateBackoffDelay(
            attempt,
            finalConfig.baseDelay,
            finalConfig.maxDelay,
            finalConfig.backoffFactor,
            finalConfig.jitter
          );

          // Call onRetry callback if provided
          if (finalConfig.onRetry) {
            finalConfig.onRetry(lastError, attempt + 1);
          }

          // Wait before retrying
          await this.sleep(delay);
        } else {
          // No more retries, record history and throw
          this.addToHistory(operationId, attempts);
          throw lastError;
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    this.addToHistory(operationId, attempts);
    throw lastError!;
  }

  getDefaultConfig(): RetryConfig {
    return { ...this.defaultConfig };
  }

  setDefaultConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  async getRetryHistory(operationId?: string): Promise<RetryAttempt[]> {
    if (operationId) {
      return this.retryHistory.get(operationId) || [];
    }

    // Return all history
    const allAttempts: RetryAttempt[] = [];
    Array.from(this.retryHistory.values()).forEach(attempts => {
      allAttempts.push(...attempts);
    });

    return allAttempts.sort((a, b) => b.timestamp - a.timestamp);
  }

  private generateOperationId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private addToHistory(operationId: string, attempts: RetryAttempt[]): void {
    this.retryHistory.set(operationId, [...attempts]);

    // Clean up old history if needed
    if (this.retryHistory.size > this.maxHistorySize) {
      const oldestKey = Array.from(this.retryHistory.keys())[0];
      if (oldestKey) {
        this.retryHistory.delete(oldestKey);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ================================
// SPECIALIZED RETRY FUNCTIONS
// ================================

export async function retryNetworkOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const retryManager = new RetryManagerImpl({
    maxRetries,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      return (
        error instanceof NetworkError ||
        error.message.includes("network") ||
        error.message.includes("fetch") ||
        error.message.includes("timeout")
      );
    },
  });

  return retryManager.executeWithRetry(operation);
}

export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  const retryManager = new RetryManagerImpl({
    maxRetries,
    baseDelay: 500,
    maxDelay: 5000,
    backoffFactor: 2,
    jitter: false,
    retryCondition: (error: Error) => {
      return (
        error.message.includes("database") ||
        error.message.includes("connection") ||
        error.message.includes("timeout")
      );
    },
  });

  return retryManager.executeWithRetry(operation);
}

export async function retryApiCall<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  const retryManager = new RetryManagerImpl({
    maxRetries,
    baseDelay: 2000,
    maxDelay: 20000,
    backoffFactor: 2.5,
    jitter: true,
    retryCondition: (error: Error) => {
      // Retry on 5xx errors, network errors, and timeouts
      const message = error.message.toLowerCase();
      return (
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("network") ||
        message.includes("timeout")
      );
    },
  });

  return retryManager.executeWithRetry(operation);
}

// ================================
// RETRY DECORATORS
// ================================

export function withRetry<T extends unknown[], R>(config?: Partial<RetryConfig>) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      throw new Error("Retry decorator can only be applied to methods");
    }

    descriptor.value = async function (...args: T): Promise<R> {
      const retryManager = new RetryManagerImpl(config);
      return retryManager.executeWithRetry(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// ================================
// CIRCUIT BREAKER PATTERN
// ================================

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.state = "closed";
    this.lastFailureTime = 0;
  }
}

// ================================
// BULK RETRY OPERATIONS
// ================================

export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  config?: Partial<RetryConfig>
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const retryManager = new RetryManagerImpl(config);

  const results = await Promise.allSettled(
    operations.map(operation => retryManager.executeWithRetry(operation))
  );

  return results.map(result => {
    if (result.status === "fulfilled") {
      return { success: true, result: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

export async function retrySequential<T>(
  operations: Array<() => Promise<T>>,
  config?: Partial<RetryConfig>
): Promise<T[]> {
  const retryManager = new RetryManagerImpl(config);
  const results: T[] = [];

  for (const operation of operations) {
    const result = await retryManager.executeWithRetry(operation);
    results.push(result);
  }

  return results;
}

// Export singleton instance
export const retryManager = new RetryManagerImpl();
