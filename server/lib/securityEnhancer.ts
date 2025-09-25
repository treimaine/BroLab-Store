import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { auditLogger } from "./audit";

// Security event types
export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = "authentication_success",
  AUTHENTICATION_FAILURE = "authentication_failure",
  TOKEN_VALIDATION_FAILURE = "token_validation_failure",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  INVALID_INPUT_DETECTED = "invalid_input_detected",
  PRIVILEGE_ESCALATION_ATTEMPT = "privilege_escalation_attempt",
  SESSION_HIJACK_ATTEMPT = "session_hijack_attempt",
  BRUTE_FORCE_ATTEMPT = "brute_force_attempt",
  SQL_INJECTION_ATTEMPT = "sql_injection_attempt",
  XSS_ATTEMPT = "xss_attempt",
  CSRF_ATTEMPT = "csrf_attempt",
  UNAUTHORIZED_ACCESS_ATTEMPT = "unauthorized_access_attempt",
}

// Security risk levels
export enum SecurityRiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Enhanced authentication result
export interface AuthenticationResult {
  success: boolean;
  user?: {
    userId: string;
    sessionId?: string;
    sessionClaims?: Record<string, unknown>;
  };
  error?: string;
  riskLevel: SecurityRiskLevel;
  securityEvents: SecurityEventType[];
  metadata: Record<string, unknown>;
}

// Security configuration
export interface SecurityConfig {
  maxFailedAttempts: number;
  lockoutDuration: number; // in minutes
  sessionTimeout: number; // in minutes
  requireStrongPasswords: boolean;
  enableBruteForceProtection: boolean;
  enableSuspiciousActivityDetection: boolean;
  logAllAuthAttempts: boolean;
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxFailedAttempts: 5,
  lockoutDuration: 15,
  sessionTimeout: 60,
  requireStrongPasswords: true,
  enableBruteForceProtection: true,
  enableSuspiciousActivityDetection: true,
  logAllAuthAttempts: true,
};

// Failed attempt tracking
const failedAttempts = new Map<
  string,
  { count: number; lastAttempt: number; lockedUntil?: number }
>();

// Session tracking for suspicious activity detection
const sessionTracking = new Map<
  string,
  {
    userId: string;
    ipAddress: string;
    userAgent: string;
    createdAt: number;
    lastActivity: number;
    requestCount: number;
  }
>();

export class SecurityEnhancer {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Enhanced Clerk token validation with security logging
   */
  async validateClerkToken(req: Request): Promise<AuthenticationResult> {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers["user-agent"] || "unknown";
    const securityEvents: SecurityEventType[] = [];
    let riskLevel = SecurityRiskLevel.LOW;

    try {
      // Get Clerk authentication
      const { userId, sessionId, sessionClaims } = getAuth(req);

      if (!userId) {
        securityEvents.push(SecurityEventType.AUTHENTICATION_FAILURE);
        riskLevel = SecurityRiskLevel.MEDIUM;

        await this.logSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_FAILURE,
          riskLevel,
          details: {
            reason: "No Clerk user ID found",
            ipAddress,
            userAgent,
          },
          req,
        });

        return {
          success: false,
          error: "Authentication failed",
          riskLevel,
          securityEvents,
          metadata: { ipAddress, userAgent },
        };
      }

      // Validate session claims
      const claimsValidation = this.validateSessionClaims(sessionClaims);
      if (!claimsValidation.valid) {
        securityEvents.push(SecurityEventType.TOKEN_VALIDATION_FAILURE);
        riskLevel = SecurityRiskLevel.HIGH;

        await this.logSecurityEvent({
          type: SecurityEventType.TOKEN_VALIDATION_FAILURE,
          riskLevel,
          details: {
            reason: "Invalid session claims",
            errors: claimsValidation.errors,
            userId,
            ipAddress,
            userAgent,
          },
          req,
        });

        return {
          success: false,
          error: "Invalid session claims",
          riskLevel,
          securityEvents,
          metadata: { userId, ipAddress, userAgent },
        };
      }

      // Check for suspicious activity
      const suspiciousActivity = await this.detectSuspiciousActivity(req, userId);
      if (suspiciousActivity.detected) {
        securityEvents.push(SecurityEventType.SUSPICIOUS_ACTIVITY);
        // Properly compare risk levels
        const riskLevels = [
          SecurityRiskLevel.LOW,
          SecurityRiskLevel.MEDIUM,
          SecurityRiskLevel.HIGH,
          SecurityRiskLevel.CRITICAL,
        ];
        const currentIndex = riskLevels.indexOf(riskLevel);
        const suspiciousIndex = riskLevels.indexOf(suspiciousActivity.riskLevel);
        riskLevel = riskLevels[Math.max(currentIndex, suspiciousIndex)];

        await this.logSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          riskLevel: suspiciousActivity.riskLevel,
          details: {
            reasons: suspiciousActivity.reasons,
            userId,
            ipAddress,
            userAgent,
          },
          req,
        });
      }

      // Update session tracking
      this.updateSessionTracking(sessionId || userId, userId, ipAddress, userAgent);

      // Log successful authentication
      if (this.config.logAllAuthAttempts) {
        await this.logSecurityEvent({
          type: SecurityEventType.AUTHENTICATION_SUCCESS,
          riskLevel: SecurityRiskLevel.LOW,
          details: {
            userId,
            sessionId,
            ipAddress,
            userAgent,
          },
          req,
        });
      }

      return {
        success: true,
        user: { userId, sessionId, sessionClaims },
        riskLevel,
        securityEvents,
        metadata: { userId, sessionId, ipAddress, userAgent },
      };
    } catch (error) {
      securityEvents.push(SecurityEventType.AUTHENTICATION_FAILURE);
      riskLevel = SecurityRiskLevel.HIGH;

      await this.logSecurityEvent({
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        riskLevel,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          ipAddress,
          userAgent,
        },
        req,
      });

      return {
        success: false,
        error: "Authentication error",
        riskLevel,
        securityEvents,
        metadata: { ipAddress, userAgent, error: String(error) },
      };
    }
  }

  /**
   * Validate session claims for security
   */
  private validateSessionClaims(sessionClaims: Record<string, unknown> | null | undefined): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!sessionClaims) {
      errors.push("No session claims provided");
      return { valid: false, errors };
    }

    // Check expiration
    if (
      sessionClaims.exp &&
      typeof sessionClaims.exp === "number" &&
      sessionClaims.exp < Math.floor(Date.now() / 1000)
    ) {
      errors.push("Session has expired");
    }

    // Check issued at time (not too far in the future)
    if (
      sessionClaims.iat &&
      typeof sessionClaims.iat === "number" &&
      sessionClaims.iat > Math.floor(Date.now() / 1000) + 300
    ) {
      errors.push("Session issued in the future");
    }

    // Check session ID format
    if (sessionClaims.sid && typeof sessionClaims.sid !== "string") {
      errors.push("Invalid session ID format");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(
    req: Request,
    userId: string
  ): Promise<{
    detected: boolean;
    riskLevel: SecurityRiskLevel;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let riskLevel = SecurityRiskLevel.LOW;

    if (!this.config.enableSuspiciousActivityDetection) {
      return { detected: false, riskLevel, reasons };
    }

    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers["user-agent"] || "";

    // Check for rapid requests from same IP
    const session = sessionTracking.get(userId);
    if (session) {
      const timeDiff = Date.now() - session.lastActivity;
      if (timeDiff < 1000 && session.requestCount > 10) {
        reasons.push("Rapid successive requests detected");
        riskLevel = SecurityRiskLevel.MEDIUM;
      }

      // Check for IP address changes
      if (session.ipAddress !== ipAddress) {
        reasons.push("IP address change detected during session");
        riskLevel = SecurityRiskLevel.HIGH;
      }

      // Check for user agent changes
      if (session.userAgent !== userAgent) {
        reasons.push("User agent change detected during session");
        riskLevel = SecurityRiskLevel.MEDIUM;
      }
    }

    // Check for suspicious user agents
    const suspiciousAgents = ["bot", "crawler", "spider", "scraper", "curl", "wget"];
    if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      reasons.push("Suspicious user agent detected");
      riskLevel = SecurityRiskLevel.MEDIUM;
    }

    // Check for suspicious IP patterns (basic implementation)
    if (this.isSuspiciousIP(ipAddress)) {
      reasons.push("Request from suspicious IP address");
      riskLevel = SecurityRiskLevel.HIGH;
    }

    return {
      detected: reasons.length > 0,
      riskLevel,
      reasons,
    };
  }

  /**
   * Check if IP address is suspicious (basic implementation)
   */
  private isSuspiciousIP(ipAddress: string): boolean {
    // Check for localhost/private IPs in production
    if (process.env.NODE_ENV === "production") {
      const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./];

      if (privateRanges.some(range => range.test(ipAddress))) {
        return true;
      }
    }

    // Add more sophisticated IP reputation checking here
    // This could integrate with threat intelligence services

    return false;
  }

  /**
   * Update session tracking for suspicious activity detection
   */
  private updateSessionTracking(
    sessionId: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): void {
    const existing = sessionTracking.get(sessionId);
    const now = Date.now();

    if (existing) {
      existing.lastActivity = now;
      existing.requestCount += 1;
    } else {
      sessionTracking.set(sessionId, {
        userId,
        ipAddress,
        userAgent,
        createdAt: now,
        lastActivity: now,
        requestCount: 1,
      });
    }

    // Clean up old sessions (older than 24 hours)
    for (const [id, session] of sessionTracking.entries()) {
      if (now - session.createdAt > 24 * 60 * 60 * 1000) {
        sessionTracking.delete(id);
      }
    }
  }

  /**
   * Enhanced input sanitization with security logging
   */
  sanitizeInput(
    input: unknown,
    context: string,
    req?: Request,
    visited = new WeakSet()
  ): {
    sanitized: unknown;
    securityEvents: SecurityEventType[];
  } {
    const securityEvents: SecurityEventType[] = [];

    // Handle circular references
    if (typeof input === "object" && input !== null) {
      if (visited.has(input)) {
        return { sanitized: "[Circular Reference]", securityEvents };
      }
      visited.add(input);
    }

    if (typeof input === "string") {
      const original = input;

      // Detect potential XSS attempts
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
      ];

      if (xssPatterns.some(pattern => pattern.test(input))) {
        securityEvents.push(SecurityEventType.XSS_ATTEMPT);
        this.logSecurityEvent({
          type: SecurityEventType.XSS_ATTEMPT,
          riskLevel: SecurityRiskLevel.HIGH,
          details: {
            context,
            originalInput: original,
            detectedPatterns: xssPatterns.filter(p => p.test(input)).map(p => p.toString()),
          },
          req,
        });
      }

      // Detect potential SQL injection attempts
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE|TABLE)\b)/gi,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
        /(';|'--|\s--\s|\/\*.*\*\/)/gi,
      ];

      if (sqlPatterns.some(pattern => pattern.test(input))) {
        securityEvents.push(SecurityEventType.SQL_INJECTION_ATTEMPT);
        this.logSecurityEvent({
          type: SecurityEventType.SQL_INJECTION_ATTEMPT,
          riskLevel: SecurityRiskLevel.CRITICAL,
          details: {
            context,
            originalInput: original,
            detectedPatterns: sqlPatterns.filter(p => p.test(input)).map(p => p.toString()),
          },
          req,
        });
      }

      // Sanitize the input
      const sanitized = input
        .replace(/[<>"'&]/g, "") // Remove dangerous characters
        .replace(/[\u0000]/g, "") // Remove null bytes
        .trim()
        .slice(0, 10000); // Limit length

      return { sanitized, securityEvents };
    }

    if (typeof input === "object" && input !== null) {
      const sanitized: Record<string, unknown> | unknown[] = Array.isArray(input) ? [] : {};

      for (const [key, value] of Object.entries(input)) {
        const result = this.sanitizeInput(value, `${context}.${key}`, req, visited);
        if (Array.isArray(sanitized)) {
          (sanitized as unknown[])[Number(key)] = result.sanitized;
        } else {
          (sanitized as Record<string, unknown>)[key] = result.sanitized;
        }
        securityEvents.push(...result.securityEvents);
      }

      return { sanitized, securityEvents };
    }

    return { sanitized: input, securityEvents };
  }

  /**
   * Brute force protection
   */
  checkBruteForce(identifier: string): {
    allowed: boolean;
    remainingAttempts: number;
    lockoutTime?: number;
  } {
    if (!this.config.enableBruteForceProtection) {
      return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
    }

    const now = Date.now();
    const attempt = failedAttempts.get(identifier);

    if (!attempt) {
      return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
    }

    // Check if lockout period has expired
    if (attempt.lockedUntil && now > attempt.lockedUntil) {
      failedAttempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
    }

    // Check if currently locked out
    if (attempt.lockedUntil && now <= attempt.lockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTime: attempt.lockedUntil,
      };
    }

    const remainingAttempts = this.config.maxFailedAttempts - attempt.count;
    return {
      allowed: remainingAttempts > 0,
      remainingAttempts: Math.max(0, remainingAttempts),
    };
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(identifier: string): void {
    if (!this.config.enableBruteForceProtection) {
      return;
    }

    const now = Date.now();
    const attempt = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };

    attempt.count += 1;
    attempt.lastAttempt = now;

    if (attempt.count >= this.config.maxFailedAttempts) {
      attempt.lockedUntil = now + this.config.lockoutDuration * 60 * 1000;
    }

    failedAttempts.set(identifier, attempt);
  }

  /**
   * Clear failed attempts for successful authentication
   */
  clearFailedAttempts(identifier: string): void {
    failedAttempts.delete(identifier);
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Log security event
   */
  private async logSecurityEvent({
    type,
    riskLevel,
    details,
    req,
  }: {
    type: SecurityEventType;
    riskLevel: SecurityRiskLevel;
    details: Record<string, any>;
    req?: Request;
  }): Promise<void> {
    try {
      const ipAddress = req ? this.getClientIP(req) : undefined;
      const userAgent = req?.headers["user-agent"];

      await auditLogger.logSecurityEvent(
        details.userId || "anonymous",
        type,
        {
          ...details,
          riskLevel,
          timestamp: new Date().toISOString(),
        },
        ipAddress,
        userAgent
      );
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Create security middleware
   */
  createSecurityMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Enhanced authentication
        const authResult = await this.validateClerkToken(req);

        // Add security information to request
        (req as any).security = {
          authResult,
          riskLevel: authResult.riskLevel,
          securityEvents: authResult.securityEvents,
        };

        // Check brute force protection
        const ipAddress = this.getClientIP(req);
        const bruteForceCheck = this.checkBruteForce(ipAddress);

        if (!bruteForceCheck.allowed) {
          await this.logSecurityEvent({
            type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
            riskLevel: SecurityRiskLevel.HIGH,
            details: {
              ipAddress,
              lockoutTime: bruteForceCheck.lockoutTime,
            },
            req,
          });

          res.status(429).json({
            error: "Too many failed attempts",
            retryAfter: bruteForceCheck.lockoutTime
              ? Math.ceil((bruteForceCheck.lockoutTime - Date.now()) / 1000)
              : undefined,
          });
          return;
        }

        // Sanitize request body
        if (req.body) {
          const sanitizationResult = this.sanitizeInput(req.body, "request.body", req);
          req.body = sanitizationResult.sanitized;

          if (sanitizationResult.securityEvents.length > 0) {
            (req as any).security.securityEvents.push(...sanitizationResult.securityEvents);
          }
        }

        // Sanitize query parameters
        if (req.query) {
          const sanitizationResult = this.sanitizeInput(req.query, "request.query", req);
          // Only assign if the result is a valid query object
          if (sanitizationResult.sanitized && typeof sanitizationResult.sanitized === "object") {
            req.query = sanitizationResult.sanitized as any;
          }

          if (sanitizationResult.securityEvents.length > 0) {
            (req as unknown).security.securityEvents.push(...sanitizationResult.securityEvents);
          }
        }

        next();
      } catch (error) {
        console.error("Security middleware error:", error);
        res.status(500).json({ error: "Security validation failed" });
      }
    };
  }
}

// Create singleton instance
export const securityEnhancer = new SecurityEnhancer();

// Export default instance
export default securityEnhancer;
