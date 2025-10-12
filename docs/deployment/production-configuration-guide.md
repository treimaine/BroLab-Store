# Production Configuration Guide

## Overview

This guide provides comprehensive configuration instructions for deploying the BroLab Entertainment platform to production environments. It covers all aspects of the optimized system including performance configurations, security settings, monitoring setup, and deployment procedures.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Performance Configuration](#performance-configuration)
3. [Security Configuration](#security-configuration)
4. [Monitoring and Analytics Setup](#monitoring-and-analytics-setup)
5. [Database Configuration](#database-configuration)
6. [CDN and Caching Configuration](#cdn-and-caching-configuration)
7. [Error Handling Configuration](#error-handling-configuration)
8. [Deployment Procedures](#deployment-procedures)
9. [Health Checks and Monitoring](#health-checks-and-monitoring)
10. [Troubleshooting](#troubleshooting)

## Environment Setup

### 1. Node.js and Runtime Configuration

**Required Versions**:

- Node.js: 20.x LTS or higher
- npm: 9.x or higher
- PM2: Latest stable version

**Production Environment Variables**:

```bash
# Core Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
CONVEX_DEPLOYMENT=prod-brolab-entertainment
CONVEX_URL=https://your-convex-deployment.convex.cloud
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
CLERK_PUBLISHABLE_KEY=pk_live_your-key
CLERK_SECRET_KEY=sk_live_your-key
CLERK_WEBHOOK_SECRET=whsec_your-webhook-secret

# Payment Processing
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# Performance Optimization
VITE_ENABLE_LAZY_LOADING=true
VITE_CACHE_TTL=300000
VITE_SYNC_DEBOUNCE_DELAY=1000
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Security Configuration
WEBHOOK_TIMESTAMP_TOLERANCE=300
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://brolab.com,https://www.brolab.com

# Monitoring and Analytics
VITE_ENABLE_ERROR_TRACKING=true
VITE_ANALYTICS_ENDPOINT=/api/analytics
SENTRY_DSN=your-sentry-dsn
GOOGLE_ANALYTICS_ID=GA-your-id

# File Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=brolab-production-assets

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@brolab.com

# WordPress Integration
WORDPRESS_API_URL=https://your-wordpress-site.com/wp-json/wc/v3
WORDPRESS_CONSUMER_KEY=ck_your-key
WORDPRESS_CONSUMER_SECRET=cs_your-secret
```

### 2. System Dependencies

**Required System Packages**:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx redis-server postgresql-client curl wget git

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install build tools
sudo apt install -y build-essential python3-dev
```

**Optional Performance Tools**:

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Install security tools
sudo apt install -y fail2ban ufw
```

## Performance Configuration

### 1. Application Performance Settings

**PM2 Configuration** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: "brolab-production",
      script: "server/index.js",
      instances: "max", // Use all CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Performance optimizations
      node_args: "--max-old-space-size=4096",
      max_memory_restart: "2G",

      // Logging
      log_file: "/var/log/brolab/combined.log",
      out_file: "/var/log/brolab/out.log",
      error_file: "/var/log/brolab/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Auto-restart configuration
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      max_restarts: 10,
      min_uptime: "10s",

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    },
  ],
};
```

**Node.js Performance Tuning**:

```bash
# Add to /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536

# Add to /etc/sysctl.conf
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65536
```

### 2. Lazy Loading Production Configuration

**Vite Production Build Configuration**:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info"],
      },
      mangle: {
        safari10: true,
      },
    },

    rollupOptions: {
      output: {
        // Optimize chunk naming for caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",

        // Manual chunks for optimal caching
        manualChunks: {
          // Vendor chunks
          "vendor-react": ["react", "react-dom"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          "vendor-audio": ["wavesurfer.js"],
          "vendor-charts": ["recharts", "d3"],

          // Feature chunks
          "audio-components": [
            "client/src/components/audio/WaveformAudioPlayer",
            "client/src/components/audio/AudioAnalyzer",
          ],
          "chart-components": [
            "client/src/components/charts/AnalyticsChart",
            "client/src/components/charts/SalesChart",
          ],
          "modal-components": [
            "client/src/components/modals/CheckoutModal",
            "client/src/components/modals/ContactModal",
          ],
        },
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Asset optimization
    assetsInlineLimit: 4096,

    // Source maps for production debugging
    sourcemap: "hidden",
  },

  // Production optimizations
  define: {
    __DEV__: false,
    "process.env.NODE_ENV": '"production"',
  },
});
```

### 3. Caching Configuration

**Application-Level Caching**:

```typescript
// Production cache configuration
const cacheConfig = {
  // Cache Manager settings
  cache: {
    defaultTTL: 300000, // 5 minutes
    maxSize: 1000,
    strategy: "LRU",

    // Different TTLs for different data types
    ttlByType: {
      "user-data": 600000, // 10 minutes
      "beats-list": 300000, // 5 minutes
      analytics: 900000, // 15 minutes
      "static-content": 3600000, // 1 hour
    },
  },

  // Sync Manager settings
  sync: {
    debounceDelay: 1000,
    maxRetries: 3,
    batchSize: 10,
    retryBackoffFactor: 2,
  },

  // Lazy loading settings
  lazyLoading: {
    rootMargin: "100px",
    preloadDelay: 2000,
    maxRetries: 3,
    retryDelay: 1000,
  },
};
```

## Security Configuration

### 1. Web Server Security (Nginx)

**Nginx Configuration** (`/etc/nginx/sites-available/brolab`):

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name brolab.com www.brolab.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/brolab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/brolab.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.dev https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; media-src 'self' https:;" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Static Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";

        # CORS for assets
        add_header Access-Control-Allow-Origin "*";
    }

    # API Routes with Rate Limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Authentication Routes with Stricter Rate Limiting
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Main Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name brolab.com www.brolab.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. Application Security Configuration

**Rate Limiting Configuration**:

```typescript
// Production rate limiting configuration
const rateLimitConfig = {
  // Global API rate limiting
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Endpoint-specific rate limiting
  endpoints: {
    "/api/auth/login": {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      skipSuccessfulRequests: true,
    },
    "/api/auth/register": {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      skipSuccessfulRequests: true,
    },
    "/api/beats": {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: false,
    },
    "/api/cart/checkout": {
      windowMs: 60 * 1000,
      maxRequests: 10,
      skipSuccessfulRequests: true,
    },
  },

  // User-based rate limiting
  userBased: {
    premium: {
      windowMs: 60 * 1000,
      maxRequests: 200,
    },
    basic: {
      windowMs: 60 * 1000,
      maxRequests: 100,
    },
    anonymous: {
      windowMs: 60 * 1000,
      maxRequests: 50,
    },
  },
};
```

**Webhook Security Configuration**:

```typescript
// Production webhook validation
const webhookConfig = {
  secrets: {
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    clerk: process.env.CLERK_WEBHOOK_SECRET,
    paypal: process.env.PAYPAL_WEBHOOK_SECRET,
  },

  // Timestamp tolerance (5 minutes)
  timestampTolerance: 300,

  // IP whitelist for webhook sources
  allowedIPs: {
    stripe: ["3.18.12.63", "3.130.192.231", "13.235.14.237", "13.235.122.149"],
    clerk: [
      // Clerk webhook IPs
    ],
  },

  // Security headers validation
  requiredHeaders: {
    stripe: ["stripe-signature"],
    clerk: ["svix-id", "svix-timestamp", "svix-signature"],
  },
};
```

### 3. Input Sanitization Configuration

**Production Sanitization Rules**:

```typescript
// Comprehensive input sanitization
const sanitizationConfig = {
  // HTML sanitization
  html: {
    allowedTags: ["b", "i", "em", "strong", "p", "br"],
    allowedAttributes: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  },

  // File upload sanitization
  fileUpload: {
    allowedMimeTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/mp4",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    virusScanEnabled: true,
    quarantineDirectory: "/var/quarantine",
  },

  // SQL injection prevention
  sql: {
    escapeStrings: true,
    validateQueries: true,
    logSuspiciousQueries: true,
  },
};
```

## Monitoring and Analytics Setup

### 1. Performance Monitoring Configuration

**Production Performance Monitoring**:

```typescript
// Performance monitoring configuration
const performanceConfig = {
  // Web Vitals tracking
  webVitals: {
    enabled: true,
    sampleRate: 1.0, // Track 100% in production
    reportingEndpoint: "/api/analytics/web-vitals",
    thresholds: {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
    },
  },

  // Lazy loading monitoring
  lazyLoading: {
    enabled: true,
    trackAllComponents: true,
    reportingInterval: 60000, // 1 minute
    alertThresholds: {
      averageLoadTime: 2000,
      errorRate: 0.05,
      successRate: 0.95,
    },
  },

  // API performance monitoring
  api: {
    enabled: true,
    trackAllEndpoints: true,
    slowQueryThreshold: 1000,
    errorRateThreshold: 0.01,
  },
};
```

### 2. Error Tracking Configuration

**Production Error Tracking**:

```typescript
// Error tracking configuration
const errorTrackingConfig = {
  // Sentry configuration
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: "production",
    sampleRate: 1.0,
    tracesSampleRate: 0.1,

    // Error filtering
    beforeSend: (event, hint) => {
      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.message && error.message.includes("Non-Error promise rejection")) {
          return null;
        }
      }
      return event;
    },

    // Performance monitoring
    integrations: [
      new Sentry.BrowserTracing({
        tracingOrigins: ["localhost", "brolab.com", /^\//],
      }),
    ],
  },

  // Custom error tracking
  custom: {
    enabled: true,
    reportingEndpoint: "/api/errors",
    batchSize: 10,
    flushInterval: 30000,

    // Error categorization
    categories: {
      critical: ["payment", "auth", "data-loss"],
      high: ["api-error", "component-crash"],
      medium: ["performance", "validation"],
      low: ["ui-glitch", "warning"],
    },
  },
};
```

### 3. Analytics Configuration

**Production Analytics Setup**:

```typescript
// Analytics configuration
const analyticsConfig = {
  // Google Analytics
  googleAnalytics: {
    measurementId: process.env.GOOGLE_ANALYTICS_ID,
    config: {
      send_page_view: true,
      anonymize_ip: true,
      cookie_flags: "SameSite=Strict;Secure",
    },
  },

  // Custom analytics
  custom: {
    enabled: true,
    endpoint: "/api/analytics/events",
    batchSize: 20,
    flushInterval: 30000,

    // Event tracking
    events: {
      // User interactions
      beat_play: { category: "engagement", priority: "high" },
      beat_download: { category: "conversion", priority: "critical" },
      cart_add: { category: "commerce", priority: "high" },
      checkout_complete: { category: "conversion", priority: "critical" },

      // Performance events
      lazy_load_complete: { category: "performance", priority: "medium" },
      page_load_complete: { category: "performance", priority: "medium" },
    },
  },

  // Privacy compliance
  privacy: {
    respectDoNotTrack: true,
    cookieConsent: true,
    dataRetentionDays: 365,
    anonymizeIPs: true,
  },
};
```

## Database Configuration

### 1. Convex Production Configuration

**Convex Deployment Configuration**:

```typescript
// convex.json
{
  "functions": "convex/",
  "generateCommonJSApi": false,
  "node": {
    "externalPackages": ["sharp", "canvas"]
  },
  "environment": {
    "CLERK_WEBHOOK_SECRET": "whsec_your_webhook_secret",
    "STRIPE_SECRET_KEY": "sk_live_your_stripe_key",
    "AWS_ACCESS_KEY_ID": "your_aws_key",
    "AWS_SECRET_ACCESS_KEY": "your_aws_secret"
  }
}
```

**Convex Function Optimization**:

```typescript
// Production-optimized Convex functions
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Optimized query with caching
export const getBeats = query({
  args: {
    filters: v.optional(
      v.object({
        genre: v.optional(v.string()),
        bpm: v.optional(
          v.object({
            min: v.number(),
            max: v.number(),
          })
        ),
        price: v.optional(
          v.object({
            min: v.number(),
            max: v.number(),
          })
        ),
      })
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Implement efficient querying with indexes
    const { filters = {}, limit = 20, offset = 0 } = args;

    let query = ctx.db.query("beats");

    // Apply filters efficiently
    if (filters.genre) {
      query = query.filter(q => q.eq(q.field("genre"), filters.genre));
    }

    if (filters.bpm) {
      query = query.filter(q =>
        q.and(q.gte(q.field("bpm"), filters.bpm.min), q.lte(q.field("bpm"), filters.bpm.max))
      );
    }

    // Use pagination for performance
    const results = await query.order("desc").paginate({ numItems: limit, cursor: null });

    return results;
  },
});

// Optimized mutation with validation
export const createOrder = mutation({
  args: {
    userId: v.string(),
    items: v.array(
      v.object({
        beatId: v.id("beats"),
        licenseType: v.string(),
        price: v.number(),
      })
    ),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    // Validate payment intent with Stripe
    // ... payment validation logic

    // Create order atomically
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      items: args.items,
      status: "pending",
      paymentIntentId: args.paymentIntentId,
      createdAt: Date.now(),
      totalAmount: args.items.reduce((sum, item) => sum + item.price, 0),
    });

    return orderId;
  },
});
```

### 2. Supabase Production Configuration

**Supabase Connection Configuration**:

```typescript
// Production Supabase configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,

  // Connection pooling
  db: {
    poolSize: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // RLS policies
  rls: {
    enabled: true,
    policies: {
      beats: "user_id = auth.uid()",
      orders: "user_id = auth.uid()",
      downloads: "user_id = auth.uid()",
    },
  },

  // Performance optimization
  performance: {
    enableCache: true,
    cacheMaxAge: 300, // 5 minutes
    enableCompression: true,
  },
};
```

## CDN and Caching Configuration

### 1. CloudFlare Configuration

**CloudFlare Settings**:

```javascript
// CloudFlare Page Rules
const cloudflareRules = [
  {
    url: "brolab.com/assets/*",
    settings: {
      cache_level: "cache_everything",
      edge_cache_ttl: 31536000, // 1 year
      browser_cache_ttl: 31536000,
    },
  },
  {
    url: "brolab.com/api/*",
    settings: {
      cache_level: "bypass",
      security_level: "high",
    },
  },
  {
    url: "brolab.com/*",
    settings: {
      cache_level: "standard",
      browser_cache_ttl: 3600, // 1 hour
      security_level: "medium",
    },
  },
];

// CloudFlare Workers for edge optimization
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Cache static assets aggressively
  if (url.pathname.startsWith("/assets/")) {
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);

    newResponse.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    newResponse.headers.set("Vary", "Accept-Encoding");

    return newResponse;
  }

  // Add security headers
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);

  newResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
  newResponse.headers.set("X-Content-Type-Options", "nosniff");

  return newResponse;
}
```

### 2. AWS CloudFront Configuration

**CloudFront Distribution Configuration**:

```json
{
  "DistributionConfig": {
    "CallerReference": "brolab-production-2024",
    "Comment": "BroLab Entertainment Production CDN",
    "DefaultRootObject": "index.html",

    "Origins": [
      {
        "Id": "brolab-origin",
        "DomainName": "brolab.com",
        "CustomOriginConfig": {
          "HTTPPort": 443,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ],

    "DefaultCacheBehavior": {
      "TargetOriginId": "brolab-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      "Compress": true,

      "LambdaFunctionAssociations": [
        {
          "EventType": "origin-response",
          "LambdaFunctionARN": "arn:aws:lambda:us-east-1:123456789:function:security-headers:1"
        }
      ]
    },

    "CacheBehaviors": [
      {
        "PathPattern": "/assets/*",
        "TargetOriginId": "brolab-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "b2884449-e4de-46a7-ac36-70bc7f1ddd6d",
        "TTL": {
          "DefaultTTL": 31536000,
          "MaxTTL": 31536000
        }
      },
      {
        "PathPattern": "/api/*",
        "TargetOriginId": "brolab-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        "TTL": {
          "DefaultTTL": 0,
          "MaxTTL": 0
        }
      }
    ],

    "Enabled": true,
    "PriceClass": "PriceClass_All"
  }
}
```

## Error Handling Configuration

### 1. Global Error Handling

**Production Error Handler**:

```typescript
// Global error handling configuration
const errorHandlingConfig = {
  // Unhandled promise rejections
  unhandledRejection: {
    logError: true,
    exitProcess: false,
    reportToSentry: true,
  },

  // Uncaught exceptions
  uncaughtException: {
    logError: true,
    exitProcess: true,
    gracefulShutdown: true,
    shutdownTimeout: 10000,
  },

  // Express error handling
  express: {
    logErrors: true,
    includeStack: false, // Don't expose stack traces in production
    customErrorPages: {
      404: "/404.html",
      500: "/500.html",
    },
  },

  // Client-side error handling
  client: {
    enableErrorBoundaries: true,
    reportToSentry: true,
    showUserFriendlyMessages: true,
    enableRetryMechanisms: true,
  },
};

// Production error handler implementation
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);

  // Report to error tracking service
  if (errorTrackingConfig.sentry.enabled) {
    Sentry.captureException(reason);
  }
});

process.on("uncaughtException", error => {
  console.error("Uncaught Exception:", error);

  // Report to error tracking service
  if (errorTrackingConfig.sentry.enabled) {
    Sentry.captureException(error);
  }

  // Graceful shutdown
  setTimeout(() => {
    process.exit(1);
  }, errorHandlingConfig.uncaughtException.shutdownTimeout);
});
```

### 2. Circuit Breaker Configuration

**Production Circuit Breaker**:

```typescript
// Circuit breaker configuration for external services
const circuitBreakerConfig = {
  // Stripe API circuit breaker
  stripe: {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 10000,
    fallback: "queue-payment",
  },

  // WordPress API circuit breaker
  wordpress: {
    failureThreshold: 3,
    resetTimeout: 30000,
    monitoringPeriod: 5000,
    fallback: "cached-data",
  },

  // Convex circuit breaker
  convex: {
    failureThreshold: 10,
    resetTimeout: 30000,
    monitoringPeriod: 5000,
    fallback: "local-cache",
  },
};
```

## Deployment Procedures

### 1. Pre-deployment Checklist

**Deployment Checklist**:

```bash
#!/bin/bash
# pre-deployment-checklist.sh

echo "🚀 Pre-deployment Checklist"

# 1. Environment variables check
echo "1. Checking environment variables..."
required_vars=(
  "NODE_ENV"
  "CONVEX_DEPLOYMENT"
  "CLERK_SECRET_KEY"
  "STRIPE_SECRET_KEY"
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  else
    echo "✅ $var is set"
  fi
done

# 2. Build verification
echo "2. Verifying build..."
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

# 3. Test suite
echo "3. Running test suite..."
npm test -- --run
if [ $? -eq 0 ]; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
  exit 1
fi

# 4. Security scan
echo "4. Running security scan..."
npm audit --audit-level=high
if [ $? -eq 0 ]; then
  echo "✅ Security scan passed"
else
  echo "⚠️ Security vulnerabilities found"
fi

# 5. Performance check
echo "5. Checking bundle size..."
node scripts/test-production-build.js
if [ $? -eq 0 ]; then
  echo "✅ Bundle size within limits"
else
  echo "⚠️ Bundle size exceeds recommended limits"
fi

echo "✅ Pre-deployment checklist completed"
```

### 2. Deployment Script

**Production Deployment Script**:

```bash
#!/bin/bash
# deploy-production.sh

set -e

echo "🚀 Starting production deployment..."

# Configuration
APP_NAME="brolab-production"
DEPLOY_DIR="/var/www/brolab"
BACKUP_DIR="/var/backups/brolab"
LOG_FILE="/var/log/brolab/deploy.log"

# Create backup
echo "📦 Creating backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_path="$BACKUP_DIR/backup_$timestamp"
mkdir -p "$backup_path"
cp -r "$DEPLOY_DIR" "$backup_path/"
echo "✅ Backup created at $backup_path"

# Stop application
echo "🛑 Stopping application..."
pm2 stop $APP_NAME || true

# Update code
echo "📥 Updating code..."
cd $DEPLOY_DIR
git fetch origin
git reset --hard origin/main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build application
echo "🔨 Building application..."
npm run build

# Database migrations (if any)
echo "🗄️ Running database migrations..."
# Add migration commands here if needed

# Update PM2 configuration
echo "⚙️ Updating PM2 configuration..."
pm2 delete $APP_NAME || true
pm2 start ecosystem.config.js --env production

# Health check
echo "🏥 Performing health check..."
sleep 10
health_check_url="https://brolab.com/api/health"
response=$(curl -s -o /dev/null -w "%{http_code}" $health_check_url)

if [ "$response" = "200" ]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed (HTTP $response)"
  echo "🔄 Rolling back..."

  # Rollback procedure
  pm2 stop $APP_NAME
  rm -rf $DEPLOY_DIR
  cp -r "$backup_path/brolab" $DEPLOY_DIR
  pm2 start ecosystem.config.js --env production

  echo "❌ Deployment failed and rolled back"
  exit 1
fi

# Cleanup old backups (keep last 5)
echo "🧹 Cleaning up old backups..."
cd $BACKUP_DIR
ls -t | tail -n +6 | xargs -r rm -rf

# Update monitoring
echo "📊 Updating monitoring..."
curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=$UPTIMEROBOT_API_KEY&id=$MONITOR_ID&status=1"

echo "✅ Production deployment completed successfully!"
echo "📝 Deployment logged to $LOG_FILE"

# Send notification
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-type: application/json' \
  --data '{"text":"🚀 BroLab production deployment completed successfully!"}'
```

### 3. Zero-downtime Deployment

**Blue-Green Deployment Script**:

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

echo "🔄 Starting blue-green deployment..."

# Configuration
BLUE_PORT=3000
GREEN_PORT=3001
NGINX_CONFIG="/etc/nginx/sites-available/brolab"
CURRENT_COLOR=$(curl -s http://localhost/api/health | jq -r '.color' || echo "blue")

if [ "$CURRENT_COLOR" = "blue" ]; then
  NEW_COLOR="green"
  NEW_PORT=$GREEN_PORT
  OLD_PORT=$BLUE_PORT
else
  NEW_COLOR="blue"
  NEW_PORT=$BLUE_PORT
  OLD_PORT=$GREEN_PORT
fi

echo "📊 Current: $CURRENT_COLOR ($OLD_PORT) → New: $NEW_COLOR ($NEW_PORT)"

# Deploy to new environment
echo "🚀 Deploying to $NEW_COLOR environment..."
PORT=$NEW_PORT pm2 start ecosystem.config.js --name "brolab-$NEW_COLOR" --env production

# Health check new environment
echo "🏥 Health checking $NEW_COLOR environment..."
sleep 15
health_url="http://localhost:$NEW_PORT/api/health"
response=$(curl -s -o /dev/null -w "%{http_code}" $health_url)

if [ "$response" != "200" ]; then
  echo "❌ Health check failed for $NEW_COLOR environment"
  pm2 delete "brolab-$NEW_COLOR" || true
  exit 1
fi

# Switch traffic
echo "🔀 Switching traffic to $NEW_COLOR..."
sed -i "s/localhost:$OLD_PORT/localhost:$NEW_PORT/g" $NGINX_CONFIG
nginx -t && systemctl reload nginx

# Verify switch
sleep 5
current_check=$(curl -s http://localhost/api/health | jq -r '.color')
if [ "$current_check" != "$NEW_COLOR" ]; then
  echo "❌ Traffic switch verification failed"
  # Rollback
  sed -i "s/localhost:$NEW_PORT/localhost:$OLD_PORT/g" $NGINX_CONFIG
  nginx -t && systemctl reload nginx
  exit 1
fi

# Stop old environment
echo "🛑 Stopping old $CURRENT_COLOR environment..."
pm2 delete "brolab-$CURRENT_COLOR" || true

echo "✅ Blue-green deployment completed successfully!"
echo "🎯 Traffic is now served by $NEW_COLOR environment on port $NEW_PORT"
```

## Health Checks and Monitoring

### 1. Application Health Checks

**Comprehensive Health Check Endpoint**:

```typescript
// Health check implementation
app.get("/api/health", async (req, res) => {
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    color: process.env.DEPLOYMENT_COLOR || "blue",

    services: {
      database: "unknown",
      convex: "unknown",
      clerk: "unknown",
      stripe: "unknown",
      redis: "unknown",
    },

    performance: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: os.loadavg(),
    },
  };

  try {
    // Check Convex connection
    const convexHealth = await convex.query(api.health.check);
    healthCheck.services.convex = convexHealth ? "healthy" : "unhealthy";
  } catch (error) {
    healthCheck.services.convex = "unhealthy";
    healthCheck.status = "degraded";
  }

  try {
    // Check Clerk connection
    const clerkHealth = await clerkClient.users.getCount();
    healthCheck.services.clerk = typeof clerkHealth === "number" ? "healthy" : "unhealthy";
  } catch (error) {
    healthCheck.services.clerk = "unhealthy";
    healthCheck.status = "degraded";
  }

  try {
    // Check Stripe connection
    const stripeHealth = await stripe.accounts.retrieve();
    healthCheck.services.stripe = stripeHealth ? "healthy" : "unhealthy";
  } catch (error) {
    healthCheck.services.stripe = "unhealthy";
    healthCheck.status = "degraded";
  }

  // Determine overall status
  const unhealthyServices = Object.values(healthCheck.services).filter(
    status => status === "unhealthy"
  ).length;

  if (unhealthyServices > 0) {
    healthCheck.status = unhealthyServices > 2 ? "unhealthy" : "degraded";
  }

  const statusCode =
    healthCheck.status === "healthy" ? 200 : healthCheck.status === "degraded" ? 200 : 503;

  res.status(statusCode).json(healthCheck);
});
```

### 2. External Monitoring Setup

**UptimeRobot Configuration**:

```json
{
  "monitors": [
    {
      "friendly_name": "BroLab Main Site",
      "url": "https://brolab.com",
      "type": 1,
      "interval": 300,
      "timeout": 30,
      "keyword_type": 2,
      "keyword_value": "BroLab Entertainment"
    },
    {
      "friendly_name": "BroLab API Health",
      "url": "https://brolab.com/api/health",
      "type": 1,
      "interval": 60,
      "timeout": 10,
      "keyword_type": 2,
      "keyword_value": "healthy"
    },
    {
      "friendly_name": "BroLab Authentication",
      "url": "https://brolab.com/api/auth/status",
      "type": 1,
      "interval": 300,
      "timeout": 15
    }
  ],

  "alert_contacts": [
    {
      "type": 2,
      "value": "alerts@brolab.com"
    },
    {
      "type": 11,
      "value": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    }
  ]
}
```

### 3. Log Monitoring

**Log Aggregation Configuration**:

```bash
# Logrotate configuration for application logs
# /etc/logrotate.d/brolab
/var/log/brolab/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}

# Rsyslog configuration for centralized logging
# /etc/rsyslog.d/50-brolab.conf
$ModLoad imfile
$InputFileName /var/log/brolab/error.log
$InputFileTag brolab-error:
$InputFileStateFile stat-brolab-error
$InputFileSeverity error
$InputFileFacility local0
$InputRunFileMonitor

# Forward to centralized log server
*.* @@log-server.brolab.com:514
```

## Troubleshooting

### 1. Common Issues and Solutions

**Performance Issues**:

```bash
# Check system resources
htop
iotop
nethogs

# Check application performance
pm2 monit
pm2 logs brolab-production --lines 100

# Check lazy loading performance
curl -s https://brolab.com/api/analytics/lazy-loading | jq '.'

# Check bundle sizes
node scripts/test-production-build.js
```

**Memory Issues**:

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check for memory leaks
node --inspect server/index.js
# Then use Chrome DevTools to analyze heap

# Restart application if needed
pm2 restart brolab-production
```

**Database Connection Issues**:

```bash
# Check Convex status
curl -s https://your-convex-deployment.convex.cloud/api/status

# Check Supabase connection
psql -h your-project.supabase.co -U postgres -d postgres -c "SELECT 1;"

# Check connection pool
pm2 logs brolab-production | grep -i "connection"
```

### 2. Emergency Procedures

**Emergency Rollback**:

```bash
#!/bin/bash
# emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Stop current application
pm2 stop brolab-production

# Get latest backup
latest_backup=$(ls -t /var/backups/brolab/ | head -1)
echo "📦 Rolling back to: $latest_backup"

# Restore from backup
rm -rf /var/www/brolab
cp -r "/var/backups/brolab/$latest_backup/brolab" /var/www/

# Start application
cd /var/www/brolab
pm2 start ecosystem.config.js --env production

# Verify rollback
sleep 10
health_check=$(curl -s -o /dev/null -w "%{http_code}" https://brolab.com/api/health)

if [ "$health_check" = "200" ]; then
  echo "✅ Emergency rollback successful"
else
  echo "❌ Emergency rollback failed"
fi

# Send alert
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-type: application/json' \
  --data '{"text":"🚨 EMERGENCY: BroLab production rolled back to '"$latest_backup"'"}'
```

**Service Recovery**:

```bash
#!/bin/bash
# service-recovery.sh

echo "🔧 Service Recovery Procedure"

# 1. Check system health
echo "1. Checking system health..."
systemctl status nginx
systemctl status pm2-www-data

# 2. Restart services
echo "2. Restarting services..."
systemctl restart nginx
pm2 restart all

# 3. Clear caches
echo "3. Clearing caches..."
redis-cli FLUSHALL
pm2 flush

# 4. Health verification
echo "4. Verifying health..."
sleep 15
curl -f https://brolab.com/api/health || echo "Health check failed"

echo "✅ Service recovery completed"
```

This comprehensive production configuration guide ensures that the BroLab Entertainment platform is deployed with optimal performance, security, and reliability in production environments.
