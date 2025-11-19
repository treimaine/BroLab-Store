# Performance & Security Improvements Implementation

## Overview

This document summarizes the performance and security improvements implemented based on the recommended optimizations.

## 1. Deferred Suspense Fallbacks for Non-Critical Components

### Problem

Offline indicator, mobile navigation, and audio player Suspense fallbacks were rendering immediately, competing with main content for resources.

### Solution

Implemented deferred preloading with configurable delays:

```typescript
// client/src/App.tsx
const Footer = createLazyComponent(
  () => import("@/components/layout/footer").then(m => ({ default: m.Footer })),
  { preloadDelay: 3000 } // Preload after 3 seconds
);

const MobileBottomNav = createLazyComponent(
  () => import("@/components/layout/MobileBottomNav").then(m => ({ default: m.MobileBottomNav })),
  { preloadDelay: 2000 } // Preload after 2 seconds
);

const OfflineIndicator = createLazyComponent(
  () => import("@/components/loading/OfflineIndicator"),
  { preloadDelay: 5000 } // Preload after 5 seconds - low priority
);
```

### Impact

- Reduces initial bundle size
- Improves Time to Interactive (TTI)
- Prioritizes critical content rendering
- Non-critical components mount after main content is interactive

---

## 2. Lazy Newsletter Modal State Initialization

### Problem

Newsletter modal state was initializing on every render, causing unnecessary localStorage reads and blocking main thread.

### Solution

Implemented lazy state initialization with `requestIdleCallback`:

```typescript
// client/src/components/newsletter/NewsletterModal.tsx
export function useNewsletterModal() {
  const [isOpen, setIsOpen] = useState(() => false);
  const [initialized, setInitialized] = useState(() => false);

  useEffect(() => {
    if (initialized) return undefined;

    let cleanupTimer: NodeJS.Timeout | undefined;

    const initTimer =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(() => {
            const hasSignedUp = localStorage.getItem("brolab-newsletter-signup");
            if (!hasSignedUp) {
              cleanupTimer = setTimeout(() => setIsOpen(true), 10000);
            }
            setInitialized(true);
          })
        : setTimeout(() => {
            const hasSignedUp = localStorage.getItem("brolab-newsletter-signup");
            if (!hasSignedUp) {
              cleanupTimer = setTimeout(() => setIsOpen(true), 10000);
            }
            setInitialized(true);
          }, 0);

    return () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      if (typeof initTimer === "number" && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(initTimer);
      } else if (typeof initTimer === "number") {
        clearTimeout(initTimer);
      }
    };
  }, [initialized]);

  return { isOpen, openModal: () => setIsOpen(true), closeModal: () => setIsOpen(false) };
}
```

### Impact

- Defers localStorage reads to idle time
- Prevents blocking main thread during initial render
- Graceful fallback for browsers without `requestIdleCallback`
- Proper cleanup to prevent memory leaks

---

## 3. Server Security Hardening Middleware

### Problem

Express server lacked comprehensive security measures:

- No HTTP security headers (helmet)
- No response compression
- No rate limiting
- No body size limits

### Solution

Created centralized security middleware in `server/middleware/security.ts`:

```typescript
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

export function setupSecurityMiddleware(app: Application): void {
  setupHelmet(app); // HTTP security headers
  setupCompression(app); // Response compression (gzip)
  setupBodyLimits(app); // 10MB JSON/URL-encoded limits
  setupRateLimiting(app); // API rate limiting
}
```

### Helmet Configuration

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});
```

### Compression Configuration

```typescript
compression({
  level: 6, // Balanced compression level (0-9)
  threshold: 1024, // Only compress responses larger than 1KB
});
```

### Rate Limiting Configuration

```typescript
// Global API limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP per window
  message: {
    error: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Auth endpoints limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests per IP per window
});

// Payment endpoints limiter
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 requests per IP per window
});
```

### Body Size Limits

```typescript
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
```

### Integration

```typescript
// server/app.ts
import { setupSecurityMiddleware } from "./middleware/security";

const app = express();

// Security middleware - MUST be first
setupSecurityMiddleware(app);
```

### Impact

- Protects against common web vulnerabilities (XSS, clickjacking, MIME sniffing)
- Reduces bandwidth usage with gzip compression
- Prevents DDoS and brute-force attacks with rate limiting
- Protects against memory exhaustion with body size limits
- Maintains compatibility with Stripe, PayPal, and external services

---

## 4. WooCommerce Routes Consolidation

### Problem

WooCommerce routes were mounted under multiple paths:

- `/api/woo`
- `/api/woocommerce`
- `/api/products`

This caused:

- Route confusion
- Duplicate route handlers
- SEO issues with multiple URLs for same content

### Solution

Consolidated to single canonical path with 301 redirects:

```typescript
// server/app.ts

// Primary route: /api/woocommerce (canonical)
app.use("/api/woocommerce", wooRouter);

// Legacy redirects for backward compatibility
app.use("/api/woo", (req, res) => {
  const newPath = req.path.replace(/^\//, "/api/woocommerce/");
  res.redirect(301, newPath + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
});

app.use("/api/products", (req, res) => {
  const newPath = req.path.replace(/^\//, "/api/woocommerce/");
  res.redirect(301, newPath + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
});
```

### Impact

- Single source of truth for WooCommerce routes
- Improved SEO with canonical URLs
- Backward compatibility maintained with 301 redirects
- Clearer API structure for clients
- Easier to maintain and update

---

## Dependencies Added

```bash
npm install helmet compression express-rate-limit --save
npm install --save-dev @types/compression
```

---

## Testing Recommendations

### 1. Performance Testing

- Measure Time to Interactive (TTI) before and after
- Verify lazy components load at expected delays
- Test newsletter modal initialization with browser DevTools Performance tab

### 2. Security Testing

- Verify rate limiting with load testing tools (Apache Bench, k6)
- Test CSP headers with browser console
- Verify compression with network tab (check Content-Encoding: gzip)
- Test body size limits with large payloads

### 3. Route Testing

- Verify `/api/woo/*` redirects to `/api/woocommerce/*`
- Verify `/api/products/*` redirects to `/api/woocommerce/*`
- Test query parameters are preserved in redirects
- Update client code to use canonical paths

---

## Monitoring

### Performance Metrics to Track

- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Bundle size reduction
- Network transfer size (with compression)

### Security Metrics to Track

- Rate limit violations per endpoint
- Failed authentication attempts
- Oversized payload rejections
- CSP violations (check browser console)

---

## Future Improvements

1. **Service Worker for Offline Support**
   - Cache critical assets
   - Implement offline fallback pages
   - Background sync for failed requests

2. **Advanced Rate Limiting**
   - Redis-based distributed rate limiting
   - Per-user rate limits (not just IP-based)
   - Dynamic rate limits based on user tier

3. **Enhanced Compression**
   - Brotli compression for modern browsers
   - Pre-compressed static assets
   - CDN integration for global distribution

4. **Route Optimization**
   - Remove legacy redirects after migration period
   - Implement API versioning (e.g., `/api/v1/woocommerce`)
   - GraphQL endpoint for flexible data fetching

---

## References

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [Compression Middleware](https://github.com/expressjs/compression)
- [React Suspense Best Practices](https://react.dev/reference/react/Suspense)
- [requestIdleCallback API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
