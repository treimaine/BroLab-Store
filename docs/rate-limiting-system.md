# Rate Limiting System

This document describes the comprehensive rate limiting system implemented for the BroLab platform.

## Overview

The rate limiting system provides protection against abuse and ensures fair resource usage across all users. It's built on top of Convex for data storage and includes monitoring and alerting capabilities.

## Architecture

### Components

1. **Convex Functions** (`convex/rateLimits.ts`)
   - Data storage and retrieval
   - Rate limit checking and counter updates
   - Metrics collection and cleanup

2. **Rate Limiter Implementation** (`shared/utils/rate-limiter.ts`)
   - Core rate limiting logic
   - Interface implementation
   - Predefined configurations

3. **Express Middleware** (`server/middleware/rateLimiter.ts`)
   - HTTP request rate limiting
   - Header management
   - Error handling

4. **System Integration** (`shared/utils/system-manager.ts`)
   - Performance monitoring
   - Health checks
   - Automated cleanup

## Usage

### Basic Middleware Usage

```typescript
import { apiRateLimit, uploadRateLimit } from "../middleware/rateLimiter";

// Apply to routes
app.use("/api", apiRateLimit);
app.use("/upload", uploadRateLimit);
```

### Custom Rate Limiter

```typescript
import RateLimiter from "../middleware/rateLimiter";

const customLimit = RateLimiter.create("custom_action", {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: "Custom rate limit exceeded",
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
});

app.use("/custom", customLimit);
```

### Direct Rate Limiter Usage

```typescript
import { rateLimiter, RateLimitConfigs } from "../utils/rate-limiter";

// Check rate limit
const result = await rateLimiter.checkLimit("user:123:api_request", RateLimitConfigs.API_STRICT);

if (!result.allowed) {
  // Handle rate limit exceeded
  console.log(`Rate limited. Try again in ${result.retryAfter} seconds`);
}
```

## Predefined Configurations

### API Rate Limits

- **API_STRICT**: 100 requests per 15 minutes
- **API_MODERATE**: 500 requests per 15 minutes
- **API_LENIENT**: 1000 requests per 15 minutes

### File Operations

- **FILE_UPLOAD**: 20 uploads per hour
- **FILE_DOWNLOAD**: 100 downloads per hour

### Authentication

- **LOGIN_ATTEMPTS**: 5 attempts per 15 minutes
- **PASSWORD_RESET**: 3 resets per hour

### Email Operations

- **EMAIL_SEND**: 10 emails per day
- **EMAIL_VERIFICATION**: 5 verifications per hour

### Search and Queries

- **SEARCH_QUERIES**: 30 searches per minute
- **DATABASE_QUERIES**: 100 queries per minute

## Monitoring and Analytics

### Performance Metrics

The system automatically tracks:

- Total active rate limit keys
- Total requests processed
- Total blocked requests
- Block rate percentage
- Active time windows

### Health Checks

Rate limiter health is monitored with:

- Block rate thresholds (>20% degraded, >50% unhealthy)
- Error rate monitoring
- Response time tracking

### Cleanup

Expired rate limit records are automatically cleaned up:

- Every hour for records older than 24 hours
- Configurable cleanup intervals
- Metrics tracking for cleanup operations

## API Reference

### RateLimiter Interface

```typescript
interface RateLimiter {
  checkLimit(key: string, limit: RateLimit): Promise<RateLimitResult>;
  resetLimit(key: string): Promise<void>;
  getStats(key: string): Promise<RateLimitStats>;
  incrementCounter(key: string): Promise<number>;
  getGlobalStats(): Promise<Record<string, RateLimitStats>>;
}
```

### Rate Limit Configuration

```typescript
interface RateLimit {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip counting 2xx responses
  skipFailedRequests?: boolean; // Skip counting 4xx+ responses
  keyGenerator?: (id: string) => string; // Custom key generation
  onLimitReached?: (key: string) => void; // Callback when limit exceeded
  message?: string; // Custom error message
}
```

### Rate Limit Result

```typescript
interface RateLimitResult {
  allowed: boolean; // Whether request is allowed
  remaining: number; // Remaining requests in window
  resetTime: number; // When the window resets (timestamp)
  totalRequests: number; // Total requests in current window
  retryAfter?: number; // Seconds to wait before retry
}
```

## HTTP Headers

When rate limiting is applied, the following headers are set:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: When the rate limit resets (ISO string)
- `Retry-After`: Seconds to wait before retry (when blocked)

## Error Handling

The rate limiting system follows a "fail open" approach:

- If Convex is unavailable, requests are allowed through
- Errors are logged but don't block requests
- Graceful degradation ensures system availability

## Security Considerations

### Key Generation

- User-based keys: `user:{userId}:{action}`
- IP-based keys: `{ip}:{action}` (for unauthenticated requests)
- Custom key generators for specific use cases

### Data Privacy

- No sensitive user data stored in rate limit records
- Automatic cleanup of expired records
- Configurable data retention periods

### Attack Mitigation

- Protection against brute force attacks
- DDoS mitigation through request throttling
- Configurable thresholds for different threat levels

## Configuration Examples

### High Security Endpoint

```typescript
const securityLimit = RateLimiter.create("security_action", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // Very strict limit
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: "Security rate limit exceeded. Account may be locked.",
});
```

### Public API Endpoint

```typescript
const publicApiLimit = RateLimiter.create("public_api", {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // Generous limit
  skipSuccessfulRequests: true, // Only count failures
  message: "API rate limit exceeded. Please slow down.",
});
```

### File Upload with Custom Key

```typescript
const uploadLimit = RateLimiter.create("file_upload", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  keyGenerator: req => `upload:${req.user?.id || req.ip}:${req.body?.fileType}`,
  message: "Upload limit exceeded for this file type.",
});
```

## Troubleshooting

### Common Issues

1. **Rate limits not working**
   - Check Convex URL configuration
   - Verify authentication middleware is working
   - Check for errors in logs

2. **Too many false positives**
   - Adjust `skipSuccessfulRequests` setting
   - Review rate limit thresholds
   - Consider custom key generators

3. **Performance issues**
   - Monitor Convex query performance
   - Check cleanup job frequency
   - Review rate limit key patterns

### Debugging

Enable debug logging:

```typescript
// In development
process.env.RATE_LIMIT_DEBUG = "true";
```

Check rate limit stats:

```typescript
const stats = await rateLimiter.getStats("user:123:api_request");
console.log("Rate limit stats:", stats);
```

Monitor global metrics:

```typescript
const metrics = await rateLimiter.getMetrics();
console.log("Global rate limit metrics:", metrics);
```
