/**
 * Service Visibility Manager
 *
 * Provides visibility-aware interval management for singleton services.
 * Automatically pauses intervals when tab is hidden and resumes with
 * staggered delays when tab becomes visible to prevent "thundering herd".
 *
 * @example
 * ```typescript
 * class MyService {
 *   private visibilityManager = new ServiceVisibilityManager('MyService');
 *
 *   start() {
 *     this.visibilityManager.createInterval('heartbeat', () => {
 *       this.sendHeartbeat();
 *     }, 30000);
 *   }
 *
 *   destroy() {
 *     this.visibilityManager.destroy();
 *   }
 * }
 * ```
 */

export interface VisibilityAwareInterval {
  id: string;
  callback: () => void;
  interval: number;
  timerId: NodeJS.Timeout | null;
  isPaused: boolean;
  lastRun: number;
}

export interface ServiceVisibilityConfig {
  /** Base delay before resuming intervals when tab becomes visible (ms) */
  resumeBaseDelay: number;
  /** Random range added to base delay to stagger multiple services (ms) */
  resumeStaggerRange: number;
  /** Minimum time tab must be visible before resuming (ms) */
  minVisibleTime: number;
  /** Enable debug logging */
  debug: boolean;
}

const DEFAULT_CONFIG: ServiceVisibilityConfig = {
  resumeBaseDelay: 500,
  resumeStaggerRange: 1000,
  minVisibleTime: 300,
  debug: false,
};

/**
 * Manages visibility-aware intervals for a service
 */
export class ServiceVisibilityManager {
  private readonly intervals = new Map<string, VisibilityAwareInterval>();
  private readonly config: ServiceVisibilityConfig;
  private readonly serviceName: string;
  private isVisible: boolean;
  private lastVisibilityChange: number;
  private visibilityHandler: (() => void) | null = null;
  private resumeTimeouts: NodeJS.Timeout[] = [];
  private isDestroyed = false;

  constructor(serviceName: string, config: Partial<ServiceVisibilityConfig> = {}) {
    this.serviceName = serviceName;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isVisible = typeof document !== "undefined" ? !document.hidden : true;
    this.lastVisibilityChange = Date.now();

    this.setupVisibilityListener();
  }

  /**
   * Create a visibility-aware interval
   * Automatically pauses when tab is hidden and resumes when visible
   */
  public createInterval(id: string, callback: () => void, interval: number): void {
    if (this.isDestroyed) {
      this.log(`Cannot create interval '${id}' - manager is destroyed`);
      return;
    }

    // Clear existing interval with same id
    this.clearInterval(id);

    const intervalData: VisibilityAwareInterval = {
      id,
      callback,
      interval,
      timerId: null,
      isPaused: !this.isVisible,
      lastRun: 0,
    };

    this.intervals.set(id, intervalData);

    // Start immediately if visible
    if (this.isVisible) {
      this.startInterval(intervalData);
    }

    this.log(`Created interval '${id}' with ${interval}ms period`);
  }

  /**
   * Clear a specific interval
   */
  public clearInterval(id: string): void {
    const intervalData = this.intervals.get(id);
    if (intervalData) {
      this.stopInterval(intervalData);
      this.intervals.delete(id);
      this.log(`Cleared interval '${id}'`);
    }
  }

  /**
   * Clear all intervals
   */
  public clearAllIntervals(): void {
    for (const intervalData of this.intervals.values()) {
      this.stopInterval(intervalData);
    }
    this.intervals.clear();
    this.log("Cleared all intervals");
  }

  /**
   * Pause all intervals (manual control)
   */
  public pauseAll(): void {
    for (const intervalData of this.intervals.values()) {
      this.stopInterval(intervalData);
      intervalData.isPaused = true;
    }
    this.log("Paused all intervals");
  }

  /**
   * Resume all intervals (manual control)
   */
  public resumeAll(): void {
    for (const intervalData of this.intervals.values()) {
      if (intervalData.isPaused && this.isVisible) {
        intervalData.isPaused = false;
        this.startInterval(intervalData);
      }
    }
    this.log("Resumed all intervals");
  }

  /**
   * Check if tab is currently visible
   */
  public isTabVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get time since last visibility change
   */
  public getTimeSinceVisibilityChange(): number {
    return Date.now() - this.lastVisibilityChange;
  }

  /**
   * Destroy the manager and clean up all resources
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clear all intervals
    this.clearAllIntervals();

    // Clear resume timeouts
    for (const timeout of this.resumeTimeouts) {
      clearTimeout(timeout);
    }
    this.resumeTimeouts = [];

    // Remove visibility listener
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    this.log("Destroyed");
  }

  // Private methods

  private setupVisibilityListener(): void {
    if (typeof document === "undefined") return;

    this.visibilityHandler = () => {
      const wasVisible = this.isVisible;
      this.isVisible = !document.hidden;
      this.lastVisibilityChange = Date.now();

      if (wasVisible === this.isVisible) return;

      if (this.isVisible) {
        this.handleTabVisible();
      } else {
        this.handleTabHidden();
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler, { passive: true });
  }

  private handleTabHidden(): void {
    this.log("Tab hidden - pausing all intervals");

    // Clear any pending resume timeouts
    for (const timeout of this.resumeTimeouts) {
      clearTimeout(timeout);
    }
    this.resumeTimeouts = [];

    // Pause all intervals
    for (const intervalData of this.intervals.values()) {
      this.stopInterval(intervalData);
      intervalData.isPaused = true;
    }
  }

  private handleTabVisible(): void {
    this.log("Tab visible - scheduling staggered resume");

    // Calculate staggered delay for this service
    const staggerDelay = Math.random() * this.config.resumeStaggerRange;
    const totalDelay = this.config.resumeBaseDelay + staggerDelay;

    const resumeTimeout = setTimeout(() => {
      // Verify tab is still visible and has been for minimum time
      if (!this.isVisible || this.isDestroyed) return;

      const visibleDuration = Date.now() - this.lastVisibilityChange;
      if (visibleDuration < this.config.minVisibleTime) {
        // Tab wasn't visible long enough, schedule another check
        const retryTimeout = setTimeout(
          () => {
            if (this.isVisible && !this.isDestroyed) {
              this.resumeIntervals();
            }
          },
          this.config.minVisibleTime - visibleDuration + 100
        );
        this.resumeTimeouts.push(retryTimeout);
        return;
      }

      this.resumeIntervals();
    }, totalDelay);

    this.resumeTimeouts.push(resumeTimeout);
  }

  private resumeIntervals(): void {
    this.log("Resuming intervals");

    for (const intervalData of this.intervals.values()) {
      if (intervalData.isPaused) {
        intervalData.isPaused = false;
        this.startInterval(intervalData);
      }
    }
  }

  private startInterval(intervalData: VisibilityAwareInterval): void {
    if (intervalData.timerId !== null) return;

    intervalData.timerId = setInterval(() => {
      // Double-check visibility before running callback
      if (!this.isVisible || this.isDestroyed) {
        this.stopInterval(intervalData);
        intervalData.isPaused = true;
        return;
      }

      try {
        intervalData.callback();
        intervalData.lastRun = Date.now();
      } catch (error) {
        console.error(`[${this.serviceName}] Interval '${intervalData.id}' callback error:`, error);
      }
    }, intervalData.interval);
  }

  private stopInterval(intervalData: VisibilityAwareInterval): void {
    if (intervalData.timerId !== null) {
      clearInterval(intervalData.timerId);
      intervalData.timerId = null;
    }
  }

  private log(message: string): void {
    if (
      this.config.debug ||
      (typeof process !== "undefined" && process.env?.NODE_ENV === "development")
    ) {
      console.log(`[ServiceVisibilityManager:${this.serviceName}] ${message}`);
    }
  }
}

/**
 * Create a visibility-aware interval outside of a class context
 * Returns a cleanup function
 */
export function createVisibilityAwareInterval(
  callback: () => void,
  interval: number,
  serviceName: string = "anonymous"
): () => void {
  const manager = new ServiceVisibilityManager(serviceName);
  manager.createInterval("main", callback, interval);

  return () => manager.destroy();
}

/**
 * Check if the current tab is visible
 */
export function isTabVisible(): boolean {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

/**
 * Subscribe to visibility changes
 * Returns an unsubscribe function
 */
export function onVisibilityChange(callback: (isVisible: boolean) => void): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const handler = (): void => {
    callback(!document.hidden);
  };

  document.addEventListener("visibilitychange", handler, { passive: true });

  return () => {
    document.removeEventListener("visibilitychange", handler);
  };
}
