# Performance Monitoring Runbook

## Overview

This runbook provides procedures for monitoring and troubleshooting performance issues in the BroLab Entertainment platform.

## Monitoring Stack

### 1. Performance Metrics

- **Web Vitals**: Core Web Vitals tracking
- **Lazy Loading**: Component load times and success rates
- **Bundle Analysis**: JavaScript chunk sizes and loading
- **API Performance**: Response times and error rates

### 2. Monitoring Tools

- **Built-in Monitoring**: Custom performance tracking
- **Browser DevTools**: Performance profiling
- **Lighthouse**: Automated performance audits
- **Bundle Analyzer**: Code splitting analysis

## Key Performance Indicators (KPIs)

### 1. Core Web Vitals

| Metric                             | Good    | Needs Improvement | Poor    |
| ---------------------------------- | ------- | ----------------- | ------- |
| **LCP** (Largest Contentful Paint) | ≤ 2.5s  | 2.5s - 4.0s       | > 4.0s  |
| **FID** (First Input Delay)        | ≤ 100ms | 100ms - 300ms     | > 300ms |
| **CLS** (Cumulative Layout Shift)  | ≤ 0.1   | 0.1 - 0.25        | > 0.25  |
| **TTFB** (Time to First Byte)      | ≤ 800ms | 800ms - 1.8s      | > 1.8s  |

### 2. Lazy Loading Metrics

| Metric                | Target   | Warning         | Critical |
| --------------------- | -------- | --------------- | -------- |
| **Average Load Time** | < 1000ms | 1000ms - 2000ms | > 2000ms |
| **Success Rate**      | > 99%    | 95% - 99%       | < 95%    |
| **Error Rate**        | < 1%     | 1% - 5%         | > 5%     |
| **Chunk Size**        | < 200KB  | 200KB - 500KB   | > 500KB  |

### 3. Bundle Performance

| Metric             | Target  | Warning     | Critical |
| ------------------ | ------- | ----------- | -------- |
| **Initial Bundle** | < 500KB | 500KB - 1MB | > 1MB    |
| **Total Bundle**   | < 2MB   | 2MB - 5MB   | > 5MB    |
| **Chunk Count**    | 5-15    | 15-25       | > 25     |

## Monitoring Procedures

### 1. Daily Performance Check

```bash
#!/bin/bash
# daily-performance-check.sh

echo "📊 Daily Performance Check - $(date)"

# 1. Check Web Vitals
echo "🔍 Checking Web Vitals..."
npx lighthouse https://brolab.com --only-categories=performance --output=json > performance-report.json

# Extract key metrics
LCP=$(jq '.audits["largest-contentful-paint"].numericValue' performance-report.json)
FID=$(jq '.audits["max-potential-fid"].numericValue' performance-report.json)
CLS=$(jq '.audits["cumulative-layout-shift"].numericValue' performance-report.json)

echo "LCP: ${LCP}ms"
echo "FID: ${FID}ms"
echo "CLS: ${CLS}"

# 2. Check lazy loading performance
echo "🚀 Checking lazy loading performance..."
node scripts/validate-lazy-loading.mjs

# 3. Check bundle sizes
echo "📦 Checking bundle sizes..."
node scripts/test-production-build.js

# 4. Check API performance
echo "🌐 Checking API performance..."
curl -w "@curl-format.txt" -o /dev/null -s https://brolab.com/api/health

echo "✅ Daily check completed"
```

### 2. Real-time Monitoring

```typescript
// Real-time performance monitoring
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  // Track Web Vitals
  trackWebVitals() {
    // LCP
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric("LCP", lastEntry.startTime);
    }).observe({ entryTypes: ["largest-contentful-paint"] });

    // FID
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.recordMetric("FID", entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ["first-input"] });

    // CLS
    let clsValue = 0;
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.recordMetric("CLS", clsValue);
        }
      });
    }).observe({ entryTypes: ["layout-shift"] });
  }

  // Record metric
  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }

    // Check thresholds
    this.checkThresholds(name, value);
  }

  // Check performance thresholds
  private checkThresholds(metric: string, value: number) {
    const thresholds = {
      LCP: { warning: 2500, critical: 4000 },
      FID: { warning: 100, critical: 300 },
      CLS: { warning: 0.1, critical: 0.25 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return;

    if (value > threshold.critical) {
      this.alertCritical(metric, value);
    } else if (value > threshold.warning) {
      this.alertWarning(metric, value);
    }
  }

  // Alert handlers
  private alertWarning(metric: string, value: number) {
    console.warn(`⚠️ Performance Warning: ${metric} = ${value}`);
    // Send to monitoring service
  }

  private alertCritical(metric: string, value: number) {
    console.error(`🚨 Performance Critical: ${metric} = ${value}`);
    // Send to alerting service
  }
}
```

## Troubleshooting Procedures

### 1. Slow Page Load Times

**Symptoms:**

- LCP > 4 seconds
- Users reporting slow loading
- High bounce rate

**Investigation Steps:**

```bash
# 1. Check bundle sizes
node scripts/test-production-build.js

# 2. Analyze network requests
npx lighthouse https://brolab.com --view

# 3. Check lazy loading performance
node scripts/validate-lazy-loading.mjs

# 4. Profile in browser
# Open DevTools > Performance > Record page load
```

**Common Causes & Solutions:**

1. **Large Bundle Size**

   ```bash
   # Analyze bundle
   ANALYZE=true npm run build

   # Solution: Implement more aggressive code splitting
   # Update vite.config.ts manualChunks configuration
   ```

2. **Inefficient Lazy Loading**

   ```typescript
   // Check lazy loading configuration
   const lazyStats = lazyLoadingMonitor.getStats();
   console.log('Lazy loading stats:', lazyStats);

   // Solution: Optimize preloading strategy
   <IntersectionLazyLoader
     rootMargin="200px" // Increase preload distance
     preloadDelay={1000} // Add preload delay
   />
   ```

3. **Network Issues**

   ```bash
   # Check CDN performance
   curl -w "@curl-format.txt" -o /dev/null -s https://cdn.brolab.com/assets/

   # Solution: Optimize CDN configuration or switch providers
   ```

### 2. High Memory Usage

**Symptoms:**

- Browser tab crashes
- Slow interactions
- Memory warnings in DevTools

**Investigation Steps:**

```bash
# 1. Check for memory leaks
node --inspect server/index.js

# 2. Profile memory usage in browser
# DevTools > Memory > Take heap snapshot

# 3. Check lazy loading cleanup
# Ensure components are properly unmounted
```

**Solutions:**

1. **Memory Leaks in Components**

   ```typescript
   // Ensure proper cleanup
   useEffect(() => {
     const cleanup = setupComponent();

     return () => {
       cleanup(); // Always cleanup
     };
   }, []);
   ```

2. **Large Component Caches**
   ```typescript
   // Implement cache size limits
   const cacheManager = new CacheManager({
     maxSize: 100, // Limit cache size
     ttl: 300000, // 5 minute TTL
   });
   ```

### 3. Failed Lazy Loading

**Symptoms:**

- Components not loading
- Error boundaries triggered
- High error rate in monitoring

**Investigation Steps:**

```typescript
// Check lazy loading errors
const stats = lazyLoadingMonitor.getStats();
console.log("Failed loads:", stats.failedLoads);

// Check specific component errors
lazyLoadingMonitor.metrics.forEach((metric, name) => {
  if (metric.error) {
    console.error(`${name}: ${metric.error}`);
  }
});
```

**Solutions:**

1. **Network Failures**

   ```typescript
   // Implement retry logic
   const LazyComponent = createMonitoredLazyComponent(
     "MyComponent",
     () => import("@/components/MyComponent"),
     {
       retryOnError: true,
       maxRetries: 3,
     }
   );
   ```

2. **Import Errors**
   ```typescript
   // Fix import paths
   // Before: import('@/components/NonExistentComponent')
   // After: import('@/components/ExistingComponent')
   ```

## Performance Optimization Procedures

### 1. Bundle Size Optimization

```bash
#!/bin/bash
# optimize-bundle.sh

echo "📦 Optimizing bundle size..."

# 1. Analyze current bundle
ANALYZE=true npm run build

# 2. Check for duplicate dependencies
npx webpack-bundle-analyzer dist/public/js/*.js

# 3. Identify optimization opportunities
node scripts/detailed-bundle-analysis.js

# 4. Update code splitting configuration
# Edit vite.config.ts based on analysis

# 5. Test optimizations
npm run build
node scripts/test-production-build.js
```

### 2. Lazy Loading Optimization

```typescript
// Optimize lazy loading strategy
const optimizeLazyLoading = () => {
  // 1. Analyze current performance
  const stats = lazyLoadingMonitor.getStats();

  // 2. Identify slow components
  const slowComponents = stats.slowestComponent;

  // 3. Implement preloading for slow components
  if (stats.averageLoadTime > 1000) {
    // Add preloading
    preloadCriticalComponents();
  }

  // 4. Optimize chunk sizes
  if (stats.totalChunkSize > 500000) {
    // Further split large chunks
    implementAdditionalSplitting();
  }
};
```

### 3. Cache Optimization

```typescript
// Optimize caching strategy
const optimizeCaching = () => {
  // 1. Implement service worker caching
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
  }

  // 2. Optimize browser caching
  // Set appropriate cache headers

  // 3. Implement component-level caching
  const componentCache = new Map();

  // 4. Cache lazy-loaded chunks
  const chunkCache = new Map();
};
```

## Alerting Configuration

### 1. Performance Alerts

```typescript
// Configure performance alerts
const alertConfig = {
  // Web Vitals alerts
  webVitals: {
    LCP: { warning: 2500, critical: 4000 },
    FID: { warning: 100, critical: 300 },
    CLS: { warning: 0.1, critical: 0.25 },
  },

  // Lazy loading alerts
  lazyLoading: {
    averageLoadTime: { warning: 1000, critical: 2000 },
    errorRate: { warning: 0.01, critical: 0.05 },
    successRate: { warning: 0.95, critical: 0.9 },
  },

  // Bundle size alerts
  bundleSize: {
    initialBundle: { warning: 500000, critical: 1000000 },
    totalBundle: { warning: 2000000, critical: 5000000 },
  },
};
```

### 2. Alert Handlers

```typescript
// Alert notification system
class AlertManager {
  sendAlert(level: "warning" | "critical", metric: string, value: number) {
    const message = `${level.toUpperCase()}: ${metric} = ${value}`;

    // Log to console
    console[level === "critical" ? "error" : "warn"](message);

    // Send to monitoring service
    if (typeof window !== "undefined" && "gtag" in window) {
      (window as any).gtag("event", "performance_alert", {
        event_category: "monitoring",
        event_label: metric,
        value: value,
        custom_parameters: { level },
      });
    }

    // Send to external alerting service
    if (level === "critical") {
      this.sendCriticalAlert(metric, value);
    }
  }

  private sendCriticalAlert(metric: string, value: number) {
    // Implement integration with PagerDuty, Slack, etc.
    fetch("/api/alerts/critical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric, value, timestamp: Date.now() }),
    });
  }
}
```

## Reporting and Analytics

### 1. Performance Reports

```typescript
// Generate performance reports
const generatePerformanceReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    webVitals: getWebVitalsMetrics(),
    lazyLoading: lazyLoadingMonitor.getStats(),
    bundleSize: getBundleSizeMetrics(),
    recommendations: getOptimizationRecommendations(),
  };

  return report;
};

// Weekly performance summary
const generateWeeklyReport = () => {
  const weeklyData = getWeeklyMetrics();

  return {
    summary: {
      averageLCP: weeklyData.lcp.average,
      averageFID: weeklyData.fid.average,
      averageCLS: weeklyData.cls.average,
      lazyLoadingSuccessRate: weeklyData.lazyLoading.successRate,
    },
    trends: {
      improving: weeklyData.trends.improving,
      degrading: weeklyData.trends.degrading,
    },
    recommendations: generateRecommendations(weeklyData),
  };
};
```

### 2. Dashboard Integration

```typescript
// Performance dashboard data
const getDashboardData = () => {
  return {
    realTime: {
      currentUsers: getCurrentUserCount(),
      averageLoadTime: getCurrentAverageLoadTime(),
      errorRate: getCurrentErrorRate(),
    },

    historical: {
      last24Hours: getLast24HoursMetrics(),
      last7Days: getLast7DaysMetrics(),
      last30Days: getLast30DaysMetrics(),
    },

    alerts: {
      active: getActiveAlerts(),
      recent: getRecentAlerts(),
    },
  };
};
```

## Maintenance Procedures

### 1. Regular Maintenance Tasks

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "🔧 Weekly Performance Maintenance"

# 1. Clean up old performance logs
find /var/log/brolab -name "*.log" -mtime +7 -delete

# 2. Update performance baselines
node scripts/update-performance-baselines.js

# 3. Check for performance regressions
node scripts/check-performance-regression.js

# 4. Optimize bundle configuration
node scripts/optimize-bundle-config.js

# 5. Generate performance report
node scripts/generate-performance-report.js

echo "✅ Maintenance completed"
```

### 2. Performance Audits

```bash
#!/bin/bash
# monthly-audit.sh

echo "📊 Monthly Performance Audit"

# 1. Full Lighthouse audit
npx lighthouse https://brolab.com --output=html --output-path=audit-$(date +%Y%m).html

# 2. Bundle analysis
ANALYZE=true npm run build

# 3. Lazy loading analysis
node scripts/comprehensive-lazy-loading-audit.js

# 4. Performance comparison
node scripts/compare-performance-metrics.js

echo "✅ Audit completed"
```
