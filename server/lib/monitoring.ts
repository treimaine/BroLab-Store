import type { NextFunction, Request, Response } from "express";

// System health monitoring
export interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  timestamp: string;
  error?: string;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
  lastCheck: string;
}

// Interface for system event logging
export interface SystemEvent {
  type: "error" | "warning" | "info";
  service: string;
  message: string;
  details?: Record<string, unknown>;
}

// Interface for performance metrics data
export interface PerformanceMetricsResult {
  metrics: SystemMetrics;
  healthChecks: HealthCheck[];
}

// Type for metric values stored in the metrics map
export type MetricValue = string | number | boolean | object;

// Extended Express interfaces for middleware
interface ExtendedRequest extends Request {
  path: string;
}

interface ExtendedResponse extends Response {
  statusCode: number;
  end: (...args: unknown[]) => this;
}

class MonitoringService {
  private readonly metrics: Map<string, MetricValue> = new Map();
  private healthChecks: HealthCheck[] = [];
  private readonly requestCounts: Map<string, number> = new Map();
  private readonly errorCounts: Map<string, number> = new Map();

  // Database health check using Convex
  async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const convex = getConvex();
      // Query health check endpoint to verify Convex connectivity
      const result = await convex.query(api.health.check.checkHealth);

      const responseTime = Date.now() - startTime;
      const isHealthy = result.status === "healthy";

      // Determine status based on health and response time
      let status: "healthy" | "degraded" | "down" = "healthy";
      if (!isHealthy) {
        status = "down";
      } else if (responseTime > 2000) {
        status = "degraded";
      }

      return {
        service: "database",
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        error: isHealthy ? undefined : "Database connectivity issue",
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown database error";
      return {
        service: "database",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  // Storage service health check using Convex storage
  async checkStorageHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Convex storage is integrated with the database
      // We verify connectivity by checking if we can access the Convex client
      const convex = getConvex();
      // Simple connectivity check - if getConvex() succeeds, storage is available
      if (convex) {
        const responseTime = Date.now() - startTime;
        return {
          service: "storage",
          status: responseTime > 1000 ? "degraded" : "healthy",
          responseTime,
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error("Convex client not available");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
      return {
        service: "storage",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  // External API health checks
  async checkWooCommerceHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const wcKey = process.env.VITE_WC_KEY || "";
      const wcSecret = process.env.VITE_WC_SECRET || "";
      const credentials = Buffer.from(`${wcKey}:${wcSecret}`).toString("base64");

      const response = await fetch(`${process.env.VITE_WOOCOMMERCE_URL}/products?per_page=1`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "User-Agent": "BroLab-Beats-Store/1.0",
        },
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        service: "woocommerce",
        status: responseTime > 3000 ? "degraded" : "healthy",
        responseTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown WooCommerce API error";
      return {
        service: "woocommerce",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  // Comprehensive health check
  async performHealthCheck(): Promise<HealthCheck[]> {
    const checks = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkStorageHealth(),
      this.checkWooCommerceHealth(),
    ]);

    this.healthChecks = checks;
    return checks;
  }

  // Request tracking
  trackRequest(endpoint: string, success: boolean) {
    const minute = Math.floor(Date.now() / 60000);
    const key = `${minute}:${endpoint}`;

    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    if (!success) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }

    // Cleanup old entries (keep last 5 minutes)
    const cutoff = minute - 5;
    Array.from(this.requestCounts.keys()).forEach(k => {
      const keyMinute = Number.parseInt(k.split(":")[0], 10);
      if (keyMinute < cutoff) {
        this.requestCounts.delete(k);
        this.errorCounts.delete(k);
      }
    });
  }

  // Get system metrics
  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);

    // Calculate requests per minute (last minute)
    let requestsPerMinute = 0;
    let errors = 0;

    Array.from(this.requestCounts.entries()).forEach(([key, count]) => {
      const keyMinute = Number.parseInt(key.split(":")[0], 10);
      if (keyMinute === currentMinute - 1) {
        requestsPerMinute += count;
        errors += this.errorCounts.get(key) || 0;
      }
    });

    const errorRate = requestsPerMinute > 0 ? (errors / requestsPerMinute) * 100 : 0;

    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeConnections: (this.metrics.get("activeConnections") as number) || 0,
      requestsPerMinute,
      errorRate,
      lastCheck: new Date().toISOString(),
    };
  }

  // Log system events to Convex
  async logSystemEvent(event: SystemEvent): Promise<void> {
    try {
      const convex = getConvex();
      await convex.mutation(api.audit.logAuditEvent, {
        action: `system_${event.type}`,
        resource: event.service,
        details: {
          message: event.message,
          ...event.details,
        },
      });

      // Also log to console for immediate visibility
      console.log(
        `[${event.type.toUpperCase()}] ${event.service}: ${event.message}`,
        event.details
      );
    } catch (error) {
      // Graceful degradation - log to console if Convex fails
      console.error("Failed to log system event to Convex:", error);
      console.log(
        `[${event.type.toUpperCase()}] ${event.service}: ${event.message}`,
        event.details
      );
    }
  }

  // Performance metrics collection
  async collectPerformanceMetrics(): Promise<PerformanceMetricsResult> {
    const metrics = this.getSystemMetrics();
    const healthChecks = await this.performHealthCheck();

    // Log degraded services
    const degradedServices = healthChecks.filter(
      check => check.status === "degraded" || check.status === "down"
    );

    for (const service of degradedServices) {
      await this.logSystemEvent({
        type: service.status === "down" ? "error" : "warning",
        service: service.service,
        message: `Service ${service.status}`,
        details: {
          responseTime: service.responseTime,
          error: service.error,
        },
      });
    }

    // Alert on high error rates
    if (metrics.errorRate > 10) {
      await this.logSystemEvent({
        type: "warning",
        service: "api",
        message: `High error rate detected: ${metrics.errorRate.toFixed(2)}%`,
        details: {
          requestsPerMinute: metrics.requestsPerMinute,
          errorRate: metrics.errorRate,
        },
      });
    }

    return { metrics, healthChecks };
  }

  // Express middleware for request tracking
  trackingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalEnd = res.end;

      res.end = (...args: unknown[]) => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;

        this.trackRequest((req as ExtendedRequest).path || req.url, success);

        // Log slow requests
        if (responseTime > 5000) {
          this.logSystemEvent({
            type: "warning",
            service: "api",
            message: `Slow request detected: ${req.method} ${(req as ExtendedRequest).path || req.url}`,
            details: {
              responseTime,
              statusCode: (res as ExtendedResponse).statusCode,
              userAgent: req.get ? req.get("User-Agent") : undefined,
            },
          }).catch(console.error);
        }

        return originalEnd.apply(res, args as Parameters<typeof originalEnd>);
      };

      next();
    };
  }
}

export const monitoring = new MonitoringService();
export default monitoring;
