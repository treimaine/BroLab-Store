import rateLimit from 'express-rate-limit';
import { auditLogger } from '../lib/audit';

// ================================
// RATE LIMITING CONFIGURATION
// ================================

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    // Log rate limit exceeded
    auditLogger.logRateLimitExceeded(
      req.ip || 'unknown',
      req.path,
      100
    );
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Authentication rate limiter (more strict)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 5, // Higher limit for tests
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log rate limit exceeded for auth
    auditLogger.logRateLimitExceeded(
      req.ip || 'unknown',
      req.path,
      process.env.NODE_ENV === 'test' ? 100 : 5
    );
    
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Registration rate limiter (very strict)
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' ? 100 : 3, // Higher limit for tests
  message: {
    error: 'Too many registration attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log rate limit exceeded for registration
    auditLogger.logRateLimitExceeded(
      req.ip || 'unknown',
      req.path,
      process.env.NODE_ENV === 'test' ? 100 : 3
    );
    
    res.status(429).json({
      error: 'Too many registration attempts, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Subscription creation rate limiter
export const subscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 subscription attempts per hour
  message: {
    error: 'Too many subscription attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log rate limit exceeded for subscriptions
    auditLogger.logRateLimitExceeded(
      req.ip || 'unknown',
      req.path,
      10
    );
    
    res.status(429).json({
      error: 'Too many subscription attempts, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Payment rate limiter
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 payment attempts per 15 minutes
  message: {
    error: 'Too many payment attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log rate limit exceeded for payments
    auditLogger.logRateLimitExceeded(
      req.ip || 'unknown',
      req.path,
      20
    );
    
    res.status(429).json({
      error: 'Too many payment attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 upload attempts per hour
  message: {
    error: 'Too many upload attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log rate limit exceeded for uploads
    auditLogger.logRateLimitExceeded(
      req.ip || 'unknown',
      req.path,
      50
    );
    
    res.status(429).json({
      error: 'Too many upload attempts, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// ================================
// RATE LIMITING MIDDLEWARE FACTORY
// ================================

export const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string,
  endpoint: string
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: `${Math.ceil(windowMs / (1000 * 60))} minutes`
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Log rate limit exceeded
      auditLogger.logRateLimitExceeded(
        req.ip || 'unknown',
        endpoint,
        max
      );
      
      res.status(429).json({
        error: message,
        retryAfter: `${Math.ceil(windowMs / (1000 * 60))} minutes`
      });
    }
  });
};

// ================================
// HELPER FUNCTIONS
// ================================

export const getClientIP = (req: any): string => {
  return (
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

export const isRateLimited = (req: any): boolean => {
  // Check if request is coming from a known bot or suspicious IP
  const userAgent = req.headers['user-agent'] || '';
  const ip = getClientIP(req);
  
  // Block common bot user agents
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /perl/i,
    /ruby/i,
    /php/i,
  ];
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  
  // Block suspicious IP patterns (example)
  const suspiciousIPs: string[] = [
    // Add known malicious IPs here
  ];
  
  const isSuspiciousIP = suspiciousIPs.includes(ip);
  
  return isBot || isSuspiciousIP;
}; 