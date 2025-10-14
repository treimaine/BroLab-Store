import type { NextFunction, Request, Response } from "express";

// import { supabaseAdmin } from './supabaseAdmin'; // Removed - using Convex for data

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
  private metrics: Map<string, MetricValue> = new Map();
  private healthChecks: HealthCheck[] = [];
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();

  // Database health check
  async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // TODO: Implement with Convex
      // const { data, error } = await supabaseAdmin
      //   .from('users')
      //   .select('id')
      //   .limit(1)
      //   .single();

      // const responseTime = Date.now() - startTime;

      // if (error && error.code !== 'PGRST116') {
      //   throw error;
      // }

      // return {
      //   service: 'database',
      //   status: 'healthy',
      //   responseTime,
      //   timestamp: new Date().toISOString()
      // };

      // Placeholder implementation
      const responseTime = Date.now() - startTime;
      return {
        service: "database",
        status: "healthy",
        responseTime,
        timestamp: new Date().toISOString(),
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

  // Storage service health check
  async checkStorageHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // TODO: Implement with Convex
      // const { data, error } = await supabaseAdmin.storage
      //   .from('uploads')
      //   .list('', { limit: 1 });

      // const responseTime = Date.now() - startTime;

      // if (error) {
      //   throw error;
      // }

      // return {
      //   service: 'storage',
      //   status: 'healthy',
      //   responseTime,
      //   timestamp: new Date().toISOString()
      // };

      // Placeholder implementation
      const responseTime = Date.now() - startTime;
      return {
        service: "storage",
        status: "healthy",
        responseTime,
        timestamp: new Date().toISOString(),
      };
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
      const response = await fetch(`${process.env.VITE_WOOCOMMERCE_URL}/products?per_page=1`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.VITE_WC_KEY}:${process.env.VITE_WC_SECRET}`).toString("base64")}`,
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
      const keyMinute = parseInt(k.split(":")[0]);
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
      const keyMinute = parseInt(key.split(":")[0]);
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

  // Log system events
  async logSystemEvent(event: SystemEvent) {
    try {
      // TODO: Implement with Convex
      // await supabaseAdmin
      //   .from('activity_log')
      //   .insert({
      //     user_id: null,
      //     action: `system_${event.type}`,
      //     details: {
      //       service: event.service,
      //       message: event.message,
      //       ...event.details
      //     }
      //   });

      // Placeholder implementation - just log to console
      console.log(
        `[${event.type.toUpperCase()}] ${event.service}: ${event.message}`,
        event.details
      );
    } catch (error) {
      console.error("Failed to log system event:", error);
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
