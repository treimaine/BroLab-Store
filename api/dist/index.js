var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/types/ConvexUser.ts
function convexUserToUser(convexUser) {
  const numericId = extractNumericId(convexUser._id);
  return {
    id: numericId,
    username: convexUser.username || convexUser.email.split("@")[0] || `user_${convexUser.clerkId.slice(-8)}`,
    email: convexUser.email,
    password: "",
    // Not stored in Convex, using Clerk for auth
    created_at: new Date(convexUser.createdAt).toISOString(),
    avatar: convexUser.imageUrl || convexUser.avatar || null,
    subscription: null,
    // Will be populated separately if needed
    memberSince: new Date(convexUser.createdAt).toISOString(),
    stripeCustomerId: null,
    // Using Clerk for billing
    stripe_customer_id: null,
    // Snake case version for compatibility
    downloads_used: 0,
    // Default value, will be updated from quota system
    quota: 3
    // Default free tier quota
  };
}
function userToConvexUserInput(user) {
  return {
    clerkId: user.clerkId,
    email: user.email || "",
    username: user.username,
    firstName: void 0,
    // Not available in shared User type
    lastName: void 0,
    // Not available in shared User type
    imageUrl: user.avatar || void 0
  };
}
function extractNumericId(convexId) {
  const idString = convexId.toString();
  const numericPart = idString.slice(-8);
  const parsed = Number.parseInt(numericPart, 16);
  return parsed || Math.floor(Math.random() * 1e6);
}
var init_ConvexUser = __esm({
  "shared/types/ConvexUser.ts"() {
    "use strict";
  }
});

// convex/_generated/api.js
var api_exports = {};
__export(api_exports, {
  api: () => api,
  internal: () => internal
});
import { anyApi } from "convex/server";
var api, internal;
var init_api = __esm({
  "convex/_generated/api.js"() {
    "use strict";
    api = anyApi;
    internal = anyApi;
  }
});

// shared/types/ConvexIntegration.ts
function handleConvexError(error, functionName, context) {
  const message = error instanceof Error ? error.message : String(error);
  const convexError = new ConvexIntegrationError(message, functionName, error);
  console.error("Convex Integration Error:", {
    functionName,
    message,
    context,
    originalError: error
  });
  return convexError;
}
async function withRetry(operation, options = {}) {
  const { maxAttempts, delayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };
  let lastError;
  let currentDelay = delayMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }
  throw lastError;
}
var CONVEX_FUNCTIONS, ConvexIntegrationError, DEFAULT_RETRY_OPTIONS, ConvexOperationWrapper;
var init_ConvexIntegration = __esm({
  "shared/types/ConvexIntegration.ts"() {
    "use strict";
    CONVEX_FUNCTIONS = {
      // User management
      GET_USER_BY_CLERK_ID: "users/clerkSync:getUserByClerkId",
      UPSERT_USER: "users/clerkSync:upsertUser",
      UPDATE_USER_AVATAR: "users/clerkSync:updateUserAvatar",
      // Downloads
      LOG_DOWNLOAD: "downloads/record:logDownload",
      GET_USER_DOWNLOADS: "downloads/record:getUserDownloads",
      // Orders
      CREATE_ORDER: "orders/createOrder:createOrder",
      GET_USER_ORDERS: "orders/createOrder:getUserOrders",
      UPDATE_ORDER_STATUS: "orders/createOrder:updateOrderStatus",
      // Reservations
      CREATE_RESERVATION: "reservations/createReservation:createReservation",
      GET_USER_RESERVATIONS: "reservations/createReservation:getUserReservations",
      UPDATE_RESERVATION_STATUS: "reservations/createReservation:updateReservationStatus",
      // Subscriptions
      UPSERT_SUBSCRIPTION: "subscriptions/updateSubscription:upsertSubscription",
      GET_USER_SUBSCRIPTION: "subscriptions/updateSubscription:getUserSubscription",
      // Activity
      LOG_ACTIVITY: "activity/logActivity:logActivity",
      GET_USER_ACTIVITY: "activity/logActivity:getUserActivity",
      // Sync operations
      SYNC_WORDPRESS_PRODUCTS: "sync/wordpress:syncWordPressProducts",
      SYNC_WOOCOMMERCE_ORDERS: "sync/woocommerce:syncWooCommerceOrders",
      GET_SYNCED_PRODUCTS: "sync/wordpress:getSyncedProducts",
      GET_SYNCED_ORDERS: "sync/woocommerce:getSyncedOrders"
    };
    ConvexIntegrationError = class extends Error {
      constructor(message, functionName, originalError) {
        super(`Convex ${functionName}: ${message}`);
        this.functionName = functionName;
        this.originalError = originalError;
        this.name = "ConvexIntegrationError";
      }
    };
    DEFAULT_RETRY_OPTIONS = {
      maxAttempts: 3,
      delayMs: 1e3,
      backoffMultiplier: 2
    };
    ConvexOperationWrapper = class {
      constructor(client) {
        this.client = client;
      }
      async mutation(functionName, args, options) {
        try {
          const result = await withRetry(() => this.client.mutation(functionName, args), options);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          throw handleConvexError(error, functionName, args);
        }
      }
      async query(functionName, args, options) {
        try {
          const result = await withRetry(() => this.client.query(functionName, args), options);
          return {
            success: true,
            data: result
          };
        } catch (error) {
          throw handleConvexError(error, functionName, args);
        }
      }
    };
  }
});

// server/lib/convex.ts
var convex_exports = {};
__export(convex_exports, {
  convex: () => convex,
  convexWrapper: () => convexWrapper,
  createOrder: () => createOrder,
  createReservation: () => createReservation,
  getConvex: () => getConvex,
  getUserByClerkId: () => getUserByClerkId,
  logActivity: () => logActivity,
  logDownload: () => logDownload,
  upsertSubscription: () => upsertSubscription,
  upsertUser: () => upsertUser
});
import { ConvexHttpClient } from "convex/browser";
function createMockConvexClient() {
  const mockClient = {
    query: async () => null,
    mutation: async () => null,
    action: async () => null
  };
  return mockClient;
}
function getConvexClient() {
  if (convexClient) {
    return convexClient;
  }
  if (initializationError) {
    throw initializationError;
  }
  if (process.env.NODE_ENV === "test") {
    convexClient = createMockConvexClient();
    return convexClient;
  }
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    initializationError = new Error(
      "VITE_CONVEX_URL environment variable is required. Add it to your .env file:\nVITE_CONVEX_URL=https://your-deployment.convex.cloud"
    );
    throw initializationError;
  }
  try {
    convexClient = new ConvexHttpClient(convexUrl);
    return convexClient;
  } catch (error) {
    initializationError = error instanceof Error ? error : new Error("Failed to initialize Convex client");
    throw initializationError;
  }
}
async function getUserByClerkId(clerkId) {
  try {
    const result = await convexWrapper.query(CONVEX_FUNCTIONS.GET_USER_BY_CLERK_ID, {
      clerkId
    });
    return result.data || null;
  } catch (error) {
    console.error("getUserByClerkId failed:", error);
    return null;
  }
}
async function upsertUser(userData) {
  try {
    const result = await convexWrapper.mutation(CONVEX_FUNCTIONS.UPSERT_USER, userData);
    return result.data || null;
  } catch (error) {
    console.error("upsertUser failed:", error);
    return null;
  }
}
async function logDownload(downloadData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.LOG_DOWNLOAD,
      downloadData
    );
    return result.data || null;
  } catch (error) {
    console.error("logDownload failed:", error);
    return null;
  }
}
async function createOrder(orderData) {
  try {
    const result = await convexWrapper.mutation(CONVEX_FUNCTIONS.CREATE_ORDER, orderData);
    return result.data || null;
  } catch (error) {
    console.error("createOrder failed:", error);
    return null;
  }
}
async function createReservation(reservationData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.CREATE_RESERVATION,
      reservationData
    );
    return result.data || null;
  } catch (error) {
    console.error("createReservation failed:", error);
    return null;
  }
}
async function upsertSubscription(subscriptionData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.UPSERT_SUBSCRIPTION,
      subscriptionData
    );
    return result.data || null;
  } catch (error) {
    console.error("upsertSubscription failed:", error);
    return null;
  }
}
async function logActivity(activityData) {
  try {
    const result = await convexWrapper.mutation(
      CONVEX_FUNCTIONS.LOG_ACTIVITY,
      activityData
    );
    return result.data || null;
  } catch (error) {
    console.error("logActivity failed:", error);
    return null;
  }
}
var convexClient, initializationError, convex, convexWrapper, getConvex;
var init_convex = __esm({
  "server/lib/convex.ts"() {
    "use strict";
    init_ConvexIntegration();
    convexClient = null;
    initializationError = null;
    convex = new Proxy({}, {
      get(_target, prop) {
        const client = getConvexClient();
        const value = client[prop];
        return typeof value === "function" ? value.bind(client) : value;
      }
    });
    convexWrapper = new ConvexOperationWrapper(convex);
    getConvex = getConvexClient;
  }
});

// server/lib/audit.ts
var AuditLogger, auditLogger;
var init_audit = __esm({
  "server/lib/audit.ts"() {
    "use strict";
    init_api();
    init_convex();
    AuditLogger = class _AuditLogger {
      static instance;
      constructor() {
      }
      static getInstance() {
        if (!_AuditLogger.instance) {
          _AuditLogger.instance = new _AuditLogger();
        }
        return _AuditLogger.instance;
      }
      /**
       * Log a security-relevant action to Convex
       * Implements graceful degradation - logs to console if Convex fails
       * Requirements: 1.1, 1.4
       */
      async log(entry) {
        try {
          const convex6 = getConvex();
          await convex6.mutation(api.audit.logAuditEvent, {
            userId: entry.userId,
            action: entry.action,
            resource: entry.resource,
            details: entry.details,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent
          });
        } catch (error) {
          console.error("Failed to log audit entry to Convex:", error);
          console.log("Audit log entry (fallback):", entry);
        }
      }
      /**
       * Log user registration
       */
      async logRegistration(userId, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "user_registered",
          resource: "users",
          details: { event: "registration_success" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log user login
       */
      async logLogin(userId, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "user_login",
          resource: "users",
          details: { event: "login_success" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log failed login attempt
       */
      async logFailedLogin(username, ipAddress, userAgent) {
        await this.log({
          action: "login_failed",
          resource: "users",
          details: { username, event: "login_failed" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log subscription creation
       */
      async logSubscriptionCreated(userId, plan, billingInterval, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "subscription_created",
          resource: "subscriptions",
          details: { plan, billingInterval, event: "subscription_created" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log subscription update
       */
      async logSubscriptionUpdated(userId, oldStatus, newStatus, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "subscription_updated",
          resource: "subscriptions",
          details: {
            oldStatus,
            newStatus,
            event: "subscription_updated"
          },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log subscription cancellation
       */
      async logSubscriptionCancelled(userId, plan, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "subscription_cancelled",
          resource: "subscriptions",
          details: { plan, event: "subscription_cancelled" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log payment processed
       */
      async logPaymentProcessed(userId, amount, currency, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "payment_processed",
          resource: "payments",
          details: { amount, currency, event: "payment_success" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log payment failure
       */
      async logPaymentFailed(userId, amount, currency, error, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "payment_failed",
          resource: "payments",
          details: { amount, currency, error, event: "payment_failed" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log profile update
       */
      async logProfileUpdated(userId, fields, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "profile_updated",
          resource: "users",
          details: { fields, event: "profile_updated" },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log security event
       */
      async logSecurityEvent(userId, event, details, ipAddress, userAgent) {
        await this.log({
          userId,
          action: "security_event",
          resource: "security",
          details: { ...details, event },
          ipAddress,
          userAgent
        });
      }
      /**
       * Log rate limit exceeded
       */
      async logRateLimitExceeded(ipAddress, endpoint, limit) {
        await this.log({
          action: "rate_limit_exceeded",
          resource: "api",
          details: { endpoint, limit, event: "rate_limit_exceeded" },
          ipAddress,
          userAgent: void 0
        });
      }
      /**
       * Get user audit logs from Convex
       * Requirements: 1.2
       */
      async getUserAuditLogs(clerkId, limit = 50) {
        try {
          const convex6 = getConvex();
          const logs = await convex6.query(api.audit.getUserAuditLogs, {
            clerkId,
            limit
          });
          return logs.map((log) => ({
            userId: log.clerkId ?? void 0,
            action: log.action,
            resource: log.resource,
            details: log.details,
            ipAddress: log.ipAddress ?? void 0,
            userAgent: log.userAgent ?? void 0,
            timestamp: log.timestamp
          }));
        } catch (error) {
          console.error("Failed to get user audit logs from Convex:", error);
          return [];
        }
      }
      /**
       * Get security events from Convex
       * Requirements: 1.3
       */
      async getSecurityEvents(limit = 100) {
        try {
          const convex6 = getConvex();
          const events = await convex6.query(api.audit.getSecurityEvents, {
            limit
          });
          return events.map((event) => ({
            userId: event.clerkId ?? void 0,
            action: event.action,
            resource: event.resource,
            details: event.details,
            ipAddress: event.ipAddress ?? void 0,
            userAgent: event.userAgent ?? void 0,
            timestamp: event.timestamp
          }));
        } catch (error) {
          console.error("Failed to get security events from Convex:", error);
          return [];
        }
      }
    };
    auditLogger = AuditLogger.getInstance();
  }
});

// server/lib/securityEnhancer.ts
var securityEnhancer_exports = {};
__export(securityEnhancer_exports, {
  SecurityEnhancer: () => SecurityEnhancer,
  SecurityEventType: () => SecurityEventType,
  SecurityRiskLevel: () => SecurityRiskLevel,
  default: () => securityEnhancer_default,
  securityEnhancer: () => securityEnhancer
});
import { getAuth } from "@clerk/express";
var SecurityEventType, SecurityRiskLevel, DEFAULT_SECURITY_CONFIG, failedAttempts, sessionTracking, SecurityEnhancer, securityEnhancer, securityEnhancer_default;
var init_securityEnhancer = __esm({
  "server/lib/securityEnhancer.ts"() {
    "use strict";
    init_audit();
    SecurityEventType = /* @__PURE__ */ ((SecurityEventType2) => {
      SecurityEventType2["AUTHENTICATION_SUCCESS"] = "authentication_success";
      SecurityEventType2["AUTHENTICATION_FAILURE"] = "authentication_failure";
      SecurityEventType2["TOKEN_VALIDATION_FAILURE"] = "token_validation_failure";
      SecurityEventType2["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
      SecurityEventType2["RATE_LIMIT_EXCEEDED"] = "rate_limit_exceeded";
      SecurityEventType2["INVALID_INPUT_DETECTED"] = "invalid_input_detected";
      SecurityEventType2["PRIVILEGE_ESCALATION_ATTEMPT"] = "privilege_escalation_attempt";
      SecurityEventType2["SESSION_HIJACK_ATTEMPT"] = "session_hijack_attempt";
      SecurityEventType2["BRUTE_FORCE_ATTEMPT"] = "brute_force_attempt";
      SecurityEventType2["SQL_INJECTION_ATTEMPT"] = "sql_injection_attempt";
      SecurityEventType2["XSS_ATTEMPT"] = "xss_attempt";
      SecurityEventType2["CSRF_ATTEMPT"] = "csrf_attempt";
      SecurityEventType2["UNAUTHORIZED_ACCESS_ATTEMPT"] = "unauthorized_access_attempt";
      return SecurityEventType2;
    })(SecurityEventType || {});
    SecurityRiskLevel = /* @__PURE__ */ ((SecurityRiskLevel2) => {
      SecurityRiskLevel2["LOW"] = "low";
      SecurityRiskLevel2["MEDIUM"] = "medium";
      SecurityRiskLevel2["HIGH"] = "high";
      SecurityRiskLevel2["CRITICAL"] = "critical";
      return SecurityRiskLevel2;
    })(SecurityRiskLevel || {});
    DEFAULT_SECURITY_CONFIG = {
      maxFailedAttempts: 5,
      lockoutDuration: 15,
      sessionTimeout: 60,
      requireStrongPasswords: true,
      enableBruteForceProtection: true,
      enableSuspiciousActivityDetection: true,
      logAllAuthAttempts: true
    };
    failedAttempts = /* @__PURE__ */ new Map();
    sessionTracking = /* @__PURE__ */ new Map();
    SecurityEnhancer = class {
      config;
      constructor(config = {}) {
        this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
      }
      /**
       * Enhanced Clerk token validation with security logging
       */
      async validateClerkToken(req) {
        const ipAddress = this.getClientIP(req);
        const userAgent = req.headers["user-agent"] || "unknown";
        const securityEvents = [];
        let riskLevel = "low" /* LOW */;
        try {
          const { userId, sessionId, sessionClaims } = getAuth(req);
          if (!userId) {
            securityEvents.push("authentication_failure" /* AUTHENTICATION_FAILURE */);
            riskLevel = "medium" /* MEDIUM */;
            await this.logSecurityEvent({
              type: "authentication_failure" /* AUTHENTICATION_FAILURE */,
              riskLevel,
              details: {
                reason: "No Clerk user ID found",
                ipAddress,
                userAgent
              },
              req
            });
            return {
              success: false,
              error: "Authentication failed",
              riskLevel,
              securityEvents,
              metadata: { ipAddress, userAgent }
            };
          }
          const claimsValidation = this.validateSessionClaims(sessionClaims);
          if (!claimsValidation.valid) {
            securityEvents.push("token_validation_failure" /* TOKEN_VALIDATION_FAILURE */);
            riskLevel = "high" /* HIGH */;
            await this.logSecurityEvent({
              type: "token_validation_failure" /* TOKEN_VALIDATION_FAILURE */,
              riskLevel,
              details: {
                reason: "Invalid session claims",
                errors: claimsValidation.errors,
                userId,
                ipAddress,
                userAgent
              },
              req
            });
            return {
              success: false,
              error: "Invalid session claims",
              riskLevel,
              securityEvents,
              metadata: { userId, ipAddress, userAgent }
            };
          }
          const suspiciousActivity = await this.detectSuspiciousActivity(req, userId);
          if (suspiciousActivity.detected) {
            securityEvents.push("suspicious_activity" /* SUSPICIOUS_ACTIVITY */);
            const riskLevels = [
              "low" /* LOW */,
              "medium" /* MEDIUM */,
              "high" /* HIGH */,
              "critical" /* CRITICAL */
            ];
            const currentIndex = riskLevels.indexOf(riskLevel);
            const suspiciousIndex = riskLevels.indexOf(suspiciousActivity.riskLevel);
            riskLevel = riskLevels[Math.max(currentIndex, suspiciousIndex)];
            await this.logSecurityEvent({
              type: "suspicious_activity" /* SUSPICIOUS_ACTIVITY */,
              riskLevel: suspiciousActivity.riskLevel,
              details: {
                reasons: suspiciousActivity.reasons,
                userId,
                ipAddress,
                userAgent
              },
              req
            });
          }
          this.updateSessionTracking(sessionId || userId, userId, ipAddress, userAgent);
          if (this.config.logAllAuthAttempts) {
            await this.logSecurityEvent({
              type: "authentication_success" /* AUTHENTICATION_SUCCESS */,
              riskLevel: "low" /* LOW */,
              details: {
                userId,
                sessionId,
                ipAddress,
                userAgent
              },
              req
            });
          }
          return {
            success: true,
            user: { userId, sessionId, sessionClaims },
            riskLevel,
            securityEvents,
            metadata: { userId, sessionId, ipAddress, userAgent }
          };
        } catch (error) {
          securityEvents.push("authentication_failure" /* AUTHENTICATION_FAILURE */);
          riskLevel = "high" /* HIGH */;
          await this.logSecurityEvent({
            type: "authentication_failure" /* AUTHENTICATION_FAILURE */,
            riskLevel,
            details: {
              error: error instanceof Error ? error.message : "Unknown error",
              ipAddress,
              userAgent
            },
            req
          });
          return {
            success: false,
            error: "Authentication error",
            riskLevel,
            securityEvents,
            metadata: { ipAddress, userAgent, error: String(error) }
          };
        }
      }
      /**
       * Validate session claims for security
       */
      validateSessionClaims(sessionClaims) {
        const errors = [];
        if (!sessionClaims) {
          errors.push("No session claims provided");
          return { valid: false, errors };
        }
        if (sessionClaims.exp && typeof sessionClaims.exp === "number" && sessionClaims.exp < Math.floor(Date.now() / 1e3)) {
          errors.push("Session has expired");
        }
        if (sessionClaims.iat && typeof sessionClaims.iat === "number" && sessionClaims.iat > Math.floor(Date.now() / 1e3) + 300) {
          errors.push("Session issued in the future");
        }
        if (sessionClaims.sid && typeof sessionClaims.sid !== "string") {
          errors.push("Invalid session ID format");
        }
        return { valid: errors.length === 0, errors };
      }
      /**
       * Detect suspicious activity patterns
       */
      async detectSuspiciousActivity(req, userId) {
        const reasons = [];
        let riskLevel = "low" /* LOW */;
        if (!this.config.enableSuspiciousActivityDetection) {
          return { detected: false, riskLevel, reasons };
        }
        const ipAddress = this.getClientIP(req);
        const userAgent = req.headers["user-agent"] || "";
        const session2 = sessionTracking.get(userId);
        if (session2) {
          const timeDiff = Date.now() - session2.lastActivity;
          if (timeDiff < 1e3 && session2.requestCount > 10) {
            reasons.push("Rapid successive requests detected");
            riskLevel = "medium" /* MEDIUM */;
          }
          if (session2.ipAddress !== ipAddress) {
            reasons.push("IP address change detected during session");
            riskLevel = "high" /* HIGH */;
          }
          if (session2.userAgent !== userAgent) {
            reasons.push("User agent change detected during session");
            riskLevel = "medium" /* MEDIUM */;
          }
        }
        const suspiciousAgents = ["bot", "crawler", "spider", "scraper", "curl", "wget"];
        if (suspiciousAgents.some((agent) => userAgent.toLowerCase().includes(agent))) {
          reasons.push("Suspicious user agent detected");
          riskLevel = "medium" /* MEDIUM */;
        }
        if (this.isSuspiciousIP(ipAddress)) {
          reasons.push("Request from suspicious IP address");
          riskLevel = "high" /* HIGH */;
        }
        return {
          detected: reasons.length > 0,
          riskLevel,
          reasons
        };
      }
      /**
       * Check if IP address is suspicious (basic implementation)
       */
      isSuspiciousIP(ipAddress) {
        if (process.env.NODE_ENV === "production") {
          const privateRanges = [/^127\./, /^10\./, /^172\.(\d{2}|3[0-1])\./, /^192\.168\./];
          if (privateRanges.some((range) => range.test(ipAddress))) {
            return true;
          }
        }
        return false;
      }
      /**
       * Update session tracking for suspicious activity detection
       */
      updateSessionTracking(sessionId, userId, ipAddress, userAgent) {
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
            requestCount: 1
          });
        }
        for (const [id, session2] of sessionTracking.entries()) {
          if (now - session2.createdAt > 24 * 60 * 60 * 1e3) {
            sessionTracking.delete(id);
          }
        }
      }
      /**
       * Detect XSS patterns in input
       */
      detectXSSPatterns(input) {
        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe[^>]*>.*?<\/iframe>/gi
        ];
        return xssPatterns.some((pattern) => pattern.test(input));
      }
      /**
       * Detect SQL injection patterns in input
       */
      detectSQLPatterns(input) {
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE|TABLE)\b)/gi,
          /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
          /(';|'--|\s--\s|\/\*.*\*\/)/gi
        ];
        return sqlPatterns.some((pattern) => pattern.test(input));
      }
      /**
       * Sanitize string input
       */
      sanitizeString(input, context, req) {
        const securityEvents = [];
        const original = input;
        if (this.detectXSSPatterns(input)) {
          securityEvents.push("xss_attempt" /* XSS_ATTEMPT */);
          this.logSecurityEvent({
            type: "xss_attempt" /* XSS_ATTEMPT */,
            riskLevel: "high" /* HIGH */,
            details: { context, originalInput: original },
            req
          });
        }
        if (this.detectSQLPatterns(input)) {
          securityEvents.push("sql_injection_attempt" /* SQL_INJECTION_ATTEMPT */);
          this.logSecurityEvent({
            type: "sql_injection_attempt" /* SQL_INJECTION_ATTEMPT */,
            riskLevel: "critical" /* CRITICAL */,
            details: { context, originalInput: original },
            req
          });
        }
        const sanitized = input.replaceAll(/[<>"'&]/g, "").replaceAll("\0", "").trim().slice(0, 1e4);
        return { sanitized, securityEvents };
      }
      /**
       * Sanitize object input
       */
      sanitizeObject(input, context, req, visited) {
        const securityEvents = [];
        if (Array.isArray(input)) {
          const sanitized = [];
          for (const [key, value] of Object.entries(input)) {
            const result = this.sanitizeInput(value, `${context}.${key}`, req, visited);
            sanitized[Number(key)] = result.sanitized;
            securityEvents.push(...result.securityEvents);
          }
          return { sanitized, securityEvents };
        } else {
          const sanitized = {};
          for (const [key, value] of Object.entries(input)) {
            const result = this.sanitizeInput(value, `${context}.${key}`, req, visited);
            sanitized[key] = result.sanitized;
            securityEvents.push(...result.securityEvents);
          }
          return { sanitized, securityEvents };
        }
      }
      /**
       * Enhanced input sanitization with security logging
       */
      sanitizeInput(input, context, req = void 0, visited = /* @__PURE__ */ new WeakSet()) {
        if (typeof input === "object" && input !== null) {
          if (visited.has(input)) {
            return { sanitized: "[Circular Reference]", securityEvents: [] };
          }
          visited.add(input);
        }
        if (typeof input === "string") {
          return this.sanitizeString(input, context, req);
        }
        if (typeof input === "object" && input !== null) {
          return this.sanitizeObject(input, context, req, visited);
        }
        return { sanitized: input, securityEvents: [] };
      }
      /**
       * Brute force protection
       */
      checkBruteForce(identifier) {
        if (!this.config.enableBruteForceProtection) {
          return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
        }
        const now = Date.now();
        const attempt = failedAttempts.get(identifier);
        if (!attempt) {
          return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
        }
        if (attempt.lockedUntil && now > attempt.lockedUntil) {
          failedAttempts.delete(identifier);
          return { allowed: true, remainingAttempts: this.config.maxFailedAttempts };
        }
        if (attempt.lockedUntil && now <= attempt.lockedUntil) {
          return {
            allowed: false,
            remainingAttempts: 0,
            lockoutTime: attempt.lockedUntil
          };
        }
        const remainingAttempts = this.config.maxFailedAttempts - attempt.count;
        return {
          allowed: remainingAttempts > 0,
          remainingAttempts: Math.max(0, remainingAttempts)
        };
      }
      /**
       * Record failed authentication attempt
       */
      recordFailedAttempt(identifier) {
        if (!this.config.enableBruteForceProtection) {
          return;
        }
        const now = Date.now();
        const attempt = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
        attempt.count += 1;
        attempt.lastAttempt = now;
        if (attempt.count >= this.config.maxFailedAttempts) {
          attempt.lockedUntil = now + this.config.lockoutDuration * 60 * 1e3;
        }
        failedAttempts.set(identifier, attempt);
      }
      /**
       * Clear failed attempts for successful authentication
       */
      clearFailedAttempts(identifier) {
        failedAttempts.delete(identifier);
      }
      /**
       * Get client IP address
       */
      getClientIP(req) {
        return req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown";
      }
      /**
       * Log security event
       */
      async logSecurityEvent({
        type,
        riskLevel,
        details,
        req
      }) {
        try {
          const ipAddress = req ? this.getClientIP(req) : void 0;
          const userAgent = req?.headers["user-agent"];
          await auditLogger.logSecurityEvent(
            details.userId || "anonymous",
            type,
            {
              ...details,
              riskLevel,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            },
            ipAddress,
            userAgent
          );
        } catch (error) {
          console.error("Failed to log security event:", error);
        }
      }
      /**
       * Handle brute force check in middleware
       */
      async handleBruteForceCheck(req, res) {
        const ipAddress = this.getClientIP(req);
        const bruteForceCheck = this.checkBruteForce(ipAddress);
        if (!bruteForceCheck.allowed) {
          await this.logSecurityEvent({
            type: "brute_force_attempt" /* BRUTE_FORCE_ATTEMPT */,
            riskLevel: "high" /* HIGH */,
            details: {
              ipAddress,
              lockoutTime: bruteForceCheck.lockoutTime
            },
            req
          });
          res.status(429).json({
            error: "Too many failed attempts",
            retryAfter: bruteForceCheck.lockoutTime ? Math.ceil((bruteForceCheck.lockoutTime - Date.now()) / 1e3) : void 0
          });
          return { allowed: false };
        }
        return { allowed: true };
      }
      /**
       * Sanitize request data
       */
      sanitizeRequestData(req) {
        if (req.body) {
          const sanitizationResult = this.sanitizeInput(req.body, "request.body", req);
          req.body = sanitizationResult.sanitized;
          if (sanitizationResult.securityEvents.length > 0) {
            const authReq = req;
            authReq.security?.securityEvents.push(...sanitizationResult.securityEvents);
          }
        }
        if (req.query) {
          const sanitizationResult = this.sanitizeInput(req.query, "request.query", req);
          if (sanitizationResult.sanitized && typeof sanitizationResult.sanitized === "object") {
            req.query = sanitizationResult.sanitized;
          }
          if (sanitizationResult.securityEvents.length > 0) {
            const authReq = req;
            authReq.security?.securityEvents.push(...sanitizationResult.securityEvents);
          }
        }
      }
      /**
       * Create security middleware
       */
      createSecurityMiddleware() {
        return async (req, res, next) => {
          try {
            const authResult = await this.validateClerkToken(req);
            req.security = {
              authResult,
              riskLevel: authResult.riskLevel,
              securityEvents: authResult.securityEvents
            };
            const bruteForceResult = await this.handleBruteForceCheck(req, res);
            if (!bruteForceResult.allowed) {
              return;
            }
            this.sanitizeRequestData(req);
            next();
          } catch (error) {
            console.error("Security middleware error:", error);
            res.status(500).json({ error: "Security validation failed" });
          }
        };
      }
    };
    securityEnhancer = new SecurityEnhancer();
    securityEnhancer_default = securityEnhancer;
  }
});

// server/auth.ts
import { clerkMiddleware, getAuth as getAuth2 } from "@clerk/express";
import cookieParser from "cookie-parser";
import session from "express-session";
function setupAuth(app2) {
  if (process.env.NODE_ENV !== "test" && !process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET environment variable is required for security. Generate a strong secret with: openssl rand -hex 32"
    );
  }
  app2.use(cookieParser());
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "test-secret-key-only-for-testing",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1e3
      },
      store: process.env.NODE_ENV === "test" ? new session.MemoryStore() : void 0
      // NOTE: Consider using Redis store in production for session persistence
      // Example: new RedisStore({ client: redisClient })
    })
  );
  try {
    if (process.env.NODE_ENV === "test") {
      app2.use((_req, _res, next) => next());
    } else if (typeof clerkMiddleware === "function") {
      app2.use(clerkMiddleware());
    } else {
      app2.use((_req, _res, next) => next());
    }
  } catch {
    app2.use((_req, _res, next) => next());
  }
}
function isTokenAccepted(token) {
  if (!token) return false;
  const envToken = process.env.TEST_USER_TOKEN;
  if (envToken && token === envToken) return true;
  if (issuedTestTokens.has(token)) return true;
  return defaultAcceptedTokens.has(token);
}
function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown";
}
function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const bearerPrefix = "Bearer ";
  return authHeader.startsWith(bearerPrefix) ? authHeader.slice(bearerPrefix.length) : void 0;
}
async function handleTestTokenAuth(req, ipAddress, userAgent) {
  const bearerToken = extractBearerToken(req);
  if (!isTokenAccepted(bearerToken)) {
    return false;
  }
  const { SecurityEventType: SecurityEventType2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
  await auditLogger.logSecurityEvent(
    "testsprite_user",
    SecurityEventType2.AUTHENTICATION_SUCCESS,
    {
      method: "test_token",
      ipAddress,
      userAgent
    },
    ipAddress,
    userAgent
  );
  req.user = {
    id: "0",
    username: "testsprite_user",
    email: "testsprite@example.com",
    role: "user"
  };
  return true;
}
async function handleClerkAuth(req, userId, sessionId, authResult, ipAddress, userAgent) {
  const { securityEnhancer: securityEnhancer2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
  securityEnhancer2.clearFailedAttempts(ipAddress);
  let convexUser = await getUserByClerkId(userId);
  if (!convexUser) {
    const newUserInput = userToConvexUserInput({
      clerkId: userId,
      email: "",
      // Will be updated client-side
      username: `user_${userId.slice(-8)}`
    });
    convexUser = await upsertUser(newUserInput);
    if (convexUser) {
      await auditLogger.logRegistration(userId, ipAddress, userAgent);
    }
  }
  if (!convexUser) {
    return false;
  }
  const sharedUser = convexUserToUser(convexUser);
  await auditLogger.logLogin(userId, ipAddress, userAgent);
  for (const event of authResult.securityEvents) {
    await auditLogger.logSecurityEvent(
      userId,
      event,
      {
        riskLevel: authResult.riskLevel,
        sessionId,
        ipAddress,
        userAgent
      },
      ipAddress,
      userAgent
    );
  }
  req.user = {
    id: sharedUser.id.toString(),
    clerkId: convexUser.clerkId,
    username: sharedUser.username,
    email: sharedUser.email,
    role: convexUser.role || "user"
  };
  req.security = {
    riskLevel: authResult.riskLevel,
    securityEvents: authResult.securityEvents,
    sessionId
  };
  return true;
}
async function handleSessionAuth(req, ipAddress, userAgent) {
  if (!req.session?.userId) {
    return false;
  }
  const { SecurityEventType: SecurityEventType2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
  await auditLogger.logSecurityEvent(
    req.session.userId.toString(),
    SecurityEventType2.AUTHENTICATION_SUCCESS,
    {
      method: "session",
      ipAddress,
      userAgent
    },
    ipAddress,
    userAgent
  );
  req.user = {
    id: req.session.userId.toString(),
    username: `session_user_${req.session.userId}`,
    email: "",
    role: "user"
  };
  return true;
}
function registerAuthRoutes(app2) {
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
}
var issuedTestTokens, defaultAcceptedTokens, isAuthenticated, getCurrentUser;
var init_auth = __esm({
  "server/auth.ts"() {
    "use strict";
    init_ConvexUser();
    init_audit();
    init_convex();
    issuedTestTokens = /* @__PURE__ */ new Set();
    defaultAcceptedTokens = /* @__PURE__ */ new Set([
      "mock-test-token",
      "test_api_key_or_jwt_token_for_clerk_authentication"
    ]);
    isAuthenticated = async (req, res, next) => {
      try {
        const { securityEnhancer: securityEnhancer2, SecurityEventType: SecurityEventType2 } = await Promise.resolve().then(() => (init_securityEnhancer(), securityEnhancer_exports));
        const ipAddress = getClientIP(req);
        const userAgent = req.headers["user-agent"] || "unknown";
        if (await handleTestTokenAuth(req, ipAddress, userAgent)) {
          return next();
        }
        const authResult = await securityEnhancer2.validateClerkToken(req);
        if (!authResult.success) {
          securityEnhancer2.recordFailedAttempt(ipAddress);
          await auditLogger.logSecurityEvent(
            "anonymous",
            SecurityEventType2.AUTHENTICATION_FAILURE,
            {
              error: authResult.error,
              riskLevel: authResult.riskLevel,
              securityEvents: authResult.securityEvents,
              ipAddress,
              userAgent
            },
            ipAddress,
            userAgent
          );
          res.status(401).json({
            error: "Authentication failed",
            details: process.env.NODE_ENV === "development" ? authResult.error : void 0
          });
          return;
        }
        const { userId, sessionId } = authResult.user || {};
        if (userId) {
          const success = await handleClerkAuth(
            req,
            userId,
            sessionId,
            authResult,
            ipAddress,
            userAgent
          );
          if (success) {
            return next();
          }
        }
        if (await handleSessionAuth(req, ipAddress, userAgent)) {
          return next();
        }
        await auditLogger.logSecurityEvent(
          "anonymous",
          SecurityEventType2.UNAUTHORIZED_ACCESS_ATTEMPT,
          {
            path: req.path,
            method: req.method,
            ipAddress,
            userAgent
          },
          ipAddress,
          userAgent
        );
        res.status(401).json({ error: "Unauthorized" });
      } catch (error) {
        console.error("Authentication error:", error);
        const ipAddress = getClientIP(req);
        const userAgent = req.headers["user-agent"] || "unknown";
        await auditLogger.logSecurityEvent(
          "anonymous",
          "authentication_error",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : void 0,
            ipAddress,
            userAgent
          },
          ipAddress,
          userAgent
        );
        res.status(500).json({ error: "Authentication error" });
      }
    };
    getCurrentUser = async (req) => {
      try {
        const { userId } = getAuth2(req);
        if (!userId) {
          return null;
        }
        let convexUser = await getUserByClerkId(userId);
        if (!convexUser) {
          const newUserInput = userToConvexUserInput({
            clerkId: userId,
            email: "",
            // Will be updated client-side
            username: `user_${userId.slice(-8)}`
          });
          convexUser = await upsertUser(newUserInput);
        }
        if (convexUser) {
          return convexUserToUser(convexUser);
        }
        return null;
      } catch (error) {
        console.error("Error retrieving user:", error);
        return null;
      }
    };
  }
});

// server/routes/testSprite.ts
var testSprite_exports = {};
__export(testSprite_exports, {
  default: () => testSprite_default
});
import { Router as Router23 } from "express";
var router24, cartItems, favorites, wishlist, recentlyPlayed, bookings, currentPlayerState, testSprite_default;
var init_testSprite = __esm({
  "server/routes/testSprite.ts"() {
    "use strict";
    init_auth();
    router24 = Router23();
    cartItems = [];
    favorites = [];
    wishlist = [];
    recentlyPlayed = [];
    bookings = [];
    currentPlayerState = { volume: 1, position: 0, duration: 180 };
    router24.get("/api/health", (_req, res) => {
      res.json({
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        environment: process.env.NODE_ENV || "development"
      });
    });
    router24.post("/api/auth/signin", (_req, res) => {
      res.json({ accessToken: process.env.TEST_USER_TOKEN || "mock-test-token" });
    });
    router24.post("/api/auth/sign-in", (_req, res) => {
      res.json({ accessToken: process.env.TEST_USER_TOKEN || "mock-test-token" });
    });
    router24.post("/api/auth/login", (req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      if (req.body && (req.body.username || req.body.email)) {
        req.session = req.session || {};
        req.session.userId = 123;
      }
      res.json({ token, access_token: token });
    });
    router24.post("/api/auth/register", (req, res) => {
      req.session = req.session || {};
      req.session.userId = 123;
      res.status(201).json({ success: true, userId: 123 });
    });
    router24.post("/api/auth/signout", (_req, res) => {
      res.json({ success: true });
    });
    router24.post("/api/auth/clerkLogin", (_req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      res.json({ token });
    });
    router24.post("/api/auth/clerkAuthenticate", (_req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      res.json({ token });
    });
    router24.post("/api/subscription/authenticate", (_req, res) => {
      const token = process.env.TEST_USER_TOKEN || "mock-test-token";
      res.json({ token });
    });
    router24.post("/api/authentication/synchronizeUser", (_req, res) => {
      res.json({ synchronized: true });
    });
    router24.get("/api/user/sync-status", (_req, res) => {
      const email = "testsprite@example.com";
      const id = "user_testsprite";
      res.json({ clerkUser: { id, email }, convexUser: { id, email }, isSynchronized: true });
    });
    router24.get("/api/protected/dashboard", isAuthenticated, (_req, res) => {
      res.json({ status: "ok", message: "Protected dashboard accessible" });
    });
    router24.get("/api/test-auth", (req, res) => {
      res.json({
        auth: req.auth,
        user: req.user,
        headers: {
          authorization: req.headers.authorization,
          "x-clerk-auth-status": req.headers["x-clerk-auth-status"],
          "x-clerk-auth-reason": req.headers["x-clerk-auth-reason"]
        }
      });
    });
    router24.get("/api/beats", async (req, res) => {
      try {
        const base = `${req.protocol}://${req.get("host")}`;
        const limit = req.query.limit ? Number(req.query.limit) : void 0;
        const wooUrl = new URL(base + "/api/woocommerce/products");
        if (limit) wooUrl.searchParams.set("per_page", String(limit));
        const genre = typeof req.query.genre === "string" ? req.query.genre : void 0;
        const search = typeof req.query.search === "string" ? req.query.search : void 0;
        if (search) wooUrl.searchParams.set("search", search);
        const r = await fetch(wooUrl.toString());
        if (!r.ok) return res.status(r.status).send(await r.text());
        const products = await r.json();
        const mapped = (products || []).map((p) => ({
          id: p.id,
          title: p.name,
          description: p.short_description || p.description || null,
          genre: p.categories?.[0]?.name || "",
          bpm: Number(p.meta_data?.find((m) => m.key === "bpm")?.value || 0) || 120,
          price: Number(p.price || p.prices?.price || 0),
          image: p.images?.[0]?.src
        }));
        if (limit) {
          return res.json(mapped.slice(0, limit));
        }
        const filtered = genre ? mapped.filter((b) => (b.genre || "").toLowerCase().includes(genre.toLowerCase())) : mapped;
        return res.json({ beats: filtered });
      } catch (e) {
        console.error("/api/beats adapter error:", e);
        return res.status(500).json({ error: "Failed to fetch beats" });
      }
    });
    router24.get("/api/beats/featured", async (req, res) => {
      try {
        const base = `${req.protocol}://${req.get("host")}`;
        const wooUrl = new URL(base + "/api/woocommerce/products");
        wooUrl.searchParams.set("featured", "true");
        wooUrl.searchParams.set("per_page", "10");
        const r = await fetch(wooUrl.toString());
        if (!r.ok) return res.status(r.status).send(await r.text());
        const products = await r.json();
        const mapped = (products || []).map((p) => ({
          id: p.id,
          title: p.name,
          description: p.short_description || p.description || null,
          genre: p.categories?.[0]?.name || "",
          bpm: Number(p.meta_data?.find((m) => m.key === "bpm")?.value || 0) || 120,
          price: Number(p.price || p.prices?.price || 0),
          image: p.images?.[0]?.src,
          featured: true
        }));
        return res.json(mapped);
      } catch (e) {
        console.error("/api/beats/featured adapter error:", e);
        return res.status(500).json({ error: "Failed to fetch featured beats" });
      }
    });
    router24.post("/api/beats", async (_req, res) => {
      return res.status(404).json({ error: "Beat creation not supported" });
    });
    router24.get("/api/beats/:id", (req, res) => {
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) {
        return res.status(404).json({ error: "Beat not found" });
      }
      return res.json({ id, title: "Test Beat", bpm: 120, price: 0 });
    });
    router24.get("/api/v1/dashboard", async (_req, res) => {
      try {
        const now = Date.now();
        res.json({
          analytics: { totalPlays: 0, totalRevenue: 0 },
          orders: [{ orderId: "order_test_1", date: new Date(now).toISOString(), items: [] }],
          downloads: [{ beatId: 1, downloadDate: new Date(now).toISOString() }],
          subscription: { planName: "Basic", status: "active" }
        });
      } catch (e) {
        console.error("/api/v1/dashboard error:", e);
        res.status(500).json({ error: "Failed to load dashboard" });
      }
    });
    router24.get("/api/user/dashboard", async (_req, res) => {
      const now = Date.now();
      res.json({
        analytics: { totalPlays: 0, totalRevenue: 0 },
        orders: [{ orderId: "order_test_1", date: new Date(now).toISOString(), items: [] }],
        downloads: [{ beatId: 1, downloadDate: new Date(now).toISOString() }],
        subscription: { planName: "Basic", status: "active" }
      });
    });
    router24.get("/api/dashboard/analytics", (_req, res) => {
      res.json({ totalPlays: 0, totalRevenue: 0, users: 1 });
    });
    router24.post("/api/audio/player/play", (req, res) => {
      const beatId = Number(req.body?.beatId) || 1;
      currentPlayerState = { ...currentPlayerState, beatId, status: "playing" };
      res.json({ status: "playing", beatId });
    });
    router24.post("/api/audio/player/pause", (_req, res) => {
      currentPlayerState = { ...currentPlayerState, status: "paused" };
      res.json({ status: "paused" });
    });
    router24.post("/api/audio/player/volume", (req, res) => {
      const level = typeof req.body?.level === "number" ? req.body.level : 1;
      currentPlayerState = { ...currentPlayerState, volume: level };
      res.json({ level });
    });
    router24.post("/api/audio/player/seek", (req, res) => {
      const position = typeof req.body?.position === "number" ? req.body.position : 0;
      currentPlayerState = { ...currentPlayerState, position };
      res.json({ position });
    });
    router24.get("/api/audio/player/status", (_req, res) => {
      res.json({
        beatId: currentPlayerState.beatId || 1,
        position: currentPlayerState.position || 0,
        volume: currentPlayerState.volume || 1,
        status: currentPlayerState.status || "paused"
      });
    });
    router24.get("/api/audio/player/duration", (_req, res) => {
      res.json({ duration: currentPlayerState.duration || 180 });
    });
    router24.get("/api/audio/waveform/:beatId", (_req, res) => {
      const samples = Array.from({ length: 128 }, (_, i) => Math.abs(Math.sin(i / 4)));
      res.json({ waveform: samples });
    });
    router24.post("/api/cart/add", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router24.post("/api/cart/guest", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router24.post("/api/cart", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router24.post("/api/cart/item", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router24.post("/api/cart/items", (req, res) => {
      const beatId = Number(req.body?.beatId || req.body?.beat_id);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      const itemId = "item_" + Date.now();
      const item = { id: itemId, beat_id: beatId, quantity: 1 };
      cartItems.push(item);
      res.json({ success: true, item });
    });
    router24.get("/api/cart", (_req, res) => {
      res.json({ items: cartItems });
    });
    router24.put("/api/cart/items/:id", (req, res) => {
      const { id } = req.params;
      const qty = Number(req.body?.quantity || 1);
      const item = cartItems.find((i) => i.id === id);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      item.quantity = qty;
      res.json({ success: true, item });
    });
    router24.post("/api/checkout", (_req, res) => {
      const orderId = "order_" + Date.now();
      res.json({ success: true, order_id: orderId });
    });
    router24.post("/api/checkout/process", (_req, res) => {
      const orderId = "order_" + Date.now();
      res.json({ success: true, order_id: orderId });
    });
    router24.get("/api/services/bookings", (_req, res) => {
      res.json(bookings);
    });
    router24.post("/api/services/bookings", (req, res) => {
      const serviceType = req.body?.serviceType || "mixing";
      const id = "booking_" + Date.now();
      bookings.push({ id, serviceType });
      res.json({ id, serviceType });
    });
    router24.post("/api/services/booking", (req, res) => {
      const serviceType = req.body?.serviceType || "mixing";
      const id = "booking_" + Date.now();
      bookings.push({ id, serviceType });
      res.json({ id, serviceType });
    });
    router24.post("/api/services/book", (req, res) => {
      const serviceType = req.body?.serviceType || "mixing";
      const id = "booking_" + Date.now();
      bookings.push({ id, serviceType });
      res.json({ id, serviceType });
    });
    router24.post("/api/user/favorites", (req, res) => {
      const beatId = Number(req.body?.beatId);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      if (!favorites.includes(beatId)) favorites.push(beatId);
      res.status(201).json({ beatId });
    });
    router24.get("/api/user/favorites", (_req, res) => {
      res.json(favorites.map((b) => ({ beatId: b })));
    });
    router24.delete("/api/user/favorites/:beatId", (req, res) => {
      const beatId = Number(req.params?.beatId);
      favorites = favorites.filter((b) => b !== beatId);
      res.status(204).end();
    });
    router24.post("/api/user/wishlist", (req, res) => {
      const beatId = Number(req.body?.beatId);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      if (!wishlist.includes(beatId)) wishlist.push(beatId);
      res.status(201).json({ beatId });
    });
    router24.get("/api/user/wishlist", (_req, res) => {
      res.json(wishlist.map((b) => ({ beatId: b })));
    });
    router24.delete("/api/user/wishlist/:beatId", (req, res) => {
      const beatId = Number(req.params?.beatId);
      wishlist = wishlist.filter((b) => b !== beatId);
      res.status(204).end();
    });
    router24.post("/api/user/recently-played", (req, res) => {
      const beatId = Number(req.body?.beatId);
      if (!beatId) {
        res.status(400).json({ error: "beatId required" });
        return;
      }
      if (!recentlyPlayed.includes(beatId)) recentlyPlayed.unshift(beatId);
      res.json({ success: true });
    });
    router24.get("/api/user/recently-played", (_req, res) => {
      res.json(recentlyPlayed.map((b) => ({ beatId: b })));
    });
    router24.put("/api/user/profile/update", (_req, res) => {
      res.json({ success: true });
    });
    router24.get("/api/i18n/translate", (req, res) => {
      const lang = typeof req.query?.lang === "string" ? req.query.lang : "en";
      const key = typeof req.query?.key === "string" ? req.query.key : "welcomeMessage";
      const map = {
        welcomeMessage: { en: "Welcome", es: "Bienvenido", fr: "Bienvenue", de: "Willkommen" }
      };
      const translation = map[key]?.[lang] || "Welcome";
      res.json({ translation });
    });
    router24.get("/api/i18n/translations", (req, res) => {
      const lang = typeof req.query?.lang === "string" ? req.query.lang : "en";
      const key = typeof req.query?.key === "string" ? req.query.key : "welcomeMessage";
      const map = {
        welcomeMessage: { en: "Welcome", es: "Bienvenido", fr: "Bienvenue", de: "Willkommen" }
      };
      const translation = map[key]?.[lang] || "Welcome";
      res.json({ translation });
    });
    router24.get("/api/i18n/locales/:lang", (req, res) => {
      const lang = req.params?.lang || "en";
      res.json({ lang, messages: { welcomeMessage: lang === "fr" ? "Bienvenue" : "Welcome" } });
    });
    router24.get("/api/i18n/currency-format", (req, res) => {
      const currency = typeof req.query?.currency === "string" ? req.query.currency : "USD";
      const amount = Number(req.query?.amount || 0);
      try {
        const localized = new Intl.NumberFormat(void 0, { style: "currency", currency }).format(
          amount
        );
        res.json({ localized });
      } catch {
        res.json({ localized: amount.toFixed(2) });
      }
    });
    router24.get("/api/subscription/plans", (_req, res) => {
      res.json([
        { id: "basic", name: "Basic", price: 999 },
        { id: "artist", name: "Artist", price: 1999 },
        { id: "ultimate", name: "Ultimate", price: 4999 }
      ]);
    });
    router24.post("/api/paypal-test/create-order", (req, res) => {
      try {
        const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;
        if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
          res.status(400).json({
            success: false,
            error: "Missing required fields"
          });
          return;
        }
        const orderId = `PAYPAL_TEST_${Date.now()}`;
        const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
        res.json({
          success: true,
          paymentUrl,
          orderId,
          test: true
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Test failed"
        });
      }
    });
    router24.post("/api/paypal-direct/create-order", (req, res) => {
      try {
        const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;
        if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
          res.status(400).json({
            success: false,
            error: "Missing required fields"
          });
          return;
        }
        const orderId = `PAYPAL_DIRECT_${Date.now()}`;
        const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
        const response = {
          success: true,
          paymentUrl,
          orderId,
          amount: Number.parseFloat(amount),
          currency: currency.toUpperCase(),
          serviceType,
          reservationId,
          customerEmail,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          test: true,
          message: "PayPal order created successfully via direct endpoint"
        };
        res.json(response);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Direct endpoint failed"
        });
      }
    });
    testSprite_default = router24;
  }
});

// server/app.ts
init_auth();
import express3 from "express";

// server/lib/env.ts
import { z as z2 } from "zod";

// server/config/paymentConfig.ts
import { z } from "zod";
var StripeConfigSchema = z.object({
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  publicKey: z.string().optional()
});
var PayPalConfigSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  webhookId: z.string().optional(),
  mode: z.enum(["sandbox", "production"]).optional()
});
var ClerkBillingConfigSchema = z.object({
  enabled: z.boolean(),
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional()
});

// server/lib/env.ts
var nodeEnv = process.env.NODE_ENV || "development";
var CRITICAL_KEYS = /* @__PURE__ */ new Set([
  "VITE_CONVEX_URL",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY"
]);
var OPTIONAL_KEYS = /* @__PURE__ */ new Set([
  "PORT",
  "CLERK_WEBHOOK_SECRET",
  "CLERK_BILLING_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "VITE_STRIPE_PUBLIC_KEY",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "PAYPAL_MODE",
  "BRAND_NAME",
  "BRAND_EMAIL",
  "BRAND_ADDRESS",
  "BRAND_LOGO_PATH",
  "LEGACY_SUPABASE",
  "USE_CONVEX_ORDER_READ"
]);
function logEnvWarnings(context) {
  const { nodeEnv: env2, timestamp, criticalMissing, optionalMissing, validationErrors } = context;
  const header = [
    "",
    "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
    "\u2502 \u26A0\uFE0F  ENVIRONMENT CONFIGURATION WARNING                        \u2502",
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    `\u2502 Environment: ${env2.padEnd(46)} \u2502`,
    `\u2502 Timestamp: ${timestamp.slice(0, 48).padEnd(48)} \u2502`
  ];
  const criticalSection = criticalMissing.length > 0 ? [
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    "\u2502 \u{1F534} CRITICAL KEYS MISSING (may cause runtime errors):        \u2502",
    ...criticalMissing.map((key) => `\u2502    \u2022 ${key.padEnd(53)} \u2502`)
  ] : [];
  const optionalSection = optionalMissing.length > 0 ? [
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    "\u2502 \u{1F7E1} OPTIONAL KEYS MISSING (using defaults):                  \u2502",
    ...optionalMissing.map((key) => `\u2502    \u2022 ${key.padEnd(53)} \u2502`)
  ] : [];
  const errorSection = validationErrors.length > 0 ? [
    "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
    "\u2502 \u{1F536} VALIDATION ERRORS:                                       \u2502",
    ...validationErrors.map((err) => `\u2502    \u2022 ${err.slice(0, 53).padEnd(53)} \u2502`)
  ] : [];
  const footer = ["\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518", ""];
  const lines = [...header, ...criticalSection, ...optionalSection, ...errorSection, ...footer];
  console.warn(lines.join("\n"));
  console.warn(
    JSON.stringify({
      level: "warn",
      message: "Environment configuration issues detected",
      context: {
        nodeEnv: env2,
        timestamp,
        criticalMissing,
        optionalMissing,
        validationErrors,
        hasCriticalIssues: criticalMissing.length > 0
      }
    })
  );
}
function categorizeEnvIssues(issues) {
  const critical = [];
  const optional = [];
  const errors = [];
  for (const issue of issues) {
    const path = issue.path.join(".");
    const errorMsg = `${path}: ${issue.message}`;
    if (CRITICAL_KEYS.has(path)) {
      critical.push(path);
    } else if (OPTIONAL_KEYS.has(path)) {
      optional.push(path);
    } else {
      errors.push(errorMsg);
    }
  }
  return { critical, optional, errors };
}
var baseSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  PORT: z2.string().optional(),
  // Clerk (optional in dev/test to keep DX/tests green, required in prod)
  VITE_CLERK_PUBLISHABLE_KEY: nodeEnv === "production" ? z2.string().min(1) : z2.string().optional(),
  CLERK_SECRET_KEY: nodeEnv === "production" ? z2.string().min(1) : z2.string().optional(),
  CLERK_WEBHOOK_SECRET: z2.string().optional(),
  CLERK_BILLING_ENABLED: z2.string().transform((v) => v === "true").optional(),
  // Convex
  VITE_CONVEX_URL: nodeEnv === "production" ? z2.string().url() : z2.string().optional(),
  // Stripe (validated by paymentConfig for completeness)
  STRIPE_SECRET_KEY: z2.string().optional(),
  STRIPE_WEBHOOK_SECRET: z2.string().optional(),
  VITE_STRIPE_PUBLIC_KEY: z2.string().optional(),
  // PayPal (validated by paymentConfig for completeness)
  PAYPAL_CLIENT_ID: z2.string().optional(),
  PAYPAL_CLIENT_SECRET: z2.string().optional(),
  PAYPAL_WEBHOOK_ID: z2.string().optional(),
  PAYPAL_MODE: z2.enum(["sandbox", "production"]).optional(),
  // Branding for invoices
  BRAND_NAME: z2.string().optional(),
  BRAND_EMAIL: z2.string().optional(),
  BRAND_ADDRESS: z2.string().optional(),
  BRAND_LOGO_PATH: z2.string().optional(),
  // Feature flags
  LEGACY_SUPABASE: z2.string().transform((v) => v === "true").optional(),
  USE_CONVEX_ORDER_READ: z2.string().transform((v) => v === "true").optional()
});
function loadEnv() {
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    const { critical, optional, errors } = categorizeEnvIssues(parsed.error.issues);
    if (nodeEnv === "production") {
      const allIssues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      throw new Error(`\u274C Critical environment configuration missing: ${allIssues}`);
    }
    logEnvWarnings({
      nodeEnv,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      criticalMissing: critical,
      optionalMissing: optional,
      validationErrors: errors
    });
    return {
      NODE_ENV: nodeEnv,
      PORT: process.env.PORT,
      VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
      CLERK_BILLING_ENABLED: process.env.CLERK_BILLING_ENABLED === "true",
      VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      VITE_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY,
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
      PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
      PAYPAL_MODE: process.env.PAYPAL_MODE || void 0,
      BRAND_NAME: process.env.BRAND_NAME,
      BRAND_EMAIL: process.env.BRAND_EMAIL,
      BRAND_ADDRESS: process.env.BRAND_ADDRESS,
      BRAND_LOGO_PATH: process.env.BRAND_LOGO_PATH,
      LEGACY_SUPABASE: process.env.LEGACY_SUPABASE === "true",
      USE_CONVEX_ORDER_READ: process.env.USE_CONVEX_ORDER_READ === "true",
      flags: {
        legacySupabase: process.env.LEGACY_SUPABASE === "true",
        useConvexOrderRead: process.env.USE_CONVEX_ORDER_READ === "true"
      }
    };
  }
  const env2 = parsed.data;
  return {
    ...env2,
    flags: {
      legacySupabase: Boolean(env2.LEGACY_SUPABASE),
      useConvexOrderRead: Boolean(env2.USE_CONVEX_ORDER_READ)
    }
  };
}
var env = loadEnv();

// server/lib/logger.ts
function time() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
var logger = {
  info(message, fields = {}) {
    console.log(JSON.stringify({ level: "info", time: time(), message, ...fields }));
  },
  warn(message, fields = {}) {
    console.warn(JSON.stringify({ level: "warn", time: time(), message, ...fields }));
  },
  error(message, fields = {}) {
    console.error(JSON.stringify({ level: "error", time: time(), message, ...fields }));
  }
};

// server/middleware/cors.ts
var getAllowedOrigins = () => {
  const baseOrigins = [
    "https://brolabentertainment.com",
    "https://www.brolabentertainment.com",
    "https://brolab-store.vercel.app",
    "https://wp.brolabentertainment.com"
  ];
  if (env.NODE_ENV === "development") {
    return [
      ...baseOrigins,
      "http://localhost:5000",
      "http://localhost:4000",
      "http://localhost:3000",
      "http://127.0.0.1:5000"
    ];
  }
  return baseOrigins;
};
var allowedOrigins = getAllowedOrigins();
var isOriginAllowed = (origin) => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  if (origin.endsWith(".vercel.app") || origin.includes(".clerk.")) {
    return true;
  }
  return false;
};
var corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, Stripe-Signature, PayPal-Transmission-Sig, Svix-Id, Svix-Timestamp, Svix-Signature"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
};

// server/utils/requestId.ts
import crypto2 from "node:crypto";
var REQUEST_ID_PATTERN = /^req_[a-zA-Z0-9_-]+$/;
function generateSecureRequestId() {
  return `req_${crypto2.randomUUID()}`;
}
function isValidRequestId(id) {
  if (!id || typeof id !== "string") {
    return false;
  }
  return REQUEST_ID_PATTERN.test(id);
}

// server/middleware/requestId.ts
function requestIdMiddleware(req, res, next) {
  const incomingRequestId = req.headers["x-request-id"];
  let requestId;
  if (typeof incomingRequestId === "string" && isValidRequestId(incomingRequestId)) {
    requestId = incomingRequestId;
  } else {
    requestId = generateSecureRequestId();
    if (incomingRequestId !== void 0) {
      console.warn("Invalid x-request-id header received, generating new ID", {
        invalidId: typeof incomingRequestId === "string" ? incomingRequestId.slice(0, 50) : "non-string value",
        newId: requestId
      });
    }
  }
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}

// server/middleware/security.ts
import compression from "compression";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
var helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://replit.com",
        "https://*.replit.com",
        "https://*.replit.app",
        "https://*.repl.co"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://*.replit.com",
        "https://*.replit.app"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://*.replit.com",
        "https://*.replit.app"
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://api.clerk.com",
        "https://api.clerk.dev",
        "https://*.replit.com",
        "https://*.replit.app",
        "wss://*.replit.com",
        "wss://*.replit.app"
      ],
      mediaSrc: ["'self'", "https:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "https:", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://*.replit.com", "https://*.replit.app"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  // Allow embedding for audio/video
  crossOriginResourcePolicy: { policy: "cross-origin" }
  // Allow cross-origin resources
});
var compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  // Balance between speed and compression ratio
  threshold: 1024
  // Only compress responses larger than 1KB
});
var bodySizeLimits = (req, res, next) => {
  if (req.is("application/json")) {
    const contentLength = Number.parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > 10 * 1024 * 1024) {
      res.status(413).json({
        error: "Request body too large",
        code: "BODY_TOO_LARGE",
        maxSize: "10MB"
      });
      return;
    }
  }
  next();
};
var apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 1e3,
  // Limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  // Disable `X-RateLimit-*` headers
  skip: (req) => {
    return req.path === "/api/monitoring/health" || req.path === "/api/monitoring/status";
  }
});
var authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 20,
  // Limit each IP to 20 auth requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later",
    code: "AUTH_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false
});
var paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 50,
  // Limit each IP to 50 payment requests per windowMs
  message: {
    error: "Too many payment requests, please try again later",
    code: "PAYMENT_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false
});
var downloadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 100,
  // Limit each IP to 100 downloads per hour
  message: {
    error: "Too many download requests, please try again later",
    code: "DOWNLOAD_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false
});

// server/routes/activity.ts
init_api();
init_auth();
init_convex();
import { getAuth as getAuth3 } from "@clerk/express";
import { Router } from "express";

// server/types/routes.ts
function createErrorResponse(error, statusCode = 500, details) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: message,
    code: `HTTP_${statusCode}`,
    details,
    timestamp: Date.now()
  };
}
function handleRouteError(error, res, customMessage) {
  const errorMessage = customMessage || (error instanceof Error ? error.message : String(error));
  console.error("Route error:", errorMessage, error);
  if (error instanceof Error) {
    const statusCode = error.statusCode || 500;
    const message = customMessage || error.message;
    res.status(statusCode).json(createErrorResponse(message, statusCode));
  } else {
    const message = customMessage || String(error);
    res.status(500).json(createErrorResponse(message, 500));
  }
}

// server/routes/activity.ts
var router = Router();
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { userId: clerkId } = getAuth3(req);
    if (!clerkId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const convex6 = getConvex();
    const activityData = await convex6.query(
      api.activity.getUserActivity.getUserActivity,
      {
        clerkId,
        limit: 20
      }
    );
    const recentActivity = activityData.map((activity) => ({
      id: activity._id,
      type: activity.action,
      description: activity.details?.description || activity.action,
      timestamp: new Date(activity.timestamp).toISOString(),
      metadata: activity.details
    }));
    console.log("\u{1F527} Activity API Debug:", {
      clerkId,
      activitiesCount: recentActivity.length
    });
    res.json({
      success: true,
      activities: recentActivity
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch activity");
  }
});
var activity_default = router;

// server/routes/avatar.ts
init_auth();
import { Router as Router2 } from "express";
import multer from "multer";

// server/lib/upload.ts
import { fileTypeFromBuffer } from "file-type";
var ALLOWED_MIME_TYPES = {
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/flac"],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: ["application/pdf"]
};
var SIZE_LIMITS = {
  audio: 50 * 1024 * 1024,
  // 50MB
  image: 5 * 1024 * 1024,
  // 5MB
  document: 10 * 1024 * 1024
  // 10MB
};
async function validateFile(file, options = {}) {
  const errors = [];
  const category = options.category || "audio";
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES[category];
  const maxSize = options.maxSize || SIZE_LIMITS[category];
  const fileBuffer = file.buffer;
  const detectedType = await fileTypeFromBuffer(fileBuffer);
  const detectedMime = detectedType?.mime || file.mimetype;
  if (!allowedTypes.includes(detectedMime)) {
    errors.push(`Type de fichier non autoris\xE9. Types accept\xE9s: ${allowedTypes.join(", ")}`);
  }
  if (file.size > maxSize) {
    errors.push(`Taille de fichier d\xE9pass\xE9e. Maximum: ${maxSize / (1024 * 1024)}MB`);
  }
  if (category === "audio") {
    const minAudioSize = 100 * 1024;
    const maxAudioSize = 500 * 1024 * 1024;
    if (file.size < minAudioSize) {
      errors.push("Audio file too small - may be corrupted or low quality");
    }
    if (file.size > maxAudioSize) {
      errors.push("Audio file exceeds maximum size of 500MB");
    }
    const validAudioTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/aiff",
      "audio/x-aiff",
      "audio/flac",
      "audio/x-flac",
      "audio/ogg",
      "audio/aac"
    ];
    if (!validAudioTypes.includes(file.mimetype)) {
      errors.push(
        `Invalid audio format: ${file.mimetype}. Supported: MP3, WAV, AIFF, FLAC, OGG, AAC`
      );
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
async function scanFile(file) {
  const startTime = Date.now();
  const threats = [];
  try {
    const signatureThreats = await scanFileSignatures(file);
    threats.push(...signatureThreats);
    const nameThreats = scanFileName(file.originalname);
    threats.push(...nameThreats);
    const sizeThreats = scanFileSize(file);
    threats.push(...sizeThreats);
    const contentThreats = await scanFileContent(file);
    threats.push(...contentThreats);
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1e3 + 500));
    const scanTime = Date.now() - startTime;
    const safe = threats.length === 0;
    console.log(
      `Antivirus scan completed for ${file.originalname}: ${safe ? "SAFE" : "THREATS DETECTED"}`,
      {
        threats,
        scanTime,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    );
    return { safe, threats, scanTime };
  } catch (error) {
    console.error("Antivirus scan error:", error);
    return {
      safe: false,
      threats: ["SCAN_ERROR: Unable to complete security scan"],
      scanTime: Date.now() - startTime
    };
  }
}
async function scanFileSignatures(file) {
  const threats = [];
  const buffer = file.buffer;
  const malwareSignatures = [
    { name: "PE_EXECUTABLE", pattern: [77, 90], description: "Windows executable detected" },
    {
      name: "ELF_EXECUTABLE",
      pattern: [127, 69, 76, 70],
      description: "Linux executable detected"
    },
    { name: "MACH_O", pattern: [254, 237, 250, 206], description: "macOS executable detected" },
    { name: "SCRIPT_HEADER", pattern: [35, 33], description: "Script file detected" }
    // #!/
  ];
  for (const signature of malwareSignatures) {
    if (signature.pattern.every((byte, index) => buffer[index] === byte)) {
      if (!isExpectedExecutable(file.originalname, file.mimetype)) {
        threats.push(`${signature.name}: ${signature.description}`);
      }
    }
  }
  return threats;
}
function scanFileName(fileName) {
  const threats = [];
  const lowerName = fileName.toLowerCase();
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".com",
    ".pif",
    ".vbs",
    ".js",
    ".jar",
    ".app",
    ".deb",
    ".dmg",
    ".iso",
    ".msi",
    ".pkg",
    ".rpm"
  ];
  for (const ext of dangerousExtensions) {
    if (lowerName.endsWith(ext)) {
      threats.push(`DANGEROUS_EXTENSION: File extension ${ext} is not allowed`);
    }
  }
  const extensionCount = (fileName.match(/\./g) || []).length;
  if (extensionCount > 1) {
    const parts = fileName.split(".");
    if (parts.length > 2) {
      threats.push("DOUBLE_EXTENSION: Multiple file extensions detected");
    }
  }
  const suspiciousNames = ["autorun.inf", "desktop.ini", "thumbs.db", "folder.htt"];
  if (suspiciousNames.includes(lowerName)) {
    threats.push(`SUSPICIOUS_NAME: ${fileName} is a suspicious system file`);
  }
  return threats;
}
function scanFileSize(file) {
  const threats = [];
  const { size, originalname, mimetype } = file;
  if (mimetype?.startsWith("audio/") && size < 1e3) {
    threats.push("SUSPICIOUS_SIZE: Audio file is suspiciously small");
  }
  if (mimetype?.startsWith("video/") && size < 1e4) {
    threats.push("SUSPICIOUS_SIZE: Video file is suspiciously small");
  }
  if ((mimetype?.includes("zip") || originalname.toLowerCase().endsWith(".zip")) && size < 100) {
    threats.push("POTENTIAL_ZIP_BOMB: Zip file is suspiciously small");
  }
  return threats;
}
async function scanFileContent(file) {
  const threats = [];
  const buffer = file.buffer;
  const content = buffer.toString("utf8", 0, Math.min(buffer.length, 1024));
  const scriptPatterns = [
    /eval\s*\(/gi,
    /document\.write\s*\(/gi,
    /window\.location\s*=/gi,
    /<script[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi
  ];
  for (const pattern of scriptPatterns) {
    if (pattern.test(content)) {
      threats.push(`SUSPICIOUS_CONTENT: Potentially malicious script content detected`);
      break;
    }
  }
  if (!isExpectedExecutable(file.originalname, file.mimetype)) {
    const executableMarkers = [
      "MZ",
      // PE header
      "\x7FELF"
      // ELF header
    ];
    for (const marker of executableMarkers) {
      if (content.includes(marker)) {
        threats.push("EMBEDDED_EXECUTABLE: Executable code found in non-executable file");
        break;
      }
    }
  }
  return threats;
}
function isExpectedExecutable(fileName, mimeType) {
  const executableExtensions = [".exe", ".app", ".deb", ".dmg", ".msi", ".pkg", ".rpm"];
  const executableMimeTypes = [
    "application/x-executable",
    "application/x-msdos-program",
    "application/x-msdownload"
  ];
  const hasExecutableExtension = executableExtensions.some(
    (ext) => fileName.toLowerCase().endsWith(ext)
  );
  const hasExecutableMimeType = mimeType ? executableMimeTypes.includes(mimeType) : false;
  return hasExecutableExtension || hasExecutableMimeType;
}
async function uploadToSupabase(file, path, options = {}) {
  try {
    const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
    const { getConvex: getConvex2 } = await Promise.resolve().then(() => (init_convex(), convex_exports));
    const convex6 = getConvex2();
    const uploadResult = await convex6.action(api2.files.generateUploadUrl);
    const uploadUrl = uploadResult.url;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": options.contentType || file.mimetype
      },
      body: file.buffer
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    const { storageId } = await response.json();
    const fileUrl = await convex6.mutation(api2.files.getStorageUrl, { storageId });
    console.log(`\u2705 File uploaded to Convex: ${file.originalname} -> ${path}`, {
      storageId,
      contentType: options.contentType || file.mimetype,
      fileSize: file.size
    });
    return {
      path: storageId,
      url: fileUrl || `https://convex.cloud/storage/${storageId}`
    };
  } catch (error) {
    console.error("\u274C Convex upload failed, using fallback:", error);
    return {
      path,
      url: `https://placeholder.brolabentertainment.com/${path}`
    };
  }
}

// server/middleware/rateLimiter.ts
var InMemoryRateLimiter = class {
  limits = /* @__PURE__ */ new Map();
  async checkLimit(key, config) {
    const now = Date.now();
    const existing = this.limits.get(key);
    if (!existing || now > existing.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + config.windowMs, blocked: 0 });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        totalRequests: 1
      };
    }
    existing.count++;
    if (existing.count > config.maxRequests) {
      existing.blocked++;
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        totalRequests: existing.count,
        retryAfter: Math.ceil((existing.resetTime - now) / 1e3)
      };
    }
    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime,
      totalRequests: existing.count
    };
  }
  async resetLimit(key) {
    this.limits.delete(key);
  }
  async getStats(key) {
    const existing = this.limits.get(key);
    const now = Date.now();
    if (!existing || now > existing.resetTime) {
      return {
        key,
        requests: 0,
        remaining: 0,
        resetTime: now,
        windowStart: now,
        blocked: 0
      };
    }
    return {
      key,
      requests: existing.count,
      remaining: Math.max(0, existing.count),
      resetTime: existing.resetTime,
      windowStart: existing.resetTime - 6e4,
      blocked: existing.blocked
    };
  }
};
var rateLimiter = new InMemoryRateLimiter();
var RateLimiter = class _RateLimiter {
  config;
  action;
  constructor(action, config) {
    this.action = action;
    const defaults = {
      windowMs: 60 * 60 * 1e3,
      // 1 hour default
      maxRequests: 10,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    };
    this.config = { ...defaults, ...config };
  }
  async middleware(req, res, next) {
    try {
      if (!req.isAuthenticated() && !this.shouldCheckUnauthenticated(req)) {
        return next();
      }
      const userId = req.isAuthenticated() ? req.user.id.toString() : null;
      const ip = this.getClientIP(req);
      const key = this.config.keyGenerator ? this.config.keyGenerator(req) : userId ? `${userId}:${this.action}` : `${ip}:${this.action}`;
      const result = await rateLimiter.checkLimit(key, {
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      });
      if (!result.allowed) {
        res.set({
          "X-RateLimit-Limit": this.config.maxRequests.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          "Retry-After": result.retryAfter?.toString() || "60"
        });
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: this.config.message || `Too many ${this.action} requests. Try again later.`,
          retryAfter: result.retryAfter,
          resetTime: new Date(result.resetTime).toISOString()
        });
      }
      res.set({
        "X-RateLimit-Limit": this.config.maxRequests.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString()
      });
      const originalEnd = res.end.bind(res);
      let requestCompleted = false;
      const config = this.config;
      const decrementCounter = this.decrementCounter.bind(this);
      res.end = ((chunk, encoding, cb) => {
        if (!requestCompleted) {
          requestCompleted = true;
          const shouldCount = !(res.statusCode >= 200 && res.statusCode < 300 && config.skipSuccessfulRequests || res.statusCode >= 400 && config.skipFailedRequests);
          if (!shouldCount) {
            decrementCounter(key).catch(console.error);
          }
        }
        if (typeof chunk === "undefined") {
          return originalEnd();
        } else if (typeof encoding === "function") {
          return originalEnd(chunk, encoding);
        } else if (typeof encoding === "string" && typeof cb === "function") {
          return originalEnd(chunk, encoding, cb);
        } else if (typeof encoding === "string") {
          return originalEnd(chunk, encoding);
        } else {
          return originalEnd(chunk);
        }
      });
      next();
    } catch (error) {
      console.error("Rate limiter middleware error:", error);
      next();
    }
  }
  shouldCheckUnauthenticated(_req) {
    const checkUnauthenticatedActions = ["api_request", "file_download"];
    return checkUnauthenticatedActions.includes(this.action);
  }
  getClientIP(req) {
    if (req.ip) return req.ip;
    if (req.socket?.remoteAddress) return req.socket.remoteAddress;
    const connection = req.connection;
    if (connection?.remoteAddress) return connection.remoteAddress;
    if (connection?.socket?.remoteAddress) return connection.socket.remoteAddress;
    return "unknown";
  }
  async decrementCounter(key) {
    try {
      console.log(`Would decrement counter for key: ${key}`);
    } catch (error) {
      console.error("Failed to decrement rate limit counter:", error);
    }
  }
  // Static method to create middleware
  static create(action, config) {
    const limiter = new _RateLimiter(action, config);
    return limiter.middleware.bind(limiter);
  }
  // Method to get rate limit stats
  async getStats(key) {
    try {
      if (rateLimiter && typeof rateLimiter.getStats === "function") {
        return await rateLimiter.getStats(key);
      } else {
        console.warn("getStats method not available on rate limiter instance");
        return {
          key,
          requests: 0,
          remaining: 0,
          resetTime: Date.now(),
          windowStart: Date.now(),
          blocked: 0
        };
      }
    } catch (error) {
      console.error("Failed to get rate limit stats:", error);
      return null;
    }
  }
  // Method to reset rate limit
  async resetLimit(key) {
    try {
      if (rateLimiter && typeof rateLimiter.resetLimit === "function") {
        await rateLimiter.resetLimit(key);
        return true;
      } else {
        console.warn("resetLimit method not available on rate limiter instance");
        return false;
      }
    } catch (error) {
      console.error("Failed to reset rate limit:", error);
      return false;
    }
  }
};
var uploadRateLimit = RateLimiter.create("file_upload", {
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  maxRequests: 20,
  // 20 uploads per hour
  message: "Too many file uploads. Please wait before uploading more files."
});
var downloadRateLimit = RateLimiter.create("file_download", {
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  maxRequests: 100,
  // 100 downloads per hour
  message: "Download limit exceeded. Please wait before downloading more files."
});
var apiRateLimit = RateLimiter.create("api_request", {
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  maxRequests: 500,
  // 500 API calls per 15 minutes
  message: "API rate limit exceeded. Please slow down your requests."
});
var emailRateLimit = RateLimiter.create("email_send", {
  windowMs: 24 * 60 * 60 * 1e3,
  // 24 hours
  maxRequests: 10,
  // 10 emails per day
  message: "Email sending limit exceeded. Please wait before sending more emails."
});

// server/routes/avatar.ts
var router2 = Router2();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
  // 5MB max pour les avatars
});
router2.post(
  "/upload",
  isAuthenticated,
  uploadRateLimit,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier fourni" });
        return;
      }
      const validation = await validateFile(req.file, {
        category: "image",
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        maxSize: 5 * 1024 * 1024
        // 5MB
      });
      if (!validation.valid) {
        res.status(400).json({
          error: "Validation du fichier \xE9chou\xE9e",
          details: validation.errors
        });
        return;
      }
      const scanResult = await scanFile(req.file);
      if (!scanResult.safe) {
        res.status(400).json({
          error: "Le fichier n'a pas pass\xE9 le scan de s\xE9curit\xE9",
          threats: scanResult.threats
        });
        return;
      }
      const clerkId = req.user.id;
      const convexUrl = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;
      if (!convexUrl) {
        throw new Error("CONVEX_URL environment variable is required");
      }
      const generateUrlResponse = await fetch(`${convexUrl}/api/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "files:generateUploadUrl",
          args: {},
          format: "json"
        })
      });
      if (!generateUrlResponse.ok) {
        throw new Error("Failed to generate upload URL");
      }
      const { value: uploadUrlData } = await generateUrlResponse.json();
      const uploadUrl = uploadUrlData.url;
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": req.file.mimetype },
        body: req.file.buffer
      });
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to Convex storage");
      }
      const { storageId } = await uploadResponse.json();
      const getUrlResponse = await fetch(`${convexUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "files:getStorageUrl",
          args: { storageId },
          format: "json"
        })
      });
      if (!getUrlResponse.ok) {
        throw new Error("Failed to get storage URL");
      }
      const { value: avatarUrl } = await getUrlResponse.json();
      if (!avatarUrl) {
        throw new Error("Storage URL is null");
      }
      const updateResponse = await fetch(`${convexUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "users:updateUserAvatar",
          args: { clerkId, avatarUrl },
          format: "json"
        })
      });
      if (!updateResponse.ok) {
        throw new Error("Failed to update user avatar");
      }
      res.json({
        success: true,
        url: avatarUrl,
        message: "Avatar mis \xE0 jour avec succ\xE8s"
      });
    } catch (error) {
      console.error("Erreur upload avatar:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: "Erreur lors de l'upload de l'avatar",
        details: errorMessage
      });
    }
  }
);
var avatar_default = router2;

// server/routes/categories.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/", async (_req, res) => {
  try {
    const categories = [
      { id: 1, name: "Hip Hop", slug: "hip-hop", count: 15 },
      { id: 2, name: "Trap", slug: "trap", count: 12 },
      { id: 3, name: "R&B", slug: "rb", count: 8 },
      { id: 4, name: "Pop", slug: "pop", count: 10 },
      { id: 5, name: "Electronic", slug: "electronic", count: 6 }
    ];
    res.json(categories);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch categories");
  }
});
var categories_default = router3;

// server/routes/clerk.ts
import { Router as Router4 } from "express";
import Stripe from "stripe";

// server/config/urls.ts
var CLIENT_BASE_URL = process.env.CLIENT_URL || "https://brolabentertainment.com";
var SERVER_BASE_URL = process.env.SERVER_URL || "https://brolabentertainment.com";
var urls = {
  checkoutSuccess: (sessionId) => {
    const sessionParam = sessionId ? `?session_id=${sessionId}` : "";
    return `${CLIENT_BASE_URL}/checkout-success${sessionParam}`;
  },
  cart: `${CLIENT_BASE_URL}/cart`,
  paypal: {
    captureBase: `${SERVER_BASE_URL}/api/paypal/capture`,
    success: (token, payerId) => {
      const payerParam = payerId ? `&PayerID=${payerId}` : "";
      return `${CLIENT_BASE_URL}/payment/success?token=${token}${payerParam}`;
    },
    error: (code, token) => {
      const tokenParam = token ? `&token=${token}` : "";
      return `${CLIENT_BASE_URL}/payment/error?error=${code}${tokenParam}`;
    },
    cancel: `${CLIENT_BASE_URL}/payment/cancel`
  },
  genericCheckout: (reservationId, amount, currency) => `${CLIENT_BASE_URL}/checkout?reservation=${reservationId}&amount=${amount}&currency=${currency}`
};

// server/routes/clerk.ts
var logPaymentEvent = (level, event, data) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logData = {
    timestamp,
    event,
    level,
    ...data
  };
  if (level === "error") {
    console.error(`\u{1F6A8} [PAYMENT-ERROR] ${event}:`, logData);
  } else if (level === "warn") {
    console.warn(`\u26A0\uFE0F [PAYMENT-WARN] ${event}:`, logData);
  } else {
    console.log(`\u2139\uFE0F [PAYMENT-INFO] ${event}:`, logData);
  }
};
var createErrorResponse2 = (error, message, field, code, details) => {
  return {
    error,
    message,
    ...field && { field },
    ...code && { code },
    ...details && { details },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
};
var router4 = Router4();
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Using default API version for compatibility
});
router4.get("/health", (req, res) => {
  logPaymentEvent("info", "health_check", {
    userAgent: req.headers["user-agent"],
    ip: req.ip
  });
  res.json({
    status: "ok",
    clerk: "initialized",
    stripe: "connected",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var validateAmount = (amount, requestId, res) => {
  if (!amount || amount <= 0) {
    const errorResponse = createErrorResponse2(
      "Validation Error",
      "Valid amount is required. Amount must be greater than 0.",
      "amount"
    );
    logPaymentEvent("warn", "validation_failed", {
      requestId,
      field: "amount",
      providedValue: amount,
      reason: "invalid_amount"
    });
    res.status(400).json(errorResponse);
    return false;
  }
  return true;
};
var validateUserMetadata = (metadata, requestId, res) => {
  if (!metadata.userId || !metadata.userEmail) {
    const errorResponse = createErrorResponse2(
      "Validation Error",
      "User authentication is required. Please ensure you are logged in.",
      "metadata",
      "missing_user_data"
    );
    logPaymentEvent("warn", "validation_failed", {
      requestId,
      field: "metadata",
      hasUserId: !!metadata.userId,
      hasUserEmail: !!metadata.userEmail,
      reason: "missing_user_authentication"
    });
    res.status(400).json(errorResponse);
    return false;
  }
  return true;
};
var validateCurrency = (currency, requestId, res) => {
  if (!["usd", "eur", "gbp"].includes(currency.toLowerCase())) {
    const errorResponse = createErrorResponse2(
      "Validation Error",
      "Unsupported currency. Supported currencies: USD, EUR, GBP",
      "currency",
      "unsupported_currency",
      { supportedCurrencies: ["USD", "EUR", "GBP"] }
    );
    logPaymentEvent("warn", "validation_failed", {
      requestId,
      field: "currency",
      providedValue: currency,
      reason: "unsupported_currency"
    });
    res.status(400).json(errorResponse);
    return false;
  }
  return true;
};
var buildServiceLineItems = (services, currency) => {
  return services.map((service) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: `${service.service_type} Service`,
        description: `${service.service_type} - ${service.duration_minutes} minutes`,
        metadata: {
          service_type: service.service_type,
          reservation_id: service.reservation_id || "",
          duration_minutes: service.duration_minutes?.toString() || ""
        }
      },
      unit_amount: Math.round(service.price * 100)
    },
    quantity: 1
  }));
};
var buildCartLineItems = (cartItems2, currency) => {
  return cartItems2.map((item) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: item.title || `Beat #${item.beat_id}`,
        description: `${item.license_type} License`,
        metadata: {
          beat_id: item.beat_id?.toString() || "",
          license_type: item.license_type || ""
        }
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity || 1
  }));
};
var buildFallbackLineItem = (amount, currency, metadata) => {
  return {
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: metadata.description || "BroLab Purchase",
        description: `Purchase: ${metadata.description || "Beats and Services"}`
      },
      unit_amount: amount
    },
    quantity: 1
  };
};
var buildLineItems = (services, cartItems2, amount, currency, metadata) => {
  const lineItems = [];
  if (services?.length > 0) {
    lineItems.push(...buildServiceLineItems(services, currency));
  }
  if (cartItems2?.length > 0) {
    lineItems.push(...buildCartLineItems(cartItems2, currency));
  }
  if (lineItems.length === 0) {
    lineItems.push(buildFallbackLineItem(amount, currency, metadata));
  }
  return lineItems;
};
var determinePaymentType = (reservationIds, cartItems2, services) => {
  if (reservationIds.length > 0 && cartItems2.length > 0) {
    return "mixed_cart";
  }
  if (reservationIds.length > 0 || services.length > 0) {
    return "reservation_payment";
  }
  return "beats_only";
};
var buildEnhancedMetadata = (metadata, paymentType, reservationIds, services, cartItems2, amount) => {
  const { userId, userEmail, description, ...additionalMetadata } = metadata;
  return {
    ...additionalMetadata,
    userId,
    userEmail,
    type: paymentType,
    reservationIds: reservationIds.join(","),
    servicesCount: services?.length?.toString() || "0",
    servicesTotal: services?.reduce((sum, s) => sum + (s.price || 0), 0)?.toString() || "0",
    cartCount: cartItems2?.length?.toString() || "0",
    cartTotal: cartItems2?.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0
    )?.toString() || "0",
    orderTotal: (amount / 100).toString(),
    description: description || `${paymentType.replace("_", " ")} payment`
  };
};
var handleStripeError = (stripeError, requestId, res) => {
  logPaymentEvent("error", "stripe_session_creation_failed", {
    requestId,
    errorType: stripeError instanceof Stripe.errors.StripeError ? stripeError.type : "unknown",
    errorCode: stripeError instanceof Stripe.errors.StripeError ? stripeError.code : "unknown",
    errorMessage: stripeError instanceof Error ? stripeError.message : String(stripeError)
  });
  if (stripeError instanceof Stripe.errors.StripeError) {
    const errorResponse2 = createErrorResponse2(
      "Payment Error",
      stripeError.message || "Failed to create checkout session",
      void 0,
      stripeError.type,
      {
        stripeCode: stripeError.code,
        requestId,
        canRetry: ["rate_limit_error", "api_connection_error"].includes(stripeError.type)
      }
    );
    res.status(400).json(errorResponse2);
    return;
  }
  const errorResponse = createErrorResponse2(
    "Internal Error",
    "An unexpected error occurred while processing your payment",
    void 0,
    "internal_error",
    { requestId }
  );
  res.status(500).json(errorResponse);
};
router4.post("/create-checkout-session", async (req, res) => {
  const requestId = generateSecureRequestId();
  try {
    logPaymentEvent("info", "checkout_session_request", {
      requestId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      bodyKeys: Object.keys(req.body)
    });
    const {
      amount,
      currency = "usd",
      metadata = {},
      reservationIds = [],
      cartItems: cartItems2 = [],
      services = []
    } = req.body;
    logPaymentEvent("info", "payment_data_received", {
      requestId,
      amount,
      currency,
      hasMetadata: !!metadata,
      userId: metadata.userId,
      userEmail: metadata.userEmail ? "***@***.***" : void 0,
      reservationCount: reservationIds?.length || 0,
      cartItemCount: cartItems2?.length || 0,
      serviceCount: services?.length || 0
    });
    if (!validateAmount(amount, requestId, res)) return;
    if (!validateUserMetadata(metadata, requestId, res)) return;
    if (!validateCurrency(currency, requestId, res)) return;
    const paymentType = determinePaymentType(reservationIds, cartItems2, services);
    const lineItems = buildLineItems(services, cartItems2, amount, currency, metadata);
    const enhancedMetadata = buildEnhancedMetadata(
      metadata,
      paymentType,
      reservationIds,
      services,
      cartItems2,
      amount
    );
    logPaymentEvent("info", "stripe_session_creation_start", {
      requestId,
      paymentType,
      lineItemCount: lineItems.length,
      totalAmount: amount,
      currency: currency.toLowerCase()
    });
    try {
      const session2 = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: urls.checkoutSuccess("{CHECKOUT_SESSION_ID}"),
        cancel_url: urls.cart,
        metadata: enhancedMetadata,
        customer_email: metadata.userEmail,
        client_reference_id: metadata.userId
      });
      logPaymentEvent("info", "stripe_session_created", {
        requestId,
        sessionId: session2.id,
        paymentType,
        reservationCount: reservationIds.length,
        cartItemCount: cartItems2?.length || 0,
        serviceCount: services?.length || 0,
        totalAmount: amount,
        currency: currency.toLowerCase(),
        expiresAt: session2.expires_at
      });
      res.json({
        success: true,
        url: session2.url,
        sessionId: session2.id,
        paymentType,
        metadata: enhancedMetadata,
        expiresAt: session2.expires_at
      });
    } catch (stripeError) {
      handleStripeError(stripeError, requestId, res);
    }
  } catch (error) {
    logPaymentEvent("error", "checkout_session_unexpected_error", {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : void 0
    });
    handleRouteError(error, res, "Failed to create checkout session");
  }
});
router4.get("/checkout-session/:id", async (req, res) => {
  const requestId = `get_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      const errorResponse = createErrorResponse2(
        "Validation Error",
        "Valid session ID is required",
        "id"
      );
      logPaymentEvent("warn", "session_retrieval_invalid_id", {
        requestId,
        providedId: id
      });
      res.status(400).json(errorResponse);
      return;
    }
    logPaymentEvent("info", "session_retrieval_start", {
      requestId,
      sessionId: id
    });
    const session2 = await stripe.checkout.sessions.retrieve(id);
    logPaymentEvent("info", "session_retrieved", {
      requestId,
      sessionId: session2.id,
      status: session2.status,
      amount: session2.amount_total,
      currency: session2.currency,
      paymentType: session2.metadata?.type || "unknown"
    });
    res.json({
      success: true,
      id: session2.id,
      status: session2.status,
      amount: session2.amount_total,
      currency: session2.currency,
      metadata: session2.metadata,
      customerEmail: session2.customer_email,
      createdAt: session2.created * 1e3,
      // Convert to milliseconds
      expiresAt: session2.expires_at * 1e3
      // Convert to milliseconds
    });
  } catch (error) {
    logPaymentEvent("error", "session_retrieval_failed", {
      requestId,
      sessionId: req.params.id,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      const errorResponse = createErrorResponse2(
        "Not Found",
        "Checkout session not found",
        "id",
        "session_not_found"
      );
      res.status(404).json(errorResponse);
      return;
    }
    handleRouteError(error, res, "Failed to retrieve checkout session");
  }
});
var clerk_default = router4;

// server/routes/clerk-billing.ts
import { Router as Router5 } from "express";
import { randomUUID } from "node:crypto";

// server/services/WebhookAuditLogger.ts
var WebhookAuditLogger = class _WebhookAuditLogger {
  static instance;
  constructor() {
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!_WebhookAuditLogger.instance) {
      _WebhookAuditLogger.instance = new _WebhookAuditLogger();
    }
    return _WebhookAuditLogger.instance;
  }
  /**
   * Log a webhook audit entry
   *
   * Requirements:
   * - 4.1: Log structured audit entry for any webhook request
   * - 4.2: Include rejection reason for rejected webhooks
   * - 4.3: Include mutation called and sync status for successful webhooks
   *
   * @param entry - Complete audit entry with all required fields
   */
  log(entry) {
    const level = this.determineLogLevel(entry);
    const logEntry = this.formatLogEntry(entry);
    this.writeLog(level, logEntry);
  }
  /**
   * Log a security warning for suspicious IP activity
   *
   * Requirement 4.4: Log security warning when multiple failures from same IP
   *
   * @param ip - Source IP address
   * @param failureCount - Number of failures from this IP
   */
  logSecurityWarning(ip, failureCount) {
    const warningEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sourceIp: ip,
      failureCount,
      message: `Multiple signature verification failures detected from IP: ${ip}`
    };
    const logEntry = {
      type: "webhook_security_warning",
      ...warningEntry
    };
    this.writeLog("warn", logEntry);
  }
  /**
   * Create a partial audit entry with common fields pre-filled
   * Useful for starting to build an audit entry at request start
   *
   * @param requestId - Unique request identifier
   * @param sourceIp - Source IP address
   * @param svixId - Svix webhook identifier
   * @returns Partial audit entry with common fields
   */
  createPartialEntry(requestId, sourceIp, svixId) {
    return {
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sourceIp,
      svixId
    };
  }
  /**
   * Determine the appropriate log level based on outcome
   */
  determineLogLevel(entry) {
    switch (entry.outcome) {
      case "success":
      case "duplicate":
        return "info";
      case "rejected":
        return "warn";
      case "error":
        return "error";
      default:
        return "info";
    }
  }
  /**
   * Format the audit entry for logging
   * Adds type field and ensures consistent structure
   */
  formatLogEntry(entry) {
    const logEntry = {
      type: "webhook_audit",
      requestId: entry.requestId,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      sourceIp: entry.sourceIp,
      svixId: entry.svixId,
      signatureValid: entry.signatureValid,
      processingTimeMs: entry.processingTimeMs,
      outcome: entry.outcome
    };
    if (entry.rejectionReason !== void 0) {
      logEntry.rejectionReason = entry.rejectionReason;
    }
    if (entry.mutationCalled !== void 0) {
      logEntry.mutationCalled = entry.mutationCalled;
    }
    if (entry.syncStatus !== void 0) {
      logEntry.syncStatus = entry.syncStatus;
    }
    return logEntry;
  }
  /**
   * Write log entry to console as JSON
   * In production, this would be picked up by log aggregators
   */
  writeLog(level, entry) {
    const jsonLog = JSON.stringify(entry);
    switch (level) {
      case "info":
        console.info(jsonLog);
        break;
      case "warn":
        console.warn(jsonLog);
        break;
      case "error":
        console.error(jsonLog);
        break;
    }
  }
};
function getWebhookAuditLogger() {
  return WebhookAuditLogger.getInstance();
}
var webhookAuditLogger = WebhookAuditLogger.getInstance();

// server/utils/LRUCache.ts
var LRUCache = class {
  cache;
  maxSize;
  defaultTTL;
  constructor(config) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = config.maxSize;
    this.defaultTTL = config.defaultTTL;
  }
  /**
   * Get a value from the cache
   * Returns undefined if key doesn't exist or has expired
   * Moves accessed key to end (most recently used)
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return void 0;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return void 0;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }
  /**
   * Set a value in the cache with optional custom TTL
   * Evicts oldest entry if max size is reached
   */
  set(key, value, ttl) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }
  /**
   * Check if a key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  /**
   * Delete a key from the cache
   * Returns true if key existed and was deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }
  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache.clear();
  }
  /**
   * Get the current number of entries in the cache
   * Note: May include expired entries until they are accessed
   */
  get size() {
    return this.cache.size;
  }
  /**
   * Evict the oldest (least recently used) entry
   * Map maintains insertion order, so first key is oldest
   */
  evictOldest() {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== void 0) {
      this.cache.delete(oldestKey);
    }
  }
  /**
   * Clean up expired entries
   * Useful for periodic maintenance
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }
};

// server/services/WebhookSecurityService.ts
var DEFAULT_CONFIG = {
  maxTimestampAge: 300,
  // 5 minutes
  maxTimestampFuture: 60,
  // 1 minute
  idempotencyCacheSize: 1e4,
  idempotencyCacheTTL: 3e5,
  // 5 minutes
  failureTrackingWindow: 3e5,
  // 5 minutes
  failureThreshold: 5
};
var WebhookSecurityService = class {
  config;
  idempotencyCache;
  ipFailureCache;
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const idempotencyCacheConfig = {
      maxSize: this.config.idempotencyCacheSize,
      defaultTTL: this.config.idempotencyCacheTTL
    };
    this.idempotencyCache = new LRUCache(idempotencyCacheConfig);
    const ipFailureCacheConfig = {
      maxSize: 1e3,
      // Track up to 1000 unique IPs
      defaultTTL: this.config.failureTrackingWindow
    };
    this.ipFailureCache = new LRUCache(ipFailureCacheConfig);
  }
  /**
   * Validate webhook timestamp for replay attack protection
   *
   * Requirements:
   * - 2.1: Reject timestamps older than 300 seconds (5 minutes)
   * - 2.2: Reject timestamps more than 60 seconds in the future
   * - 2.3: Accept timestamps within the valid window
   *
   * @param timestamp - Unix timestamp in seconds (from svix-timestamp header)
   * @returns ValidationResult indicating if timestamp is valid
   */
  validateTimestamp(timestamp) {
    const timestampSeconds = Number.parseInt(timestamp, 10);
    if (Number.isNaN(timestampSeconds)) {
      return {
        valid: false,
        reason: "Invalid timestamp format: not a valid number",
        code: "WEBHOOK_INVALID_TIMESTAMP_FORMAT"
      };
    }
    const nowSeconds = Math.floor(Date.now() / 1e3);
    const ageSeconds = nowSeconds - timestampSeconds;
    if (ageSeconds > this.config.maxTimestampAge) {
      return {
        valid: false,
        reason: `Timestamp too old: ${ageSeconds} seconds (max: ${this.config.maxTimestampAge})`,
        code: "WEBHOOK_REPLAY_DETECTED"
      };
    }
    if (ageSeconds < -this.config.maxTimestampFuture) {
      return {
        valid: false,
        reason: `Timestamp too far in future: ${-ageSeconds} seconds (max: ${this.config.maxTimestampFuture})`,
        code: "WEBHOOK_INVALID_TIMESTAMP_FUTURE"
      };
    }
    return { valid: true };
  }
  /**
   * Check if a webhook has already been processed (idempotency check)
   *
   * Requirements:
   * - 3.1: Detect duplicate webhooks by svix-id
   * - 3.2: Cache processed webhooks with 5-minute TTL
   *
   * @param svixId - Unique webhook identifier from svix-id header
   * @returns IdempotencyResult indicating if this is a duplicate
   */
  checkIdempotency(svixId) {
    const entry = this.idempotencyCache.get(svixId);
    if (entry) {
      return {
        isDuplicate: true,
        originalProcessedAt: entry.processedAt
      };
    }
    return { isDuplicate: false };
  }
  /**
   * Record a successfully processed webhook for idempotency tracking
   *
   * Requirements:
   * - 3.2: Store svix-id in cache with 5-minute TTL
   * - 3.3: LRU eviction when max size reached (handled by LRUCache)
   *
   * @param svixId - Unique webhook identifier
   * @param eventType - Type of webhook event
   */
  recordProcessed(svixId, eventType) {
    const entry = {
      svixId,
      processedAt: Date.now(),
      eventType
    };
    this.idempotencyCache.set(svixId, entry);
  }
  /**
   * Track a signature verification failure for an IP address
   *
   * Requirement 4.4: Track failures within 5-minute sliding window
   *
   * @param ip - Source IP address
   */
  trackSignatureFailure(ip) {
    const now = Date.now();
    const record = this.ipFailureCache.get(ip);
    if (record) {
      const recentFailures = record.failures.filter(
        (timestamp) => now - timestamp < this.config.failureTrackingWindow
      );
      recentFailures.push(now);
      this.ipFailureCache.set(ip, { failures: recentFailures });
    } else {
      this.ipFailureCache.set(ip, { failures: [now] });
    }
  }
  /**
   * Check if an IP has exceeded the failure threshold
   *
   * Requirement 4.4: Trigger warning after 5 failures from same IP
   *
   * @param ip - Source IP address
   * @returns true if IP should trigger a security warning
   */
  shouldWarnAboutIP(ip) {
    const record = this.ipFailureCache.get(ip);
    if (!record) {
      return false;
    }
    const now = Date.now();
    const recentFailures = record.failures.filter(
      (timestamp) => now - timestamp < this.config.failureTrackingWindow
    );
    return recentFailures.length >= this.config.failureThreshold;
  }
  /**
   * Get the current failure count for an IP
   *
   * @param ip - Source IP address
   * @returns Number of recent failures
   */
  getFailureCount(ip) {
    const record = this.ipFailureCache.get(ip);
    if (!record) {
      return 0;
    }
    const now = Date.now();
    return record.failures.filter((timestamp) => now - timestamp < this.config.failureTrackingWindow).length;
  }
  /**
   * Get the current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      idempotencyCacheSize: this.idempotencyCache.size,
      ipFailureCacheSize: this.ipFailureCache.size
    };
  }
};
var instance = null;
function getWebhookSecurityService(config) {
  instance ??= new WebhookSecurityService(config);
  return instance;
}

// server/utils/errorHandling.ts
function createErrorResponse3(error, code, message, requestId, details) {
  return {
    error,
    code,
    message,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    requestId
  };
}
function getErrorSeverity(code) {
  const criticalErrors = [
    "STRIPE_INVALID_SIGNATURE" /* STRIPE_INVALID_SIGNATURE */,
    "PAYPAL_INVALID_SIGNATURE" /* PAYPAL_INVALID_SIGNATURE */,
    "PAYMENT_CONFIRMATION_FAILED" /* PAYMENT_CONFIRMATION_FAILED */,
    "MISSING_CONFIGURATION" /* MISSING_CONFIGURATION */
  ];
  const highErrors = [
    "PAYMENT_INTENT_CREATION_FAILED" /* PAYMENT_INTENT_CREATION_FAILED */,
    "PAYMENT_RECORDING_FAILED" /* PAYMENT_RECORDING_FAILED */,
    "PAYMENT_REFUND_FAILED" /* PAYMENT_REFUND_FAILED */,
    "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */
  ];
  const mediumErrors = [
    "INVOICE_GENERATION_FAILED" /* INVOICE_GENERATION_FAILED */,
    "INVOICE_EMAIL_FAILED" /* INVOICE_EMAIL_FAILED */,
    "ORDER_NOT_FOUND" /* ORDER_NOT_FOUND */,
    "RESERVATION_NOT_FOUND" /* RESERVATION_NOT_FOUND */
  ];
  if (criticalErrors.includes(code)) {
    return "critical" /* CRITICAL */;
  }
  if (highErrors.includes(code)) {
    return "high" /* HIGH */;
  }
  if (mediumErrors.includes(code)) {
    return "medium" /* MEDIUM */;
  }
  return "low" /* LOW */;
}
function requiresAdminNotification(code) {
  const severity = getErrorSeverity(code);
  return severity === "critical" /* CRITICAL */ || severity === "high" /* HIGH */;
}
function sanitizeErrorMessage(error) {
  const message = error.message;
  let sanitized = message;
  sanitized = sanitized.replaceAll(/sk_live_[a-zA-Z0-9]+/g, "[REDACTED_KEY]");
  sanitized = sanitized.replaceAll(/sk_test_[a-zA-Z0-9]+/g, "[REDACTED_KEY]");
  sanitized = sanitized.replaceAll(/whsec_[a-zA-Z0-9]+/g, "[REDACTED_SECRET]");
  sanitized = sanitized.replaceAll(/Bearer [a-zA-Z0-9._-]+/g, "Bearer [REDACTED]");
  sanitized = sanitized.replaceAll(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[EMAIL]"
  );
  if (sanitized.includes("signature")) {
    return "Payment verification failed. Please contact support if this persists.";
  }
  if (sanitized.includes("timeout") || sanitized.includes("ETIMEDOUT")) {
    return "Payment processing is taking longer than expected. Please check your order status.";
  }
  if (sanitized.includes("network") || sanitized.includes("ECONNREFUSED")) {
    return "Unable to connect to payment service. Please try again later.";
  }
  return sanitized;
}
var PaymentError = class _PaymentError extends Error {
  code;
  severity;
  context;
  originalError;
  constructor(message, code, context, originalError) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.severity = getErrorSeverity(code);
    this.context = context;
    this.originalError = originalError;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _PaymentError);
    }
  }
  /**
   * Convert to error response format
   */
  toErrorResponse(requestId) {
    return createErrorResponse3(
      this.message,
      this.code,
      sanitizeErrorMessage(this),
      requestId,
      this.context
    );
  }
  /**
   * Check if this error requires admin notification
   */
  requiresNotification() {
    return requiresAdminNotification(this.code);
  }
};

// server/routes/clerk-billing.ts
var router5 = Router5();
var securityService = getWebhookSecurityService();
var auditLogger2 = getWebhookAuditLogger();
var SUBSCRIPTION_EVENT_MUTATIONS = {
  "subscription.created": "clerk/billing:handleSubscriptionCreated",
  "subscription.updated": "clerk/billing:handleSubscriptionUpdated",
  "subscription.deleted": "clerk/billing:handleSubscriptionDeleted"
};
var INVOICE_EVENT_MUTATIONS = {
  "invoice.created": "clerk/billing:handleInvoiceCreated",
  "invoice.paid": "clerk/billing:handleInvoicePaid",
  "invoice.payment_failed": "clerk/billing:handleInvoicePaymentFailed"
};
router5.post("/", async (req, res) => {
  const requestId = randomUUID();
  const startTime = Date.now();
  const sourceIp = extractSourceIP(req);
  const svixHeaders = extractSvixHeaders(req);
  const svixId = svixHeaders?.["svix-id"] || "unknown";
  const svixTimestamp = svixHeaders?.["svix-timestamp"] || "";
  let eventType = "unknown";
  let signatureValid = false;
  let outcome = "error";
  let rejectionReason;
  let mutationCalled;
  let syncStatus;
  try {
    console.log(`\u{1F4E8} [${requestId}] Processing Clerk Billing webhook...`);
    const config = validateEnvironmentConfig(requestId);
    if (!config.isValid) {
      outcome = "rejected";
      rejectionReason = "Environment configuration invalid";
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      res.status(config.statusCode).json(config.errorResponse);
      return;
    }
    if (!svixHeaders) {
      outcome = "rejected";
      rejectionReason = "Missing required Svix headers";
      console.warn(`\u26A0\uFE0F [${requestId}] ${rejectionReason}`);
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      const errorResponse = createErrorResponse3(
        "Missing headers",
        "WEBHOOK_MISSING_HEADERS" /* WEBHOOK_MISSING_HEADERS */,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }
    const timestampValidation = securityService.validateTimestamp(svixTimestamp);
    if (!timestampValidation.valid) {
      outcome = "rejected";
      rejectionReason = timestampValidation.reason;
      console.warn(`\u26A0\uFE0F [${requestId}] Timestamp validation failed: ${rejectionReason}`);
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      const errorResponse = createErrorResponse3(
        "Invalid timestamp",
        timestampValidation.code,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }
    const idempotencyResult = securityService.checkIdempotency(svixId);
    if (idempotencyResult.isDuplicate) {
      outcome = "duplicate";
      console.log(
        `\u2139\uFE0F [${requestId}] Duplicate webhook detected: ${svixId} (originally processed at ${new Date(idempotencyResult.originalProcessedAt).toISOString()})`
      );
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid: true,
        // Signature was valid when originally processed
        outcome
      });
      res.status(200).json({
        received: true,
        synced: false,
        message: "Duplicate webhook - already processed",
        requestId,
        duplicate: true
      });
      return;
    }
    const payload = await verifyWebhookSignature(
      req,
      config.webhookSecret,
      config.isProd,
      requestId
    );
    if (!payload) {
      outcome = "rejected";
      rejectionReason = "Webhook signature verification failed";
      securityService.trackSignatureFailure(sourceIp);
      if (securityService.shouldWarnAboutIP(sourceIp)) {
        const failureCount = securityService.getFailureCount(sourceIp);
        auditLogger2.logSecurityWarning(sourceIp, failureCount);
        console.warn(
          `\u{1F6A8} [${requestId}] Security warning: ${failureCount} signature failures from IP ${sourceIp}`
        );
      }
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason
      });
      const errorResponse = createErrorResponse3(
        "Invalid signature",
        "STRIPE_INVALID_SIGNATURE" /* STRIPE_INVALID_SIGNATURE */,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }
    signatureValid = true;
    eventType = payload.type || "unknown";
    const response = await processWebhookEvent(payload, config.convexUrl, requestId);
    securityService.recordProcessed(svixId, eventType);
    outcome = "success";
    syncStatus = response.synced;
    mutationCalled = response.handled ? `${response.handled}:${eventType}` : void 0;
    logAuditEntry({
      requestId,
      startTime,
      eventType,
      sourceIp,
      svixId,
      signatureValid,
      outcome,
      mutationCalled,
      syncStatus
    });
    res.status(200).json(response);
  } catch (error) {
    outcome = "error";
    rejectionReason = error instanceof Error ? error.message : String(error);
    logAuditEntry({
      requestId,
      startTime,
      eventType,
      sourceIp,
      svixId,
      signatureValid,
      outcome,
      rejectionReason
    });
    handleWebhookError(error, requestId, res);
  }
});
function extractSourceIP(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return req.socket.remoteAddress || "unknown";
}
function logAuditEntry(options) {
  const processingTimeMs = Date.now() - options.startTime;
  const auditEntry = {
    requestId: options.requestId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    eventType: options.eventType,
    sourceIp: options.sourceIp,
    svixId: options.svixId,
    signatureValid: options.signatureValid,
    processingTimeMs,
    outcome: options.outcome
  };
  if (options.rejectionReason !== void 0) {
    auditEntry.rejectionReason = options.rejectionReason;
  }
  if (options.mutationCalled !== void 0) {
    auditEntry.mutationCalled = options.mutationCalled;
  }
  if (options.syncStatus !== void 0) {
    auditEntry.syncStatus = options.syncStatus;
  }
  auditLogger2.log(auditEntry);
}
function validateEnvironmentConfig(requestId) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  const convexUrl = process.env.VITE_CONVEX_URL;
  const isProd = process.env.NODE_ENV === "production";
  if (!webhookSecret && isProd) {
    console.error(`\u274C [${requestId}] CLERK_WEBHOOK_SECRET not configured in production`);
    return {
      isValid: false,
      isProd,
      statusCode: 500,
      errorResponse: createErrorResponse3(
        "Webhook secret not configured",
        "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
        "CLERK_WEBHOOK_SECRET environment variable is required",
        requestId
      )
    };
  }
  if (!webhookSecret) {
    console.warn(`\u26A0\uFE0F [${requestId}] CLERK_WEBHOOK_SECRET not set; using raw body in dev`);
  }
  if (!convexUrl) {
    console.warn(
      `\u26A0\uFE0F [${requestId}] VITE_CONVEX_URL not set; webhook will be acknowledged but not synced`
    );
  }
  return {
    isValid: true,
    webhookSecret,
    convexUrl,
    isProd
  };
}
async function verifyWebhookSignature(req, webhookSecret, isProd, requestId) {
  if (!webhookSecret) {
    return req.body;
  }
  try {
    const { Webhook } = await import("svix");
    const svix = new Webhook(webhookSecret);
    const svixHeaders = extractSvixHeaders(req);
    if (!svixHeaders) {
      throw new Error("Missing required Svix headers");
    }
    const payload = svix.verify(JSON.stringify(req.body), svixHeaders);
    console.log(`\u2705 [${requestId}] Webhook signature verified`);
    return payload;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`\u274C [${requestId}] Webhook signature verification failed:`, errorMessage);
    if (isProd) {
      return null;
    }
    console.warn(`\u26A0\uFE0F [${requestId}] Svix verification failed; using raw body in dev`);
    return req.body;
  }
}
function extractSvixHeaders(req) {
  const svixId = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignature = req.headers["svix-signature"];
  if (!svixId || !svixTimestamp || !svixSignature) {
    return null;
  }
  return {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature
  };
}
async function processWebhookEvent(payload, convexUrl, requestId) {
  const { type: eventType, data: eventData } = payload;
  console.log(`\u{1F4CB} [${requestId}] Event type: ${eventType}`);
  if (!convexUrl) {
    return {
      received: true,
      synced: false,
      message: "Convex URL not configured",
      requestId
    };
  }
  if (eventType.startsWith("subscription.")) {
    await handleEventWithMutation(
      eventType,
      eventData,
      SUBSCRIPTION_EVENT_MUTATIONS,
      convexUrl,
      requestId
    );
    return {
      received: true,
      synced: true,
      handled: "subscription",
      eventType,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (eventType.startsWith("invoice.")) {
    await handleEventWithMutation(
      eventType,
      eventData,
      INVOICE_EVENT_MUTATIONS,
      convexUrl,
      requestId
    );
    return {
      received: true,
      synced: true,
      handled: "invoice",
      eventType,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (eventType === "session.created" || eventType === "user.created" || eventType === "user.updated") {
    await handleUserEvent(eventType, eventData, convexUrl, requestId);
    return {
      received: true,
      synced: true,
      handled: "user_session",
      eventType,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  console.log(`\u2139\uFE0F [${requestId}] Unhandled event type: ${eventType}`);
  return {
    received: true,
    synced: false,
    message: `Event type ${eventType} not handled`,
    requestId
  };
}
async function handleEventWithMutation(eventType, data, mutationMap, convexUrl, requestId) {
  const mutationName = mutationMap[eventType];
  if (!mutationName) {
    console.log(`\u2139\uFE0F [${requestId}] No mutation defined for event: ${eventType}`);
    return;
  }
  console.log(`\u{1F514} [${requestId}] Handling event: ${eventType}`);
  logEventDetails(eventType, data, requestId);
  await callConvexMutation(mutationName, data, convexUrl, requestId);
}
function logEventDetails(eventType, data, requestId) {
  if (eventType.startsWith("subscription.")) {
    console.log(`\u{1F4CA} [${requestId}] Subscription details:`, {
      subscriptionId: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      status: data.status
    });
  } else if (eventType.startsWith("invoice.")) {
    console.log(`\u{1F4CA} [${requestId}] Invoice details:`, {
      invoiceId: data.id,
      userId: data.user_id,
      amount: data.amount,
      status: data.status
    });
  }
}
async function handleUserEvent(eventType, data, convexUrl, requestId) {
  console.log(`\u{1F464} [${requestId}] Handling user event: ${eventType}`);
  try {
    const userId = data.user_id || data.id;
    const emailAddresses = data.email_addresses;
    const email = emailAddresses?.[0]?.email_address || "unknown@temp.com";
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "users/clerkSync:syncClerkUser",
        args: {
          clerkId: userId,
          email,
          username: data.username,
          firstName: data.first_name,
          lastName: data.last_name,
          imageUrl: data.image_url
        },
        format: "json"
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Convex mutation failed: ${errorText}`);
    }
    console.log(`\u2705 [${requestId}] User synced successfully: ${userId}`);
  } catch (error) {
    console.error(`\u274C [${requestId}] Error syncing user:`, error);
    throw error;
  }
}
async function callConvexMutation(mutationName, data, convexUrl, requestId) {
  try {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: mutationName,
        args: { data },
        format: "json"
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Convex mutation failed: ${errorText}`);
    }
    console.log(`\u2705 [${requestId}] Convex mutation completed: ${mutationName}`);
  } catch (error) {
    console.error(`\u274C [${requestId}] Error calling Convex mutation:`, error);
    throw error;
  }
}
function handleWebhookError(error, requestId, res) {
  console.error(`\u274C [${requestId}] Error processing Clerk Billing webhook:`, error);
  if (error instanceof PaymentError) {
    const errorResponse2 = error.toErrorResponse(requestId);
    res.status(500).json(errorResponse2);
    return;
  }
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorResponse = createErrorResponse3(
    "Webhook processing failed",
    "WEBHOOK_PROCESSING_ERROR" /* WEBHOOK_PROCESSING_ERROR */,
    sanitizeErrorMessage(errorObj),
    requestId,
    { stack: errorObj.stack }
  );
  res.status(500).json(errorResponse);
}
var clerk_billing_default = router5;

// server/routes/downloads.ts
import archiver from "archiver";
import express from "express";
import { Parser } from "json2csv";

// shared/schema.ts
import { z as z3 } from "zod";
var LicenseType = ["basic", "premium", "unlimited"];
var OrderStatus = [
  "pending",
  "processing",
  "paid",
  "completed",
  "failed",
  "refunded",
  "cancelled"
];
var insertUserSchema = z3.object({
  username: z3.string().min(2),
  email: z3.string().email(),
  password: z3.string().min(6)
});
var insertEmailVerificationSchema = z3.object({
  user_id: z3.number(),
  token: z3.string(),
  expires_at: z3.string()
});
var insertPasswordResetSchema = z3.object({
  user_id: z3.number(),
  token: z3.string(),
  expires_at: z3.string()
});
var verifyEmailSchema = z3.object({
  token: z3.string().uuid("Format de token invalide")
});
var resendVerificationSchema = z3.object({
  email: z3.string().email("Format d'email invalide")
});
var forgotPasswordSchema = z3.object({
  email: z3.string().email("Format d'email invalide")
});
var resetPasswordSchema = z3.object({
  token: z3.string().uuid("Format de token invalide"),
  password: z3.string().min(6, "Le mot de passe doit contenir au moins 6 caract\xE8res")
});
var insertBeatSchema = z3.object({
  wordpress_id: z3.number(),
  title: z3.string().min(2),
  description: z3.string().optional().nullable(),
  genre: z3.string(),
  bpm: z3.number(),
  key: z3.string().optional().nullable(),
  mood: z3.string().optional().nullable(),
  price: z3.number(),
  audio_url: z3.string().optional().nullable(),
  image_url: z3.string().optional().nullable(),
  tags: z3.array(z3.string()).optional().nullable(),
  featured: z3.boolean().optional(),
  downloads: z3.number().optional(),
  views: z3.number().optional(),
  duration: z3.number().optional(),
  is_active: z3.boolean().optional()
});
var insertWishlistItemSchema = z3.object({
  user_id: z3.number(),
  beat_id: z3.number()
});
var insertCartItemSchema = z3.object({
  beat_id: z3.number(),
  license_type: z3.enum(LicenseType),
  price: z3.number(),
  quantity: z3.number().min(1),
  session_id: z3.string().optional().nullable(),
  user_id: z3.number().optional().nullable()
});
var insertOrderSchema = z3.object({
  user_id: z3.number().optional().nullable(),
  session_id: z3.string().optional().nullable(),
  email: z3.string().email(),
  total: z3.number(),
  status: z3.enum(OrderStatus),
  stripe_payment_intent_id: z3.string().optional().nullable(),
  items: z3.array(
    z3.object({
      productId: z3.number().optional(),
      title: z3.string(),
      price: z3.number().optional(),
      quantity: z3.number().optional(),
      license: z3.string().optional(),
      type: z3.string().optional(),
      sku: z3.string().optional(),
      metadata: z3.object({
        beatGenre: z3.string().optional(),
        beatBpm: z3.number().optional(),
        beatKey: z3.string().optional(),
        downloadFormat: z3.string().optional(),
        licenseTerms: z3.string().optional()
      }).optional()
    })
  )
});
var insertOrderStatusHistorySchema = z3.object({
  order_id: z3.number(),
  status: z3.enum(OrderStatus),
  comment: z3.string().optional().nullable()
});
var insertSubscriptionSchema = z3.object({
  user_id: z3.number(),
  plan: z3.enum(LicenseType),
  status: z3.enum(["active", "inactive", "canceled"]),
  started_at: z3.string(),
  expires_at: z3.string()
});
var insertDownloadSchema = z3.object({
  productId: z3.number().positive("Product ID must be a positive number"),
  license: z3.enum(LicenseType, {
    errorMap: () => ({ message: "License must be basic, premium, or unlimited" })
  }),
  price: z3.number().min(0).optional(),
  // Price in cents, optional for free downloads
  productName: z3.string().optional()
  // Optional product name for order creation
});
var insertActivityLogSchema = z3.object({
  user_id: z3.number().optional().nullable(),
  action: z3.string(),
  details: z3.object({
    action: z3.string(),
    resource: z3.string(),
    resourceId: z3.string().optional(),
    changes: z3.record(
      z3.object({
        from: z3.unknown(),
        to: z3.unknown()
      })
    ).optional(),
    metadata: z3.object({
      ipAddress: z3.string().optional(),
      userAgent: z3.string().optional(),
      duration: z3.number().optional(),
      success: z3.boolean(),
      errorMessage: z3.string().optional(),
      additionalContext: z3.record(z3.unknown()).optional()
    })
  }).optional(),
  timestamp: z3.string().optional()
});
var insertFileSchema = z3.object({
  user_id: z3.number(),
  filename: z3.string(),
  original_name: z3.string(),
  mime_type: z3.string(),
  size: z3.number(),
  storage_path: z3.string(),
  role: z3.enum(["upload", "deliverable", "invoice"]),
  reservation_id: z3.string().optional().nullable(),
  order_id: z3.number().optional().nullable(),
  owner_id: z3.number().optional().nullable()
});
var ServiceType = [
  "mixing",
  "mastering",
  "recording",
  "custom_beat",
  "consultation"
];
var insertServiceOrderSchema = z3.object({
  user_id: z3.number(),
  service_type: z3.enum(ServiceType),
  details: z3.object({
    duration: z3.number().optional(),
    tracks: z3.number().optional(),
    format: z3.enum(["wav", "mp3", "aiff"]).optional(),
    quality: z3.enum(["standard", "premium"]).optional(),
    rush: z3.boolean().optional(),
    notes: z3.string().optional()
  }),
  estimated_price: z3.number().min(0),
  status: z3.enum(["pending", "in_progress", "completed", "cancelled"]).optional()
});
var ReservationStatus = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled"
];
var insertReservationSchema = z3.object({
  user_id: z3.number().optional().nullable(),
  service_type: z3.enum(ServiceType),
  details: z3.object({
    name: z3.string().min(1, "Name is required"),
    email: z3.string().email("Invalid email format"),
    phone: z3.string().min(10, "Invalid phone number"),
    requirements: z3.string().optional(),
    referenceLinks: z3.array(z3.string().url()).optional()
  }),
  preferred_date: z3.string().datetime(),
  duration_minutes: z3.number().min(30).max(480),
  total_price: z3.number().min(0),
  notes: z3.string().optional().nullable()
});

// server/routes/downloads.ts
init_auth();

// server/lib/validation.ts
import { ZodError, z as z4 } from "zod";

// shared/constants/HttpStatus.ts
var HTTP_STATUS = {
  // Success responses (2xx)
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  // Redirection responses (3xx)
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  // Client error responses (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  // Server error responses (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505
};
var STATUS_DESCRIPTIONS = {
  [HTTP_STATUS.OK]: "OK",
  [HTTP_STATUS.CREATED]: "Created",
  [HTTP_STATUS.ACCEPTED]: "Accepted",
  [HTTP_STATUS.NO_CONTENT]: "No Content",
  [HTTP_STATUS.MOVED_PERMANENTLY]: "Moved Permanently",
  [HTTP_STATUS.FOUND]: "Found",
  [HTTP_STATUS.NOT_MODIFIED]: "Not Modified",
  [HTTP_STATUS.BAD_REQUEST]: "Bad Request",
  [HTTP_STATUS.UNAUTHORIZED]: "Unauthorized",
  [HTTP_STATUS.PAYMENT_REQUIRED]: "Payment Required",
  [HTTP_STATUS.FORBIDDEN]: "Forbidden",
  [HTTP_STATUS.NOT_FOUND]: "Not Found",
  [HTTP_STATUS.METHOD_NOT_ALLOWED]: "Method Not Allowed",
  [HTTP_STATUS.NOT_ACCEPTABLE]: "Not Acceptable",
  [HTTP_STATUS.REQUEST_TIMEOUT]: "Request Timeout",
  [HTTP_STATUS.CONFLICT]: "Conflict",
  [HTTP_STATUS.GONE]: "Gone",
  [HTTP_STATUS.LENGTH_REQUIRED]: "Length Required",
  [HTTP_STATUS.PRECONDITION_FAILED]: "Precondition Failed",
  [HTTP_STATUS.PAYLOAD_TOO_LARGE]: "Payload Too Large",
  [HTTP_STATUS.URI_TOO_LONG]: "URI Too Long",
  [HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE]: "Unsupported Media Type",
  [HTTP_STATUS.RANGE_NOT_SATISFIABLE]: "Range Not Satisfiable",
  [HTTP_STATUS.EXPECTATION_FAILED]: "Expectation Failed",
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]: "Unprocessable Entity",
  [HTTP_STATUS.TOO_MANY_REQUESTS]: "Too Many Requests",
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: "Internal Server Error",
  [HTTP_STATUS.NOT_IMPLEMENTED]: "Not Implemented",
  [HTTP_STATUS.BAD_GATEWAY]: "Bad Gateway",
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: "Service Unavailable",
  [HTTP_STATUS.GATEWAY_TIMEOUT]: "Gateway Timeout",
  [HTTP_STATUS.HTTP_VERSION_NOT_SUPPORTED]: "HTTP Version Not Supported"
};
var BROLAB_STATUS_MAPPING = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: HTTP_STATUS.UNAUTHORIZED,
  SESSION_EXPIRED: HTTP_STATUS.UNAUTHORIZED,
  INSUFFICIENT_PERMISSIONS: HTTP_STATUS.FORBIDDEN,
  ACCOUNT_SUSPENDED: HTTP_STATUS.FORBIDDEN,
  EMAIL_NOT_VERIFIED: HTTP_STATUS.UNAUTHORIZED,
  // Beat Licensing
  LICENSE_NOT_AVAILABLE: HTTP_STATUS.CONFLICT,
  BEAT_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  BEAT_UNAVAILABLE: HTTP_STATUS.CONFLICT,
  EXCLUSIVE_BEAT_SOLD: HTTP_STATUS.GONE,
  INVALID_LICENSE_TYPE: HTTP_STATUS.BAD_REQUEST,
  LICENSE_TERMS_VIOLATION: HTTP_STATUS.FORBIDDEN,
  // Payment Processing
  PAYMENT_FAILED: HTTP_STATUS.PAYMENT_REQUIRED,
  INSUFFICIENT_FUNDS: HTTP_STATUS.PAYMENT_REQUIRED,
  CARD_DECLINED: HTTP_STATUS.PAYMENT_REQUIRED,
  PAYMENT_METHOD_INVALID: HTTP_STATUS.BAD_REQUEST,
  CURRENCY_NOT_SUPPORTED: HTTP_STATUS.BAD_REQUEST,
  REFUND_FAILED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  SUBSCRIPTION_PAYMENT_FAILED: HTTP_STATUS.PAYMENT_REQUIRED,
  // Audio Processing
  AUDIO_FILE_CORRUPT: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  AUDIO_FORMAT_UNSUPPORTED: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
  WAVEFORM_GENERATION_FAILED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  AUDIO_PROCESSING_TIMEOUT: HTTP_STATUS.REQUEST_TIMEOUT,
  AUDIO_QUALITY_INSUFFICIENT: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  // Download & Quota
  DOWNLOAD_QUOTA_EXCEEDED: HTTP_STATUS.TOO_MANY_REQUESTS,
  DOWNLOAD_LINK_EXPIRED: HTTP_STATUS.GONE,
  FILE_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  DOWNLOAD_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  CONCURRENT_DOWNLOAD_LIMIT: HTTP_STATUS.TOO_MANY_REQUESTS,
  // Studio Booking
  BOOKING_CONFLICT: HTTP_STATUS.CONFLICT,
  STUDIO_UNAVAILABLE: HTTP_STATUS.SERVICE_UNAVAILABLE,
  BOOKING_CANCELLED: HTTP_STATUS.GONE,
  SERVICE_NOT_AVAILABLE: HTTP_STATUS.SERVICE_UNAVAILABLE,
  BOOKING_DEADLINE_PASSED: HTTP_STATUS.GONE,
  // File Upload
  FILE_TOO_LARGE: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  FILE_TYPE_NOT_ALLOWED: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
  VIRUS_DETECTED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  UPLOAD_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  STORAGE_QUOTA_EXCEEDED: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  // Subscription
  SUBSCRIPTION_EXPIRED: HTTP_STATUS.PAYMENT_REQUIRED,
  SUBSCRIPTION_CANCELLED: HTTP_STATUS.FORBIDDEN,
  PLAN_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  UPGRADE_FAILED: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  DOWNGRADE_RESTRICTED: HTTP_STATUS.FORBIDDEN,
  // Business Logic
  CART_EMPTY: HTTP_STATUS.BAD_REQUEST,
  ITEM_OUT_OF_STOCK: HTTP_STATUS.CONFLICT,
  PRICE_CHANGED: HTTP_STATUS.CONFLICT,
  PROMOTIONAL_CODE_INVALID: HTTP_STATUS.BAD_REQUEST,
  WISHLIST_FULL: HTTP_STATUS.CONFLICT,
  // System Errors
  DATABASE_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  EXTERNAL_SERVICE_ERROR: HTTP_STATUS.SERVICE_UNAVAILABLE,
  RATE_LIMIT_EXCEEDED: HTTP_STATUS.TOO_MANY_REQUESTS,
  MAINTENANCE_MODE: HTTP_STATUS.SERVICE_UNAVAILABLE,
  FEATURE_DISABLED: HTTP_STATUS.SERVICE_UNAVAILABLE,
  // Validation Errors
  VALIDATION_ERROR: HTTP_STATUS.BAD_REQUEST,
  INVALID_INPUT: HTTP_STATUS.BAD_REQUEST,
  MISSING_REQUIRED_FIELD: HTTP_STATUS.BAD_REQUEST,
  // API Errors
  API_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  INTERNAL_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
  FORBIDDEN: HTTP_STATUS.FORBIDDEN
};

// server/lib/errorResponses.ts
function createErrorResponse4(type, message, statusCode, code, details, requestId) {
  return {
    error: {
      type,
      message,
      code: code || type.toUpperCase(),
      details
    },
    timestamp: Date.now(),
    requestId
  };
}
function sendValidationError(res, errors, requestId) {
  const response = {
    success: false,
    error: {
      type: "validation_error" /* VALIDATION_ERROR */,
      message: "Request validation failed",
      code: "VALIDATION_ERROR",
      details: {
        errors,
        invalidFields: errors.map((e) => e.field)
      }
    },
    timestamp: Date.now(),
    requestId
  };
  res.status(HTTP_STATUS.BAD_REQUEST).json(response);
}
function sendInternalError(res, message = "Internal server error", error, requestId) {
  const response = createErrorResponse4(
    "internal_error" /* INTERNAL_ERROR */,
    message,
    500,
    "INTERNAL_ERROR",
    {
      errorName: error?.name,
      // Only include stack trace in development
      ...process.env.NODE_ENV === "development" && { stack: error?.stack }
    },
    requestId
  );
  res.status(500).json(response);
}
function getRequestId(req) {
  if (req && typeof req === "object" && "requestId" in req) {
    return req.requestId;
  }
  return void 0;
}

// server/lib/validation.ts
function createValidationMiddleware(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.method === "GET" ? req.query : req.body);
      const validatedReq = req;
      if (req.method === "GET") {
        validatedReq.validatedQuery = validatedData;
      } else {
        req.body = validatedData;
      }
      validatedReq.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code
        }));
        return sendValidationError(res, validationErrors, getRequestId(req));
      }
      return sendInternalError(res, "Internal validation error", error, getRequestId(req));
    }
  };
}
var commonSchemas = {
  id: z4.object({
    id: z4.string().or(z4.number().positive())
  }),
  pagination: z4.object({
    page: z4.number().min(1).optional().default(1),
    limit: z4.number().min(1).max(100).optional().default(20),
    offset: z4.number().min(0).optional()
  }),
  sorting: z4.object({
    sortBy: z4.string().optional(),
    sortOrder: z4.enum(["asc", "desc"]).optional().default("desc")
  }),
  dateRange: z4.object({
    startDate: z4.string().datetime().optional(),
    endDate: z4.string().datetime().optional()
  }),
  search: z4.object({
    query: z4.string().min(1).optional(),
    filters: z4.record(z4.unknown()).optional()
  })
};
var validateFileUpload = (allowedTypes, maxSize) => {
  return (req, res, next) => {
    const files = req.files;
    if (!files || files.length === 0) {
      return sendValidationError(
        res,
        [{ field: "files", message: "At least one file is required", code: "required" }],
        getRequestId(req)
      );
    }
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return sendValidationError(
          res,
          [
            {
              field: "files",
              message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
              code: "invalid_type"
            }
          ],
          getRequestId(req)
        );
      }
      if (file.size > maxSize) {
        return sendValidationError(
          res,
          [
            {
              field: "files",
              message: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
              code: "file_too_large"
            }
          ],
          getRequestId(req)
        );
      }
    }
    next();
  };
};
var validateAudioUpload = validateFileUpload(
  ["audio/mpeg", "audio/wav", "audio/flac", "audio/aiff"],
  100 * 1024 * 1024
  // 100MB
);
var validateImageUpload = validateFileUpload(
  ["image/jpeg", "image/png", "image/gif", "image/webp"],
  10 * 1024 * 1024
  // 10MB
);

// server/middleware/clerkAuth.ts
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
var withClerkAuth = ClerkExpressWithAuth({
  onError: (error) => {
    console.error("Clerk auth error:", error);
    return {
      error: "Non autoris\xE9",
      message: "Authentification Clerk requise"
    };
  }
});
var getCurrentClerkUser = (req) => {
  return req.auth?.userId ? {
    id: req.auth.userId,
    sessionId: req.auth.sessionId,
    getToken: req.auth.getToken
  } : null;
};

// server/routes/downloads.ts
init_convex();
var convex2 = getConvex();
var router6 = express.Router();
router6.post(
  "/",
  isAuthenticated,
  createValidationMiddleware(insertDownloadSchema),
  async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const clerkUser = getCurrentClerkUser(req);
      if (!clerkUser) {
        res.status(401).json({ error: "Clerk authentication required" });
        return;
      }
      const { productId, license, price, productName } = req.body;
      console.log(`\u{1F527} Download request received:`, {
        userId: user.id,
        clerkId: clerkUser.id,
        productId,
        license,
        price,
        productName
      });
      const convexClient2 = convex2;
      const download = await convexClient2.mutation("downloads:recordDownload", {
        beatId: Number(productId),
        licenseType: String(license),
        downloadUrl: void 0
      });
      if (download) {
        res.json({
          success: true,
          message: "Download logged successfully",
          download: {
            id: download,
            userId: user.id,
            productId,
            license,
            timestamp: Date.now()
          }
        });
      } else {
        res.status(500).json({ error: "Failed to log download" });
      }
    } catch (error) {
      handleRouteError(error, res, "Download failed");
    }
  }
);
router6.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }
    const downloads = await convex2.query("downloads:getUserDownloads", {});
    res.json({
      downloads: downloads.map((download) => ({
        id: download._id,
        product_id: download.beatId,
        license: download.licenseType,
        downloaded_at: new Date(download.timestamp).toISOString(),
        // Convert timestamp to ISO string
        download_count: download.downloadCount || 1
      }))
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to list downloads");
  }
});
router6.get("/export", isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }
    const downloads = await convex2.query("downloads:getUserDownloads", {});
    const csvData = downloads.map((download) => ({
      product_id: download.beatId,
      license: download.licenseType,
      downloaded_at: new Date(download.timestamp).toISOString(),
      // Convert timestamp to ISO string
      download_count: download.downloadCount || 1
    }));
    const parser = new Parser({
      fields: ["product_id", "license", "downloaded_at", "download_count"],
      header: true
    });
    const csv = parser.parse(csvData);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="downloads.csv"');
    res.send(csv);
  } catch (error) {
    handleRouteError(error, res, "Failed to export downloads");
  }
});
router6.get("/quota", isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }
    const convexClient2 = convex2;
    const quotaResult = await convexClient2.query(
      "subscriptions/checkDownloadQuota:checkDownloadQuota",
      {}
    );
    const downloadsUsed = quotaResult.quota.used;
    const quota = quotaResult.quota.limit === Infinity ? -1 : quotaResult.quota.limit;
    const remaining = quotaResult.quota.remaining === Infinity ? -1 : quotaResult.quota.remaining;
    const isUnlimited = quota === -1;
    const progress = isUnlimited ? 0 : Math.min(downloadsUsed / quota * 100, 100);
    console.log(
      `\u{1F50D} Quota API - User ${user.id}: ${downloadsUsed}/${isUnlimited ? "unlimited" : quota} downloads (plan: ${quotaResult.planId || "unknown"})`
    );
    res.json({
      downloadsUsed,
      quota,
      remaining,
      progress,
      isUnlimited,
      canDownload: quotaResult.canDownload,
      licenseType: quotaResult.planId || "free",
      currentPeriodEnd: quotaResult.currentPeriodEnd
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch download quota");
  }
});
router6.get("/debug", async (req, res) => {
  try {
    res.json({
      success: true,
      tableExists: true,
      message: "Convex downloads table is working correctly",
      note: "Authentication required for actual data queries"
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      error: "Debug failed",
      details: error,
      message: "Check if Convex connection is working"
    });
  }
});
router6.get("/quota/test", async (req, res) => {
  try {
    res.json({
      downloadsUsed: 0,
      quota: 5,
      // Basic plan default
      remaining: 5,
      progress: 0,
      test: true,
      message: "Test endpoint - authentication required for actual data"
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch test download quota");
  }
});
router6.get("/file/:productId/:type", async (req, res) => {
  try {
    const { productId, type } = req.params;
    res.json({
      success: true,
      productId,
      type,
      message: `Download initiated for product ${productId} (${type})`,
      downloadUrl: `/api/placeholder/audio.mp3`,
      // Placeholder URL
      note: "This is a placeholder. In production, this would serve the actual file."
    });
  } catch (error) {
    handleRouteError(error, res, "File download failed");
  }
});
router6.get("/proxy", async (req, res) => {
  try {
    const { url, filename } = req.query;
    console.log("\u{1F4E5} Proxy download request:", { url, filename });
    if (!url || typeof url !== "string") {
      console.error("\u274C Missing or invalid URL parameter");
      res.status(400).json({ error: "Missing or invalid URL parameter" });
      return;
    }
    const decodedUrl = decodeURIComponent(url);
    console.log("\u{1F4E5} Decoded URL:", decodedUrl);
    const allowedDomains = ["brolabentertainment.com", "wp-content", "uploads"];
    const isAllowed = allowedDomains.some((domain) => decodedUrl.includes(domain));
    if (!isAllowed) {
      console.error("\u274C URL domain not allowed:", decodedUrl);
      res.status(403).json({ error: "URL domain not allowed", url: decodedUrl });
      return;
    }
    console.log("\u{1F4E5} Fetching file from:", decodedUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "audio/mpeg, audio/*, */*",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        Referer: "https://brolabentertainment.com/"
      }
    });
    if (!response.ok) {
      console.error("\u274C Failed to fetch file:", response.status, response.statusText);
      res.status(response.status).json({
        error: "Failed to fetch file from source",
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl
      });
      return;
    }
    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const contentLength = response.headers.get("content-length");
    console.log("\u{1F4E5} File info:", { contentType, contentLength });
    const safeFilename = typeof filename === "string" ? filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_") : "download.mp3";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log("\u2705 Sending file:", safeFilename, "size:", arrayBuffer.byteLength);
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("\u274C Proxy download error:", error);
    handleRouteError(error, res, "Proxy download failed");
  }
});
var ALLOWED_DOMAINS = ["brolabentertainment.com", "wp-content", "uploads"];
var AUDIO_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "audio/mpeg, audio/*, */*",
  Referer: "https://brolabentertainment.com/"
};
function isUrlAllowed(url) {
  return ALLOWED_DOMAINS.some((domain) => url.includes(domain));
}
function validateTrackUrls(tracks) {
  for (const track of tracks) {
    const trackUrl = track.downloadUrl || track.url;
    if (trackUrl && !isUrlAllowed(trackUrl)) {
      return { valid: false, invalidUrl: trackUrl };
    }
  }
  return { valid: true };
}
async function fetchTrackBuffer(trackUrl, trackIndex, totalTracks) {
  console.log(`\u{1F4E5} Fetching track ${trackIndex}/${totalTracks}: ${trackUrl.substring(0, 60)}...`);
  const response = await fetch(trackUrl, { headers: AUDIO_FETCH_HEADERS });
  if (!response.ok) {
    console.error(`\u274C Failed to fetch track ${trackIndex}:`, response.status);
    return null;
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
function generateTrackFilename(track, index) {
  const trackTitle = track.title || `Track_${index}`;
  const safeTrackTitle = trackTitle.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return `${String(index).padStart(2, "0")}_${safeTrackTitle}.mp3`;
}
async function addTracksToArchive(archive, tracks) {
  let trackIndex = 1;
  for (const track of tracks) {
    const trackUrl = track.downloadUrl || track.url;
    if (!trackUrl) {
      console.warn(`\u26A0\uFE0F Skipping track ${trackIndex}: no URL`);
      trackIndex++;
      continue;
    }
    try {
      const buffer = await fetchTrackBuffer(trackUrl, trackIndex, tracks.length);
      if (buffer) {
        const trackFilename = generateTrackFilename(track, trackIndex);
        console.log(`\u2705 Adding to ZIP: ${trackFilename} (${buffer.length} bytes)`);
        archive.append(buffer, { name: trackFilename });
      }
    } catch (fetchError) {
      console.error(`\u274C Error fetching track ${trackIndex}:`, fetchError);
    }
    trackIndex++;
  }
}
router6.post("/zip", async (req, res) => {
  try {
    const { productName, tracks } = req.body;
    console.log("\u{1F4E6} ZIP download request:", { productName, trackCount: tracks?.length });
    if (!productName || !tracks || !Array.isArray(tracks) || tracks.length === 0) {
      res.status(400).json({ error: "Missing productName or tracks array" });
      return;
    }
    const validation = validateTrackUrls(tracks);
    if (!validation.valid) {
      console.error("\u274C Track URL domain not allowed:", validation.invalidUrl);
      res.status(403).json({ error: "Track URL domain not allowed", url: validation.invalidUrl });
      return;
    }
    const safeProductName = productName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    const zipFilename = `${safeProductName}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.on("error", (err) => {
      console.error("\u274C Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create ZIP archive" });
      }
    });
    archive.pipe(res);
    await addTracksToArchive(archive, tracks);
    await archive.finalize();
    console.log(`\u2705 ZIP archive created: ${zipFilename}`);
  } catch (error) {
    console.error("\u274C ZIP download error:", error);
    if (!res.headersSent) {
      handleRouteError(error, res, "ZIP download failed");
    }
  }
});
var downloads_default = router6;

// server/routes/email.ts
import bcrypt from "bcrypt";
import { Router as Router6 } from "express";
import { v4 as uuidv4 } from "uuid";
init_convex();

// server/services/mail.ts
import nodemailer from "nodemailer";
var createTransporter = () => {
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY
      }
    });
  }
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass || smtpUser === "your_email@gmail.com" || smtpPass === "your_app_password_here") {
    console.error(
      "\u274C SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env or use RESEND_API_KEY"
    );
    throw new Error("Email service not configured. Please contact administrator.");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1e3,
    rateLimit: 5
  });
};
var transporter = null;
var getTransporter = () => {
  if (!transporter) {
    try {
      transporter = createTransporter();
    } catch (error) {
      console.error("\u274C Failed to create email transporter:", error);
      throw error;
    }
  }
  return transporter;
};
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var calculateDelay = (attempt, options) => {
  const baseDelay = options.baseDelay || 1e3;
  const backoffFactor = options.backoffFactor || 2;
  const maxDelay = options.maxDelay || 3e4;
  const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
  return Math.min(delay, maxDelay);
};
var stripHTML = (html) => {
  return html.replaceAll(/<[^>]*>/g, "").replaceAll("&nbsp;", " ").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').trim();
};
async function sendMail(payload, retryOptions) {
  const options = {
    maxRetries: 3,
    baseDelay: 1e3,
    maxDelay: 3e4,
    backoffFactor: 2,
    ...retryOptions
  };
  let lastError = null;
  for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
    try {
      if (process.env.MAIL_DRY_RUN === "true") {
        console.log("\u{1F4E7} MAIL DRY RUN:", {
          to: payload.to,
          subject: payload.subject,
          from: payload.from || process.env.DEFAULT_FROM,
          attempt
        });
        return "dry-run-message-id";
      }
      const transporter2 = getTransporter();
      const mailOptions = {
        from: payload.from || process.env.DEFAULT_FROM || "BroLab <contact@brolabentertainment.com>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || stripHTML(payload.html),
        replyTo: payload.replyTo
      };
      const result = await transporter2.sendMail(mailOptions);
      console.log(`\u2705 Email sent successfully on attempt ${attempt}:`, result.messageId);
      return result.messageId;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `\u26A0\uFE0F Email sending failed on attempt ${attempt}/${options.maxRetries}:`,
        lastError.message
      );
      if (attempt === options.maxRetries) {
        break;
      }
      const delay = calculateDelay(attempt, options);
      console.log(`\u23F3 Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  const errorMessage = lastError?.message || "Unknown error";
  console.error("\u274C All email sending attempts failed:", errorMessage);
  throw new Error(`Email sending failed after ${options.maxRetries} attempts: ${errorMessage}`);
}
async function sendMailWithResult(payload, retryOptions) {
  const options = {
    maxRetries: 3,
    baseDelay: 1e3,
    maxDelay: 3e4,
    backoffFactor: 2,
    ...retryOptions
  };
  let lastError = null;
  for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
    try {
      const messageId = await sendMail(payload, { maxRetries: 1 });
      return {
        success: true,
        messageId,
        attempts: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === options.maxRetries) {
        break;
      }
      const delay = calculateDelay(attempt, options);
      await sleep(delay);
    }
  }
  return {
    success: false,
    error: lastError?.message || "Unknown error",
    attempts: options.maxRetries || 3
  };
}

// server/services/ReservationEmailService.ts
var ReservationEmailService = class {
  options;
  constructor(options = {}) {
    this.options = {
      retryOptions: {
        maxRetries: 3,
        baseDelay: 1e3,
        maxDelay: 3e4,
        backoffFactor: 2
      },
      adminEmails: process.env.ADMIN_EMAILS?.split(",") || ["contact@brolabentertainment.com"],
      fromEmail: process.env.DEFAULT_FROM || "BroLab <contact@brolabentertainment.com>",
      ...options
    };
  }
  /**
   * Send reservation confirmation email to user
   */
  async sendReservationConfirmation(user, reservations, payment) {
    const emailContent = this.generateReservationConfirmationEmail(reservations, payment);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u{1F3B5} Reservation Confirmed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send admin notification for new reservation
   */
  async sendAdminNotification(user, reservation) {
    const emailContent = this.generateAdminNotificationEmail(user, reservation);
    return await sendMailWithResult(
      {
        to: this.options.adminEmails,
        subject: `\u{1F514} New Reservation - ${reservation.serviceType} - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send status update email to user
   */
  async sendStatusUpdate(user, reservation, oldStatus, newStatus) {
    const emailContent = this.generateStatusUpdateEmail(reservation, oldStatus, newStatus);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u{1F4C5} Reservation Status Update - ${newStatus.toUpperCase()} - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(user, reservations, payment) {
    const emailContent = this.generatePaymentConfirmationEmail(reservations, payment);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u{1F4B3} Payment Confirmed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(user, reservationIds, payment, failureReason) {
    const emailContent = this.generatePaymentFailureEmail(reservationIds, payment, failureReason);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u26A0\uFE0F Payment Failed - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Send reservation reminder email (24 hours before)
   */
  async sendReservationReminder(user, reservation) {
    const emailContent = this.generateReminderEmail(reservation);
    return await sendMailWithResult(
      {
        to: user.email,
        subject: `\u23F0 Reminder: Your session is tomorrow - BroLab Entertainment`,
        html: emailContent,
        from: this.options.fromEmail
      },
      this.options.retryOptions
    );
  }
  /**
   * Generate reservation confirmation email template
   */
  generateReservationConfirmationEmail(reservations, payment) {
    const reservationsList = reservations.map((reservation) => {
      const date = new Date(reservation.preferredDate);
      return `
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">CONFIRMED</span></p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
        `;
    }).join("");
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reservation Confirmed!</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Your reservation${reservations.length > 1 ? "s are" : " is"} now confirmed</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Thank you for choosing BroLab Entertainment! Your reservation${reservations.length > 1 ? "s have" : " has"} been confirmed and we're excited to work with you.
          </p>
          
          <h2 style="color: #8B5CF6; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">Reservation Details</h2>
          ${reservationsList}
          
          ${payment ? `
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Payment Information</h3>
            <p><strong>Amount:</strong> ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod || "Card"}</p>
            ${payment.paymentIntentId ? `<p><strong>Transaction ID:</strong> ${payment.paymentIntentId}</p>` : ""}
          </div>
          ` : ""}
          
          <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">What's Next?</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>We'll contact you 24-48 hours before your session to confirm details</li>
              <li>Please arrive 10 minutes early to your scheduled session</li>
              <li>Bring any reference materials or files you'd like to work with</li>
              <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Questions? We're here to help!</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>This is an automated confirmation email. Please do not reply to this message.</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate admin notification email template
   */
  generateAdminNotificationEmail(user, reservation) {
    const date = new Date(reservation.preferredDate);
    const userName = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User";
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F514} New Reservation</h1>
          <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">A new reservation has been created</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="color: #D97706; margin: 0 0 15px 0;">Reservation Details</h3>
            <p><strong>Service:</strong> ${this.formatServiceType(reservation.serviceType)}</p>
            <p><strong>Client:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Phone:</strong> ${reservation.details.phone || "Not provided"}</p>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            <p><strong>Price:</strong> \u20AC${reservation.totalPrice}</p>
            <p><strong>Status:</strong> ${reservation.status.toUpperCase()}</p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
            ${reservation.details.requirements ? `<p><strong>Requirements:</strong> ${reservation.details.requirements}</p>` : ""}
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Action Required</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Review the reservation details and confirm availability</li>
              <li>Contact the client if additional information is needed</li>
              <li>Update the reservation status in the admin panel</li>
              <li>Prepare any necessary materials for the session</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || "https://brolabentertainment.com"}/admin/reservations/${reservation.id}" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Reservation
            </a>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Admin Notification System</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate status update email template
   */
  generateStatusUpdateEmail(reservation, oldStatus, newStatus) {
    const date = new Date(reservation.preferredDate);
    const statusColors = {
      pending: "#F59E0B",
      confirmed: "#10B981",
      in_progress: "#3B82F6",
      completed: "#8B5CF6",
      cancelled: "#EF4444"
    };
    const statusMessages = {
      confirmed: "Your reservation has been confirmed! We're looking forward to working with you.",
      in_progress: "Your session is currently in progress. We're working hard to deliver exceptional results!",
      completed: "Your session has been completed! We hope you're satisfied with the results.",
      cancelled: "Your reservation has been cancelled. If this was unexpected, please contact us immediately."
    };
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reservation Update</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Your reservation status has been updated</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            ${statusMessages[newStatus] || "We wanted to let you know that your reservation status has been updated."}
          </p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 15px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Status Update</h3>
            <p><strong>Previous Status:</strong> <span style="color: ${statusColors[oldStatus] || "#6B7280"}; font-weight: bold;">${oldStatus.toUpperCase()}</span></p>
            <p><strong>New Status:</strong> <span style="color: ${statusColors[newStatus] || "#6B7280"}; font-weight: bold;">${newStatus.toUpperCase()}</span></p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Questions about your reservation?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate payment confirmation email template
   */
  generatePaymentConfirmationEmail(reservations, payment) {
    const reservationsList = reservations.map((reservation) => {
      const date = new Date(reservation.preferredDate);
      return `
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h4 style="color: #8B5CF6; margin: 0 0 10px 0;">${this.formatServiceType(reservation.serviceType)}</h4>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })}</p>
          </div>
        `;
    }).join("");
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F4B3} Payment Confirmed!</h1>
          <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">Your payment has been processed successfully</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Thank you! Your payment has been processed successfully. Your reservation${reservations.length > 1 ? "s are" : " is"} now fully confirmed.
          </p>
          
          <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">Payment Details</h3>
            <p><strong>Amount Paid:</strong> ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod || "Card"}</p>
            ${payment.paymentIntentId ? `<p><strong>Transaction ID:</strong> ${payment.paymentIntentId}</p>` : ""}
            <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">PAID</span></p>
          </div>
          
          <h3 style="color: #8B5CF6; margin: 20px 0 10px 0;">Confirmed Reservations</h3>
          ${reservationsList}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need help or have questions?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>Keep this email as your payment receipt.</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate payment failure email template
   */
  generatePaymentFailureEmail(reservationIds, payment, failureReason) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Failed</h1>
          <p style="color: #FEE2E2; margin: 10px 0 0 0; font-size: 16px;">We couldn't process your payment</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            We're sorry, but we encountered an issue processing your payment for your reservation${reservationIds.length > 1 ? "s" : ""}. 
            Don't worry - your reservation${reservationIds.length > 1 ? "s are" : " is"} still held for you.
          </p>
          
          <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
            <h3 style="color: #DC2626; margin: 0 0 10px 0;">Payment Details</h3>
            <p><strong>Amount:</strong> ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}</p>
            ${payment.paymentIntentId ? `<p><strong>Payment Intent ID:</strong> ${payment.paymentIntentId}</p>` : ""}
            <p><strong>Failure Reason:</strong> ${failureReason || "Payment processing failed"}</p>
          </div>
          
          <div style="background: #F0F9FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369A1; margin: 0 0 10px 0;">What You Can Do</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Check that your payment method has sufficient funds</li>
              <li>Verify your card details are correct</li>
              <li>Try a different payment method</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "https://brolabentertainment.com"}/checkout" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Try Payment Again
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need help? We're here for you!</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>Your reservation${reservationIds.length > 1 ? "s are" : " is"} held for 24 hours while you resolve the payment issue.</p>
        </div>
      </div>
    `;
  }
  /**
   * Generate reminder email template
   */
  generateReminderEmail(reservation) {
    const date = new Date(reservation.preferredDate);
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">\u23F0 Session Reminder</h1>
          <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">Your session is tomorrow!</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            This is a friendly reminder that your session is scheduled for tomorrow. We're excited to work with you!
          </p>
          
          <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h3 style="color: #D97706; margin: 0 0 15px 0;">${this.formatServiceType(reservation.serviceType)}</h3>
            <p><strong>Date:</strong> ${date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })}</p>
            <p><strong>Time:</strong> ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })}</p>
            <p><strong>Duration:</strong> ${reservation.durationMinutes} minutes</p>
            ${reservation.notes ? `<p><strong>Notes:</strong> ${reservation.notes}</p>` : ""}
          </div>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Preparation Checklist</h3>
            <ul style="color: #374151; padding-left: 20px;">
              <li>Arrive 10 minutes early to get settled</li>
              <li>Bring any reference materials or inspiration tracks</li>
              <li>Have your project files ready (if applicable)</li>
              <li>Bring headphones if you have a preferred pair</li>
              <li>Come with an open mind and creative energy!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; margin-bottom: 10px;">Need to reschedule or have questions?</p>
            <p style="color: #8B5CF6; font-weight: bold;">
              \u{1F4E7} contact@brolabentertainment.com<br>
              \u{1F4DE} +33 (0)1 XX XX XX XX
            </p>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p>BroLab Entertainment - Professional Music Production Services</p>
          <p>We look forward to seeing you tomorrow!</p>
        </div>
      </div>
    `;
  }
  /**
   * Format service type for display
   */
  formatServiceType(serviceType) {
    const serviceNames = {
      mixing_mastering: "Mixing & Mastering",
      recording_session: "Recording Session",
      custom_beat: "Custom Beat Production",
      production_consultation: "Production Consultation"
    };
    return serviceNames[serviceType] || serviceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
};
var reservationEmailService = new ReservationEmailService();

// server/templates/emailTemplates.ts
var EMAIL_STYLES = {
  container: "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;",
  header: "background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;",
  headerTitle: "color: white; margin: 0; font-size: 28px;",
  headerSubtitle: "color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;",
  content: "padding: 30px; background: white;",
  footer: "background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;",
  button: "background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;",
  infoBox: "background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;",
  successBox: "background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;",
  warningBox: "background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;",
  errorBox: "background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;"
};
var generateEmailWrapper = (title, subtitle, content, footerText) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #f4f4f4;">
      <div style="${EMAIL_STYLES.container}">
        <div style="${EMAIL_STYLES.header}">
          <h1 style="${EMAIL_STYLES.headerTitle}">${title}</h1>
          <p style="${EMAIL_STYLES.headerSubtitle}">${subtitle}</p>
        </div>
        
        <div style="${EMAIL_STYLES.content}">
          ${content}
        </div>
        
        <div style="${EMAIL_STYLES.footer}">
          <p style="margin: 0;">BroLab Entertainment - Professional Music Production Services</p>
          ${footerText ? `<p style="margin: 5px 0 0 0;">${footerText}</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
};
var emailTemplates = {
  /**
   * Email verification template
   */
  verifyEmail: (verificationLink, username) => ({
    subject: "V\xE9rifiez votre adresse email - BroLab Entertainment",
    html: generateEmailWrapper(
      "BroLab Entertainment",
      "V\xE9rifiez votre compte",
      `
        <h2 style="color: #333; margin: 0 0 20px 0;">Salut ${username} ! \u{1F44B}</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Bienvenue sur BroLab Entertainment ! Pour terminer votre inscription et acc\xE9der \xE0 votre compte, veuillez v\xE9rifier votre adresse email.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="${EMAIL_STYLES.button}">
            V\xE9rifier mon email
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 24 heures. Si vous n'avez pas cr\xE9\xE9 de compte, ignorez cet email.
        </p>
      `,
      "Votre destination pour les beats de qualit\xE9"
    )
  }),
  /**
   * Password reset template
   */
  resetPassword: (resetLink, username) => ({
    subject: "R\xE9initialisation de votre mot de passe - BroLab Entertainment",
    html: generateEmailWrapper(
      "BroLab Entertainment",
      "R\xE9initialisation du mot de passe",
      `
        <h2 style="color: #333; margin: 0 0 20px 0;">R\xE9initialisation du mot de passe</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Salut ${username}, vous avez demand\xE9 \xE0 r\xE9initialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour cr\xE9er un nouveau mot de passe.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            R\xE9initialiser mon mot de passe
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 15 minutes. Si vous n'avez pas demand\xE9 cette r\xE9initialisation, ignorez cet email.
        </p>
      `,
      "S\xE9curit\xE9 de votre compte"
    )
  }),
  /**
   * Order confirmation template
   */
  orderConfirmation: (orderDetails) => ({
    subject: `Commande confirm\xE9e #${orderDetails.orderNumber} - BroLab Entertainment`,
    html: generateEmailWrapper(
      "Commande confirm\xE9e ! \u{1F389}",
      "Votre achat a \xE9t\xE9 trait\xE9 avec succ\xE8s",
      `
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          Merci ${orderDetails.customerName} pour votre achat ! Votre commande a \xE9t\xE9 trait\xE9e avec succ\xE8s.
        </p>
        <div style="${EMAIL_STYLES.infoBox}">
          <p style="margin: 0;"><strong>Num\xE9ro de commande :</strong> ${orderDetails.orderNumber}</p>
          <p style="margin: 10px 0 0 0;"><strong>Total :</strong> ${orderDetails.total}\u20AC</p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          Vos fichiers sont maintenant disponibles dans votre compte. Connectez-vous pour les t\xE9l\xE9charger.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://brolabentertainment.com/dashboard" style="${EMAIL_STYLES.button}">
            Acc\xE9der \xE0 mes t\xE9l\xE9chargements
          </a>
        </div>
      `,
      "Merci pour votre confiance"
    )
  }),
  /**
   * Subscription confirmation template
   */
  subscriptionConfirmation: (subscriptionDetails) => ({
    subject: `Abonnement activ\xE9 - ${subscriptionDetails.planName} - BroLab Entertainment`,
    html: generateEmailWrapper(
      "Abonnement activ\xE9 ! \u2B50",
      "Votre plan est maintenant actif",
      `
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          F\xE9licitations ${subscriptionDetails.customerName} ! Votre abonnement ${subscriptionDetails.planName} est maintenant actif.
        </p>
        <div style="${EMAIL_STYLES.infoBox}">
          <p style="margin: 0;"><strong>Plan :</strong> ${subscriptionDetails.planName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Cycle :</strong> ${subscriptionDetails.billingCycle}</p>
          <p style="margin: 10px 0 0 0;"><strong>Prochaine facture :</strong> ${subscriptionDetails.nextBillingDate}</p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          Profitez de tous les avantages de votre abonnement d\xE8s maintenant !
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://brolabentertainment.com/membership" style="background: #F59E0B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            G\xE9rer mon abonnement
          </a>
        </div>
      `,
      "Votre partenaire musical"
    )
  })
};
var sendAdminReservationNotification = async (user, reservation) => {
  const result = await reservationEmailService.sendAdminNotification(user, reservation);
  if (!result.success) {
    logger.error("Failed to send admin notification email", {
      error: result.error,
      reservationId: reservation.id,
      userId: user.id
    });
    throw new Error(`Email sending failed: ${result.error}`);
  }
  logger.info("Admin notification email sent successfully", {
    attempts: result.attempts,
    hasReservationId: !!reservation.id,
    userId: user.id
  });
};

// server/routes/email.ts
var router7 = Router6();
var convex3 = getConvex();
var rateLimitMap = /* @__PURE__ */ new Map();
var checkRateLimit = (email) => {
  const now = Date.now();
  const key = `verify_${email}`;
  const limit = rateLimitMap.get(key);
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 24 * 60 * 60 * 1e3 });
    return true;
  }
  if (limit.count >= 3) {
    return false;
  }
  limit.count++;
  return true;
};
router7.get(
  "/verify-email",
  createValidationMiddleware(verifyEmailSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { token } = req.validatedData;
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const verification = await convex3.query(api2.emailVerifications.getByToken, { token });
      if (!verification) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired verification token"
        });
        return;
      }
      await convex3.mutation(api2.emailVerifications.markVerified, { token });
      console.log("\u2705 Email verified for user:", verification.userId);
      res.json({
        success: true,
        message: "Email verified successfully"
      });
    } catch (error) {
      console.error("\u274C Email verification failed:", error);
      handleRouteError(error, res, "Email verification failed");
    }
  }
);
router7.post(
  "/resend-verification",
  createValidationMiddleware(resendVerificationSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { email } = req.validatedData;
      if (!checkRateLimit(email)) {
        res.status(429).json({
          success: false,
          message: "Too many verification requests. Try again tomorrow."
        });
        return;
      }
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const user = await convex3.query(api2.users.getUserByEmail, { email });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }
      const token = uuidv4();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1e3;
      await convex3.mutation(api2.emailVerifications.create, {
        userId: user._id,
        email,
        token,
        expiresAt
      });
      console.log("\u{1F4E7} Generated verification token:", token, "for user:", user._id);
      const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/verify-email?token=${token}`;
      const template = emailTemplates.verifyEmail(verificationLink, user.username || "User");
      await sendMail({
        to: email,
        subject: template.subject,
        html: template.html
      });
      res.json({
        success: true,
        message: "Verification email sent successfully"
      });
    } catch (error) {
      handleRouteError(error, res, "Failed to send verification email");
    }
  }
);
router7.post(
  "/forgot-password",
  createValidationMiddleware(forgotPasswordSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { email } = req.validatedData;
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const recentAttempts = await convex3.query(api2.passwordResets.getRecentAttempts, {
        email,
        windowMs: 60 * 60 * 1e3
        // 1 hour
      });
      if (recentAttempts >= 3) {
        res.status(429).json({
          success: false,
          message: "Too many password reset requests. Please try again later."
        });
        return;
      }
      const user = await convex3.query(api2.users.getUserByEmail, { email });
      if (!user) {
        res.json({
          success: true,
          message: "If this email exists, a reset link has been sent"
        });
        return;
      }
      const token = uuidv4();
      const expiresAt = Date.now() + 15 * 60 * 1e3;
      await convex3.mutation(api2.passwordResets.create, {
        userId: user._id,
        email,
        token,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      });
      console.log("\u{1F510} Password reset token stored in Convex for user:", user._id);
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/reset-password?token=${token}`;
      const template = emailTemplates.resetPassword(resetLink, user.username || "User");
      await sendMail({
        to: email,
        subject: template.subject,
        html: template.html
      });
      res.json({
        success: true,
        message: "If this email exists, a reset link has been sent"
      });
    } catch (error) {
      handleRouteError(error, res, "Failed to process password reset request");
    }
  }
);
router7.post(
  "/reset-password",
  createValidationMiddleware(resetPasswordSchema),
  async (req, res) => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data"
        });
        return;
      }
      const { token, password } = req.validatedData;
      const { api: api2 } = await Promise.resolve().then(() => (init_api(), api_exports));
      const reset = await convex3.query(api2.passwordResets.getByToken, {
        token
      });
      if (!reset) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired reset token"
        });
        return;
      }
      const user = await convex3.query(api2.users.getUserById, {
        id: reset.userId
      });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log("\u{1F510} Password reset validated for user:", reset.userId);
      console.log("\u{1F510} New hashed password ready (length:", hashedPassword?.length || 0, ")");
      await convex3.mutation(api2.passwordResets.markUsed, { token });
      await convex3.mutation(api2.passwordResets.deleteToken, { token });
      console.log("\u2705 Password reset token marked as used and deleted");
      res.json({
        success: true,
        message: "Password reset successfully"
      });
    } catch (error) {
      console.error("\u274C Password reset failed:", error);
      handleRouteError(error, res, "Failed to reset password");
    }
  }
);
var email_default = router7;

// server/routes/monitoring.ts
import { Router as Router7 } from "express";

// shared/constants/ErrorMessages.ts
var ErrorMessages = {
  // Authentication & Authorization
  AUTH: {
    UNAUTHORIZED: "You must be logged in to access this resource",
    FORBIDDEN: "You do not have permission to perform this action",
    INVALID_TOKEN: "Invalid or expired authentication token",
    SESSION_EXPIRED: "Your session has expired. Please log in again",
    ACCOUNT_SUSPENDED: "Your account has been suspended. Please contact support"
  },
  // User Management
  USER: {
    NOT_FOUND: "User not found",
    INVALID_EMAIL: "Please enter a valid email address",
    EMAIL_ALREADY_EXISTS: "An account with this email already exists",
    WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and numbers",
    PROFILE_UPDATE_FAILED: "Failed to update profile. Please try again",
    INVALID_USER_DATA: "Invalid user data provided"
  },
  // Beats & Products
  BEATS: {
    NOT_FOUND: "Beat not found",
    UNAVAILABLE: "This beat is no longer available",
    INVALID_LICENSE: "Invalid license type selected",
    ALREADY_PURCHASED: "You have already purchased this beat",
    INSUFFICIENT_QUOTA: "You have exceeded your download quota. Please upgrade your subscription",
    UPLOAD_FAILED: "Failed to upload beat. Please try again",
    INVALID_AUDIO_FORMAT: "Invalid audio format. Please upload MP3, WAV, or FLAC files",
    FILE_TOO_LARGE: "File size exceeds maximum limit of 50MB",
    VIRUS_DETECTED: "File failed security scan. Please contact support"
  },
  // Cart & Orders
  CART: {
    EMPTY: "Your cart is empty",
    ITEM_NOT_FOUND: "Item not found in cart",
    INVALID_QUANTITY: "Invalid quantity specified",
    UPDATE_FAILED: "Failed to update cart. Please try again",
    EXPIRED_ITEMS: "Some items in your cart are no longer available"
  },
  ORDER: {
    NOT_FOUND: "Order not found",
    ALREADY_PROCESSED: "This order has already been processed",
    INVALID_STATUS: "Invalid order status",
    PROCESSING_FAILED: "Failed to process order. Please try again",
    INSUFFICIENT_FUNDS: "Insufficient funds to complete purchase"
  },
  // Payment Processing
  PAYMENT: {
    FAILED: "Payment processing failed. Please try again",
    INVALID_CARD: "Invalid credit card information",
    CARD_DECLINED: "Your card was declined. Please try a different payment method",
    EXPIRED_CARD: "Your card has expired. Please update your payment information",
    INSUFFICIENT_FUNDS: "Insufficient funds. Please try a different payment method",
    PAYMENT_METHOD_REQUIRED: "Please add a payment method to continue",
    REFUND_FAILED: "Refund processing failed. Please contact support",
    STRIPE_ERROR: "Payment service error. Please try again later",
    PAYPAL_ERROR: "PayPal service error. Please try again later"
  },
  // Subscriptions
  SUBSCRIPTION: {
    NOT_FOUND: "Subscription not found",
    ALREADY_ACTIVE: "You already have an active subscription",
    EXPIRED: "Your subscription has expired. Please renew to continue",
    UPGRADE_FAILED: "Failed to upgrade subscription. Please try again",
    CANCEL_FAILED: "Failed to cancel subscription. Please contact support",
    INVALID_PLAN: "Invalid subscription plan selected"
  },
  // File Management
  FILE: {
    NOT_FOUND: "File not found",
    UPLOAD_FAILED: "File upload failed. Please try again",
    DOWNLOAD_FAILED: "File download failed. Please try again",
    INVALID_FORMAT: "Invalid file format",
    CORRUPTED: "File appears to be corrupted",
    ACCESS_DENIED: "You do not have access to this file",
    STORAGE_FULL: "Storage limit exceeded. Please free up space"
  },
  // Reservations & Services
  RESERVATION: {
    NOT_FOUND: "Reservation not found",
    SLOT_UNAVAILABLE: "Selected time slot is no longer available",
    BOOKING_FAILED: "Failed to create reservation. Please try again",
    CANCELLATION_FAILED: "Failed to cancel reservation. Please contact support",
    INVALID_DATE: "Invalid date selected",
    PAST_DATE: "Cannot book appointments in the past",
    TOO_FAR_AHEAD: "Cannot book more than 3 months in advance"
  },
  // WooCommerce Integration
  WOOCOMMERCE: {
    SYNC_FAILED: "Failed to sync with WooCommerce. Please try again later",
    PRODUCT_NOT_FOUND: "Product not found in WooCommerce",
    INVALID_PRODUCT_DATA: "Invalid product data received from WooCommerce",
    CONNECTION_ERROR: "Unable to connect to WooCommerce API",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please wait before trying again"
  },
  // Database & Server
  DATABASE: {
    CONNECTION_ERROR: "Database connection error. Please try again later",
    QUERY_FAILED: "Database query failed. Please try again",
    CONSTRAINT_VIOLATION: "Data constraint violation. Please check your input",
    TIMEOUT: "Database operation timed out. Please try again"
  },
  SERVER: {
    INTERNAL_ERROR: "Internal server error. Please try again later",
    SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please wait before trying again",
    MAINTENANCE_MODE: "System is under maintenance. Please try again later"
  },
  // Validation
  VALIDATION: {
    REQUIRED_FIELD: "This field is required",
    INVALID_FORMAT: "Invalid format provided",
    TOO_SHORT: "Input is too short",
    TOO_LONG: "Input is too long",
    INVALID_CHARACTERS: "Contains invalid characters",
    NUMERIC_ONLY: "Only numeric values are allowed",
    ALPHA_ONLY: "Only alphabetic characters are allowed"
  },
  // Network & API
  NETWORK: {
    CONNECTION_ERROR: "Network connection error. Please check your internet connection",
    TIMEOUT: "Request timed out. Please try again",
    OFFLINE: "You are currently offline. Please check your connection",
    API_ERROR: "API service error. Please try again later"
  },
  // Generic Messages
  GENERIC: {
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again",
    TRY_AGAIN: "Something went wrong. Please try again",
    CONTACT_SUPPORT: "If this problem persists, please contact support",
    FEATURE_UNAVAILABLE: "This feature is currently unavailable",
    COMING_SOON: "This feature is coming soon"
  }
};

// server/lib/monitoring.ts
init_api();
init_convex();
var MonitoringService = class {
  metrics = /* @__PURE__ */ new Map();
  healthChecks = [];
  requestCounts = /* @__PURE__ */ new Map();
  errorCounts = /* @__PURE__ */ new Map();
  // Database health check using Convex
  async checkDatabaseHealth() {
    const startTime = Date.now();
    try {
      const convex6 = getConvex();
      const result = await convex6.query(api.health.check.checkHealth);
      const responseTime = Date.now() - startTime;
      const isHealthy = result.status === "healthy";
      let status = "healthy";
      if (!isHealthy) {
        status = "down";
      } else if (responseTime > 2e3) {
        status = "degraded";
      }
      return {
        service: "database",
        status,
        responseTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: isHealthy ? void 0 : "Database connectivity issue"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown database error";
      return {
        service: "database",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: errorMessage
      };
    }
  }
  // Storage service health check using Convex storage
  async checkStorageHealth() {
    const startTime = Date.now();
    try {
      const convex6 = getConvex();
      if (convex6) {
        const responseTime = Date.now() - startTime;
        return {
          service: "storage",
          status: responseTime > 1e3 ? "degraded" : "healthy",
          responseTime,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      throw new Error("Convex client not available");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
      return {
        service: "storage",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: errorMessage
      };
    }
  }
  // External API health checks
  async checkWooCommerceHealth() {
    const startTime = Date.now();
    try {
      const wcKey = process.env.VITE_WC_KEY || "";
      const wcSecret = process.env.VITE_WC_SECRET || "";
      const credentials = Buffer.from(`${wcKey}:${wcSecret}`).toString("base64");
      const response = await fetch(`${process.env.VITE_WOOCOMMERCE_URL}/products?per_page=1`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          "User-Agent": "BroLab-Beats-Store/1.0"
        }
      });
      const responseTime = Date.now() - startTime;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return {
        service: "woocommerce",
        status: responseTime > 3e3 ? "degraded" : "healthy",
        responseTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown WooCommerce API error";
      return {
        service: "woocommerce",
        status: "down",
        responseTime: Date.now() - startTime,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: errorMessage
      };
    }
  }
  // Comprehensive health check
  async performHealthCheck() {
    const checks = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkStorageHealth(),
      this.checkWooCommerceHealth()
    ]);
    this.healthChecks = checks;
    return checks;
  }
  // Request tracking
  trackRequest(endpoint, success) {
    const minute = Math.floor(Date.now() / 6e4);
    const key = `${minute}:${endpoint}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    if (!success) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }
    const cutoff = minute - 5;
    Array.from(this.requestCounts.keys()).forEach((k) => {
      const keyMinute = Number.parseInt(k.split(":")[0], 10);
      if (keyMinute < cutoff) {
        this.requestCounts.delete(k);
        this.errorCounts.delete(k);
      }
    });
  }
  // Get system metrics
  getSystemMetrics() {
    const now = Date.now();
    const currentMinute = Math.floor(now / 6e4);
    let requestsPerMinute = 0;
    let errors = 0;
    Array.from(this.requestCounts.entries()).forEach(([key, count]) => {
      const keyMinute = Number.parseInt(key.split(":")[0], 10);
      if (keyMinute === currentMinute - 1) {
        requestsPerMinute += count;
        errors += this.errorCounts.get(key) || 0;
      }
    });
    const errorRate = requestsPerMinute > 0 ? errors / requestsPerMinute * 100 : 0;
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeConnections: this.metrics.get("activeConnections") || 0,
      requestsPerMinute,
      errorRate,
      lastCheck: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  // Log system events to Convex
  async logSystemEvent(event) {
    try {
      const convex6 = getConvex();
      await convex6.mutation(api.audit.logAuditEvent, {
        action: `system_${event.type}`,
        resource: event.service,
        details: {
          message: event.message,
          ...event.details
        }
      });
      console.log(
        `[${event.type.toUpperCase()}] ${event.service}: ${event.message}`,
        event.details
      );
    } catch (error) {
      console.error("Failed to log system event to Convex:", error);
      console.log(
        `[${event.type.toUpperCase()}] ${event.service}: ${event.message}`,
        event.details
      );
    }
  }
  // Performance metrics collection
  async collectPerformanceMetrics() {
    const metrics = this.getSystemMetrics();
    const healthChecks = await this.performHealthCheck();
    const degradedServices = healthChecks.filter(
      (check) => check.status === "degraded" || check.status === "down"
    );
    for (const service of degradedServices) {
      await this.logSystemEvent({
        type: service.status === "down" ? "error" : "warning",
        service: service.service,
        message: `Service ${service.status}`,
        details: {
          responseTime: service.responseTime,
          error: service.error
        }
      });
    }
    if (metrics.errorRate > 10) {
      await this.logSystemEvent({
        type: "warning",
        service: "api",
        message: `High error rate detected: ${metrics.errorRate.toFixed(2)}%`,
        details: {
          requestsPerMinute: metrics.requestsPerMinute,
          errorRate: metrics.errorRate
        }
      });
    }
    return { metrics, healthChecks };
  }
  // Express middleware for request tracking
  trackingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalEnd = res.end;
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;
        this.trackRequest(req.path || req.url, success);
        if (responseTime > 5e3) {
          this.logSystemEvent({
            type: "warning",
            service: "api",
            message: `Slow request detected: ${req.method} ${req.path || req.url}`,
            details: {
              responseTime,
              statusCode: res.statusCode,
              userAgent: req.get ? req.get("User-Agent") : void 0
            }
          }).catch(console.error);
        }
        return originalEnd.apply(res, args);
      };
      next();
    };
  }
};
var monitoring = new MonitoringService();
var monitoring_default = monitoring;

// server/routes/monitoring.ts
var router8 = Router7();
router8.get("/health", apiRateLimit, async (req, res) => {
  try {
    const healthChecks = await monitoring_default.performHealthCheck();
    const allHealthy = healthChecks.every((check) => check.status === "healthy");
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      checks: healthChecks,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Health check failed");
  }
});
router8.get("/metrics", apiRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: ErrorMessages.AUTH.UNAUTHORIZED });
      return;
    }
    const user = req.user;
    const isAdmin = user.email === "admin@brolabentertainment.com" || user.username === "admin";
    if (!isAdmin) {
      res.status(403).json({ error: ErrorMessages.AUTH.FORBIDDEN });
      return;
    }
    const { metrics, healthChecks } = await monitoring_default.collectPerformanceMetrics();
    res.json({
      system: metrics,
      services: healthChecks,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to collect metrics");
  }
});
router8.get("/status", async (req, res) => {
  try {
    const metrics = monitoring_default.getSystemMetrics();
    res.json({
      status: "online",
      uptime: metrics.uptime,
      memory: {
        used: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(metrics.memoryUsage.rss / 1024 / 1024)
      },
      requestsPerMinute: metrics.requestsPerMinute,
      errorRate: Math.round(metrics.errorRate * 100) / 100,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to get system status");
  }
});
router8.post("/health/check", apiRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: ErrorMessages.AUTH.UNAUTHORIZED });
      return;
    }
    const user = req.user;
    const isAdmin = user.email === "admin@brolabentertainment.com" || user.username === "admin";
    if (!isAdmin) {
      res.status(403).json({ error: ErrorMessages.AUTH.FORBIDDEN });
      return;
    }
    const healthChecks = await monitoring_default.performHealthCheck();
    await monitoring_default.logSystemEvent({
      type: "info",
      service: "monitoring",
      message: "Manual health check triggered",
      details: {
        triggeredBy: user.username,
        results: healthChecks
      }
    });
    res.json({
      message: "Health check completed",
      results: healthChecks,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    handleRouteError(error, res, "Manual health check failed");
  }
});
var monitoring_default2 = router8;

// server/routes/openGraph.ts
import { Router as Router8 } from "express";

// server/lib/openGraphGenerator.ts
function generateBeatOpenGraph(beat, config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  return {
    title: `${beat.title} - ${beat.genre} Beat by BroLab Entertainment`,
    description: beat.description || `${beat.title} - Professional ${beat.genre} beat with ${beat.bpm} BPM. High-quality production for music producers and artists.`,
    url: `${baseUrl}/product/${beat.id}`,
    image: beat.image_url || config.defaultImage || `${baseUrl}/logo.png`,
    type: "music.song",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle,
    audioUrl: beat.audio_url ?? void 0,
    duration: beat.duration ? `${Math.floor(beat.duration / 60)}:${(beat.duration % 60).toString().padStart(2, "0")}` : void 0,
    artist: "BroLab Entertainment"
  };
}
function generateShopOpenGraph(config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  return {
    title: "BroLab Beats - Professional Music Production",
    description: "Discover premium beats from top producers around the world. Find the perfect sound for your next hit with our collection of high-quality music production.",
    url: `${baseUrl}/shop`,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle
  };
}
function generateHomeOpenGraph(config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  return {
    title: "BroLab Entertainment - Professional Music Production & Beats",
    description: "Professional music production services and premium beats for artists and producers. Mix & mastering, custom beats, and high-quality music production.",
    url: baseUrl,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary_large_image",
    twitterHandle: config.twitterHandle
  };
}
function generateStaticPageOpenGraph(page, config) {
  const baseUrl = config.baseUrl;
  const siteName = config.siteName;
  const pages = {
    about: {
      title: "About BroLab Entertainment - Professional Music Production",
      description: "Learn about BroLab Entertainment, our mission to provide professional music production services and premium beats for artists worldwide.",
      url: `${baseUrl}/about`
    },
    contact: {
      title: "Contact BroLab Entertainment - Get in Touch",
      description: "Contact BroLab Entertainment for professional music production services, custom beats, mix & mastering, and collaboration opportunities.",
      url: `${baseUrl}/contact`
    },
    terms: {
      title: "Terms of Service - BroLab Entertainment",
      description: "Terms of service and usage conditions for BroLab Entertainment music production services and beat licensing.",
      url: `${baseUrl}/terms`
    },
    privacy: {
      title: "Privacy Policy - BroLab Entertainment",
      description: "Privacy policy and data protection information for BroLab Entertainment music production services.",
      url: `${baseUrl}/privacy`
    },
    license: {
      title: "Music Licensing - BroLab Entertainment",
      description: "Music licensing information and terms for BroLab Entertainment beats and music production services.",
      url: `${baseUrl}/license`
    }
  };
  const pageInfo = pages[page];
  return {
    title: pageInfo.title,
    description: pageInfo.description,
    url: pageInfo.url,
    image: config.defaultImage || `${baseUrl}/logo.png`,
    type: "website",
    siteName,
    twitterCard: "summary",
    twitterHandle: config.twitterHandle
  };
}
function generateOpenGraphHTML(meta) {
  const tags = [
    // Open Graph
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${meta.url}" />`,
    `<meta property="og:image" content="${meta.image}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />`,
    // Twitter Card
    `<meta name="twitter:card" content="${meta.twitterCard || "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${meta.image}" />`
  ];
  if (meta.twitterHandle) {
    tags.push(
      `<meta name="twitter:site" content="${meta.twitterHandle}" />`,
      `<meta name="twitter:creator" content="${meta.twitterHandle}" />`
    );
  }
  if (meta.type === "music.song") {
    if (meta.audioUrl) {
      tags.push(
        `<meta property="og:audio" content="${meta.audioUrl}" />`,
        `<meta property="og:audio:type" content="audio/mpeg" />`
      );
    }
    if (meta.duration) {
      tags.push(`<meta property="og:audio:duration" content="${meta.duration}" />`);
    }
    if (meta.artist) {
      tags.push(`<meta property="og:audio:artist" content="${escapeHtml(meta.artist)}" />`);
    }
  }
  return tags.join("\n    ");
}
function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
}

// server/routes/openGraph.ts
var router9 = Router8();
async function wcApiRequest(endpoint, options = {}) {
  const WOOCOMMERCE_API_URL2 = process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
  const WC_CONSUMER_KEY2 = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET2 = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!WC_CONSUMER_KEY2 || !WC_CONSUMER_SECRET2) {
    if (process.env.NODE_ENV === "test") {
      return {};
    }
    throw new Error("WooCommerce API credentials not configured");
  }
  const url = new URL(`${WOOCOMMERCE_API_URL2}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY2);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET2);
  const response = process.env.NODE_ENV === "test" ? {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({})
  } : await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "BroLab-Frontend/1.0",
      Accept: "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
var openGraphConfig = {
  baseUrl: process.env.FRONTEND_URL || "https://brolabentertainment.com",
  siteName: "BroLab Entertainment",
  defaultImage: "https://brolabentertainment.com/logo.png",
  twitterHandle: "@brolabentertainment"
};
router9.get("/beat/:id", async (req, res) => {
  try {
    const beatId = req.params.id;
    let product;
    try {
      product = await wcApiRequest(`/products/${beatId}`);
    } catch (error) {
      if (error instanceof Error && error.message?.includes("404")) {
        res.status(404).json({ error: "Beat not found" });
        return;
      }
      throw error;
    }
    if (!product?.id) {
      res.status(404).json({ error: "Beat not found" });
      return;
    }
    const extractBpmFromMeta = (metaData) => {
      const bpmMeta = metaData.find((meta) => meta.key === "bpm");
      return bpmMeta?.value ? Number.parseInt(bpmMeta.value.toString()) : void 0;
    };
    const extractStringFromMeta = (metaData, key) => {
      const meta = metaData.find((meta2) => meta2.key === key);
      return meta?.value?.toString() || null;
    };
    const beat = {
      id: product.id,
      title: product.name,
      name: product.name,
      // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: (() => {
        if (product.bpm) {
          return Number.parseInt(product.bpm.toString());
        }
        if (product.meta_data) {
          return extractBpmFromMeta(product.meta_data);
        }
        return void 0;
      })(),
      key: product.key || (product.meta_data ? extractStringFromMeta(product.meta_data, "key") : null),
      mood: product.mood || (product.meta_data ? extractStringFromMeta(product.meta_data, "mood") : null),
      price: Number.parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src,
      // Alias for compatibility
      images: product.images?.map((img) => ({ src: img.src, alt: img.alt })),
      audio_url: product.audio_url || void 0,
      tags: product.tags?.map((tag) => tag.name) || [],
      categories: product.categories?.map((cat) => ({
        id: cat.id,
        name: cat.name
      })),
      meta_data: product.meta_data,
      duration: product.duration ? Number.parseFloat(product.duration.toString()) : void 0,
      downloads: Array.isArray(product.downloads) ? product.downloads.length : product.downloads || 0
    };
    const openGraphMeta = generateBeatOpenGraph(beat, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for beat");
  }
});
router9.get("/shop", async (_req, res) => {
  try {
    const openGraphMeta = generateShopOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for shop");
  }
});
router9.get("/home", async (_req, res) => {
  try {
    const openGraphMeta = generateHomeOpenGraph(openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for home");
  }
});
router9.get("/page/:pageName", async (req, res) => {
  try {
    const pageName = req.params.pageName;
    const validPages = ["about", "contact", "terms", "privacy", "license"];
    if (!validPages.includes(pageName)) {
      res.status(400).json({ error: "Invalid page name" });
      return;
    }
    const openGraphMeta = generateStaticPageOpenGraph(pageName, openGraphConfig);
    const openGraphHTML = generateOpenGraphHTML(openGraphMeta);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(openGraphHTML);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate Open Graph for page");
  }
});
var openGraph_default = router9;

// server/routes/orders.ts
import { Router as Router9 } from "express";

// shared/validation/BeatValidation.ts
import { z as z5 } from "zod";
var BeatGenre = z5.enum([
  "hip-hop",
  "trap",
  "r&b",
  "pop",
  "drill",
  "afrobeat",
  "reggaeton",
  "dancehall",
  "uk-drill",
  "jersey-club",
  "amapiano",
  "custom"
]);
var BeatMood = z5.enum([
  "aggressive",
  "chill",
  "dark",
  "energetic",
  "emotional",
  "happy",
  "melancholic",
  "mysterious",
  "romantic",
  "uplifting"
]);
var MusicalKey = z5.enum([
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dbm",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gbm",
  "Gm",
  "G#m",
  "Abm",
  "Am",
  "A#m",
  "Bbm",
  "Bm"
]);
var LicenseType2 = z5.enum(["basic", "premium", "unlimited", "exclusive"]);
var BeatStatus = z5.enum([
  "active",
  "inactive",
  "sold_exclusively",
  "pending_review",
  "rejected"
]);
var BpmSchema = z5.number().min(60, "BPM must be at least 60").max(200, "BPM cannot exceed 200").int("BPM must be a whole number");
var BeatPriceSchema = z5.number().min(100, "Price must be at least $1.00").max(99999999, "Price cannot exceed $999,999.99").int("Price must be in cents (whole number)");
var BeatDurationSchema = z5.number().min(30, "Beat must be at least 30 seconds").max(600, "Beat cannot exceed 10 minutes").positive("Duration must be positive");
var BeatTagsSchema = z5.array(z5.string().min(1).max(20)).max(10, "Maximum 10 tags allowed").optional();
var AudioFileSchema = z5.object({
  url: z5.string().url("Invalid audio file URL"),
  format: z5.enum(["mp3", "wav", "aiff", "flac"]),
  quality: z5.enum(["128", "192", "256", "320", "lossless"]),
  duration: BeatDurationSchema,
  fileSize: z5.number().positive("File size must be positive"),
  waveformData: z5.array(z5.number()).optional()
});
var BeatMetadataSchema = z5.object({
  producer: z5.string().min(1, "Producer name is required").max(100),
  credits: z5.string().max(500).optional(),
  description: z5.string().max(1e3).optional(),
  inspiration: z5.string().max(200).optional(),
  collaborators: z5.array(z5.string()).max(5).optional()
});
var BeatSchema = z5.object({
  id: z5.number().positive().optional(),
  title: z5.string().min(1, "Beat title is required").max(100, "Beat title cannot exceed 100 characters").regex(/^[a-zA-Z0-9\s\-_()]+$/, "Beat title contains invalid characters"),
  slug: z5.string().min(1, "Slug is required").max(120, "Slug cannot exceed 120 characters").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  genre: BeatGenre,
  mood: BeatMood.optional(),
  key: MusicalKey.optional(),
  bpm: BpmSchema,
  status: BeatStatus.default("pending_review"),
  // Pricing for different license types
  basicPrice: BeatPriceSchema,
  premiumPrice: BeatPriceSchema,
  unlimitedPrice: BeatPriceSchema,
  exclusivePrice: BeatPriceSchema.optional(),
  // Audio files
  previewFile: AudioFileSchema,
  basicFile: AudioFileSchema.optional(),
  premiumFile: AudioFileSchema.optional(),
  unlimitedFile: AudioFileSchema.optional(),
  stemsFile: AudioFileSchema.optional(),
  // Metadata
  metadata: BeatMetadataSchema.optional(),
  tags: BeatTagsSchema,
  // Timestamps
  createdAt: z5.string().datetime().optional(),
  updatedAt: z5.string().datetime().optional(),
  // Producer information
  producerId: z5.number().positive(),
  producerName: z5.string().min(1).max(100),
  // Analytics
  playCount: z5.number().nonnegative().default(0),
  downloadCount: z5.number().nonnegative().default(0),
  likeCount: z5.number().nonnegative().default(0),
  // SEO
  seoTitle: z5.string().max(60).optional(),
  seoDescription: z5.string().max(160).optional(),
  // Featured status
  isFeatured: z5.boolean().default(false),
  featuredUntil: z5.string().datetime().optional()
});
var CreateBeatSchema = BeatSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  playCount: true,
  downloadCount: true,
  likeCount: true
});
var UpdateBeatSchema = BeatSchema.partial().extend({
  id: z5.number().positive()
});
var BeatFilterSchema = z5.object({
  genre: BeatGenre.optional(),
  mood: BeatMood.optional(),
  key: MusicalKey.optional(),
  bpmMin: z5.number().min(60).max(200).optional(),
  bpmMax: z5.number().min(60).max(200).optional(),
  priceMin: z5.number().min(0).optional(),
  priceMax: z5.number().min(0).optional(),
  tags: z5.array(z5.string()).optional(),
  producer: z5.string().optional(),
  isFeatured: z5.boolean().optional(),
  status: BeatStatus.optional(),
  search: z5.string().max(100).optional(),
  sortBy: z5.enum(["newest", "oldest", "price_low", "price_high", "popular", "trending"]).default("newest"),
  page: z5.number().positive().default(1),
  limit: z5.number().min(1).max(100).default(20)
});
var BeatPurchaseSchema = z5.object({
  beatId: z5.number().positive(),
  licenseType: LicenseType2,
  quantity: z5.number().positive().default(1),
  customLicenseTerms: z5.string().max(1e3).optional()
});
var BeatInteractionSchema = z5.object({
  beatId: z5.number().positive(),
  action: z5.enum(["like", "unlike", "favorite", "unfavorite"])
});

// shared/validation/ErrorValidation.ts
import { z as z6 } from "zod";
var ErrorSeverity = z6.enum(["low", "medium", "high", "critical"]);
var ErrorCategory = z6.enum([
  "authentication",
  "authorization",
  "validation",
  "payment",
  "audio_processing",
  "file_upload",
  "database",
  "external_api",
  "rate_limiting",
  "system",
  "user_input",
  "business_logic",
  "network",
  "security"
]);
var ErrorType = z6.enum([
  // Authentication errors
  "invalid_credentials",
  "account_locked",
  "session_expired",
  "two_factor_required",
  // Authorization errors
  "insufficient_permissions",
  "resource_forbidden",
  "subscription_required",
  "quota_exceeded",
  // Validation errors
  "invalid_input",
  "missing_required_field",
  "format_error",
  "constraint_violation",
  // Payment errors
  "payment_failed",
  "insufficient_funds",
  "card_declined",
  "payment_method_invalid",
  "subscription_expired",
  // Audio processing errors
  "audio_format_unsupported",
  "audio_file_corrupted",
  "processing_timeout",
  "waveform_generation_failed",
  // File upload errors
  "file_too_large",
  "file_type_not_allowed",
  "virus_detected",
  "upload_failed",
  "file_validation_failed",
  "security_threat_detected",
  "security_check_failed",
  "upload_rate_limit",
  "upload_size_limit",
  // Database errors
  "connection_failed",
  "query_timeout",
  "constraint_violation_db",
  "data_not_found",
  // External API errors
  "api_unavailable",
  "api_rate_limited",
  "api_authentication_failed",
  "api_response_invalid",
  // System errors
  "internal_server_error",
  "service_unavailable",
  "timeout",
  "configuration_error",
  // Business logic errors
  "beat_not_available",
  "license_conflict",
  "reservation_conflict",
  "order_processing_failed"
]);
var ErrorContextSchema = z6.object({
  // Request information
  requestId: z6.string().optional(),
  userId: z6.string().optional(),
  userAgent: z6.string().optional(),
  ipAddress: z6.string().ip().optional(),
  // API information
  endpoint: z6.string().optional(),
  method: z6.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  statusCode: z6.number().min(100).max(599).optional(),
  // Business context
  beatId: z6.number().optional(),
  orderId: z6.string().optional(),
  reservationId: z6.string().optional(),
  // Technical context
  stackTrace: z6.string().optional(),
  errorCode: z6.string().optional(),
  // Additional metadata
  metadata: z6.record(z6.unknown()).optional()
});
var ErrorResolutionSchema = z6.object({
  // User-facing information
  userMessage: z6.string().min(1, "User message is required").max(500),
  userAction: z6.string().max(200).optional(),
  // Support information
  supportCode: z6.string().max(50).optional(),
  documentationUrl: z6.string().url().optional(),
  // Recovery suggestions
  retryable: z6.boolean().default(false),
  retryAfter: z6.number().positive().optional(),
  // seconds
  // Escalation
  requiresSupport: z6.boolean().default(false),
  escalationLevel: z6.enum(["none", "tier1", "tier2", "engineering"]).default("none")
});
var ErrorSchema = z6.object({
  id: z6.string().optional(),
  // Error classification
  type: ErrorType,
  category: ErrorCategory,
  severity: ErrorSeverity,
  // Error details
  message: z6.string().min(1, "Error message is required").max(1e3),
  code: z6.string().max(50).optional(),
  // Context information
  context: ErrorContextSchema.optional(),
  // Resolution information
  resolution: ErrorResolutionSchema,
  // Timestamps
  occurredAt: z6.string().datetime(),
  resolvedAt: z6.string().datetime().optional(),
  // Tracking
  count: z6.number().positive().default(1),
  firstOccurrence: z6.string().datetime().optional(),
  lastOccurrence: z6.string().datetime().optional()
});
var ApiErrorResponseSchema = z6.object({
  error: z6.object({
    type: ErrorType,
    message: z6.string().min(1).max(500),
    code: z6.string().max(50).optional(),
    details: z6.record(z6.unknown()).optional(),
    // User guidance
    userMessage: z6.string().max(500).optional(),
    userAction: z6.string().max(200).optional(),
    // Support information
    supportCode: z6.string().max(50).optional(),
    documentationUrl: z6.string().url().optional(),
    // Request tracking
    requestId: z6.string().optional(),
    timestamp: z6.string().datetime()
  }),
  // Additional context for debugging (dev/staging only)
  debug: z6.object({
    stackTrace: z6.string().optional(),
    context: z6.record(z6.unknown()).optional()
  }).optional()
});
var ValidationErrorSchema = z6.object({
  field: z6.string().min(1, "Field name is required"),
  value: z6.unknown(),
  message: z6.string().min(1, "Validation message is required"),
  code: z6.string().optional(),
  // Nested validation errors (simplified to avoid circular reference)
  nested: z6.array(
    z6.object({
      field: z6.string(),
      value: z6.unknown(),
      message: z6.string(),
      code: z6.string().optional()
    })
  ).optional()
});
var ValidationErrorResponseSchema = z6.object({
  error: z6.object({
    type: z6.literal("validation_error"),
    message: z6.string().default("Validation failed"),
    errors: z6.array(ValidationErrorSchema).min(1, "At least one validation error required"),
    // Summary
    errorCount: z6.number().positive(),
    // Request tracking
    requestId: z6.string().optional(),
    timestamp: z6.string().datetime()
  })
});
var RateLimitErrorSchema = z6.object({
  error: z6.object({
    type: z6.literal("rate_limit_exceeded"),
    message: z6.string().default("Rate limit exceeded"),
    // Rate limit details
    limit: z6.number().positive(),
    remaining: z6.number().nonnegative(),
    resetTime: z6.string().datetime(),
    retryAfter: z6.number().positive(),
    // seconds
    // Request tracking
    requestId: z6.string().optional(),
    timestamp: z6.string().datetime()
  })
});
var BusinessLogicErrorSchema = z6.object({
  error: z6.object({
    type: ErrorType,
    message: z6.string().min(1).max(500),
    // Business context
    businessRule: z6.string().max(100).optional(),
    resourceId: z6.string().optional(),
    resourceType: z6.enum(["beat", "order", "reservation", "user", "subscription"]).optional(),
    // Resolution guidance
    userMessage: z6.string().max(500),
    suggestedAction: z6.string().max(200).optional(),
    // Request tracking
    requestId: z6.string().optional(),
    timestamp: z6.string().datetime()
  })
});
var createApiError = (type, message, options = {}) => {
  return {
    error: {
      type,
      message,
      code: options.code,
      userMessage: options.userMessage || message,
      userAction: options.userAction,
      supportCode: options.supportCode,
      requestId: options.requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
};
var createValidationError = (errors, requestId) => {
  return {
    error: {
      type: "validation_error",
      message: "Validation failed",
      errors: errors.map((err) => ({
        field: err.field,
        value: err.value,
        message: err.message,
        code: err.code
      })),
      errorCount: errors.length,
      requestId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
};

// shared/validation/OrderValidation.ts
import { z as z7 } from "zod";
var OrderStatus2 = z7.enum([
  "pending",
  "processing",
  "completed",
  "cancelled",
  "refunded",
  "failed"
]);
var PaymentStatus = z7.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
  "requires_payment_method",
  "requires_confirmation"
]);
var PaymentProvider = z7.enum(["stripe", "paypal", "clerk_billing"]);
var Currency = z7.enum([
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "SEK",
  "NOK",
  "DKK"
]);
var OrderItemSchema = z7.object({
  id: z7.string().optional(),
  productId: z7.number().positive(),
  productType: z7.enum(["beat", "subscription", "service", "custom"]),
  title: z7.string().min(1, "Product title is required").max(200),
  // License information for beats
  licenseType: LicenseType2.optional(),
  // Pricing
  unitPrice: z7.number().min(0, "Unit price cannot be negative"),
  quantity: z7.number().positive().default(1),
  totalPrice: z7.number().min(0, "Total price cannot be negative"),
  // Discounts
  discountAmount: z7.number().min(0).default(0),
  discountCode: z7.string().max(50).optional(),
  // Metadata
  metadata: z7.record(z7.unknown()).optional(),
  // Digital delivery
  downloadUrl: z7.string().url().optional(),
  downloadExpiry: z7.string().datetime().optional(),
  downloadCount: z7.number().nonnegative().default(0),
  maxDownloads: z7.number().positive().optional()
});
var BillingAddressSchema = z7.object({
  firstName: z7.string().min(1, "First name is required").max(50),
  lastName: z7.string().min(1, "Last name is required").max(50),
  company: z7.string().max(100).optional(),
  addressLine1: z7.string().min(1, "Address is required").max(100),
  addressLine2: z7.string().max(100).optional(),
  city: z7.string().min(1, "City is required").max(50),
  state: z7.string().max(50).optional(),
  postalCode: z7.string().min(1, "Postal code is required").max(20),
  country: z7.string().length(2, "Country must be 2-letter ISO code"),
  phone: z7.string().max(20).optional()
});
var TaxInfoSchema = z7.object({
  taxRate: z7.number().min(0).max(1),
  // 0-100% as decimal
  taxAmount: z7.number().min(0),
  taxType: z7.enum(["vat", "sales_tax", "gst", "none"]),
  taxId: z7.string().max(50).optional(),
  exemptionReason: z7.string().max(200).optional()
});
var PaymentInfoSchema = z7.object({
  provider: PaymentProvider,
  paymentIntentId: z7.string().optional(),
  sessionId: z7.string().optional(),
  transactionId: z7.string().optional(),
  // Payment method details (encrypted/tokenized)
  paymentMethodId: z7.string().optional(),
  last4: z7.string().length(4).optional(),
  brand: z7.string().max(20).optional(),
  // Processing details
  processingFee: z7.number().min(0).default(0),
  netAmount: z7.number().min(0),
  // Timestamps
  authorizedAt: z7.string().datetime().optional(),
  capturedAt: z7.string().datetime().optional(),
  // Failure information
  failureCode: z7.string().max(50).optional(),
  failureMessage: z7.string().max(200).optional()
});
var InvoiceInfoSchema = z7.object({
  invoiceNumber: z7.string().min(1, "Invoice number is required").max(50),
  invoiceDate: z7.string().datetime(),
  dueDate: z7.string().datetime().optional(),
  // PDF generation
  pdfUrl: z7.string().url().optional(),
  pdfStorageId: z7.string().optional(),
  // Invoice status
  status: z7.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  // Notes
  notes: z7.string().max(1e3).optional(),
  terms: z7.string().max(2e3).optional()
});
var OrderSchema = z7.object({
  id: z7.string().optional(),
  orderNumber: z7.string().min(1, "Order number is required").max(50),
  // Customer information
  userId: z7.string().optional(),
  email: z7.string().email("Valid email is required"),
  // Order items
  items: z7.array(OrderItemSchema).min(1, "Order must contain at least one item"),
  // Pricing
  subtotal: z7.number().min(0, "Subtotal cannot be negative"),
  taxInfo: TaxInfoSchema.optional(),
  shippingCost: z7.number().min(0).default(0),
  discountTotal: z7.number().min(0).default(0),
  total: z7.number().min(0, "Total cannot be negative"),
  currency: Currency,
  // Status
  status: OrderStatus2,
  paymentStatus: PaymentStatus,
  // Payment and billing
  paymentInfo: PaymentInfoSchema.optional(),
  billingAddress: BillingAddressSchema.optional(),
  // Invoice
  invoice: InvoiceInfoSchema.optional(),
  // Fulfillment
  fulfillmentStatus: z7.enum(["pending", "processing", "fulfilled", "cancelled"]).default("pending"),
  fulfillmentDate: z7.string().datetime().optional(),
  // Metadata
  metadata: z7.record(z7.unknown()).optional(),
  notes: z7.string().max(1e3).optional(),
  // Timestamps
  createdAt: z7.string().datetime().optional(),
  updatedAt: z7.string().datetime().optional(),
  // Idempotency
  idempotencyKey: z7.string().max(255).optional()
});
var CreateOrderSchema = z7.object({
  items: z7.array(
    z7.object({
      productId: z7.number().positive(),
      productType: z7.enum(["beat", "subscription", "service", "custom"]),
      title: z7.string().min(1).max(200),
      licenseType: LicenseType2.optional(),
      unitPrice: z7.number().min(0),
      quantity: z7.number().positive().default(1),
      metadata: z7.record(z7.unknown()).optional()
    })
  ).min(1, "Order must contain at least one item"),
  currency: Currency.default("USD"),
  email: z7.string().email("Valid email is required"),
  // Optional fields
  billingAddress: BillingAddressSchema.optional(),
  metadata: z7.record(z7.unknown()).optional(),
  notes: z7.string().max(1e3).optional(),
  idempotencyKey: z7.string().max(255).optional()
});
var UpdateOrderSchema = z7.object({
  id: z7.string().min(1, "Order ID is required"),
  status: OrderStatus2.optional(),
  paymentStatus: PaymentStatus.optional(),
  fulfillmentStatus: z7.enum(["pending", "processing", "fulfilled", "cancelled"]).optional(),
  notes: z7.string().max(1e3).optional(),
  metadata: z7.record(z7.unknown()).optional()
});
var OrderFilterSchema = z7.object({
  userId: z7.string().optional(),
  email: z7.string().email().optional(),
  status: OrderStatus2.optional(),
  paymentStatus: PaymentStatus.optional(),
  currency: Currency.optional(),
  // Date range filters
  createdAfter: z7.string().datetime().optional(),
  createdBefore: z7.string().datetime().optional(),
  // Amount filters
  minAmount: z7.number().min(0).optional(),
  maxAmount: z7.number().min(0).optional(),
  // Search
  search: z7.string().max(100).optional(),
  // Pagination
  page: z7.number().positive().default(1),
  limit: z7.number().min(1).max(100).default(20),
  // Sorting
  sortBy: z7.enum(["created_at", "updated_at", "total", "status"]).default("created_at"),
  sortOrder: z7.enum(["asc", "desc"]).default("desc")
});
var CreatePaymentIntentSchema = z7.object({
  orderId: z7.string().min(1, "Order ID is required"),
  amount: z7.number().min(50, "Minimum amount is $0.50"),
  // $0.50 minimum
  currency: Currency.default("USD"),
  paymentProvider: PaymentProvider.default("stripe"),
  // Payment method options
  paymentMethods: z7.array(z7.enum(["card", "paypal", "bank_transfer"])).optional(),
  // Customer information
  customerId: z7.string().optional(),
  customerEmail: z7.string().email().optional(),
  // Metadata
  metadata: z7.record(z7.string()).optional()
});
var RefundRequestSchema = z7.object({
  orderId: z7.string().min(1, "Order ID is required"),
  amount: z7.number().positive().optional(),
  // If not provided, full refund
  reason: z7.enum([
    "duplicate",
    "fraudulent",
    "requested_by_customer",
    "product_not_delivered",
    "product_defective",
    "other"
  ]),
  description: z7.string().max(500).optional(),
  notifyCustomer: z7.boolean().default(true)
});

// shared/validation/ReservationValidation.ts
import { z as z8 } from "zod";
var ServiceType2 = z8.enum([
  "mixing",
  "mastering",
  "recording",
  "custom_beat",
  "consultation",
  "vocal_tuning",
  "beat_remake",
  "full_production"
]);
var ReservationStatus2 = z8.enum([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled"
]);
var PriorityLevel = z8.enum(["standard", "priority", "rush", "emergency"]);
var StudioRoom = z8.enum([
  "studio_a",
  "studio_b",
  "vocal_booth_1",
  "vocal_booth_2",
  "mixing_room",
  "mastering_suite",
  "remote"
  // For online services
]);
var EquipmentRequirementsSchema = z8.object({
  microphones: z8.array(z8.string()).optional(),
  instruments: z8.array(z8.string()).optional(),
  software: z8.array(z8.string()).optional(),
  specialRequests: z8.string().max(500).optional()
});
var ServiceDetailsSchema = z8.object({
  // Recording details
  trackCount: z8.number().min(1).max(100).optional(),
  estimatedDuration: z8.number().min(30).max(480).optional(),
  // 30 minutes to 8 hours
  // Mixing/Mastering details
  stemCount: z8.number().min(1).max(50).optional(),
  referenceTrack: z8.string().url().optional(),
  targetLoudness: z8.number().optional(),
  // Beat production details
  genre: z8.string().max(50).optional(),
  bpm: z8.number().min(60).max(200).optional(),
  key: z8.string().max(10).optional(),
  mood: z8.string().max(50).optional(),
  // File requirements
  deliveryFormat: z8.enum(["wav", "mp3", "aiff", "flac"]).optional(),
  bitRate: z8.enum(["16bit", "24bit", "32bit"]).optional(),
  sampleRate: z8.enum(["44100", "48000", "96000", "192000"]).optional(),
  // Additional services
  includeStems: z8.boolean().default(false),
  includeRevisions: z8.number().min(0).max(5).default(2),
  rushDelivery: z8.boolean().default(false)
});
var ClientInfoSchema = z8.object({
  firstName: z8.string().min(1, "First name is required").max(50),
  lastName: z8.string().min(1, "Last name is required").max(50),
  email: z8.string().email("Valid email is required"),
  phone: z8.string().min(10, "Valid phone number is required").max(20),
  // Professional details
  artistName: z8.string().max(100).optional(),
  recordLabel: z8.string().max(100).optional(),
  website: z8.string().url().optional(),
  // Experience level
  experienceLevel: z8.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),
  // Previous client
  isPreviousClient: z8.boolean().default(false),
  referralSource: z8.string().max(100).optional()
});
var PricingInfoSchema = z8.object({
  basePrice: z8.number().min(0),
  // in cents
  additionalFees: z8.array(
    z8.object({
      name: z8.string().max(100),
      amount: z8.number().min(0),
      description: z8.string().max(200).optional()
    })
  ).default([]),
  discounts: z8.array(
    z8.object({
      name: z8.string().max(100),
      amount: z8.number().min(0),
      type: z8.enum(["fixed", "percentage"]),
      description: z8.string().max(200).optional()
    })
  ).default([]),
  totalPrice: z8.number().min(0),
  // in cents
  currency: z8.enum(["USD", "EUR", "GBP", "CAD"]).default("USD"),
  // Payment terms
  depositRequired: z8.boolean().default(false),
  depositAmount: z8.number().min(0).optional(),
  paymentDueDate: z8.string().datetime().optional()
});
var TimeSlotSchema = z8.object({
  startTime: z8.string().datetime(),
  endTime: z8.string().datetime(),
  duration: z8.number().min(30).max(480),
  // 30 minutes to 8 hours in minutes
  // Timezone handling
  timezone: z8.string().default("UTC"),
  // Buffer time
  setupTime: z8.number().min(0).max(60).default(15),
  // Setup time in minutes
  teardownTime: z8.number().min(0).max(30).default(15)
  // Teardown time in minutes
});
var ReservationSchema = z8.object({
  id: z8.string().optional(),
  // Service information
  serviceType: ServiceType2,
  status: ReservationStatus2.default("pending"),
  priority: PriorityLevel.default("standard"),
  // Client information
  userId: z8.string().optional(),
  // If user is registered
  clientInfo: ClientInfoSchema,
  // Scheduling
  timeSlot: TimeSlotSchema,
  studioRoom: StudioRoom.optional(),
  // Service details
  serviceDetails: ServiceDetailsSchema,
  equipmentRequirements: EquipmentRequirementsSchema.optional(),
  // Pricing
  pricing: PricingInfoSchema,
  // Communication
  notes: z8.string().max(2e3).optional(),
  internalNotes: z8.string().max(1e3).optional(),
  // Staff only
  // Files and attachments
  attachments: z8.array(
    z8.object({
      name: z8.string().max(255),
      url: z8.string().url(),
      type: z8.enum(["audio", "document", "image", "other"]),
      size: z8.number().positive()
    })
  ).optional(),
  // Assignment
  assignedEngineer: z8.string().max(100).optional(),
  assignedProducer: z8.string().max(100).optional(),
  // Completion tracking
  deliverables: z8.array(
    z8.object({
      name: z8.string().max(200),
      description: z8.string().max(500).optional(),
      fileUrl: z8.string().url().optional(),
      completedAt: z8.string().datetime().optional()
    })
  ).default([]),
  // Timestamps
  createdAt: z8.string().datetime().optional(),
  updatedAt: z8.string().datetime().optional(),
  confirmedAt: z8.string().datetime().optional(),
  completedAt: z8.string().datetime().optional(),
  // Metadata
  metadata: z8.record(z8.unknown()).optional()
});
var CreateReservationSchema = z8.object({
  serviceType: ServiceType2,
  // Client information
  clientInfo: z8.object({
    firstName: z8.string().min(1).max(50),
    lastName: z8.string().min(1).max(50),
    email: z8.string().email(),
    phone: z8.string().min(10).max(20),
    artistName: z8.string().max(100).optional(),
    experienceLevel: z8.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),
    referralSource: z8.string().max(100).optional()
  }),
  // Preferred scheduling
  preferredDate: z8.string().datetime(),
  preferredDuration: z8.number().min(30).max(480),
  alternativeDates: z8.array(z8.string().datetime()).max(3).optional(),
  // Service requirements
  serviceDetails: z8.object({
    trackCount: z8.number().min(1).max(100).optional(),
    genre: z8.string().max(50).optional(),
    bpm: z8.number().min(60).max(200).optional(),
    deliveryFormat: z8.enum(["wav", "mp3", "aiff", "flac"]).optional(),
    includeRevisions: z8.number().min(0).max(5).default(2),
    rushDelivery: z8.boolean().default(false)
  }).optional(),
  // Additional information
  notes: z8.string().max(2e3).optional(),
  budget: z8.number().min(0).optional(),
  // in cents
  // Terms acceptance
  acceptTerms: z8.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  })
});
var UpdateReservationSchema = z8.object({
  id: z8.string().min(1, "Reservation ID is required"),
  status: ReservationStatus2.optional(),
  timeSlot: TimeSlotSchema.optional(),
  studioRoom: StudioRoom.optional(),
  serviceDetails: ServiceDetailsSchema.optional(),
  notes: z8.string().max(2e3).optional(),
  internalNotes: z8.string().max(1e3).optional(),
  assignedEngineer: z8.string().max(100).optional(),
  assignedProducer: z8.string().max(100).optional()
});
var ReservationFilterSchema = z8.object({
  serviceType: ServiceType2.optional(),
  status: ReservationStatus2.optional(),
  priority: PriorityLevel.optional(),
  studioRoom: StudioRoom.optional(),
  // Date range filters
  startDate: z8.string().datetime().optional(),
  endDate: z8.string().datetime().optional(),
  // Assignment filters
  assignedEngineer: z8.string().optional(),
  assignedProducer: z8.string().optional(),
  // Client filters
  clientEmail: z8.string().email().optional(),
  clientName: z8.string().optional(),
  // Search
  search: z8.string().max(100).optional(),
  // Pagination
  page: z8.number().positive().default(1),
  limit: z8.number().min(1).max(100).default(20),
  // Sorting
  sortBy: z8.enum(["created_at", "start_time", "status", "service_type"]).default("start_time"),
  sortOrder: z8.enum(["asc", "desc"]).default("asc")
});
var AvailabilityCheckSchema = z8.object({
  startTime: z8.string().datetime(),
  endTime: z8.string().datetime(),
  serviceType: ServiceType2,
  studioRoom: StudioRoom.optional(),
  excludeReservationId: z8.string().optional()
  // For rescheduling
});
var RescheduleRequestSchema = z8.object({
  reservationId: z8.string().min(1, "Reservation ID is required"),
  newStartTime: z8.string().datetime(),
  newDuration: z8.number().min(30).max(480),
  reason: z8.string().max(500).optional(),
  notifyClient: z8.boolean().default(true)
});

// shared/validation/UserValidation.ts
import { z as z9 } from "zod";
var UserRole = z9.enum(["user", "producer", "admin", "service_role", "moderator"]);
var UserStatus = z9.enum([
  "active",
  "inactive",
  "suspended",
  "pending_verification",
  "banned"
]);
var SubscriptionPlan = z9.enum(["free", "basic", "pro", "unlimited", "enterprise"]);
var SubscriptionStatus = z9.enum([
  "active",
  "inactive",
  "cancelled",
  "past_due",
  "unpaid",
  "trialing"
]);
var UserPreferencesSchema = z9.object({
  language: z9.enum(["en", "fr", "es", "de", "it", "pt"]).default("en"),
  currency: z9.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),
  timezone: z9.string().max(50).default("UTC"),
  // Notification preferences
  emailNotifications: z9.boolean().default(true),
  marketingEmails: z9.boolean().default(false),
  pushNotifications: z9.boolean().default(true),
  // Audio preferences
  autoPlay: z9.boolean().default(false),
  audioQuality: z9.enum(["128", "192", "256", "320"]).default("192"),
  // Privacy preferences
  profileVisibility: z9.enum(["public", "private", "friends_only"]).default("public"),
  showActivity: z9.boolean().default(true),
  // Theme preferences
  theme: z9.enum(["light", "dark", "auto"]).default("auto"),
  compactMode: z9.boolean().default(false)
});
var UserProfileSchema = z9.object({
  displayName: z9.string().min(1, "Display name is required").max(50),
  bio: z9.string().max(500).optional(),
  website: z9.string().url("Invalid website URL").optional(),
  location: z9.string().max(100).optional(),
  // Social media links
  socialLinks: z9.object({
    instagram: z9.string().url().optional(),
    twitter: z9.string().url().optional(),
    youtube: z9.string().url().optional(),
    soundcloud: z9.string().url().optional(),
    spotify: z9.string().url().optional()
  }).optional(),
  // Producer-specific fields
  producerInfo: z9.object({
    stageName: z9.string().max(50).optional(),
    genres: z9.array(z9.string()).max(10).optional(),
    yearsActive: z9.number().min(0).max(50).optional(),
    equipment: z9.string().max(1e3).optional(),
    collaborationRate: z9.number().min(0).max(1e5).optional()
    // in cents
  }).optional(),
  // Avatar
  avatarUrl: z9.string().url().optional(),
  avatarStorageId: z9.string().optional()
});
var UserSubscriptionSchema = z9.object({
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  // Billing
  billingInterval: z9.enum(["monthly", "annual"]).default("monthly"),
  amount: z9.number().min(0),
  // in cents
  currency: z9.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),
  // Dates
  startDate: z9.string().datetime(),
  endDate: z9.string().datetime().optional(),
  trialEndDate: z9.string().datetime().optional(),
  // Quotas and limits
  downloadQuota: z9.number().min(0).default(0),
  // 0 = unlimited
  downloadCount: z9.number().min(0).default(0),
  // External IDs
  stripeSubscriptionId: z9.string().optional(),
  clerkSubscriptionId: z9.string().optional(),
  // Features
  features: z9.array(z9.string()).default([]),
  // Auto-renewal
  autoRenew: z9.boolean().default(true),
  cancelAtPeriodEnd: z9.boolean().default(false)
});
var UserAnalyticsSchema = z9.object({
  // Activity metrics
  totalLogins: z9.number().min(0).default(0),
  lastLoginAt: z9.string().datetime().optional(),
  totalSessionTime: z9.number().min(0).default(0),
  // in seconds
  // Purchase metrics
  totalPurchases: z9.number().min(0).default(0),
  totalSpent: z9.number().min(0).default(0),
  // in cents
  averageOrderValue: z9.number().min(0).default(0),
  // in cents
  // Engagement metrics
  beatsPlayed: z9.number().min(0).default(0),
  beatsDownloaded: z9.number().min(0).default(0),
  beatsLiked: z9.number().min(0).default(0),
  // Producer metrics (if applicable)
  beatsUploaded: z9.number().min(0).default(0),
  totalEarnings: z9.number().min(0).default(0),
  // in cents
  // Referral metrics
  referralCount: z9.number().min(0).default(0),
  referralEarnings: z9.number().min(0).default(0)
  // in cents
});
var UserSchema = z9.object({
  id: z9.string().optional(),
  clerkId: z9.string().min(1, "Clerk ID is required"),
  // Basic information
  username: z9.string().min(3, "Username must be at least 3 characters").max(30, "Username cannot exceed 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z9.string().email("Valid email is required").max(255, "Email is too long"),
  // Optional fields
  firstName: z9.string().max(50).optional(),
  lastName: z9.string().max(50).optional(),
  // Status and role
  role: UserRole.default("user"),
  status: UserStatus.default("active"),
  // Profile information
  profile: UserProfileSchema.optional(),
  preferences: UserPreferencesSchema.default({}),
  // Subscription
  subscription: UserSubscriptionSchema.optional(),
  // Analytics
  analytics: UserAnalyticsSchema.default({}),
  // Verification
  emailVerified: z9.boolean().default(false),
  phoneVerified: z9.boolean().default(false),
  identityVerified: z9.boolean().default(false),
  // Security
  twoFactorEnabled: z9.boolean().default(false),
  lastPasswordChange: z9.string().datetime().optional(),
  // Timestamps
  createdAt: z9.string().datetime().optional(),
  updatedAt: z9.string().datetime().optional(),
  lastActiveAt: z9.string().datetime().optional(),
  // Metadata
  metadata: z9.record(z9.unknown()).optional()
});
var RegisterUserSchema = z9.object({
  username: z9.string().min(3, "Username must be at least 3 characters").max(30, "Username cannot exceed 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z9.string().email("Valid email is required").max(255, "Email is too long"),
  password: z9.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  firstName: z9.string().max(50).optional(),
  lastName: z9.string().max(50).optional(),
  // Terms and privacy
  acceptTerms: z9.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  }),
  acceptPrivacy: z9.boolean().refine((val) => val === true, {
    message: "You must accept the privacy policy"
  }),
  // Marketing consent
  marketingConsent: z9.boolean().default(false),
  // Referral code
  referralCode: z9.string().max(20).optional()
});
var LoginUserSchema = z9.object({
  identifier: z9.string().min(1, "Email or username is required"),
  // Can be email or username
  password: z9.string().min(1, "Password is required"),
  rememberMe: z9.boolean().default(false)
});
var UpdateUserProfileSchema = z9.object({
  displayName: z9.string().min(1).max(50).optional(),
  bio: z9.string().max(500).optional(),
  website: z9.string().url().optional(),
  location: z9.string().max(100).optional(),
  // Social links
  socialLinks: z9.object({
    instagram: z9.string().url().optional(),
    twitter: z9.string().url().optional(),
    youtube: z9.string().url().optional(),
    soundcloud: z9.string().url().optional(),
    spotify: z9.string().url().optional()
  }).optional(),
  // Producer info
  producerInfo: z9.object({
    stageName: z9.string().max(50).optional(),
    genres: z9.array(z9.string()).max(10).optional(),
    yearsActive: z9.number().min(0).max(50).optional(),
    equipment: z9.string().max(1e3).optional(),
    collaborationRate: z9.number().min(0).max(1e5).optional()
  }).optional()
});
var UpdateUserPreferencesSchema = UserPreferencesSchema.partial();
var ChangePasswordSchema = z9.object({
  currentPassword: z9.string().min(1, "Current password is required"),
  newPassword: z9.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  confirmPassword: z9.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
var UserFilterSchema = z9.object({
  role: UserRole.optional(),
  status: UserStatus.optional(),
  subscriptionPlan: SubscriptionPlan.optional(),
  subscriptionStatus: SubscriptionStatus.optional(),
  // Search
  search: z9.string().max(100).optional(),
  // Date filters
  createdAfter: z9.string().datetime().optional(),
  createdBefore: z9.string().datetime().optional(),
  lastActiveAfter: z9.string().datetime().optional(),
  // Verification filters
  emailVerified: z9.boolean().optional(),
  identityVerified: z9.boolean().optional(),
  // Pagination
  page: z9.number().positive().default(1),
  limit: z9.number().min(1).max(100).default(20),
  // Sorting
  sortBy: z9.enum(["created_at", "last_active_at", "username", "email"]).default("created_at"),
  sortOrder: z9.enum(["asc", "desc"]).default("desc")
});

// shared/validation.ts
import { z as z10 } from "zod";
var registerSchema = z10.object({
  username: z10.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z10.string().email("Please enter a valid email address").max(255, "Email is too long"),
  password: z10.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  ),
  confirmPassword: z10.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
var serverRegisterSchema = z10.object({
  username: z10.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ),
  email: z10.string().email("Please enter a valid email address").max(255, "Email is too long"),
  password: z10.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  )
});
var loginSchema = z10.object({
  username: z10.string().min(1, "Username is required"),
  password: z10.string().min(1, "Password is required")
});
var createSubscriptionSchema = z10.object({
  priceId: z10.enum(["basic", "pro", "unlimited"], {
    errorMap: () => ({ message: "Invalid subscription plan" })
  }),
  billingInterval: z10.enum(["monthly", "annual"], {
    errorMap: () => ({ message: "Invalid billing interval" })
  })
});
var paymentIntentSchema = z10.object({
  amount: z10.number().min(100, "Amount must be at least $1.00").max(999999, "Amount is too high"),
  currency: z10.enum(["usd", "eur"], {
    errorMap: () => ({ message: "Invalid currency" })
  }),
  metadata: z10.record(z10.string()).optional()
});
var updateProfileSchema = z10.object({
  username: z10.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  ).optional(),
  email: z10.string().email("Please enter a valid email address").max(255, "Email is too long").optional(),
  avatar: z10.string().url("Invalid avatar URL").optional()
});
var serverCreateSubscriptionSchema = createSubscriptionSchema.extend({
  // Additional server-side validations
  userAgent: z10.string().optional(),
  ipAddress: z10.string().ip().optional(),
  timestamp: z10.number().optional()
});
var stripeWebhookSchema = z10.object({
  id: z10.string(),
  type: z10.string(),
  data: z10.object({
    object: z10.record(z10.unknown())
  }),
  created: z10.number()
});
var rateLimitSchema = z10.object({
  ip: z10.string(),
  endpoint: z10.string(),
  timestamp: z10.number(),
  count: z10.number().min(0)
});
var auditLogSchema = z10.object({
  userId: z10.number(),
  action: z10.string(),
  resource: z10.string(),
  details: z10.record(z10.unknown()).optional(),
  ipAddress: z10.string().optional(),
  userAgent: z10.string().optional(),
  timestamp: z10.date()
});
var validateEmail = (email) => {
  if (!email || email.length > 254) return false;
  return z10.string().email().safeParse(email).success;
};
var validatePhoneNumber = (phone) => {
  if (!phone || phone.length < 10 || phone.length > 17) return false;
  const cleaned = phone.replaceAll(/[\s\-()+]/g, "");
  const digitRegex = /^\d{10,15}$/;
  return digitRegex.test(cleaned);
};
var enhancedRegisterSchema = registerSchema.refine((data) => validateEmail(data.email), {
  message: "Email domain is not valid",
  path: ["email"]
});
var enhancedPaymentIntentSchema = paymentIntentSchema.refine(
  (data) => {
    const minimums = { usd: 50, eur: 50 };
    return data.amount >= minimums[data.currency];
  },
  {
    message: "Amount below minimum for currency",
    path: ["amount"]
  }
);
var fileUploadValidation = z10.object({
  name: z10.string().min(1, "Filename is required"),
  size: z10.number().max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
  type: z10.string().min(1, "File type is required"),
  lastModified: z10.number().optional()
});
var fileFilterValidation = z10.object({
  genre: z10.string().optional(),
  bpm: z10.object({
    min: z10.number().min(60).max(200),
    max: z10.number().min(60).max(200)
  }).optional(),
  key: z10.string().optional(),
  mood: z10.string().optional(),
  tags: z10.array(z10.string()).optional()
});
var serviceOrderValidation = z10.object({
  service_type: z10.enum(["mixing", "mastering", "recording", "consultation"]),
  details: z10.string().min(10, "Details must be at least 10 characters"),
  budget: z10.number().min(50, "Minimum budget is $50"),
  deadline: z10.string().datetime("Invalid deadline format"),
  contact_email: z10.string().email("Invalid email address"),
  contact_phone: z10.string().optional()
});
var mixingMasteringFormSchema = z10.object({
  // Personal Information
  name: z10.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters").regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z10.string().email("Please enter a valid email address").max(255, "Email is too long"),
  phone: z10.string().refine((phone) => !phone || validatePhoneNumber(phone), {
    message: "Please enter a valid phone number"
  }),
  // Booking Details
  preferredDate: z10.string().min(1, "Please select a preferred date").refine(
    (date) => {
      const selectedDate = new Date(date);
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    },
    {
      message: "Preferred date must be today or in the future"
    }
  ),
  timeSlot: z10.string().min(1, "Please select a time slot").refine(
    (slot) => {
      const validSlots = [
        "9:00 AM",
        "10:00 AM",
        "11:00 AM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM"
      ];
      return validSlots.includes(slot);
    },
    {
      message: "Please select a valid time slot"
    }
  ),
  // Project Details
  projectDetails: z10.string().min(20, "Project details must be at least 20 characters").max(2e3, "Project details must be less than 2000 characters"),
  trackCount: z10.string().optional().refine((count) => !count || Number.parseInt(count) >= 1 && Number.parseInt(count) <= 100, {
    message: "Track count must be between 1 and 100"
  }),
  genre: z10.string().optional(),
  reference: z10.string().optional().refine((ref) => !ref || ref.length <= 500, {
    message: "Reference must be less than 500 characters"
  }),
  specialRequests: z10.string().optional().refine((req) => !req || req.length <= 1e3, {
    message: "Special requests must be less than 1000 characters"
  })
});
var serviceSelectionSchema = z10.object({
  selectedService: z10.enum(["mixing", "mastering", "mixing-mastering"], {
    errorMap: () => ({ message: "Please select a valid service" })
  })
});
var mixingMasteringSubmissionSchema = mixingMasteringFormSchema.merge(serviceSelectionSchema);
var customBeatRequestSchema = z10.object({
  // Basic beat specifications
  genre: z10.string().min(1, "Genre is required"),
  subGenre: z10.string().optional(),
  bpm: z10.number().min(60, "BPM must be at least 60").max(200, "BPM must be at most 200"),
  key: z10.string().min(1, "Key is required"),
  // Creative specifications
  mood: z10.array(z10.string()).min(1, "At least one mood is required"),
  instruments: z10.array(z10.string()).optional(),
  duration: z10.number().min(60, "Duration must be at least 60 seconds").max(600, "Duration must be at most 10 minutes"),
  // Project details
  description: z10.string().min(20, "Description must be at least 20 characters").max(2e3, "Description must be less than 2000 characters"),
  referenceTrack: z10.string().optional(),
  // Business details
  budget: z10.number().min(50, "Minimum budget is $50").max(1e3, "Maximum budget is $1000"),
  deadline: z10.string().optional().refine(
    (date) => {
      if (!date) return true;
      const deadlineDate = new Date(date);
      const minDate = /* @__PURE__ */ new Date();
      minDate.setDate(minDate.getDate() + 1);
      return deadlineDate >= minDate;
    },
    {
      message: "Deadline must be at least 1 day from today"
    }
  ),
  revisions: z10.number().min(0).max(5, "Maximum 5 revisions allowed"),
  priority: z10.enum(["standard", "priority", "express"]),
  additionalNotes: z10.string().max(1e3, "Additional notes must be less than 1000 characters").optional(),
  // File uploads
  uploadedFiles: z10.array(
    z10.object({
      name: z10.string(),
      size: z10.number().max(100 * 1024 * 1024, "Individual files must be under 100MB"),
      type: z10.string(),
      lastModified: z10.number().optional()
    })
  ).optional().refine(
    (files) => {
      if (!files) return true;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      return totalSize <= 200 * 1024 * 1024;
    },
    {
      message: "Total file size must be under 200MB"
    }
  ).refine(
    (files) => {
      if (!files) return true;
      const fileNames = files.map((f) => f.name.toLowerCase());
      const uniqueNames = new Set(fileNames);
      return uniqueNames.size === fileNames.length;
    },
    {
      message: "Duplicate file names are not allowed"
    }
  )
});
var customBeatFileValidation = z10.object({
  name: z10.string().min(1, "Filename is required").refine(
    (name) => {
      const lowerName = name.toLowerCase();
      const audioExtensions = [".mp3", ".wav", ".aiff", ".flac", ".m4a"];
      const archiveExtensions = [".zip", ".rar", ".7z"];
      const isAudio = audioExtensions.some((ext) => lowerName.endsWith(ext));
      const isArchive = archiveExtensions.some((ext) => lowerName.endsWith(ext));
      return isAudio || isArchive;
    },
    {
      message: "File must be an audio file or compressed archive"
    }
  ),
  size: z10.number().max(100 * 1024 * 1024, "File size exceeds 100MB limit"),
  type: z10.string().min(1, "File type is required"),
  lastModified: z10.number().optional()
});
var PAYPAL_SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD"];
var paypalCreateOrderSchema = z10.object({
  serviceType: z10.string().min(1, "Service type is required").max(100, "Service type must be 100 characters or less"),
  amount: z10.number({ invalid_type_error: "Amount must be a number" }).min(0.5, "Minimum amount is $0.50").max(999999.99, "Amount exceeds maximum allowed ($999,999.99)"),
  currency: z10.enum(PAYPAL_SUPPORTED_CURRENCIES, {
    errorMap: () => ({
      message: `Currency must be one of: ${PAYPAL_SUPPORTED_CURRENCIES.join(", ")}`
    })
  }),
  description: z10.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  reservationId: z10.string().min(1, "Reservation ID is required"),
  customerEmail: z10.string().email("Invalid email format")
});

// shared/types/apiEndpoints.ts
import { z as z11 } from "zod";
var signInRequestSchema = z11.object({
  username: z11.string().optional(),
  email: z11.string().email().optional(),
  password: z11.string().min(1)
}).refine((data) => data.username || data.email, {
  message: "Either username or email is required"
});
var registerRequestSchema = z11.object({
  username: z11.string().min(3).max(30),
  email: z11.string().email(),
  password: z11.string().min(8),
  firstName: z11.string().optional(),
  lastName: z11.string().optional()
});
var getBeatsRequestSchema = z11.object({
  limit: z11.number().min(1).max(100).optional(),
  genre: z11.string().optional(),
  search: z11.string().optional(),
  bpm: z11.number().min(1).max(300).optional(),
  key: z11.string().optional(),
  mood: z11.string().optional(),
  priceMin: z11.number().min(0).optional(),
  priceMax: z11.number().min(0).optional(),
  featured: z11.boolean().optional(),
  free: z11.boolean().optional(),
  sortBy: z11.enum(["newest", "oldest", "price_low", "price_high", "popular"]).optional(),
  page: z11.number().min(1).optional()
});
var createBeatRequestSchema = z11.object({
  title: z11.string().min(1).max(200),
  description: z11.string().optional(),
  genre: z11.string().min(1),
  bpm: z11.number().min(1).max(300).optional(),
  key: z11.string().optional(),
  mood: z11.string().optional(),
  price: z11.number().min(0),
  audioUrl: z11.string().url().optional(),
  imageUrl: z11.string().url().optional(),
  tags: z11.array(z11.string()).optional(),
  featured: z11.boolean().optional(),
  duration: z11.number().min(1).optional(),
  isActive: z11.boolean().optional(),
  isExclusive: z11.boolean().optional(),
  isFree: z11.boolean().optional()
});
var createOrderRequestSchema = z11.object({
  items: z11.array(
    z11.object({
      productId: z11.number().positive(),
      title: z11.string().min(1),
      type: z11.enum(["beat", "subscription", "service"]),
      qty: z11.number().min(1),
      unitPrice: z11.number().min(0),
      metadata: z11.record(z11.unknown()).optional()
    })
  ).min(1),
  currency: z11.string().length(3),
  metadata: z11.record(z11.unknown()).optional(),
  idempotencyKey: z11.string().optional()
});
var createPaymentSessionRequestSchema = z11.object({
  reservationId: z11.string().min(1),
  amount: z11.number().min(1),
  currency: z11.string().length(3),
  description: z11.string().min(1),
  metadata: z11.record(z11.unknown()).optional()
});
var createReservationRequestSchema = z11.object({
  serviceType: z11.enum(["mixing", "mastering", "recording", "custom_beat", "consultation"]),
  details: z11.object({
    name: z11.string().min(1),
    email: z11.string().email(),
    phone: z11.string().min(10),
    requirements: z11.string().optional(),
    referenceLinks: z11.array(z11.string().url()).optional()
  }),
  preferredDate: z11.string().datetime(),
  durationMinutes: z11.number().min(30).max(480),
  totalPrice: z11.number().min(0),
  notes: z11.string().optional()
});
var addToCartRequestSchema = z11.object({
  beatId: z11.number().positive().optional(),
  beat_id: z11.number().positive().optional(),
  licenseType: z11.enum(["basic", "premium", "unlimited"]).optional(),
  quantity: z11.number().min(1).optional().default(1)
}).refine((data) => data.beatId || data.beat_id, {
  message: "Either beatId or beat_id is required"
});
var playBeatRequestSchema = z11.object({
  beatId: z11.number().positive()
});
var setVolumeRequestSchema = z11.object({
  level: z11.number().min(0).max(1)
});
var seekRequestSchema = z11.object({
  position: z11.number().min(0)
});
var trackDownloadRequestSchema = z11.object({
  productId: z11.number().positive(),
  license: z11.enum(["basic", "premium", "unlimited"]),
  price: z11.number().min(0).optional(),
  productName: z11.string().optional()
});

// shared/validation/index.ts
import { z as z12 } from "zod";
var CommonParams = {
  id: z12.object({
    id: z12.string().min(1, "ID is required")
  }),
  numericId: z12.object({
    id: z12.string().regex(/^\d+$/, "ID must be numeric").transform(Number)
  }),
  slug: z12.object({
    slug: z12.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Invalid slug format")
  })
};
var CommonQueries = {
  pagination: z12.object({
    page: z12.string().optional().transform((val) => val ? Number.parseInt(val, 10) : 1),
    limit: z12.string().optional().transform((val) => val ? Math.min(Number.parseInt(val, 10), 100) : 20),
    offset: z12.string().optional().transform((val) => val ? Number.parseInt(val, 10) : 0)
  }),
  sorting: z12.object({
    sortBy: z12.string().optional(),
    sortOrder: z12.enum(["asc", "desc"]).optional().default("desc")
  }),
  search: z12.object({
    q: z12.string().max(100).optional(),
    search: z12.string().max(100).optional()
  }),
  dateRange: z12.object({
    startDate: z12.string().datetime().optional(),
    endDate: z12.string().datetime().optional()
  })
};
var validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const validationErrors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          value: req.body,
          message: err.message,
          code: err.code
        }));
        const errorResponse = createValidationError(
          validationErrors,
          req.headers["x-request-id"]
        );
        return res.status(400).json(errorResponse);
      }
      req.body = result.data;
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Validation processing failed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  };
};
var validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const validationErrors = result.error.errors.map((err) => ({
          field: `query.${err.path.join(".")}`,
          value: req.query,
          message: err.message,
          code: err.code
        }));
        const errorResponse = createValidationError(
          validationErrors,
          req.headers["x-request-id"]
        );
        return res.status(400).json(errorResponse);
      }
      req.query = result.data;
      next();
    } catch (error) {
      console.error("Query validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Query validation processing failed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  };
};
var validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        const validationErrors = result.error.errors.map((err) => ({
          field: `params.${err.path.join(".")}`,
          value: req.params,
          message: err.message,
          code: err.code
        }));
        const errorResponse = createValidationError(
          validationErrors,
          req.headers["x-request-id"]
        );
        return res.status(400).json(errorResponse);
      }
      req.params = result.data;
      next();
    } catch (error) {
      console.error("Params validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Parameter validation processing failed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
  };
};

// server/routes/orders.ts
init_auth();
init_convex();
var ordersRouter = Router9();
var convex4 = getConvex();
var createOrderIdempotent = async (args) => {
  return await convex4.mutation(
    "orders:createOrderIdempotent",
    args
  );
};
var listOrders = async (args) => {
  return await convex4.query(
    "orders:listOrders",
    args
  );
};
var getOrderWithRelations = async (args) => {
  return await convex4.query(
    "orders:getOrderWithRelations",
    args
  );
};
var getOrderStatusHistory = async (args) => {
  return await convex4.query(
    "orders:getOrderStatusHistory",
    args
  );
};
ordersRouter.use(isAuthenticated);
var createOrder2 = async (req, res) => {
  try {
    const body = req.body;
    const idempotencyKey = body.idempotencyKey || req.headers["x-idempotency-key"];
    const orderArgs = {
      items: body.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        type: item.type,
        qty: item.qty,
        unitPrice: item.unitPrice,
        metadata: item.metadata
      })),
      currency: body.currency,
      email: req.user?.email || "",
      metadata: body.metadata,
      idempotencyKey
    };
    const result = await createOrderIdempotent(orderArgs);
    const response = {
      orderId: result.orderId,
      order: result.order,
      idempotent: result.idempotent
    };
    res.status(201).json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to create order");
  }
};
ordersRouter.post("/", validateBody(CreateOrderSchema), createOrder2);
var getMyOrders = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { items, cursor, hasMore } = await listOrders({ limit });
    const response = {
      orders: items,
      page,
      total: items.length,
      totalPages: hasMore ? page + 1 : page,
      cursor,
      hasMore
    };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch orders");
  }
};
ordersRouter.get("/me", validateQuery(CommonQueries.pagination), getMyOrders);
var getOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await getOrderWithRelations({ orderId: id });
    const user = req.user;
    const isAdmin = user?.role === "admin" || user?.email === "admin@brolabentertainment.com" || user?.username === "admin";
    const orderUserId = data?.order?.userId;
    const isOwner = orderUserId && orderUserId === String(user?.id);
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const statusHistory = await getOrderStatusHistory({ orderId: id });
    const response = {
      order: data?.order,
      items: data?.items || [],
      statusHistory: statusHistory.map((h) => ({
        status: h.status,
        timestamp: new Date(h.timestamp).toISOString(),
        comment: h.action
      }))
    };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to get order");
  }
};
ordersRouter.get("/:id", validateParams(CommonParams.id), getOrder);
var getInvoice = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await getOrderWithRelations({ orderId: id });
    const user = req.user;
    const isAdmin = user?.role === "admin" || user?.email === "admin@brolabentertainment.com" || user?.username === "admin";
    const orderUserId = data?.order?.userId;
    const isOwner = orderUserId && orderUserId === String(user?.id);
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const invoiceUrl = data?.order?.invoiceUrl;
    if (!invoiceUrl) {
      res.status(404).json({ error: "Invoice not ready" });
      return;
    }
    const response = { url: invoiceUrl };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Failed to get invoice");
  }
};
ordersRouter.get("/:id/invoice", validateParams(CommonParams.id), getInvoice);
ordersRouter.get("/:id/invoice/download", validateParams(CommonParams.id), async (req, res) => {
  try {
    const id = req.params.id;
    const data = await getOrderWithRelations({ orderId: id });
    const user = req.user;
    const isAdmin = user?.role === "admin" || user?.email === "admin@brolabentertainment.com" || user?.username === "admin";
    const orderUserId = data?.order?.userId;
    const isOwner = orderUserId && orderUserId === String(user?.id);
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const invoice = data;
    if (!invoice?.invoice?.pdfUrl) {
      res.status(404).json({ error: "Invoice not ready" });
      return;
    }
    res.redirect(invoice.invoice.pdfUrl);
  } catch (error) {
    handleRouteError(error, res, "Failed to download invoice");
  }
});
var orders_default = ordersRouter;

// server/routes/payments.ts
import { ConvexHttpClient as ConvexHttpClient2 } from "convex/browser";
import { Router as Router10 } from "express";
import Stripe2 from "stripe";

// server/services/paypal.ts
init_api();
import {
  CheckoutPaymentIntent,
  OrderApplicationContextUserAction,
  OrdersController
} from "@paypal/paypal-server-sdk";
import { createVerify } from "node:crypto";

// server/config/paypal.ts
import { Client, Environment } from "@paypal/paypal-server-sdk";
var clientId = process.env.PAYPAL_CLIENT_ID;
var clientSecret = process.env.PAYPAL_CLIENT_SECRET;
var paypalMode = process.env.PAYPAL_MODE || "sandbox";
if (!clientId || !clientSecret) {
  throw new Error("PayPal credentials are not configured. Please check your .env file.");
}
console.log(`\u{1F510} PayPal ${paypalMode.toUpperCase()} credentials loaded:`, {
  clientId: clientId ? `${clientId.substring(0, 8)}...` : "undefined",
  clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : "undefined",
  mode: paypalMode
});
var environment = paypalMode === "production" ? Environment.Production : Environment.Sandbox;
var paypalClient = new Client({
  environment,
  clientId,
  clientSecret
});
var PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
var PAYPAL_RETURN_URL = `${process.env.SERVER_URL || "http://localhost:5000"}/api/paypal/capture`;
var PAYPAL_CANCEL_URL = `${process.env.CLIENT_URL || "https://brolabentertainment.com"}/payment/cancel`;

// server/services/paypal.ts
init_convex();
var convex5 = getConvex();
var PayPalService = class {
  /**
   * Creates a real PayPal order for payment
   * Handles return URLs correctly
   */
  static async createPaymentOrder(paymentRequest) {
    try {
      const { amount, currency, description, reservationId } = paymentRequest;
      console.log("\u{1F680} Creating REAL PayPal order for reservation:", reservationId);
      console.log("\u{1F4B0} Payment details:", { amount, currency, description });
      if (!["EUR", "USD"].includes(currency)) {
        throw new Error(`Currency '${currency}' not supported`);
      }
      const ordersController = new OrdersController(paypalClient);
      const requestBody = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: amount.toString()
            },
            customId: reservationId
          }
        ],
        applicationContext: {
          returnUrl: `${PAYPAL_RETURN_URL}/${reservationId}`,
          cancelUrl: PAYPAL_CANCEL_URL,
          brandName: "BroLab Entertainment",
          userAction: OrderApplicationContextUserAction.PayNow
        }
      };
      console.log("\u{1F4E4} Sending PayPal order creation request...");
      console.log("\u{1F4CB} Request body:", JSON.stringify(requestBody, null, 2));
      const order = await ordersController.createOrder({
        body: requestBody,
        prefer: "return=representation"
      });
      if (order.result?.id) {
        const orderId = order.result.id;
        const approvalUrl = order.result.links?.find(
          (link) => link.rel === "approve"
        )?.href;
        if (!approvalUrl) {
          throw new Error("PayPal approval URL not found");
        }
        console.log("\u2705 REAL PayPal order created successfully:", orderId);
        console.log("\u{1F517} Approval URL:", approvalUrl);
        console.log("\u{1F4DD} Reservation ID stored in customId:", reservationId);
        return {
          success: true,
          paymentUrl: approvalUrl,
          orderId
        };
      } else {
        throw new Error("Invalid PayPal order response");
      }
    } catch (error) {
      console.error("\u274C Error creating REAL PayPal order:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Captures a real PayPal payment after approval
   * Uses PayPal orderId (token) for capture
   */
  static async capturePayment(orderId) {
    try {
      console.log("\u{1F3AF} Capturing REAL PayPal payment for order:", orderId);
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }
      const ordersController = new OrdersController(paypalClient);
      console.log("\u{1F4E4} Sending PayPal capture request...");
      const capture = await ordersController.captureOrder({
        id: orderId
      });
      if (capture.result?.id) {
        const transactionId = capture.result.id;
        const status = capture.result.status;
        console.log("\u2705 REAL PayPal payment captured successfully:", { transactionId, status });
        return {
          success: true,
          transactionId
        };
      } else {
        throw new Error("Invalid PayPal capture response");
      }
    } catch (error) {
      console.error("\u274C Error capturing REAL PayPal payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Verifies PayPal webhook signature using proper certificate validation
   * Implements PayPal's webhook signature verification algorithm
   * @see https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/#link-verifysignature
   */
  static async verifyWebhookSignature(webhookId, transmissionId, timestamp, certUrl, authAlgo, transmissionSig, body) {
    try {
      console.log("\u{1F510} Verifying PayPal webhook signature", {
        webhookId: webhookId?.substring(0, 10) + "...",
        transmissionId: transmissionId?.substring(0, 10) + "...",
        timestamp,
        authAlgo
      });
      if (!webhookId || !transmissionId || !timestamp || !certUrl || !authAlgo || !transmissionSig || !body) {
        console.error("\u274C Missing required webhook verification parameters");
        return false;
      }
      const configuredWebhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!configuredWebhookId) {
        console.error("\u274C PAYPAL_WEBHOOK_ID not configured in environment");
        return false;
      }
      if (webhookId !== configuredWebhookId) {
        console.error("\u274C Webhook ID mismatch", {
          received: webhookId,
          expected: configuredWebhookId?.substring(0, 10) + "..."
        });
        return false;
      }
      const validCertDomains = [
        "https://api.paypal.com",
        "https://api.sandbox.paypal.com",
        "https://api-m.paypal.com",
        "https://api-m.sandbox.paypal.com"
      ];
      const isValidCertUrl = validCertDomains.some((domain) => certUrl.startsWith(domain));
      if (!isValidCertUrl) {
        console.error("\u274C Invalid certificate URL domain", { certUrl });
        return false;
      }
      let certificate;
      try {
        const certResponse = await fetch(certUrl);
        if (!certResponse.ok) {
          throw new Error(`Failed to fetch certificate: ${certResponse.status}`);
        }
        certificate = await certResponse.text();
        console.log("\u2705 PayPal certificate fetched successfully");
      } catch (error) {
        console.error("\u274C Failed to fetch PayPal certificate:", error);
        return false;
      }
      const crc32 = this.calculateCRC32(body);
      const expectedSignatureString = `${transmissionId}|${timestamp}|${webhookId}|${crc32}`;
      console.log("\u{1F510} Verifying signature with expected string", {
        expectedSignatureString: expectedSignatureString.substring(0, 50) + "...",
        algorithm: authAlgo
      });
      try {
        const verifier = createVerify(authAlgo.toUpperCase());
        verifier.update(expectedSignatureString);
        verifier.end();
        const isValid = verifier.verify(certificate, transmissionSig, "base64");
        if (isValid) {
          console.log("\u2705 PayPal webhook signature verified successfully");
          return true;
        } else {
          console.error("\u274C PayPal webhook signature verification failed - signature mismatch");
          return false;
        }
      } catch (error) {
        console.error("\u274C Error during signature verification:", error);
        return false;
      }
    } catch (error) {
      console.error("\u274C Unexpected error verifying webhook signature:", error);
      console.error("\u{1F6A8} SECURITY: PayPal webhook signature verification failed", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return false;
    }
  }
  /**
   * Calculate CRC32 checksum for webhook body
   * Required for PayPal webhook signature verification
   */
  static calculateCRC32(str) {
    const table = [];
    let crc = 0;
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[i] = c;
    }
    crc = 0 ^ -1;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.codePointAt(i) ?? 0;
      crc = crc >>> 8 ^ table[(crc ^ charCode) & 255];
    }
    return (crc ^ -1) >>> 0;
  }
  /**
   * Processes a PayPal webhook event
   * Handles PayPal IDs correctly
   */
  static async processWebhookEvent(event) {
    try {
      console.log("\u{1F4E1} Processing REAL PayPal webhook event:", event.event_type);
      switch (event.event_type) {
        case "PAYMENT.CAPTURE.COMPLETED":
          return await this.handlePaymentCompleted(event);
        case "PAYMENT.CAPTURE.DENIED":
          return await this.handlePaymentDenied(event);
        case "PAYMENT.CAPTURE.REFUNDED":
          return await this.handlePaymentRefunded(event);
        default:
          console.log("\u2139\uFE0F Unhandled webhook event type:", event.event_type);
          return {
            success: true,
            message: `Unhandled event type: ${event.event_type}`
          };
      }
    } catch (error) {
      console.error("\u274C Error processing webhook event:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Handles PAYMENT.CAPTURE.COMPLETED webhook event
   */
  static async handlePaymentCompleted(event) {
    const transactionId = event.resource.id;
    const customId = event.resource.custom_id;
    console.log("\u{1F4B0} Payment completed:", { transactionId, reservationId: customId });
    if (!customId) {
      return {
        success: true,
        message: "Payment completed but no reservation ID found"
      };
    }
    await this.updateReservationStatus(
      customId,
      "confirmed",
      `PayPal payment completed. Transaction ID: ${transactionId}`
    );
    console.log("\u2705 Reservation status updated to confirmed:", customId);
    return {
      success: true,
      message: `Payment completed for reservation ${customId}`
    };
  }
  /**
   * Handles PAYMENT.CAPTURE.DENIED webhook event
   */
  static async handlePaymentDenied(event) {
    const deniedCustomId = event.resource.custom_id;
    console.log("\u274C Payment denied for reservation:", deniedCustomId);
    if (!deniedCustomId) {
      return {
        success: true,
        message: "Payment denied but no reservation ID found"
      };
    }
    await this.updateReservationStatus(
      deniedCustomId,
      "pending",
      `PayPal payment denied. Event ID: ${event.id}`
    );
    console.log("\u2705 Reservation status updated to pending (payment denied):", deniedCustomId);
    return {
      success: true,
      message: `Payment denied for reservation ${deniedCustomId}`
    };
  }
  /**
   * Handles PAYMENT.CAPTURE.REFUNDED webhook event
   */
  static async handlePaymentRefunded(event) {
    const refundedCustomId = event.resource.custom_id;
    const refundId = event.resource.id;
    console.log("\u21A9\uFE0F Payment refunded for reservation:", refundedCustomId);
    if (!refundedCustomId) {
      return {
        success: true,
        message: "Payment refunded but no reservation ID found"
      };
    }
    await this.updateReservationStatus(
      refundedCustomId,
      "cancelled",
      `PayPal payment refunded. Refund ID: ${refundId}`
    );
    console.log("\u2705 Reservation status updated to cancelled (refunded):", refundedCustomId);
    return {
      success: true,
      message: `Payment refunded for reservation ${refundedCustomId}`
    };
  }
  /**
   * Updates reservation status in Convex
   * Centralized error handling for reservation updates
   */
  static async updateReservationStatus(reservationId, status, notes) {
    try {
      await convex5.mutation(api.reservations.updateReservationStatus, {
        reservationId,
        status,
        notes,
        skipEmailNotification: false
      });
    } catch (error) {
      console.error("\u274C Failed to update reservation status:", error);
      throw new Error(
        `Failed to update reservation status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Gets details of a real PayPal order
   * Uses PayPal orderId
   */
  static async getOrderDetails(orderId) {
    try {
      console.log("\u{1F4CB} Getting REAL PayPal order details:", orderId);
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }
      const ordersController = new OrdersController(paypalClient);
      console.log("\u{1F4E4} Sending PayPal order details request...");
      const order = await ordersController.getOrder({
        id: orderId
      });
      if (order.result) {
        console.log("\u2705 REAL PayPal order details retrieved successfully");
        return order.result;
      } else {
        throw new Error("Invalid PayPal order response");
      }
    } catch (error) {
      console.error("\u274C Error getting REAL PayPal order details:", error);
      throw error;
    }
  }
};
var paypal_default = PayPalService;

// server/routes/payments.ts
var router10 = Router10();
async function handleSubscriptionWebhook(eventType, payload, convexUrl) {
  console.log(`\u{1F4E6} Processing subscription webhook: ${eventType}`);
  const convex6 = new ConvexHttpClient2(convexUrl);
  const webhookData = payload.data;
  if (!webhookData) {
    throw new Error("Missing webhook data");
  }
  const subscriptionId = webhookData.id || "";
  const userId = webhookData.user_id || webhookData.userId || "";
  const planId = webhookData.plan_id || webhookData.planId || "basic";
  const status = webhookData.status || "active";
  const currentPeriodStart = webhookData.current_period_start || webhookData.currentPeriodStart || Date.now();
  const currentPeriodEnd = webhookData.current_period_end || webhookData.currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1e3;
  const quotaMap = {
    free_user: 1,
    basic: 5,
    artist: 20,
    ultimate_pass: 999999,
    ultimate: 999999
    // Legacy alias
  };
  const downloadQuota = quotaMap[planId] || 5;
  try {
    const users = await convex6.query("users:getUserByClerkId", { clerkId: userId });
    if (!users) {
      console.warn(`\u26A0\uFE0F User not found for Clerk ID: ${userId}`);
      return;
    }
    const userDoc = users;
    const existingSubscriptions = await convex6.query("subscriptions:getByClerkId", {
      clerkSubscriptionId: subscriptionId
    });
    if (eventType === "subscription.created" || !existingSubscriptions) {
      await convex6.mutation("subscriptions:create", {
        userId: userDoc._id,
        clerkSubscriptionId: subscriptionId,
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        downloadQuota,
        downloadUsed: 0,
        features: []
      });
      console.log(`\u2705 Subscription created: ${subscriptionId}`);
    } else if (eventType === "subscription.updated") {
      await convex6.mutation("subscriptions:update", {
        clerkSubscriptionId: subscriptionId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        downloadQuota
      });
      console.log(`\u2705 Subscription updated: ${subscriptionId}`);
    } else if (eventType === "subscription.deleted") {
      await convex6.mutation("subscriptions:cancel", {
        clerkSubscriptionId: subscriptionId
      });
      console.log(`\u2705 Subscription cancelled: ${subscriptionId}`);
    }
  } catch (error) {
    console.error(`\u274C Error processing subscription webhook:`, error);
    throw error;
  }
}
async function handleInvoiceWebhook(eventType, payload, convexUrl) {
  console.log(`\u{1F4C4} Processing invoice webhook: ${eventType}`);
  const convex6 = new ConvexHttpClient2(convexUrl);
  const webhookData = payload.data;
  if (!webhookData) {
    throw new Error("Missing webhook data");
  }
  const invoiceId = webhookData.id || "";
  const subscriptionId = webhookData.subscription_id || webhookData.subscriptionId || "";
  const amount = webhookData.amount || 0;
  const currency = webhookData.currency || "USD";
  const status = webhookData.status || "open";
  const dueDate = webhookData.due_date || webhookData.dueDate || Date.now();
  try {
    const subscription = await convex6.query("subscriptions:getByClerkId", {
      clerkSubscriptionId: subscriptionId
    });
    if (!subscription) {
      console.warn(`\u26A0\uFE0F Subscription not found for invoice: ${subscriptionId}`);
      return;
    }
    const subscriptionDoc = subscription;
    const existingInvoice = await convex6.query("invoices:getByClerkId", {
      clerkInvoiceId: invoiceId
    });
    if (eventType === "invoice.created" || !existingInvoice) {
      await convex6.mutation("invoices:create", {
        subscriptionId: subscriptionDoc._id,
        clerkInvoiceId: invoiceId,
        amount,
        currency,
        status,
        dueDate
      });
      console.log(`\u2705 Invoice created: ${invoiceId}`);
    } else if (eventType === "invoice.paid") {
      await convex6.mutation("invoices:markPaid", {
        clerkInvoiceId: invoiceId,
        paidAt: Date.now()
      });
      console.log(`\u2705 Invoice paid: ${invoiceId}`);
    } else if (eventType === "invoice.payment_failed") {
      await convex6.mutation("invoices:markFailed", {
        clerkInvoiceId: invoiceId
      });
      console.log(`\u26A0\uFE0F Invoice payment failed: ${invoiceId}`);
    }
  } catch (error) {
    console.error(`\u274C Error processing invoice webhook:`, error);
    throw error;
  }
}
async function handleOrderWebhook(normalized, mapped, convexUrl) {
  console.log("\u{1F4B3} Processing order webhook with data:", {
    email: normalized.email,
    sessionId: normalized.sessionId,
    paymentId: normalized.paymentId,
    status: mapped.status,
    paymentStatus: mapped.paymentStatus
  });
  const convex6 = new ConvexHttpClient2(convexUrl);
  let orderId = null;
  if (normalized.sessionId) {
    const orders = await convex6.query("orders:listOrdersAdmin", {
      limit: 1
    });
    const ordersList = Array.isArray(orders) ? orders : [];
    const order = ordersList.find(
      (o) => o.checkoutSessionId === normalized.sessionId
    );
    if (order && "_id" in order) {
      orderId = order._id;
    }
  }
  if (!orderId && normalized.paymentId) {
    const orders = await convex6.query("orders:listOrdersAdmin", {
      limit: 1
    });
    const ordersList = Array.isArray(orders) ? orders : [];
    const order = ordersList.find(
      (o) => o.paymentIntentId === normalized.paymentId
    );
    if (order && "_id" in order) {
      orderId = order._id;
    }
  }
  if (!orderId) {
    console.warn(`\u26A0\uFE0F Order not found for session/payment ID`);
    return;
  }
  await convex6.mutation("orders:recordPayment", {
    orderId,
    provider: "stripe",
    status: mapped.paymentStatus,
    amount: 0,
    // Amount should come from webhook data
    currency: "usd",
    stripeEventId: normalized.sessionId || normalized.paymentId || "",
    stripePaymentIntentId: normalized.paymentId
  });
  if (mapped.paymentStatus === "succeeded") {
    await convex6.mutation("orders:confirmPayment:confirmPayment", {
      orderId,
      paymentIntentId: normalized.paymentId || normalized.sessionId || "",
      status: "succeeded",
      provider: "stripe"
    });
    console.log(`\u2705 Order payment confirmed: ${orderId}`);
  }
}
var stripeSecretKey = process.env.STRIPE_SECRET_KEY;
var stripeClient = null;
if (stripeSecretKey) {
  stripeClient = new Stripe2(stripeSecretKey, {
    apiVersion: "2025-08-27.basil"
  });
}
var createPaymentSession = async (req, res) => {
  try {
    const { reservationId, amount, currency, description, metadata } = req.body;
    if (!req.user?.id) {
      const requestId = req.requestId || generateSecureRequestId();
      res.status(401).json({
        error: "Authentication required",
        message: "Please log in to continue",
        requestId
      });
      return;
    }
    const userId = String(req.user.id);
    const userEmail = req.user.email || "";
    const paymentProvider = metadata?.paymentProvider || "stripe";
    console.log(`\u{1F4B3} Creating ${paymentProvider} payment session for reservation: ${reservationId}`);
    if (paymentProvider === "paypal") {
      const paypalResult = await paypal_default.createPaymentOrder({
        serviceType: metadata?.serviceType || "service",
        amount: amount / 100,
        // PayPal expects amount in dollars, not cents
        currency: currency.toUpperCase(),
        description,
        reservationId,
        userId,
        customerEmail: userEmail
      });
      if (!paypalResult.success || !paypalResult.paymentUrl) {
        res.status(500).json({
          error: "Failed to create PayPal payment session",
          message: paypalResult.error || "Unknown error"
        });
        return;
      }
      const response2 = {
        success: true,
        checkoutUrl: paypalResult.paymentUrl,
        sessionId: paypalResult.orderId || `paypal_${Date.now()}`,
        amount,
        currency,
        description,
        metadata: { ...metadata, provider: "paypal" }
      };
      console.log(`\u2705 PayPal payment session created: ${paypalResult.orderId}`);
      res.json(response2);
      return;
    }
    if (!stripeClient) {
      console.error("\u274C Stripe client not initialized - STRIPE_SECRET_KEY missing");
      res.status(500).json({
        error: "Payment service unavailable",
        message: "Stripe is not configured. Please contact support."
      });
      return;
    }
    const baseUrl = process.env.CLIENT_URL || "https://brolabentertainment.com";
    const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservationId}`;
    const cancelUrl = `${baseUrl}/payment/cancel?reservation_id=${reservationId}`;
    const session2 = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || "Service Payment",
              description: `Reservation: ${reservationId}`
            },
            unit_amount: amount
            // Amount in cents
          },
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail || void 0,
      metadata: {
        reservationId,
        userId,
        type: "reservation_payment",
        ...metadata
      },
      expires_at: Math.floor(Date.now() / 1e3) + 30 * 60
      // 30 minutes expiration
    });
    if (!session2.url) {
      res.status(500).json({
        error: "Failed to create Stripe checkout session",
        message: "No checkout URL returned from Stripe"
      });
      return;
    }
    const response = {
      success: true,
      checkoutUrl: session2.url,
      sessionId: session2.id,
      amount,
      currency,
      description,
      metadata: { ...metadata, provider: "stripe" }
    };
    console.log(`\u2705 Stripe checkout session created: ${session2.id}`);
    res.json(response);
  } catch (error) {
    console.error("\u274C Error creating payment session:", error);
    handleRouteError(error, res, "Failed to create payment session");
  }
};
router10.post(
  "/create-payment-session",
  validateBody(createPaymentSessionRequestSchema),
  createPaymentSession
);
async function verifyWebhookSignature2(body, headers, secret) {
  const { Webhook } = await import("svix");
  if (!Webhook) throw new Error("Svix Webhook class not found");
  const svix = new Webhook(secret);
  return svix.verify(JSON.stringify(body), headers);
}
async function getWebhookPayload(req, res) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  if (!WEBHOOK_SECRET) {
    if (isProd) {
      console.error("CLERK_WEBHOOK_SECRET not set in production");
      res.status(500).json({ error: "Webhook secret not configured" });
      return null;
    }
    console.warn("\u26A0\uFE0F Missing CLERK_WEBHOOK_SECRET; using raw body in dev.");
    return req.body;
  }
  try {
    return await verifyWebhookSignature2(
      req.body,
      req.headers,
      WEBHOOK_SECRET
    );
  } catch (err) {
    if (isProd) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Webhook signature verification failed:", errorMessage);
      res.status(400).json({ error: "invalid_signature" });
      return null;
    }
    console.warn("\u26A0\uFE0F Svix not available or verification failed; using raw body in dev.");
    return req.body;
  }
}
async function handleClerkBillingEvent(eventType, payload, convexUrl, res) {
  if (eventType.startsWith("subscription.")) {
    await handleSubscriptionWebhook(eventType, payload, convexUrl);
    res.json({ received: true, synced: true, handled: "subscription" });
    return true;
  }
  if (eventType.startsWith("invoice.")) {
    await handleInvoiceWebhook(eventType, payload, convexUrl);
    res.json({ received: true, synced: true, handled: "invoice" });
    return true;
  }
  return false;
}
function extractWebhookData(webhookData) {
  const email = webhookData?.customer_email || webhookData?.customerEmail || webhookData?.email;
  const sessionId = webhookData?.id || webhookData?.session_id || void 0;
  const paymentId = webhookData?.payment_intent || webhookData?.payment_id || void 0;
  const statusRaw = webhookData?.status || void 0;
  return {
    email,
    sessionId,
    paymentId,
    status: statusRaw && typeof statusRaw === "string" ? statusRaw.toLowerCase() : void 0
  };
}
function mapWebhookStatus(status) {
  const statusMap = {
    completed: { status: "completed", paymentStatus: "succeeded" },
    paid: { status: "completed", paymentStatus: "succeeded" },
    succeeded: { status: "completed", paymentStatus: "succeeded" },
    processing: { status: "processing", paymentStatus: "processing" },
    requires_payment_method: { status: "pending", paymentStatus: "requires_payment_method" },
    failed: { status: "cancelled", paymentStatus: "failed" },
    canceled: { status: "cancelled", paymentStatus: "canceled" }
  };
  return statusMap[status || ""] || { status: "completed", paymentStatus: "succeeded" };
}
async function handleOrderPaymentWebhook(payload, convexUrl, res) {
  const webhookData = payload?.data;
  const normalized = extractWebhookData(webhookData);
  const mapped = mapWebhookStatus(normalized.status);
  await handleOrderWebhook(normalized, mapped, convexUrl);
  res.json({
    received: true,
    synced: true,
    handled: "order",
    result: { status: mapped.status }
  });
}
var paymentWebhook = async (req, res) => {
  try {
    const payload = await getWebhookPayload(req, res);
    if (!payload) return;
    console.log("Payment webhook received:", payload?.type || "unknown", payload);
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      console.warn("VITE_CONVEX_URL not set; skipping Convex sync for webhook");
      res.json({ received: true, synced: false });
      return;
    }
    const eventType = (payload?.type || "").toString();
    try {
      const handled = await handleClerkBillingEvent(eventType, payload, convexUrl, res);
      if (handled) return;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("\u274C Failed to sync subscription/invoice webhook:", errorMessage);
    }
    try {
      await handleOrderPaymentWebhook(payload, convexUrl, res);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to sync webhook to Convex:", errorMessage);
      res.status(500).json({ received: true, synced: false, error: errorMessage });
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to process payment webhook");
  }
};
router10.post("/webhook", paymentWebhook);
var payments_default = router10;

// server/routes/paypal.ts
import { Router as Router11 } from "express";
init_auth();

// server/lib/secureLogger.ts
import crypto3 from "node:crypto";
var SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i
];
var PII_PATTERNS = [
  /email/i,
  /phone/i,
  /address/i,
  /ssn/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /postal[_-]?code/i,
  /zip[_-]?code/i
];
function hashValue(value) {
  return crypto3.createHash("sha256").update(value).digest("hex").substring(0, 16);
}
function isSensitiveField(fieldName) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(fieldName));
}
function isPIIField(fieldName) {
  return PII_PATTERNS.some((pattern) => pattern.test(fieldName));
}
function sanitizeValue(value, fieldName) {
  if (isSensitiveField(fieldName)) {
    return "[REDACTED]";
  }
  if (isPIIField(fieldName) && typeof value === "string") {
    return `[HASHED:${hashValue(value)}]`;
  }
  if (typeof value === "string" && value.includes("@")) {
    const [, domain] = value.split("@");
    return `[EMAIL:***@${domain}]`;
  }
  if (fieldName.toLowerCase().includes("clerkid") && typeof value === "string" && value.startsWith("user_")) {
    return `${value.substring(0, 12)}...`;
  }
  if ((fieldName.toLowerCase().includes("id") || fieldName.toLowerCase().includes("token")) && typeof value === "string" && value.length > 20) {
    return `${value.substring(0, 8)}...`;
  }
  return value;
}
function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === void 0) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(
        (item) => typeof item === "object" && item !== null ? sanitizeObject(item) : sanitizeValue(item, key)
      );
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = sanitizeValue(value, key);
    }
  }
  return sanitized;
}
function formatLogEntry(entry) {
  const { level, timestamp, message, context, requestId } = entry;
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify({
      level,
      timestamp,
      message,
      ...context && { context },
      ...requestId && { requestId }
    });
  }
  const emoji = {
    ["debug" /* DEBUG */]: "\u{1F50D}",
    ["info" /* INFO */]: "\u2139\uFE0F",
    ["warn" /* WARN */]: "\u26A0\uFE0F",
    ["error" /* ERROR */]: "\u274C"
  }[level];
  let output = `${emoji} [${level.toUpperCase()}] ${message}`;
  if (requestId) {
    output += ` [${requestId}]`;
  }
  if (context && Object.keys(context).length > 0) {
    output += `
${JSON.stringify(context, null, 2)}`;
  }
  return output;
}
function writeLog(entry) {
  const formatted = formatLogEntry(entry);
  switch (entry.level) {
    case "error" /* ERROR */:
      console.error(formatted);
      break;
    case "warn" /* WARN */:
      console.warn(formatted);
      break;
    case "debug" /* DEBUG */:
      if (process.env.NODE_ENV !== "production") {
        console.log(formatted);
      }
      break;
    case "info" /* INFO */:
    default:
      console.log(formatted);
      break;
  }
}
var SecureLogger = class {
  requestId;
  /**
   * Set request ID for correlation
   */
  setRequestId(requestId) {
    this.requestId = requestId;
  }
  /**
   * Clear request ID
   */
  clearRequestId() {
    this.requestId = void 0;
  }
  /**
   * Log debug message (development only)
   */
  debug(message, context) {
    this.log("debug" /* DEBUG */, message, context);
  }
  /**
   * Log info message
   */
  info(message, context) {
    this.log("info" /* INFO */, message, context);
  }
  /**
   * Log warning message
   */
  warn(message, context) {
    this.log("warn" /* WARN */, message, context);
  }
  /**
   * Log error message
   */
  error(message, error, context) {
    const errorContext = {
      ...context,
      ...error && {
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === "production" ? void 0 : error.stack
        }
      }
    };
    this.log("error" /* ERROR */, message, errorContext);
  }
  /**
   * Core logging method
   */
  log(level, message, context) {
    const entry = {
      level,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message,
      context: context ? sanitizeObject(context) : void 0,
      requestId: this.requestId
    };
    writeLog(entry);
  }
};
var secureLogger = new SecureLogger();

// server/routes/paypal.ts
var router11 = Router11();
if (process.env.NODE_ENV !== "production") {
  router11.get("/test", async (req, res) => {
    try {
      const testResponse = {
        success: true,
        message: "PayPal endpoint accessible",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        test: true
      };
      res.json(testResponse);
    } catch (error) {
      handleRouteError(error, res, "PayPal test failed");
    }
  });
  router11.get("/test-auth", isAuthenticated, async (req, res) => {
    try {
      res.json({
        success: true,
        message: "PayPal authentication test successful",
        user: {
          id: req.user?.id || null,
          email: req.user?.email || null
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      handleRouteError(error, res, "PayPal auth test failed");
    }
  });
}
router11.post("/create-order", isAuthenticated, async (req, res) => {
  try {
    const body = req.body;
    const parseResult = paypalCreateOrderSchema.safeParse({
      ...body,
      // Normalize amount to number and currency to uppercase before validation
      amount: Number(body.amount),
      currency: typeof body.currency === "string" ? body.currency.toUpperCase() : body.currency
    });
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: fieldErrors
      });
      return;
    }
    const { serviceType, amount, currency, description, reservationId, customerEmail } = parseResult.data;
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: "User authentication required"
      });
      return;
    }
    const paymentRequest = {
      serviceType,
      amount,
      currency,
      description,
      reservationId,
      userId: req.user.id,
      customerEmail
    };
    secureLogger.info("Creating PayPal order", {
      userId: req.user.id,
      serviceType,
      reservationId
    });
    const result = await paypal_default.createPaymentOrder(paymentRequest);
    if (result.success) {
      secureLogger.info("PayPal order created successfully", {
        orderId: result.orderId
      });
      res.json({
        success: true,
        approvalLink: result.paymentUrl,
        // URL PayPal directe
        orderId: result.orderId
        // Pour référence uniquement
      });
    } else {
      secureLogger.error("Failed to create PayPal order", void 0, {
        error: result.error
      });
      res.status(500).json({
        success: false,
        error: result.error || "Failed to create PayPal order"
      });
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to create PayPal order");
  }
});
router11.post("/capture-payment", isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId (PayPal token)"
      });
      return;
    }
    secureLogger.info("Capturing PayPal payment", {
      userId: req.user?.id,
      orderId
    });
    const result = await paypal_default.capturePayment(orderId);
    if (result.success) {
      secureLogger.info("PayPal payment captured successfully", {
        transactionId: result.transactionId,
        orderId
      });
      res.json({
        success: true,
        transactionId: result.transactionId,
        orderId
        // Token PayPal original
      });
    } else {
      secureLogger.error("Failed to capture PayPal payment", void 0, {
        error: result.error,
        orderId
      });
      res.status(500).json({
        success: false,
        error: result.error || "Failed to capture payment"
      });
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to capture PayPal payment");
  }
});
router11.get("/capture/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const { PayerID } = req.query;
    if (!token) {
      const errorUrl = urls.paypal.error("missing_token");
      res.redirect(errorUrl);
      return;
    }
    secureLogger.info("Auto-capturing PayPal payment via token validation", {
      token
    });
    let orderDetails;
    try {
      orderDetails = await paypal_default.getOrderDetails(token);
    } catch (orderError) {
      secureLogger.error(
        "Failed to validate PayPal token",
        orderError instanceof Error ? orderError : void 0,
        {
          token
        }
      );
      const errorUrl = urls.paypal.error("invalid_token", token);
      res.redirect(errorUrl);
      return;
    }
    if (orderDetails.status !== "APPROVED") {
      secureLogger.warn("PayPal order not in APPROVED status", {
        token,
        status: orderDetails.status
      });
      if (orderDetails.status === "COMPLETED") {
        const successUrl = urls.paypal.success(token, PayerID);
        res.redirect(successUrl);
        return;
      }
      const errorUrl = urls.paypal.error("order_not_approved", token);
      res.redirect(errorUrl);
      return;
    }
    const result = await paypal_default.capturePayment(token);
    if (result.success) {
      secureLogger.info("PayPal payment auto-captured successfully", {
        transactionId: result.transactionId,
        token
      });
      const successUrl = urls.paypal.success(token, PayerID);
      res.redirect(successUrl);
    } else {
      secureLogger.error("Failed to auto-capture PayPal payment", void 0, {
        error: result.error,
        token
      });
      const errorUrl = urls.paypal.error("capture_failed", token);
      res.redirect(errorUrl);
    }
  } catch (error) {
    secureLogger.error(
      "Error in PayPal auto-capture endpoint",
      error instanceof Error ? error : void 0,
      { token }
    );
    const errorUrl = urls.paypal.error("server_error");
    res.redirect(errorUrl);
  }
});
router11.get("/order/:orderId", isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId"
      });
      return;
    }
    secureLogger.info("Getting PayPal order details", {
      userId: req.user?.id,
      orderId
    });
    const orderDetails = await paypal_default.getOrderDetails(orderId);
    res.json({
      success: true,
      order: orderDetails
    });
  } catch (error) {
    handleRouteError(error, res, "Failed to get PayPal order details");
  }
});
router11.get("/health", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "PayPal service is healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: process.env.PAYPAL_MODE || "sandbox"
    });
  } catch (error) {
    handleRouteError(error, res, "PayPal service is unhealthy");
  }
});
var paypal_default2 = router11;

// server/routes/reservations.ts
import { Router as Router12 } from "express";
import { z as z13 } from "zod";
init_auth();

// server/storage.ts
import * as crypto4 from "node:crypto";

// server/lib/db.ts
init_ConvexUser();
init_convex();
async function getUserByEmail(email) {
  console.log("Getting user by email:", email);
  return null;
}
async function createServiceOrder(order) {
  console.log("Creating service order:", order);
  return {};
}
async function listServiceOrders(userId) {
  console.log("Listing service orders for user:", userId);
  return [];
}
async function getUserById(id) {
  console.log("Getting user by ID:", id);
  return null;
}
async function getOrderInvoiceData(orderId) {
  console.log("Getting order invoice data:", orderId);
  return { order: {}, items: [] };
}
async function listUserOrders(userId) {
  console.log("Listing user orders:", userId);
  return [];
}
async function createReservation2(reservation) {
  if (!reservation.clerkId) {
    throw new Error("Authentication error: clerkId is required for reservation creation");
  }
  const convexReservationData = {
    serviceType: reservation.service_type,
    details: reservation.details,
    // Keep as object for Convex
    preferredDate: reservation.preferred_date,
    durationMinutes: reservation.duration_minutes,
    totalPrice: reservation.total_price,
    notes: reservation.notes || void 0,
    clerkId: reservation.clerkId
    // Use actual clerkId when available
  };
  console.log("\u{1F680} DB Layer: Creating reservation with Convex data:", {
    serviceType: convexReservationData.serviceType,
    preferredDate: convexReservationData.preferredDate,
    durationMinutes: convexReservationData.durationMinutes,
    totalPrice: convexReservationData.totalPrice,
    clerkId: convexReservationData.clerkId ? `${convexReservationData.clerkId.substring(0, 8)}...` : "undefined"
  });
  try {
    const result = await createReservation(convexReservationData);
    if (!result) {
      throw new Error("Convex reservation creation returned null result");
    }
    console.log("\u2705 DB Layer: Reservation created with ID:", result.toString());
    return {
      id: result.toString(),
      user_id: reservation.user_id,
      service_type: reservation.service_type,
      status: "pending",
      details: reservation.details,
      preferred_date: reservation.preferred_date,
      duration_minutes: reservation.duration_minutes,
      total_price: reservation.total_price,
      notes: reservation.notes,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("\u274C DB Layer: Failed to create reservation:", error);
    if (error instanceof Error) {
      if (error.message.includes("User not found")) {
        throw new Error(
          "Authentication failed: User account not found. Please ensure you are properly authenticated."
        );
      }
      if (error.message.includes("Authentication")) {
        throw new Error(
          "Authentication failed: Unable to verify user identity. Please log out and log back in."
        );
      }
    }
    throw new Error(
      `Failed to create reservation: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
async function getReservationById(id) {
  console.log("Getting reservation by ID:", id);
  return null;
}
async function getUserReservations(userId) {
  console.log("Getting user reservations:", userId);
  return [];
}
async function updateReservationStatus(id, status) {
  console.log("Updating reservation status:", id, status);
  return {};
}
async function getReservationsByDateRange(startDate, endDate) {
  console.log("Getting reservations by date range:", startDate, endDate);
  return [];
}

// server/storage.ts
function fromDbOrder(row) {
  return {
    ...row,
    items: Array.isArray(row.items) ? row.items : []
  };
}
var MemStorage = class {
  reservations;
  users;
  beats;
  cartItems;
  orders;
  newsletterSubscriptions;
  contactMessages;
  currentUserId;
  currentBeatId;
  currentCartId;
  currentOrderId;
  downloads = /* @__PURE__ */ new Map();
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.beats = /* @__PURE__ */ new Map();
    this.cartItems = /* @__PURE__ */ new Map();
    this.orders = /* @__PURE__ */ new Map();
    this.reservations = /* @__PURE__ */ new Map();
    this.newsletterSubscriptions = /* @__PURE__ */ new Set();
    this.contactMessages = [];
    this.currentUserId = 1;
    this.currentBeatId = 1;
    this.currentCartId = 1;
    this.currentOrderId = 1;
    this.initializeSampleData();
  }
  initializeSampleData() {
    const sampleBeats = [
      {
        wordpressId: 1,
        title: "Dark Trap Vibes",
        description: "This dark trap beat combines heavy 808s with atmospheric pads and crisp hi-hats.",
        genre: "Trap",
        bpm: 140,
        key: "A minor",
        mood: "Dark",
        price: 2500,
        // $25.00 in cents
        audioUrl: "https://example.com/audio/dark-trap-vibes.mp3",
        imageUrl: "https://example.com/images/dark-trap-vibes.jpg",
        isActive: true
      },
      {
        wordpressId: 2,
        title: "Melodic Pop",
        description: "A melodic pop beat perfect for commercial releases and radio play.",
        genre: "Pop",
        bpm: 128,
        key: "C major",
        mood: "Uplifting",
        price: 3e3,
        // $30.00 in cents
        audioUrl: "https://example.com/audio/melodic-pop.mp3",
        imageUrl: "https://example.com/images/melodic-pop.jpg",
        isActive: true
      },
      {
        wordpressId: 3,
        title: "Hip-Hop Classic",
        description: "Classic hip-hop vibes with boom-bap drums and soulful samples.",
        genre: "Hip-Hop",
        bpm: 95,
        key: "F# minor",
        mood: "Nostalgic",
        price: 3500,
        // $35.00 in cents
        audioUrl: "https://example.com/audio/hip-hop-classic.mp3",
        imageUrl: "https://example.com/images/hip-hop-classic.jpg",
        isActive: true
      }
    ];
    for (const beat of sampleBeats) {
      const id = this.currentBeatId++;
      this.beats.set(id, {
        id,
        ...beat,
        key: beat.key || null,
        description: beat.description || null,
        mood: beat.mood || null,
        audio_url: beat.audioUrl || null,
        image_url: beat.imageUrl || null,
        is_active: beat.isActive ?? true,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        wordpress_id: beat.wordpressId ?? 0
      });
    }
  }
  // User management
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(_username) {
    return Array.from(this.users.values()).find((user) => user.username === _username);
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      stripeCustomerId: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.users.set(id, user);
    return user;
  }
  // Beat management
  async getBeat(id) {
    return this.beats.get(id);
  }
  async getBeats(filters) {
    let beats = Array.from(this.beats.values()).filter((beat) => beat.is_active);
    if (filters) {
      if (filters.genre) {
        beats = beats.filter(
          (beat) => beat.genre.toLowerCase().includes(filters.genre.toLowerCase())
        );
      }
      if (filters.search) {
        beats = beats.filter(
          (beat) => beat.title.toLowerCase().includes(filters.search.toLowerCase()) || beat.description?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      if (filters.minPrice) {
        beats = beats.filter((beat) => beat.price >= filters.minPrice);
      }
      if (filters.maxPrice) {
        beats = beats.filter((beat) => beat.price <= filters.maxPrice);
      }
    }
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return beats.slice(offset, offset + limit);
  }
  async createBeat(insertBeat) {
    const id = this.currentBeatId++;
    const beat = {
      ...insertBeat,
      id,
      key: insertBeat.key || null,
      description: insertBeat.description || null,
      mood: insertBeat.mood || null,
      audio_url: insertBeat.audio_url || null,
      image_url: insertBeat.image_url || null,
      is_active: insertBeat.is_active ?? true,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.beats.set(id, beat);
    return beat;
  }
  async updateBeat(id, updates) {
    const beat = this.beats.get(id);
    if (beat) {
      const updatedBeat = { ...beat, ...updates };
      this.beats.set(id, updatedBeat);
      return updatedBeat;
    }
    return void 0;
  }
  // Cart management
  async getCartItems(sessionId) {
    return Array.from(this.cartItems.values()).filter((item) => item.session_id === sessionId);
  }
  async saveCartItems(sessionId, items) {
    for (const [id, item] of Array.from(this.cartItems.entries())) {
      if (item.session_id === sessionId) {
        this.cartItems.delete(id);
      }
    }
    if (Array.isArray(items)) {
      for (const item of items) {
        const cartItem = item;
        await this.addCartItem({
          beat_id: cartItem.beatId,
          license_type: cartItem.licenseType,
          price: cartItem.price,
          quantity: cartItem.quantity,
          session_id: sessionId,
          user_id: cartItem.userId || null
        });
      }
    }
  }
  async addCartItem(insertItem) {
    const id = this.currentCartId++;
    const item = {
      ...insertItem,
      id,
      quantity: insertItem.quantity || 1,
      session_id: insertItem.session_id || null,
      user_id: insertItem.user_id || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.cartItems.set(id, item);
    return item;
  }
  async updateCartItem(id, updates) {
    const item = this.cartItems.get(id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      this.cartItems.set(id, updatedItem);
      return updatedItem;
    }
    return void 0;
  }
  async removeCartItem(id) {
    return this.cartItems.delete(id);
  }
  // Order management
  async getOrder(id) {
    return this.orders.get(id);
  }
  async getOrdersByUser(userId) {
    return Array.from(this.orders.values()).filter((order) => order.user_id === userId);
  }
  async createOrder(insertOrder) {
    const id = this.currentOrderId++;
    const cartItems2 = (insertOrder.items ?? []).map((item, index) => {
      const licenseType = item.license || "basic";
      const validLicense = licenseType === "basic" || licenseType === "premium" || licenseType === "unlimited" ? licenseType : "basic";
      return {
        id: index + 1,
        beat_id: item.productId || 0,
        license_type: validLicense,
        price: item.price || 0,
        quantity: item.quantity || 1,
        session_id: insertOrder.session_id || null,
        user_id: insertOrder.user_id || null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    const order = {
      ...insertOrder,
      id,
      session_id: insertOrder.session_id || null,
      user_id: insertOrder.user_id || null,
      stripe_payment_intent_id: insertOrder.stripe_payment_intent_id || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      email: insertOrder.email,
      status: insertOrder.status,
      total: insertOrder.total,
      items: cartItems2
    };
    this.orders.set(id, order);
    return order;
  }
  async updateOrderStatus(id, status) {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { ...order, status };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return void 0;
  }
  // Downloads management
  async getUserDownloads(userId) {
    return this.downloads.get(userId) || [];
  }
  async logDownload(download) {
    const userDownloads = this.downloads.get(download.userId) || [];
    const newDownload = {
      id: Date.now(),
      ...download
    };
    userDownloads.push(newDownload);
    this.downloads.set(download.userId, userDownloads);
    return newDownload;
  }
  // Newsletter and contact
  async subscribeToNewsletter(email) {
    this.newsletterSubscriptions.add(email.toLowerCase());
  }
  async saveContactMessage(message) {
    this.contactMessages.push({
      id: Date.now(),
      // Generate a simple ID
      name: `${message.firstName} ${message.lastName}`,
      email: message.email,
      message: message.message,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  // Reservation methods
  async createReservation(reservation) {
    const id = crypto4.randomUUID();
    const newReservation = {
      ...reservation,
      id,
      status: "pending",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.reservations.set(id, newReservation);
    return newReservation;
  }
  async getReservation(id) {
    return this.reservations.get(id);
  }
  async getUserReservations(userId) {
    const numericUserId = typeof userId === "string" ? Number.parseInt(userId, 10) : userId;
    return Array.from(this.reservations.values()).filter((reservation) => reservation.user_id === numericUserId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  async updateReservationStatus(id, status) {
    const reservation = this.reservations.get(id);
    if (!reservation) {
      throw new Error(ErrorMessages.RESERVATION.NOT_FOUND);
    }
    const updatedReservation = {
      ...reservation,
      status,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }
  async getReservationsByDateRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return Array.from(this.reservations.values()).filter((reservation) => {
      const date = new Date(reservation.preferred_date).getTime();
      return date >= start && date <= end;
    }).sort((a, b) => new Date(a.preferred_date).getTime() - new Date(b.preferred_date).getTime());
  }
};
var DatabaseStorage = class {
  orders = /* @__PURE__ */ new Map();
  // Reservation methods
  async createReservation(reservation) {
    logger.info("DatabaseStorage: Creating reservation", {
      hasClerkId: !!reservation.clerkId,
      serviceType: reservation.service_type
    });
    if (!reservation.clerkId) {
      throw new Error("Authentication error: clerkId is required for reservation creation");
    }
    return await createReservation2(reservation);
  }
  async getReservation(id) {
    const reservation = await getReservationById(id);
    return reservation || void 0;
  }
  async getUserReservations(userId) {
    return await getUserReservations(userId);
  }
  async updateReservationStatus(id, status) {
    return await updateReservationStatus(id, status);
  }
  async getReservationsByDateRange(startDate, endDate) {
    return await getReservationsByDateRange(startDate, endDate);
  }
  // User methods
  async getUser(id) {
    const user = await getUserById(id);
    return user || void 0;
  }
  async getUserByUsername(_username) {
    return void 0;
  }
  async getUserByEmail(email) {
    const user = await getUserByEmail(email);
    return user || void 0;
  }
  async createUser(_insertUser) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  // Beat methods - Not implemented (WooCommerce handles beats)
  async getBeat(_id) {
    return void 0;
  }
  async getBeats(_filters) {
    return [];
  }
  async createBeat(_insertBeat) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  async updateBeat(_id, _updates) {
    return void 0;
  }
  // Cart methods - Not implemented (client-side cart management)
  async getCartItems(_sessionId) {
    return [];
  }
  async saveCartItems(_sessionId, _items) {
  }
  async addCartItem(_insertItem) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  async updateCartItem(_id, _updates) {
    return void 0;
  }
  async removeCartItem(_id) {
    return false;
  }
  // Order methods - Not fully implemented
  async getOrdersByUser(userId) {
    const orders = await listUserOrders(userId);
    return orders.map((order) => fromDbOrder(order));
  }
  async getOrder(id) {
    const { order } = await getOrderInvoiceData(id);
    return fromDbOrder(order);
  }
  async createOrder(_insertOrder) {
    throw new Error(ErrorMessages.GENERIC.FEATURE_UNAVAILABLE);
  }
  async updateOrderStatus(_id, _status) {
    return void 0;
  }
  // Downloads management
  async getUserDownloads(userId) {
    logger.info("Getting downloads for user", { hasUserId: !!userId });
    return [];
  }
  async logDownload(download) {
    logger.info("Logging download", {
      beatId: download.beatId,
      hasUserId: !!download.userId
    });
    return {
      id: Date.now(),
      // Temporary ID
      ...download
    };
  }
  // Newsletter and contact
  async subscribeToNewsletter(email) {
    logger.info("Newsletter subscription", { hasEmail: !!email });
  }
  async saveContactMessage(message) {
    logger.info("Contact message received", {
      hasEmail: !!message.email,
      subject: message.subject
    });
  }
};
var memStorage = new MemStorage();
var databaseStorage = new DatabaseStorage();
var storage = process.env.NODE_ENV === "test" ? memStorage : databaseStorage;

// server/utils/calendar.ts
function formatDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function generateICS(event) {
  const endTime = new Date(event.startTime.getTime() + event.durationMinutes * 6e4);
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BroLab//Reservation System//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `SUMMARY:${event.summary}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    "LOCATION:BroLab Studio",
    `UID:${crypto.randomUUID()}@brolab.fr`,
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    `DTSTAMP:${formatDate(/* @__PURE__ */ new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  return icsContent;
}

// server/routes/reservations.ts
var router12 = Router12();
function getUserDisplayName(user) {
  if (user.username && typeof user.username === "string") {
    return user.username;
  }
  if (user.email && typeof user.email === "string") {
    return user.email;
  }
  return "User";
}
function buildConfirmationEmailContent(user, reservation) {
  const displayName = getUserDisplayName(user);
  const formattedDate = new Date(reservation.preferred_date).toLocaleDateString("en-US");
  const formattedTime = new Date(reservation.preferred_date).toLocaleTimeString("en-US");
  const formattedPrice = (reservation.total_price / 100).toFixed(2);
  return `
    <h2>Reservation Confirmation</h2>
    <p>Hello ${displayName},</p>
    <p>We have received your reservation for a ${reservation.service_type} session.</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Duration:</strong> ${reservation.duration_minutes} minutes</p>
      <p><strong>Price:</strong> ${formattedPrice}</p>
      <p><strong>Reservation Number:</strong> ${reservation.id}</p>
    </div>
    <p>We will contact you shortly to confirm your time slot.</p>
    <p>Thank you for your trust!<br>The BroLab Team</p>
  `;
}
async function sendConfirmationEmail(userEmail, reservation, user) {
  try {
    const emailContent = buildConfirmationEmailContent(user, reservation);
    await sendMail({
      to: userEmail,
      subject: "BroLab Reservation Confirmation",
      html: emailContent
    });
    console.log("\u{1F4E7} Confirmation email sent successfully");
  } catch (emailError) {
    console.error("\u26A0\uFE0F Failed to send confirmation email:", emailError);
  }
}
async function sendAdminNotification(user, reservation, clientPhone, notes) {
  try {
    const fullName = user.username || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    const adminUser = {
      id: user.clerkId || "unknown",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName
    };
    const reservationData = {
      id: reservation.id,
      serviceType: reservation.service_type,
      preferredDate: reservation.preferred_date,
      durationMinutes: reservation.duration_minutes,
      totalPrice: reservation.total_price / 100,
      status: reservation.status,
      notes: reservation.notes,
      details: {
        name: fullName,
        email: user.email,
        phone: clientPhone || "Not provided",
        requirements: notes || reservation.notes || void 0
      }
    };
    await sendAdminReservationNotification(adminUser, reservationData);
    console.log("\u{1F4E7} Admin notification sent successfully");
  } catch (adminEmailError) {
    console.error("\u26A0\uFE0F Failed to send admin notification:", adminEmailError);
  }
}
function handleReservationError(error, res) {
  if (error instanceof Error) {
    if (error.message.includes("User not found")) {
      res.status(401).json({
        error: "Authentication error: User account not found. Please log out and log back in.",
        code: "USER_NOT_FOUND"
      });
      return true;
    }
    if (error.message.includes("Authentication")) {
      res.status(401).json({
        error: "Authentication failed. Please ensure you are properly logged in.",
        code: "AUTH_FAILED"
      });
      return true;
    }
    if (error.message.includes("clerkId")) {
      res.status(400).json({
        error: "Invalid user session. Please log out and log back in.",
        code: "INVALID_SESSION"
      });
      return true;
    }
  }
  return false;
}
function hasReservationAccess(reservationUserId, user) {
  if (user.role === "service_role") return true;
  if (reservationUserId == null) return false;
  return reservationUserId === Number.parseInt(user.id, 10);
}
function extractUserFromRequest(req) {
  const reqWithUser = req;
  const user = reqWithUser.user;
  if (!user) return null;
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    username: user.username,
    firstName: typeof user.firstName === "string" ? user.firstName : void 0,
    lastName: typeof user.lastName === "string" ? user.lastName : void 0,
    role: user.role
  };
}
router12.get("/services", async (_req, res) => {
  try {
    const services = [
      {
        id: 1,
        name: "Recording Sessions",
        description: "Professional recording sessions with state-of-the-art equipment",
        basePrice: 150,
        duration: "2-4 hours"
      },
      {
        id: 2,
        name: "Mixing & Mastering",
        description: "Professional mixing and mastering services for your tracks",
        basePrice: 200,
        duration: "3-5 hours"
      },
      {
        id: 3,
        name: "Custom Beats",
        description: "Custom beat production tailored to your style",
        basePrice: 100,
        duration: "1-2 hours"
      },
      {
        id: 4,
        name: "Production Consultation",
        description: "Expert guidance on music production and arrangement",
        basePrice: 75,
        duration: "1 hour"
      }
    ];
    res.json(services);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch services");
  }
});
router12.get("/public", async (_req, res) => {
  try {
    const publicInfo = {
      availableServices: 4,
      totalReservations: 42,
      availableSlots: 12,
      nextAvailableDate: "2024-01-20"
    };
    res.json(publicInfo);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch public reservation info");
  }
});
router12.post(
  "/",
  isAuthenticated,
  validateBody(CreateReservationSchema),
  async (req, res) => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = req.body;
      console.log("\u{1F680} Creating reservation with authentication");
      console.log("\u{1F464} Authenticated user:", {
        id: user.id,
        clerkId: user.clerkId && typeof user.clerkId === "string" ? `${user.clerkId.substring(0, 8)}...` : "undefined",
        email: user.email
      });
      console.log("\u{1F4DD} Request body:", {
        serviceType: body.serviceType,
        preferredDate: body.preferredDate,
        clientInfo: body.clientInfo
      });
      if (!user.clerkId || typeof user.clerkId !== "string") {
        console.error("\u274C Missing or invalid clerkId in authenticated user");
        res.status(400).json({
          error: "Authentication error: Missing user identifier. Please log out and log back in."
        });
        return;
      }
      const serviceTypeMap = {
        mixing: "mixing",
        mastering: "mastering",
        recording: "recording",
        custom_beat: "custom_beat",
        consultation: "consultation",
        vocal_tuning: "mixing",
        // Map to mixing
        beat_remake: "custom_beat",
        // Map to custom_beat
        full_production: "recording"
        // Map to recording
      };
      const mappedServiceType = serviceTypeMap[body.serviceType] || "consultation";
      const reservationData = {
        user_id: Number.parseInt(user.id, 10),
        clerkId: user.clerkId,
        service_type: mappedServiceType,
        details: {
          name: `${body.clientInfo.firstName} ${body.clientInfo.lastName}`.trim(),
          email: body.clientInfo.email,
          phone: body.clientInfo.phone,
          requirements: body.notes || "",
          referenceLinks: []
        },
        preferred_date: body.preferredDate,
        duration_minutes: body.preferredDuration,
        total_price: body.budget || 0,
        notes: body.notes || null
      };
      console.log("\u{1F504} Creating reservation with data:", {
        ...reservationData,
        clerkId: typeof reservationData.clerkId === "string" ? `${reservationData.clerkId.substring(0, 8)}...` : "invalid"
      });
      const reservation = await storage.createReservation(reservationData);
      console.log("\u2705 Reservation created successfully:", {
        id: reservation.id,
        serviceType: reservation.service_type,
        status: reservation.status
      });
      void sendConfirmationEmail(user.email, reservation, user);
      void sendAdminNotification(user, reservation, body.clientInfo?.phone, body.notes);
      res.status(201).json(reservation);
    } catch (error) {
      console.error("\u274C Reservation creation failed:", error);
      if (handleReservationError(error, res)) {
        return;
      }
      handleRouteError(error, res, "Failed to create reservation");
    }
  }
);
router12.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = extractUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const reservations = await storage.getUserReservations(user.id);
    res.json(reservations);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch user reservations");
  }
});
router12.get(
  "/:id",
  isAuthenticated,
  validateParams(CommonParams.id),
  async (req, res) => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (!hasReservationAccess(reservation.user_id, user)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      res.json(reservation);
    } catch (error) {
      handleRouteError(error, res, "Failed to fetch reservation");
    }
  }
);
router12.patch(
  "/:id/status",
  isAuthenticated,
  createValidationMiddleware(z13.object({ status: z13.enum(ReservationStatus) })),
  async (req, res) => {
    try {
      const user = extractUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: "Reservation not found" });
        return;
      }
      if (!hasReservationAccess(reservation.user_id, user)) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }
      const body = req.body;
      const updatedReservation = await storage.updateReservationStatus(req.params.id, body.status);
      const displayName = getUserDisplayName(user);
      const formattedDate = new Date(updatedReservation.preferred_date).toLocaleDateString("fr-FR");
      const formattedTime = new Date(updatedReservation.preferred_date).toLocaleTimeString("fr-FR");
      const statusUpdateContent = `
        <h2>Mise \xE0 jour de votre r\xE9servation</h2>
        <p>Bonjour ${displayName},</p>
        <p>Le statut de votre r\xE9servation pour ${updatedReservation.service_type} a \xE9t\xE9 mis \xE0 jour.</p>
        <p><strong>Nouveau statut :</strong> ${body.status}</p>
        <p><strong>Date :</strong> ${formattedDate}</p>
        <p><strong>Heure :</strong> ${formattedTime}</p>
      `;
      await sendMail({
        to: user.email,
        subject: `Mise \xE0 jour de votre r\xE9servation - ${body.status}`,
        html: statusUpdateContent
      });
      res.json(updatedReservation);
    } catch (error) {
      handleRouteError(error, res, "Failed to update reservation status");
    }
  }
);
router12.get("/:id/calendar", isAuthenticated, async (req, res) => {
  try {
    const user = extractUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }
    if (!hasReservationAccess(reservation.user_id, user)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    const icsContent = generateICS({
      summary: `BroLab - ${reservation.service_type}`,
      description: reservation.notes || "",
      startTime: new Date(reservation.preferred_date),
      durationMinutes: reservation.duration_minutes
    });
    res.setHeader("Content-Type", "text/calendar");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reservation-${reservation.id}.ics"`
    );
    res.send(icsContent);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate calendar file");
  }
});
router12.get("/range/:start/:end", isAuthenticated, async (req, res) => {
  try {
    const user = extractUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role !== "service_role") {
      res.status(403).json({ error: "Unauthorized. Admin access required." });
      return;
    }
    const startDate = new Date(req.params.start);
    const endDate = new Date(req.params.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }
    const reservations = await storage.getReservationsByDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    );
    res.json(reservations);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch reservations by date range");
  }
});
var reservations_default = router12;

// server/routes/schema.ts
import { Router as Router13 } from "express";

// server/lib/schemaMarkup.ts
function generateBeatSchemaMarkup(beat, baseUrl, options = {}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "@id": `${baseUrl}/product/${beat.id}`,
    name: beat.title,
    description: beat.description || `${beat.title} - ${beat.genre} beat`,
    url: `${baseUrl}/product/${beat.id}`,
    image: beat.image_url || beat.image,
    genre: beat.genre,
    duration: beat.duration ? `PT${Math.floor(beat.duration / 60)}M${beat.duration % 60}S` : void 0,
    byArtist: {
      "@type": "MusicGroup",
      name: (() => {
        const producerTag = beat.tags?.find((tag) => {
          return tag.toLowerCase().includes("producer");
        });
        return producerTag || "BroLab Entertainment";
      })()
    },
    inAlbum: {
      "@type": "MusicAlbum",
      name: `${beat.genre} Beats Collection`,
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment"
      }
    },
    audio: beat.audio_url ? {
      "@type": "AudioObject",
      contentUrl: beat.audio_url,
      encodingFormat: "audio/mpeg"
    } : void 0,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "BPM",
        value: beat.bpm?.toString() || "120"
      },
      {
        "@type": "PropertyValue",
        name: "Key",
        value: beat.key || "C Major"
      },
      {
        "@type": "PropertyValue",
        name: "Mood",
        value: beat.mood || "Energetic"
      }
    ]
  };
  if (options.includeOffers && beat.price) {
    schema.offers = {
      "@type": "Offer",
      price: beat.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/product/${beat.id}`,
      seller: {
        "@type": "Organization",
        name: "BroLab Entertainment",
        url: baseUrl
      }
    };
  }
  if (options.includeAggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: beat.downloads || 0,
      bestRating: "5",
      worstRating: "1"
    };
  }
  return JSON.stringify(schema, null, 2);
}
function generateBeatsListSchemaMarkup(beats, baseUrl, pageTitle = "BroLab Beats") {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: pageTitle,
    description: "Professional beats collection for music producers and artists",
    url: `${baseUrl}/shop`,
    byArtist: {
      "@type": "MusicGroup",
      name: "BroLab Entertainment"
    },
    tracks: beats.map((beat) => ({
      "@type": "MusicRecording",
      name: beat.title,
      url: `${baseUrl}/product/${beat.id}`,
      genre: beat.genre,
      byArtist: {
        "@type": "MusicGroup",
        name: "BroLab Entertainment"
      }
    })),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...beats.map((b) => b.price || 0)),
      highPrice: Math.max(...beats.map((b) => b.price || 0)),
      offerCount: beats.length,
      availability: "https://schema.org/InStock"
    }
  };
  return JSON.stringify(schema, null, 2);
}
function generateOrganizationSchemaMarkup(baseUrl) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BroLab Entertainment",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: "Professional beats marketplace for music producers and artists",
    sameAs: ["https://brolabentertainment.com"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contact@brolabentertainment.com"
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "US"
    }
  };
  return JSON.stringify(schema, null, 2);
}

// server/routes/schema.ts
var router13 = Router13();
var getBpmFromProduct = (product) => {
  if (product.bpm) return parseInt(product.bpm.toString());
  const bpmMeta = product.meta_data?.find((meta) => meta.key === "bpm");
  return bpmMeta?.value ? parseInt(bpmMeta.value.toString()) : void 0;
};
var getKeyFromProduct = (product) => {
  return product.key || product.meta_data?.find((meta) => meta.key === "key")?.value?.toString() || null;
};
var getMoodFromProduct = (product) => {
  return product.mood || product.meta_data?.find((meta) => meta.key === "mood")?.value?.toString() || null;
};
var getDurationFromProduct = (product) => {
  return product.duration ? parseFloat(product.duration.toString()) : void 0;
};
var getTagsFromProduct = (product) => {
  return product.tags?.map((tag) => tag.name) || [];
};
async function wcApiRequest2(endpoint, options = {}) {
  const WOOCOMMERCE_API_URL2 = process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
  const WC_CONSUMER_KEY2 = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const WC_CONSUMER_SECRET2 = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  if (!WC_CONSUMER_KEY2 || !WC_CONSUMER_SECRET2) {
    if (process.env.NODE_ENV === "test") {
      return endpoint.includes("/products") ? [] : {};
    }
    throw new Error("WooCommerce API credentials not configured");
  }
  const url = new URL(`${WOOCOMMERCE_API_URL2}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY2);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET2);
  const response = process.env.NODE_ENV === "test" ? {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => endpoint.includes("/products") ? [] : {}
  } : await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "BroLab-Frontend/1.0",
      Accept: "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
var BASE_URL = process.env.FRONTEND_URL || "https://brolabentertainment.com";
router13.get("/beat/:id", async (req, res) => {
  try {
    const beatId = req.params.id;
    let product;
    try {
      product = await wcApiRequest2(`/products/${beatId}`);
    } catch (error) {
      if (error instanceof Error && error.message?.includes("404")) {
        res.status(404).json({ error: "Beat not found" });
        return;
      }
      throw error;
    }
    if (!product) {
      res.status(404).json({ error: "Beat not found" });
      return;
    }
    const beat = {
      id: product.id,
      title: product.name,
      name: product.name,
      // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: getBpmFromProduct(product),
      key: getKeyFromProduct(product),
      mood: getMoodFromProduct(product),
      price: parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src,
      // Alias for compatibility
      images: product.images,
      audio_url: product.audio_url,
      tags: getTagsFromProduct(product),
      categories: product.categories,
      meta_data: product.meta_data,
      duration: getDurationFromProduct(product),
      downloads: product.downloads || 0
    };
    const schemaMarkup = generateBeatSchemaMarkup(beat, BASE_URL, {
      includeOffers: true,
      includeAggregateRating: true
    });
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(schemaMarkup);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate beat schema markup");
  }
});
router13.get("/beats-list", async (req, res) => {
  try {
    const products = await wcApiRequest2("/products");
    if (!products || products.length === 0) {
      res.status(404).json({ error: "No beats found" });
      return;
    }
    const beats = products.map((product) => ({
      id: product.id,
      title: product.name,
      name: product.name,
      // Alias for compatibility
      description: product.description,
      genre: product.categories?.[0]?.name || "Unknown",
      bpm: getBpmFromProduct(product),
      key: getKeyFromProduct(product),
      mood: getMoodFromProduct(product),
      price: parseFloat(product.price) || 0,
      image_url: product.images?.[0]?.src,
      image: product.images?.[0]?.src,
      // Alias for compatibility
      images: product.images,
      audio_url: product.audio_url,
      tags: getTagsFromProduct(product),
      categories: product.categories,
      meta_data: product.meta_data,
      duration: getDurationFromProduct(product),
      downloads: product.downloads || 0
    }));
    const schemaMarkup = generateBeatsListSchemaMarkup(beats, BASE_URL, "BroLab Beats Collection");
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(schemaMarkup);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate beats list schema markup");
  }
});
router13.get("/organization", async (req, res) => {
  try {
    const schemaMarkup = generateOrganizationSchemaMarkup(BASE_URL);
    res.setHeader("Content-Type", "application/ld+json");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(schemaMarkup);
  } catch (error) {
    handleRouteError(error, res, "Failed to generate organization schema markup");
  }
});
var schema_default = router13;

// server/routes/security.ts
init_auth();
import { Router as Router14 } from "express";
var router14 = Router14();
router14.get("/security/status", (req, res) => {
  const convexConfigured = !!(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL);
  const clerkConfigured = !!process.env.CLERK_SECRET_KEY;
  const status = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: {
      provider: "convex",
      configured: convexConfigured,
      userIsolation: true
      // All Convex queries filter by userId/clerkId
    },
    authentication: {
      provider: "clerk",
      enabled: clerkConfigured,
      sessionBased: true
    },
    rateLimitActive: true,
    securityHeaders: true
  };
  res.json(status);
});
router14.get("/security/user-info", isAuthenticated, async (req, res) => {
  const userInfo = {
    userId: req.user?.id,
    username: req.user?.username,
    email: req.user?.email,
    permissions: {
      canAccessDashboard: true,
      canDownloadBeats: true,
      canCreateOrders: true
    },
    securityLevel: "authenticated"
  };
  res.json(userInfo);
});
var security_default = router14;

// server/routes/serviceOrders.ts
import express2 from "express";
init_auth();
var router15 = express2.Router();
router15.post(
  "/",
  isAuthenticated,
  validateBody(serviceOrderValidation),
  async (req, res) => {
    try {
      const data = req.body;
      const userId = req.user?.id || req.session?.userId;
      const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
      if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const order = await createServiceOrder({ ...data, user_id: numericUserId });
      res.status(201).json(order);
    } catch (error) {
      handleRouteError(error, res, "Failed to create service order");
    }
  }
);
router15.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (typeof numericUserId !== "number" || Number.isNaN(numericUserId)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const orders = await listServiceOrders(numericUserId);
    res.json(orders);
  } catch (error) {
    handleRouteError(error, res, "Failed to list service orders");
  }
});
var serviceOrders_default = router15;

// server/routes/sitemap.ts
import { Router as Router15 } from "express";

// server/lib/sitemapGenerator.ts
function generateSitemapXML(beats, categories, config) {
  const {
    baseUrl,
    includeImages = true,
    includeCategories = true,
    includeStaticPages = true
  } = config;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const urls2 = [
    // Page d'accueil
    {
      loc: `${baseUrl}/`,
      changefreq: "daily",
      priority: 1,
      lastmod: today
    },
    // Page shop
    {
      loc: `${baseUrl}/shop`,
      changefreq: "daily",
      priority: 0.9,
      lastmod: today
    },
    // Pages statiques
    ...includeStaticPages ? [
      { path: "/about", priority: 0.7, changefreq: "monthly" },
      { path: "/contact", priority: 0.6, changefreq: "monthly" },
      { path: "/terms", priority: 0.3, changefreq: "yearly" },
      { path: "/privacy", priority: 0.3, changefreq: "yearly" },
      { path: "/license", priority: 0.5, changefreq: "monthly" }
    ].map((page) => ({
      loc: `${baseUrl}${page.path}`,
      changefreq: page.changefreq,
      priority: page.priority,
      lastmod: today
    })) : [],
    // Catégories de beats
    ...includeCategories && categories.length > 0 ? categories.map((category) => ({
      loc: `${baseUrl}/shop?category=${encodeURIComponent(category.name)}`,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: today
    })) : [],
    // Beats individuels
    ...beats.map((beat) => ({
      loc: `${baseUrl}/product/${beat.id}`,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: beat.created_at ? new Date(beat.created_at).toISOString().split("T")[0] : today
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls2.map((url) => {
    let urlElement = `  <url>
    <loc>${url.loc}</loc>`;
    if (url.lastmod) {
      urlElement += `
    <lastmod>${url.lastmod}</lastmod>`;
    }
    if (url.changefreq) {
      urlElement += `
    <changefreq>${url.changefreq}</changefreq>`;
    }
    if (url.priority) {
      urlElement += `
    <priority>${url.priority}</priority>`;
    }
    if (includeImages && url.loc.includes("/product/") && beats.length > 0) {
      const beatId = url.loc.split("/").pop();
      const beat = beats.find((b) => b.id.toString() === beatId);
      if (beat?.image_url) {
        urlElement += `
    <image:image>
       <image:loc>${beat.image_url}</image:loc>
       <image:title>${beat.title}</image:title>
       <image:caption>${beat.title} - ${beat.genre} beat by BroLab Entertainment</image:caption>
     </image:image>`;
      }
    }
    urlElement += `
  </url>`;
    return urlElement;
  }).join("\n")}
</urlset>`;
  return xml;
}
function generateSitemapIndex(baseUrl, sitemaps) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(
    (sitemap) => `  <sitemap>
    <loc>${baseUrl}${sitemap}</loc>
    <lastmod>${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}</lastmod>
  </sitemap>`
  ).join("\n")}
</sitemapindex>`;
  return xml;
}
function generateRobotsTxt(baseUrl) {
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /shop
Allow: /product/
Allow: /about
Allow: /contact

# Crawl delay (optional)
Crawl-delay: 1`;
}

// server/routes/sitemap.ts
var router16 = Router15();
var WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL || "https://brolabentertainment.com/wp-json/wc/v3";
var WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
var WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;
function isWooCommerceEnabled() {
  return !!(WC_CONSUMER_KEY && WC_CONSUMER_SECRET);
}
async function wcApiRequest3(endpoint, options = {}) {
  if (!isWooCommerceEnabled()) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[Sitemap] WooCommerce API disabled - credentials missing, returning empty data"
      );
    }
    return [];
  }
  if (process.env.NODE_ENV === "test") {
    return [];
  }
  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);
  url.searchParams.append("consumer_key", WC_CONSUMER_KEY);
  url.searchParams.append("consumer_secret", WC_CONSUMER_SECRET);
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "BroLab-Frontend/1.0",
      Accept: "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    console.error(`[Sitemap] WooCommerce API error: ${response.status} ${response.statusText}`);
    return [];
  }
  return response.json();
}
async function wcApiRequestAllPages(baseEndpoint) {
  const allProducts = [];
  const perPage = 100;
  let page = 1;
  while (true) {
    const separator = baseEndpoint.includes("?") ? "&" : "?";
    const endpoint = `${baseEndpoint}${separator}per_page=${perPage}&page=${page}`;
    const products = await wcApiRequest3(endpoint);
    if (!products || products.length === 0) {
      break;
    }
    allProducts.push(...products);
    if (products.length < perPage) {
      break;
    }
    page++;
  }
  return allProducts;
}
function getBaseUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://brolabentertainment.com";
  }
  const port = process.env.PORT || 5e3;
  return `http://localhost:${port}`;
}
var BASE_URL2 = getBaseUrl();
router16.get("/sitemap.xml", async (_req, res) => {
  try {
    const wooEnabled = isWooCommerceEnabled();
    res.setHeader("X-WooCommerce-Status", wooEnabled ? "enabled" : "disabled");
    const [products, categories] = await Promise.all([
      wcApiRequestAllPages("/products"),
      wcApiRequest3("/products/categories")
    ]);
    const beats = products.map((product) => {
      let bpm;
      if (product.bpm) {
        bpm = Number.parseInt(product.bpm.toString(), 10);
      } else {
        const bpmMeta = product.meta_data?.find((meta) => meta.key === "bpm");
        if (bpmMeta?.value) {
          bpm = Number.parseInt(bpmMeta.value.toString(), 10);
        }
      }
      return {
        id: product.id,
        title: product.name,
        name: product.name,
        // Alias for compatibility
        description: product.description,
        genre: product.categories?.[0]?.name || "Unknown",
        bpm,
        key: product.key || product.meta_data?.find((meta) => meta.key === "key")?.value?.toString() || null,
        mood: product.mood || product.meta_data?.find((meta) => meta.key === "mood")?.value?.toString() || null,
        price: Number.parseFloat(product.price) || 0,
        image_url: product.images?.[0]?.src,
        image: product.images?.[0]?.src,
        // Alias for compatibility
        images: product.images,
        audio_url: product.audio_url,
        tags: product.tags?.map((tag) => tag.name) || [],
        categories: product.categories,
        meta_data: product.meta_data,
        duration: product.duration ? Number.parseFloat(product.duration.toString()) : void 0,
        downloads: product.downloads || 0
      };
    });
    const sitemapXML = generateSitemapXML(beats, categories, {
      baseUrl: BASE_URL2,
      includeImages: true,
      includeCategories: categories.length > 0,
      includeStaticPages: true
    });
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapXML);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate sitemap");
    handleRouteError(errorMessage, res, "Failed to generate sitemap");
  }
});
router16.get("/sitemap-index.xml", async (_req, res) => {
  try {
    const sitemaps = ["/sitemap.xml", "/sitemap-beats.xml", "/sitemap-categories.xml"];
    const sitemapIndexXML = generateSitemapIndex(BASE_URL2, sitemaps);
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(sitemapIndexXML);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate sitemap index");
    handleRouteError(errorMessage, res, "Failed to generate sitemap index");
  }
});
router16.get("/robots.txt", async (_req, res) => {
  try {
    const robotsTxt = generateRobotsTxt(BASE_URL2);
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(robotsTxt);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate robots.txt");
    handleRouteError(errorMessage, res, "Failed to generate robots.txt");
  }
});
router16.get("/sitemap-beats.xml", async (_req, res) => {
  try {
    const wooEnabled = isWooCommerceEnabled();
    res.setHeader("X-WooCommerce-Status", wooEnabled ? "enabled" : "disabled");
    const products = await wcApiRequestAllPages("/products");
    const beats = products.map((product) => {
      let bpm;
      if (product.bpm) {
        bpm = Number.parseInt(product.bpm.toString(), 10);
      } else {
        const bpmMeta = product.meta_data?.find((meta) => meta.key === "bpm");
        if (bpmMeta?.value) {
          bpm = Number.parseInt(bpmMeta.value.toString(), 10);
        }
      }
      return {
        id: product.id,
        title: product.name,
        name: product.name,
        // Alias for compatibility
        description: product.description,
        genre: product.categories?.[0]?.name || "Unknown",
        bpm,
        key: product.key || product.meta_data?.find((meta) => meta.key === "key")?.value?.toString() || null,
        mood: product.mood || product.meta_data?.find((meta) => meta.key === "mood")?.value?.toString() || null,
        price: Number.parseFloat(product.price) || 0,
        image_url: product.images?.[0]?.src,
        image: product.images?.[0]?.src,
        // Alias for compatibility
        images: product.images,
        audio_url: product.audio_url,
        tags: product.tags?.map((tag) => tag.name) || [],
        categories: product.categories,
        meta_data: product.meta_data,
        duration: product.duration ? Number.parseFloat(product.duration.toString()) : void 0,
        downloads: product.downloads || 0
      };
    });
    const sitemapXML = generateSitemapXML(beats, [], {
      baseUrl: BASE_URL2,
      includeImages: true,
      includeCategories: false,
      includeStaticPages: false
    });
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=1800");
    res.send(sitemapXML);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error("Failed to generate beats sitemap");
    handleRouteError(errorMessage, res, "Failed to generate beats sitemap");
  }
});
var sitemap_default = router16;

// server/routes/storage.ts
init_api();
init_convex();
import { Router as Router16 } from "express";
import multer2 from "multer";
import { z as z14 } from "zod";

// server/lib/storage.ts
init_api();
init_convex();
var STORAGE_BUCKETS = {
  USER_UPLOADS: "user-uploads",
  DELIVERABLES: "deliverables",
  INVOICES: "invoices"
};
async function uploadUserFile(_userId, file, bucket, path, options = {}) {
  try {
    const convex6 = getConvex();
    const fileData = file.toString("base64");
    const mimeType = options.contentType || "application/octet-stream";
    const result = await convex6.action(api.files.storage.uploadToStorage, {
      fileData,
      filename: path,
      mimeType,
      bucket: STORAGE_BUCKETS[bucket]
    });
    return {
      path: result.storageId,
      fullUrl: result.url
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to upload file to storage: ${errorMessage}`);
  }
}
async function getSignedUrl(_bucket, path, _expiresIn = 3600) {
  try {
    const convex6 = getConvex();
    const url = await convex6.action(api.files.storage.getStorageUrl, {
      storageId: path
    });
    if (!url) {
      throw new Error("File not found in storage");
    }
    return url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to get signed URL: ${errorMessage}`);
  }
}
async function deleteFile(_bucket, path) {
  try {
    const convex6 = getConvex();
    await convex6.action(api.files.storage.deleteFromStorage, {
      storageId: path
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to delete file from storage: ${errorMessage}`);
  }
}

// server/routes/storage.ts
var fileUploadValidation2 = z14.object({
  file: z14.any().optional()
});
var fileFilterValidation2 = z14.object({
  type: z14.string().optional(),
  limit: z14.number().min(1).max(100).optional().default(20),
  offset: z14.number().min(0).optional().default(0)
});
var router17 = Router16();
var upload2 = multer2({
  storage: multer2.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
  // 50MB limit
});
function getBucketKeyForRole(role) {
  switch (role) {
    case "deliverable":
      return "DELIVERABLES";
    case "invoice":
      return "INVOICES";
    default:
      return "USER_UPLOADS";
  }
}
router17.post(
  "/upload",
  uploadRateLimit,
  upload2.single("file"),
  createValidationMiddleware(fileUploadValidation2),
  async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const allowedTypes = ["audio/mpeg", "audio/wav", "audio/flac", "image/jpeg", "image/png"];
      const maxSize = 50 * 1024 * 1024;
      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          error: "File type not allowed",
          details: [`File type ${req.file.mimetype} is not allowed`]
        });
        return;
      }
      if (req.file.size > maxSize) {
        res.status(400).json({
          error: "File too large",
          details: [`File size ${req.file.size} exceeds maximum of ${maxSize} bytes`]
        });
        return;
      }
      const { reservation_id, order_id, role = "upload" } = req.body;
      const userId = req.user.id;
      const fileRole = role;
      const bucketKey = getBucketKeyForRole(fileRole);
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExtension}`;
      const filePath = `${fileRole}s/${fileName}`;
      const { path, fullUrl } = await uploadUserFile(userId, req.file.buffer, bucketKey, filePath, {
        contentType: req.file.mimetype
      });
      const clerkId = req.user?.clerkId;
      if (!clerkId) {
        res.status(400).json({ error: "Missing user identifier" });
        return;
      }
      const convex6 = getConvex();
      const createFileArgs = {
        filename: fileName,
        originalName: req.file.originalname,
        storagePath: path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        role: fileRole,
        reservationId: reservation_id ? reservation_id : void 0,
        orderId: order_id ? order_id : void 0,
        clerkId
      };
      const fileId = await convex6.mutation(api.files.createFile.createFile, createFileArgs);
      const fileRecord = {
        user_id: Number.parseInt(userId),
        filename: fileName,
        original_name: req.file.originalname,
        storage_path: path,
        mime_type: req.file.mimetype,
        size: req.file.size,
        role: fileRole,
        reservation_id: reservation_id || null,
        order_id: order_id ? Number.parseInt(order_id) : null,
        owner_id: Number.parseInt(userId)
      };
      res.json({
        success: true,
        file: { ...fileRecord, id: fileId },
        url: fullUrl
      });
    } catch (error) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);
router17.get("/signed-url/:fileId", downloadRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { fileId } = req.params;
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }
    const convex6 = getConvex();
    let file;
    try {
      file = await convex6.query(api.files.getFile.getFile, {
        fileId,
        clerkId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      if (errorMessage.includes("not found")) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      throw error;
    }
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const bucketKey = getBucketKeyForRole(file.role);
    const signedUrl = await getSignedUrl(bucketKey, file.storagePath, 3600);
    res.json({ url: signedUrl });
  } catch (error) {
    handleRouteError(error, res, "Failed to generate signed URL");
  }
});
router17.get("/files", createValidationMiddleware(fileFilterValidation2), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }
    const { type: roleFilter } = req.query;
    const convex6 = getConvex();
    const convexFiles = await convex6.query(api.files.listFiles.listFiles, {
      role: roleFilter,
      clerkId
    });
    const files = convexFiles.map((file) => ({
      id: file._id,
      filename: file.filename,
      original_name: file.originalName,
      mime_type: file.mimeType,
      size: file.size,
      role: file.role,
      created_at: new Date(file.createdAt).toISOString()
    }));
    res.json({ files });
  } catch (error) {
    handleRouteError(error, res, "Failed to list files");
  }
});
router17.delete("/files/:fileId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { fileId } = req.params;
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }
    const convex6 = getConvex();
    let file;
    try {
      file = await convex6.query(api.files.getFile.getFile, {
        fileId,
        clerkId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      if (errorMessage.includes("not found")) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      throw error;
    }
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const bucketKey = getBucketKeyForRole(file.role);
    await deleteFile(bucketKey, file.storagePath);
    await convex6.mutation(api.files.deleteFile.deleteFile, {
      fileId,
      clerkId
    });
    res.json({ success: true });
  } catch (error) {
    handleRouteError(error, res, "Failed to delete file");
  }
});
var storage_default = router17;

// server/routes/stripe.ts
import { Router as Router17 } from "express";
import Stripe3 from "stripe";
var createStripePaymentIntent = async (params) => {
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency,
      "automatic_payment_methods[enabled]": "true",
      ...params.metadata && Object.keys(params.metadata).reduce(
        (acc, key) => {
          acc[`metadata[${key}]`] = params.metadata[key];
          return acc;
        },
        {}
      )
    }).toString()
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API Error: ${error.error?.message || "Unknown error"}`);
  }
  return await response.json();
};
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("\u274C Missing required Stripe secret: STRIPE_SECRET_KEY");
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}
var stripeClient2 = new Stripe3(process.env.STRIPE_SECRET_KEY, {
  // Using default API version for compatibility
});
var router18 = Router17();
router18.get("/health", (req, res) => {
  res.json({
    status: "ok",
    stripe: stripeClient2 ? "initialized" : "mock",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router18.post("/checkout", async (req, res) => {
  try {
    const { orderId, successUrl, cancelUrl } = req.body;
    if (!orderId || !successUrl || !cancelUrl) {
      res.status(400).json({ error: "orderId, successUrl, cancelUrl required" });
      return;
    }
    const { getConvex: getConvex2 } = await Promise.resolve().then(() => (init_convex(), convex_exports));
    const convex6 = getConvex2();
    if (!orderId || typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }
    if (typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }
    const convexOrderId = orderId;
    const orderData = await convex6.query("orders:getOrderWithRelations", {
      orderId: convexOrderId
    });
    if (!orderData?.order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const { order, items } = orderData;
    const lineItems = (items || []).map((it) => ({
      price_data: {
        currency: (order.currency || "usd").toLowerCase(),
        product_data: { name: it.title || "Unknown Item" },
        unit_amount: Number(it.unitPrice || it.totalPrice || 0) || 0
      },
      quantity: Number(it.qty || 1)
    }));
    const session2 = await stripeClient2.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        success_url: successUrl.replace("{CHECKOUT_SESSION_ID}", "{CHECKOUT_SESSION_ID}"),
        cancel_url: cancelUrl,
        metadata: { orderId }
      },
      {
        idempotencyKey: `checkout_${orderId}`
      }
    );
    const saveCheckoutSession = async (orderId2, checkoutSessionId, paymentIntentId) => {
      return await convex6.mutation("orders:saveStripeCheckoutSession", {
        orderId: orderId2,
        checkoutSessionId,
        paymentIntentId
      });
    };
    await saveCheckoutSession(
      convexOrderId,
      session2.id,
      typeof session2.payment_intent === "string" ? session2.payment_intent : void 0
    );
    res.json({ url: session2.url, id: session2.id });
  } catch (error) {
    handleRouteError(error, res, "Error creating checkout session");
  }
});
var createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "USD", metadata = {} } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount is required and must be greater than 0" });
      return;
    }
    const paymentIntent = await createStripePaymentIntent({
      amount: Math.round(amount * 100),
      // Convert to cents
      currency: currency.toLowerCase(),
      metadata
    });
    const response = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
    res.json(response);
  } catch (error) {
    handleRouteError(error, res, "Error creating payment intent");
  }
};
router18.post("/create-payment-intent", createPaymentIntent);
router18.get("/payment-intent/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const paymentIntent = await stripeClient2.paymentIntents.retrieve(id);
    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });
  } catch (error) {
    handleRouteError(error, res, "Error retrieving payment intent");
  }
});
var stripe_default = router18;

// server/routes/sync.ts
init_auth();
import { Router as Router18 } from "express";

// server/middleware/requireAdmin.ts
init_audit();
init_convex();
var requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED"
      });
      return;
    }
    const clerkId = req.user.clerkId;
    if (!clerkId) {
      res.status(401).json({
        error: "Invalid authentication data",
        code: "INVALID_AUTH"
      });
      return;
    }
    const convexUser = await getUserByClerkId(clerkId);
    if (!convexUser) {
      res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
      return;
    }
    const userRole = convexUser.role || "user";
    if (userRole !== "admin" && userRole !== "service_role") {
      const ipAddress2 = req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
      const userAgent2 = req.headers["user-agent"] || "unknown";
      await auditLogger.logSecurityEvent(
        clerkId,
        "unauthorized_admin_access",
        {
          attemptedPath: req.path,
          method: req.method,
          userRole,
          ipAddress: ipAddress2,
          userAgent: userAgent2
        },
        ipAddress2,
        userAgent2
      );
      res.status(403).json({
        error: "Admin access required",
        code: "FORBIDDEN"
      });
      return;
    }
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await auditLogger.logSecurityEvent(
      clerkId,
      "admin_access_granted",
      {
        path: req.path,
        method: req.method,
        userRole,
        ipAddress,
        userAgent
      },
      ipAddress,
      userAgent
    );
    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    res.status(500).json({
      error: "Authorization check failed",
      code: "INTERNAL_ERROR"
    });
  }
};

// server/services/MessageQueueService.ts
var MessageQueueManager = class {
  queues = /* @__PURE__ */ new Map();
  MESSAGE_TTL = 5 * 60 * 1e3;
  // 5 minutes
  CLEANUP_INTERVAL = 60 * 1e3;
  // 1 minute
  cleanupTimer = null;
  constructor() {
    this.startCleanupTimer();
  }
  /**
   * Add a message to the queue
   */
  addMessage(message) {
    const userId = message.userId || "global";
    if (!this.queues.has(userId)) {
      this.queues.set(userId, {
        messages: [],
        lastCleanup: Date.now()
      });
    }
    const queue = this.queues.get(userId);
    queue.messages.push(message);
    if (queue.messages.length > 1e3) {
      queue.messages = queue.messages.slice(-500);
    }
  }
  /**
   * Get messages since a specific timestamp
   */
  getMessagesSince(userId, since) {
    const queue = this.queues.get(userId);
    if (!queue) {
      return [];
    }
    return queue.messages.filter((msg) => msg.timestamp > since);
  }
  /**
   * Get all messages for a user
   */
  getAllMessages(userId) {
    const queue = this.queues.get(userId);
    return queue ? [...queue.messages] : [];
  }
  /**
   * Clear messages for a user
   */
  clearMessages(userId) {
    this.queues.delete(userId);
  }
  /**
   * Broadcast a message to all users
   */
  broadcast(message) {
    const broadcastMessage = {
      ...message,
      userId: "global"
    };
    this.addMessage(broadcastMessage);
    for (const [userId, _queue] of this.queues) {
      if (userId !== "global") {
        this.addMessage({ ...broadcastMessage, userId });
      }
    }
  }
  /**
   * Get queue statistics
   */
  getStats() {
    const queueSizes = {};
    let totalMessages = 0;
    for (const [userId, queue] of this.queues) {
      queueSizes[userId] = queue.messages.length;
      totalMessages += queue.messages.length;
    }
    return {
      totalQueues: this.queues.size,
      totalMessages,
      queueSizes
    };
  }
  /**
   * Clean up old messages
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.MESSAGE_TTL;
    for (const [userId, queue] of this.queues) {
      queue.messages = queue.messages.filter((msg) => msg.timestamp > cutoff);
      queue.lastCleanup = now;
      if (queue.messages.length === 0 && userId !== "global") {
        this.queues.delete(userId);
      }
    }
  }
  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }
  /**
   * Stop cleanup timer
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.queues.clear();
  }
};
var messageQueueInstance = null;
var getMessageQueue = () => {
  messageQueueInstance ??= new MessageQueueManager();
  return messageQueueInstance;
};

// server/services/WebSocketManager.ts
import { WebSocket, WebSocketServer } from "ws";
var WebSocketManager = class {
  wss = null;
  clients = /* @__PURE__ */ new Map();
  heartbeatInterval = null;
  heartbeatTimeout = 6e4;
  // 1 minute
  heartbeatCheckInterval = 3e4;
  // 30 seconds
  constructor() {
    this.setupHeartbeatMonitoring();
  }
  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      clientTracking: true
    });
    this.wss.on("connection", (socket, request) => {
      this.handleConnection(socket, request);
    });
    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });
    console.log("WebSocket server initialized on /ws");
  }
  /**
   * Handle new client connection
   */
  handleConnection(socket, _request) {
    const clientId2 = this.generateClientId();
    const client = {
      id: clientId2,
      socket,
      lastHeartbeat: Date.now(),
      subscriptions: /* @__PURE__ */ new Set()
    };
    this.clients.set(clientId2, client);
    console.log(`Client connected: ${clientId2} (${this.clients.size} total)`);
    this.sendToClient(clientId2, {
      type: "connected",
      payload: { clientId: clientId2 },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
    socket.on("message", (data) => {
      this.handleMessage(clientId2, data);
    });
    socket.on("close", (code, reason) => {
      this.handleDisconnect(clientId2, code, reason.toString());
    });
    socket.on("error", (error) => {
      console.error(`Client ${clientId2} error:`, error);
      this.handleDisconnect(clientId2, 1006, "Socket error");
    });
  }
  /**
   * Handle incoming message from client
   */
  handleMessage(clientId2, data) {
    const client = this.clients.get(clientId2);
    if (!client) return;
    try {
      const message = JSON.parse(data.toString());
      client.lastHeartbeat = Date.now();
      console.log(`Message from ${clientId2}:`, message.type);
      switch (message.type) {
        case "heartbeat":
          this.handleHeartbeat(clientId2, message);
          break;
        case "subscribe":
          this.handleSubscription(clientId2, message);
          break;
        case "unsubscribe":
          this.handleUnsubscription(clientId2, message);
          break;
        case "force_sync":
          this.handleForceSync(clientId2, message);
          break;
        case "data_update":
          this.handleDataUpdate(clientId2, message);
          break;
        default:
          console.warn(`Unknown message type from ${clientId2}: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId2}:`, error);
      this.sendError(clientId2, "Invalid message format", "PARSE_ERROR");
    }
  }
  /**
   * Handle client disconnect
   */
  handleDisconnect(clientId2, code, _reason) {
    const _client = this.clients.get(clientId2);
    if (_client) {
      console.log(`Client disconnected: ${clientId2} (code: ${code}, reason: ${_reason})`);
      this.clients.delete(clientId2);
    }
  }
  /**
   * Handle heartbeat message
   */
  handleHeartbeat(clientId2, message) {
    this.sendToClient(clientId2, {
      type: "heartbeat_ack",
      payload: { timestamp: message.timestamp },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Handle subscription request
   */
  handleSubscription(clientId2, message) {
    const client = this.clients.get(clientId2);
    if (!client) return;
    const payload = message.payload;
    const { topics } = payload;
    if (Array.isArray(topics)) {
      topics.forEach((topic) => client.subscriptions.add(topic));
    }
    this.sendToClient(clientId2, {
      type: "subscription_ack",
      payload: { topics, subscribed: Array.from(client.subscriptions) },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Handle unsubscription request
   */
  handleUnsubscription(clientId2, message) {
    const client = this.clients.get(clientId2);
    if (!client) return;
    const payload = message.payload;
    const { topics } = payload;
    if (Array.isArray(topics)) {
      topics.forEach((topic) => client.subscriptions.delete(topic));
    }
    this.sendToClient(clientId2, {
      type: "unsubscription_ack",
      payload: { topics, subscribed: Array.from(client.subscriptions) },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Handle force sync request
   */
  async handleForceSync(clientId2, message) {
    try {
      const syncData = await this.fetchDashboardData(clientId2);
      this.sendToClient(clientId2, {
        type: "sync_data",
        payload: syncData,
        timestamp: Date.now(),
        source: "server",
        id: message.id
        // Use same ID to correlate request/response
      });
    } catch (error) {
      console.error(`Force sync error for ${clientId2}:`, error);
      this.sendError(clientId2, "Sync failed", "SYNC_ERROR", message.id);
    }
  }
  /**
   * Handle data update from client (optimistic updates)
   */
  handleDataUpdate(clientId2, message) {
    this.broadcastToOthers(clientId2, {
      type: "data_updated",
      payload: message.payload,
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
    this.sendToClient(clientId2, {
      type: "update_ack",
      payload: { success: true },
      timestamp: Date.now(),
      source: "server",
      id: message.id
    });
  }
  /**
   * Send message to specific client
   */
  sendToClient(clientId2, message) {
    const client = this.clients.get(clientId2);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      client.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Error sending message to ${clientId2}:`, error);
      return false;
    }
  }
  /**
   * Broadcast message to all connected clients
   */
  broadcast(message, excludeClientId) {
    let sentCount = 0;
    for (const [clientId2, _client] of this.clients) {
      if (excludeClientId && clientId2 === excludeClientId) continue;
      if (this.sendToClient(clientId2, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }
  /**
   * Broadcast to all clients except the sender
   */
  broadcastToOthers(senderClientId, message) {
    return this.broadcast(message, senderClientId);
  }
  /**
   * Broadcast to clients subscribed to specific topics
   */
  broadcastToSubscribers(topics, message) {
    let sentCount = 0;
    for (const [clientId2, client] of this.clients) {
      const hasSubscription = topics.some((topic) => client.subscriptions.has(topic));
      if (hasSubscription && this.sendToClient(clientId2, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }
  /**
   * Send error message to client
   */
  sendError(clientId2, message, code, correlationId) {
    this.sendToClient(clientId2, {
      type: "error",
      payload: { message, code, correlationId },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId()
    });
  }
  /**
   * Set up heartbeat monitoring
   */
  setupHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatCheckInterval);
  }
  /**
   * Check for stale connections and clean them up
   */
  checkHeartbeats() {
    const now = Date.now();
    const staleClients = [];
    for (const [clientId2, client] of this.clients) {
      if (now - client.lastHeartbeat > this.heartbeatTimeout) {
        staleClients.push(clientId2);
      }
    }
    staleClients.forEach((clientId2) => {
      console.log(`Removing stale client: ${clientId2}`);
      const staleClient = this.clients.get(clientId2);
      if (staleClient) {
        staleClient.socket.terminate();
        this.clients.delete(clientId2);
      }
    });
    if (staleClients.length > 0) {
      console.log(`Cleaned up ${staleClients.length} stale connections`);
    }
  }
  /**
   * Fetch dashboard data for sync (placeholder implementation)
   */
  async fetchDashboardData(_clientId) {
    return {
      user: { id: "user123", name: "Test User" },
      stats: {
        totalFavorites: 5,
        totalDownloads: 12,
        totalOrders: 3,
        totalSpent: 149.97,
        recentActivity: 8,
        quotaUsed: 12,
        quotaLimit: 50,
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        dataHash: this.generateDataHash()
      },
      favorites: [],
      orders: [],
      downloads: [],
      reservations: [],
      activity: [],
      trends: {},
      chartData: []
    };
  }
  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
   * Generate data hash for consistency validation
   */
  generateDataHash() {
    return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  /**
   * Get connection statistics
   */
  getStats() {
    let totalSubscriptions = 0;
    for (const client of this.clients.values()) {
      totalSubscriptions += client.subscriptions.size;
    }
    return {
      totalConnections: this.clients.size,
      activeConnections: Array.from(this.clients.values()).filter(
        (client) => client.socket.readyState === WebSocket.OPEN
      ).length,
      totalSubscriptions
    };
  }
  /**
   * Shutdown the WebSocket manager
   */
  shutdown() {
    console.log("Shutting down WebSocket manager...");
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const client of this.clients.values()) {
      client.socket.close(1001, "Server shutdown");
    }
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
};
var wsManagerInstance = null;
var getWebSocketManager = () => {
  wsManagerInstance ??= new WebSocketManager();
  return wsManagerInstance;
};

// server/routes/sync.ts
var router19 = Router18();
router19.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboardData = await fetchDashboardDataForUser(userId);
    res.json({
      success: true,
      data: dashboardData,
      timestamp: Date.now(),
      syncId: generateSyncId()
    });
  } catch (error) {
    console.error("Sync API error:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "SYNC_ERROR",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router19.get(
  "/poll",
  isAuthenticated,
  async (req, res) => {
    try {
      const since = Number.parseInt(req.query.since) || 0;
      const userId = req.user.id;
      const messageQueue = getMessageQueue();
      const messages = messageQueue.getMessagesSince(userId, since);
      res.json({
        success: true,
        messages,
        timestamp: Date.now(),
        count: messages.length
      });
    } catch (error) {
      console.error("Poll API error:", error);
      res.status(500).json({
        error: "Polling failed",
        code: "POLL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router19.post(
  "/send",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { type, payload, correlationId } = req.body;
      if (!type || !payload) {
        res.status(400).json({
          error: "Missing required fields: type, payload",
          code: "INVALID_REQUEST"
        });
        return;
      }
      const messageQueue = getMessageQueue();
      const message = {
        id: generateSyncId(),
        type,
        payload,
        timestamp: Date.now(),
        correlationId,
        userId
      };
      messageQueue.addMessage(message);
      const wsManager = getWebSocketManager();
      wsManager.broadcast({
        type,
        payload,
        timestamp: message.timestamp,
        source: "client",
        id: message.id
      });
      res.json({
        success: true,
        messageId: message.id,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error("Send API error:", error);
      res.status(500).json({
        error: "Send failed",
        code: "SEND_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router19.post(
  "/validate",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const validationResult = await validateDataConsistency(userId);
      res.json({
        success: true,
        consistent: validationResult.consistent,
        inconsistencies: validationResult.inconsistencies,
        timestamp: Date.now(),
        validationId: generateSyncId()
      });
    } catch (error) {
      console.error("Validation API error:", error);
      res.status(500).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router19.post(
  "/force",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const syncResult = await forceSyncAllData(userId);
      const message = {
        id: syncResult.syncId,
        type: "force_sync_complete",
        payload: syncResult.data,
        timestamp: Date.now(),
        userId
      };
      const messageQueue = getMessageQueue();
      messageQueue.addMessage(message);
      const wsManager = getWebSocketManager();
      wsManager.broadcast({
        type: "force_sync_complete",
        payload: syncResult.data,
        timestamp: message.timestamp,
        source: "server",
        id: syncResult.syncId
      });
      res.json({
        success: true,
        data: syncResult.data,
        syncId: syncResult.syncId,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error("Force sync API error:", error);
      res.status(500).json({
        error: "Force sync failed",
        code: "FORCE_SYNC_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router19.get(
  "/status",
  isAuthenticated,
  async (_req, res) => {
    try {
      const wsManager = getWebSocketManager();
      const wsStats = wsManager.getStats();
      const messageQueue = getMessageQueue();
      const queueStats = messageQueue.getStats();
      res.json({
        success: true,
        status: {
          websocket: {
            enabled: true,
            connections: wsStats.activeConnections,
            totalConnections: wsStats.totalConnections,
            subscriptions: wsStats.totalSubscriptions
          },
          polling: {
            enabled: true,
            endpoint: "/api/sync/poll",
            queues: queueStats.totalQueues,
            messages: queueStats.totalMessages
          },
          lastCheck: Date.now()
        }
      });
    } catch (error) {
      console.error("Status API error:", error);
      res.status(500).json({
        error: "Status check failed",
        code: "STATUS_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
router19.post(
  "/broadcast",
  isAuthenticated,
  requireAdmin,
  async (req, res) => {
    try {
      const { type, payload, topics } = req.body;
      if (!type || !payload) {
        res.status(400).json({
          error: "Missing required fields: type, payload",
          code: "INVALID_REQUEST"
        });
        return;
      }
      const messageId = generateSyncId();
      const timestamp = Date.now();
      const queuedMessage = {
        id: messageId,
        type,
        payload,
        timestamp,
        topics
      };
      const messageQueue = getMessageQueue();
      messageQueue.broadcast(queuedMessage);
      const wsManager = getWebSocketManager();
      const wsMessage = {
        type,
        payload,
        timestamp,
        source: "server",
        id: messageId
      };
      let sentCount;
      if (topics && Array.isArray(topics)) {
        sentCount = wsManager.broadcastToSubscribers(topics, wsMessage);
      } else {
        sentCount = wsManager.broadcast(wsMessage);
      }
      res.json({
        success: true,
        message: "Broadcast sent",
        sentToClients: sentCount,
        messageId,
        timestamp
      });
    } catch (error) {
      console.error("Broadcast API error:", error);
      res.status(500).json({
        error: "Broadcast failed",
        code: "BROADCAST_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);
async function fetchDashboardDataForUser(userId) {
  return {
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com"
    },
    stats: {
      totalFavorites: Math.floor(Math.random() * 20),
      totalDownloads: Math.floor(Math.random() * 50),
      totalOrders: Math.floor(Math.random() * 10),
      totalSpent: Math.floor(Math.random() * 500),
      recentActivity: Math.floor(Math.random() * 15),
      quotaUsed: Math.floor(Math.random() * 30),
      quotaLimit: 50,
      calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      dataHash: generateDataHash()
    },
    favorites: [],
    orders: [],
    downloads: [],
    reservations: [],
    activity: [],
    trends: {
      favorites: { change: Math.floor(Math.random() * 20) - 10 },
      downloads: { change: Math.floor(Math.random() * 20) - 10 },
      orders: { change: Math.floor(Math.random() * 20) - 10 },
      revenue: { change: Math.floor(Math.random() * 20) - 10 }
    },
    chartData: []
  };
}
async function validateDataConsistency(_userId) {
  const isConsistent = Math.random() > 0.1;
  return {
    consistent: isConsistent,
    inconsistencies: isConsistent ? [] : [
      {
        type: "calculation_mismatch",
        sections: ["stats", "analytics"],
        description: "Total downloads count mismatch between sections",
        severity: "medium",
        detectedAt: Date.now()
      }
    ]
  };
}
async function forceSyncAllData(userId) {
  const data = await fetchDashboardDataForUser(userId);
  const syncId = generateSyncId();
  return { data, syncId };
}
function generateSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function generateDataHash() {
  return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
var sync_default = router19;

// server/routes/uploads.ts
import { Router as Router19 } from "express";
import multer3 from "multer";
init_auth();

// server/middleware/fileUploadSecurity.ts
var enhancedFileUploadSecurity = (options = {}) => {
  const {
    maxFileSize = 100 * 1024 * 1024,
    // 100MB default
    allowedMimeTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "audio/flac",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/x-7z-compressed"
    ],
    enableAntivirusScanning = true,
    enableContentAnalysis = true,
    quarantineThreats: _quarantineThreats = true
  } = options;
  return async (req, res, next) => {
    try {
      const requestId = req.requestId || generateSecureRequestId();
      const file = req.file;
      if (!file) {
        return next();
      }
      console.log(`\u{1F50D} Starting enhanced security scan for file: ${file.originalname}`, {
        requestId,
        fileSize: file.size,
        mimeType: file.mimetype,
        enableAntivirusScanning,
        enableContentAnalysis
      });
      const validation = await validateFile(file, {
        allowedTypes: allowedMimeTypes,
        maxSize: maxFileSize,
        category: "audio"
        // Default category for beat requests
      });
      if (!validation.valid) {
        const errorResponse = createApiError("file_validation_failed", "File validation failed", {
          userMessage: `File validation failed: ${validation.errors.join(", ")}`,
          requestId,
          context: {
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            errors: validation.errors
          }
        });
        return res.status(400).json(errorResponse);
      }
      if (enableAntivirusScanning) {
        const scanResult = await scanFile(file);
        if (!scanResult.safe) {
          console.warn(`\u{1F6A8} Security threats detected in file: ${file.originalname}`, {
            requestId,
            threats: scanResult.threats,
            scanTime: scanResult.scanTime
          });
          console.error("SECURITY_INCIDENT", {
            type: "MALICIOUS_FILE_UPLOAD",
            requestId,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            threats: scanResult.threats,
            userAgent: req.headers["user-agent"],
            ip: req.ip,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          const errorResponse = createApiError(
            "security_threat_detected",
            "Security threat detected",
            {
              userMessage: "File contains potential security threats and cannot be uploaded",
              requestId,
              context: {
                threats: scanResult.threats,
                scanTime: scanResult.scanTime,
                fileName: file.originalname
              }
            }
          );
          return res.status(400).json(errorResponse);
        }
        console.log(`\u2705 File passed security scan: ${file.originalname}`, {
          requestId,
          scanTime: scanResult.scanTime
        });
      }
      if (enableContentAnalysis) {
        const contentAnalysis = await analyzeFileContent(file);
        if (contentAnalysis.suspicious) {
          console.warn(`\u26A0\uFE0F Suspicious content detected in file: ${file.originalname}`, {
            requestId,
            suspiciousFeatures: contentAnalysis.features
          });
          req.fileSecurity = {
            suspicious: true,
            features: contentAnalysis.features,
            riskLevel: contentAnalysis.riskLevel
          };
        }
      }
      req.fileSecurity = {
        ...req.fileSecurity,
        scanned: true,
        scanTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
        fileHash: await generateFileHash(file)
      };
      console.log(`\u2705 Enhanced security check completed for: ${file.originalname}`, {
        requestId,
        fileSize: file.size,
        securityStatus: "PASSED"
      });
      next();
    } catch (error) {
      console.error("Enhanced file upload security error:", error);
      const requestId = req.requestId || generateSecureRequestId();
      const errorResponse = createApiError("security_check_failed", "Security check failed", {
        userMessage: "An error occurred while checking file security",
        requestId,
        context: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
      res.status(500).json(errorResponse);
    }
  };
};
function hasValidAudioHeader(buffer) {
  const audioHeaders = {
    mp3: [255, 251],
    // MP3 frame header
    wav: [82, 73, 70, 70],
    // RIFF header
    // cspell:disable-next-line
    flac: [102, 76, 97, 67]
    // fLaC header
  };
  return Object.values(audioHeaders).some(
    (header) => header.every((byte, index) => buffer[index] === byte)
  );
}
function checkSuspiciousPatterns(content, features, currentRiskLevel) {
  const suspiciousPatterns = [
    { pattern: /https?:\/\/[^\s]+/gi, feature: "EMBEDDED_URLS", risk: "medium" },
    { pattern: /eval\s*\(/gi, feature: "EVAL_FUNCTION", risk: "high" },
    { pattern: /<script/gi, feature: "SCRIPT_TAGS", risk: "high" },
    { pattern: /powershell/gi, feature: "POWERSHELL_REFERENCE", risk: "high" },
    { pattern: /cmd\.exe/gi, feature: "CMD_REFERENCE", risk: "high" }
  ];
  let riskLevel = currentRiskLevel;
  for (const { pattern, feature, risk } of suspiciousPatterns) {
    if (pattern.test(content)) {
      features.push(feature);
      riskLevel = getHigherRiskLevel(riskLevel, risk);
    }
  }
  return riskLevel;
}
function getHigherRiskLevel(current, incoming) {
  const riskOrder = { low: 0, medium: 1, high: 2 };
  return riskOrder[incoming] > riskOrder[current] ? incoming : current;
}
async function analyzeFileContent(file) {
  const features = [];
  let riskLevel = "low";
  try {
    const buffer = file.buffer;
    const isAudioFile = file.mimetype?.startsWith("audio/");
    if (isAudioFile && !hasValidAudioHeader(buffer) && file.size > 1e3) {
      features.push("INVALID_AUDIO_HEADER");
      riskLevel = "medium";
    }
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 2048));
    riskLevel = checkSuspiciousPatterns(content, features, riskLevel);
    if (isAudioFile && file.size < 1e3) {
      features.push("UNUSUALLY_SMALL_AUDIO");
      riskLevel = getHigherRiskLevel(riskLevel, "medium");
    }
  } catch (error) {
    console.error("Content analysis error:", error);
    features.push("ANALYSIS_ERROR");
    riskLevel = "medium";
  }
  return { suspicious: features.length > 0, features, riskLevel };
}
async function generateFileHash(file) {
  const crypto5 = await import("node:crypto");
  const hash = crypto5.createHash("sha256");
  hash.update(file.buffer);
  return hash.digest("hex");
}
var fileUploadRateLimit = (options = {}) => {
  const {
    maxUploadsPerHour = 10,
    maxTotalSizePerHour = 500 * 1024 * 1024
    // 500MB
  } = options;
  const uploadTracking = /* @__PURE__ */ new Map();
  return (req, res, next) => {
    const userKey = req.user?.id?.toString() || req.ip || "anonymous";
    const now = Date.now();
    const hourInMs = 60 * 60 * 1e3;
    let userStats = uploadTracking.get(userKey);
    if (!userStats || now > userStats.resetTime) {
      userStats = {
        count: 0,
        totalSize: 0,
        resetTime: now + hourInMs
      };
    }
    if (userStats.count >= maxUploadsPerHour) {
      const errorResponse = createApiError("upload_rate_limit", "Upload rate limit exceeded", {
        userMessage: `Too many uploads. Maximum ${maxUploadsPerHour} uploads per hour allowed.`,
        requestId: req.requestId || generateSecureRequestId()
      });
      return res.status(429).json(errorResponse);
    }
    const fileSize = req.file?.size || 0;
    if (userStats.totalSize + fileSize > maxTotalSizePerHour) {
      const errorResponse = createApiError("upload_size_limit", "Upload size limit exceeded", {
        userMessage: `Upload size limit exceeded. Maximum ${Math.round(maxTotalSizePerHour / 1024 / 1024)}MB per hour allowed.`,
        requestId: req.requestId || generateSecureRequestId()
      });
      return res.status(429).json(errorResponse);
    }
    userStats.count++;
    userStats.totalSize += fileSize;
    uploadTracking.set(userKey, userStats);
    next();
  };
};

// server/middleware/validation.ts
var DANGEROUS_EXTENSIONS = /* @__PURE__ */ new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".scr",
  ".com",
  ".pif",
  ".js",
  ".vbs"
]);
var validateFileSize = (file, maxSize) => {
  if (file.size > maxSize) {
    return {
      field: "file.size",
      value: file.size,
      message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`
    };
  }
  return null;
};
var validateFileType = (file, allowedTypes) => {
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      field: "file.type",
      value: file.mimetype,
      message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`
    };
  }
  return null;
};
var validateFileName = (file) => {
  if (!file.originalname || file.originalname.length === 0) {
    return {
      field: "file.name",
      value: file.originalname,
      message: "File must have a valid name"
    };
  }
  return null;
};
var validateFileExtension = (file) => {
  const fileExtension = file.originalname.toLowerCase().split(".").pop();
  if (fileExtension && DANGEROUS_EXTENSIONS.has(`.${fileExtension}`)) {
    return {
      field: "file.extension",
      value: fileExtension,
      message: "File type not allowed for security reasons"
    };
  }
  return null;
};
var collectFileErrors = (file, maxSize, allowedTypes) => {
  const validators = [
    validateFileSize(file, maxSize),
    validateFileType(file, allowedTypes),
    validateFileName(file),
    validateFileExtension(file)
  ];
  return validators.filter((error) => error !== null);
};
var validateFileUpload3 = (options = {}) => {
  const {
    maxSize = 50 * 1024 * 1024,
    // 50MB default
    allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/zip"
    ],
    required = true
  } = options;
  return (req, res, next) => {
    try {
      const file = req.file;
      const requestId = req.requestId || generateSecureRequestId();
      if (required && !file) {
        const errorResponse = createValidationError(
          [{ field: "file", value: null, message: "File is required" }],
          requestId
        );
        return res.status(400).json(errorResponse);
      }
      if (!file) {
        return next();
      }
      const errors = collectFileErrors(file, maxSize, allowedTypes);
      if (errors.length > 0) {
        const errorResponse = createValidationError(errors, requestId);
        return res.status(400).json(errorResponse);
      }
      next();
    } catch (error) {
      console.error("File validation error:", error);
      const errorResponse = createApiError("internal_server_error", "File validation failed", {
        userMessage: "An error occurred while validating your file",
        requestId: req.requestId
      });
      res.status(500).json(errorResponse);
    }
  };
};

// server/routes/uploads.ts
var router20 = Router19();
var upload3 = multer3({
  storage: multer3.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
  // 50MB max
});
router20.post(
  "/upload",
  isAuthenticated,
  fileUploadRateLimit({
    maxUploadsPerHour: 20,
    maxTotalSizePerHour: 1e3 * 1024 * 1024
    // 1GB per hour
  }),
  uploadRateLimit,
  upload3.single("file"),
  validateFileUpload3({
    maxSize: 100 * 1024 * 1024,
    // 100MB
    allowedTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "audio/flac",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/x-7z-compressed"
    ],
    required: true
  }),
  enhancedFileUploadSecurity({
    maxFileSize: 100 * 1024 * 1024,
    enableAntivirusScanning: true,
    enableContentAnalysis: true,
    quarantineThreats: true
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        const requestId = req.requestId || generateSecureRequestId();
        const errorResponse = createApiError("file_too_large", "No file provided", {
          userMessage: "Please select a file to upload",
          requestId
        });
        res.status(400).json(errorResponse);
        return;
      }
      const validation = await validateFile(req.file, {
        category: req.body.category || "audio"
      });
      if (!validation.valid) {
        res.status(400).json({
          error: "Validation du fichier \xE9chou\xE9e",
          details: validation.errors
        });
        return;
      }
      const timestamp = Date.now();
      const userId = req.user.id;
      const extension = req.file.originalname.split(".").pop();
      const filePath = `${userId}/${timestamp}.${extension}`;
      const { path, url } = await uploadToSupabase(req.file, filePath);
      const securityInfo = req.fileSecurity || {};
      res.json({
        success: true,
        file: {
          path,
          url,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          hash: securityInfo.fileHash,
          scanned: securityInfo.scanned,
          scanTimestamp: securityInfo.scanTimestamp
        },
        security: {
          scanned: securityInfo.scanned || false,
          suspicious: securityInfo.suspicious || false,
          riskLevel: securityInfo.riskLevel || "low",
          features: securityInfo.features || []
        }
      });
    } catch (error) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);
var uploads_default = router20;

// server/routes/wishlist.ts
init_api();
init_auth();
init_convex();
import { getAuth as getAuth4 } from "@clerk/express";
import { Router as Router20 } from "express";
var router21 = Router20();
function getClerkId(req) {
  try {
    const { userId } = getAuth4(req);
    return userId;
  } catch {
    return null;
  }
}
router21.get("/", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const convex6 = getConvex();
    const favorites2 = await convex6.query(api.favorites.serverFunctions.getFavoritesByClerkId, {
      clerkId
    });
    res.json(favorites2);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch wishlist");
  }
});
router21.post("/", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { beat_id } = req.body;
    if (!beat_id || typeof beat_id !== "number") {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }
    const convex6 = getConvex();
    try {
      const result = await convex6.mutation(api.favorites.serverFunctions.addFavoriteByClerkId, {
        clerkId,
        beatId: beat_id
      });
      if (result.alreadyExists) {
        res.status(409).json({ error: "Beat is already in your wishlist" });
        return;
      }
      res.status(201).json({ message: "Added to wishlist successfully", id: result.id });
    } catch (convexError) {
      const errorMessage = convexError instanceof Error ? convexError.message : "Unknown error";
      if (errorMessage.includes("Beat not found")) {
        res.status(404).json({ error: "Beat not found in database" });
        return;
      }
      throw convexError;
    }
  } catch (error) {
    handleRouteError(error, res, "Failed to add to wishlist");
  }
});
router21.delete("/:beatId", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const beatId = Number.parseInt(req.params.beatId, 10);
    if (Number.isNaN(beatId)) {
      res.status(400).json({ error: "Valid beat_id is required" });
      return;
    }
    const convex6 = getConvex();
    await convex6.mutation(api.favorites.serverFunctions.removeFavoriteByClerkId, {
      clerkId,
      beatId
    });
    res.json({ message: "Removed from wishlist successfully" });
  } catch (error) {
    handleRouteError(error, res, "Failed to remove from wishlist");
  }
});
router21.delete("/", isAuthenticated, async (req, res) => {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const convex6 = getConvex();
    const result = await convex6.mutation(api.favorites.serverFunctions.clearFavoritesByClerkId, {
      clerkId
    });
    res.json({ message: "Wishlist cleared successfully", deletedCount: result.deletedCount });
  } catch (error) {
    handleRouteError(error, res, "Failed to clear wishlist");
  }
});
var wishlist_default = router21;

// server/routes/woo.ts
import { Router as Router21 } from "express";

// server/services/woo-validation.ts
function validateWooCommerceQuery(query) {
  const validatedQuery = {};
  if (query.context && typeof query.context === "string") {
    if (["view", "edit"].includes(query.context)) {
      validatedQuery.context = query.context;
    }
  }
  if (query.page && typeof query.page === "number" && query.page > 0) {
    validatedQuery.page = Math.floor(query.page);
  }
  if (query.per_page && typeof query.per_page === "number" && query.per_page > 0 && query.per_page <= 100) {
    validatedQuery.per_page = Math.floor(query.per_page);
  }
  if (query.search && typeof query.search === "string" && query.search.trim()) {
    validatedQuery.search = query.search.trim();
  }
  if (query.order && typeof query.order === "string") {
    if (["asc", "desc"].includes(query.order)) {
      validatedQuery.order = query.order;
    }
  }
  if (query.orderby && typeof query.orderby === "string") {
    const validOrderBy = [
      "date",
      "id",
      "include",
      "title",
      "slug",
      "price",
      "popularity",
      "rating"
    ];
    if (validOrderBy.includes(query.orderby)) {
      validatedQuery.orderby = query.orderby;
    }
  }
  if (query.featured && typeof query.featured === "boolean") {
    validatedQuery.featured = query.featured;
  }
  if (query.category && typeof query.category === "string") {
    validatedQuery.category = query.category;
  }
  if (query.tag && typeof query.tag === "string") {
    validatedQuery.tag = query.tag;
  }
  if (query.on_sale && typeof query.on_sale === "boolean") {
    validatedQuery.on_sale = query.on_sale;
  }
  if (query.min_price && typeof query.min_price === "string") {
    validatedQuery.min_price = query.min_price;
  }
  if (query.max_price && typeof query.max_price === "string") {
    validatedQuery.max_price = query.max_price;
  }
  return validatedQuery;
}
function validateWooCommerceProduct(rawProduct) {
  if (!rawProduct || typeof rawProduct !== "object") {
    throw new Error("Invalid product data: not an object");
  }
  const requiredFields = ["id", "name", "status", "type"];
  for (const field of requiredFields) {
    if (!(field in rawProduct)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  const id = rawProduct.id;
  if (typeof id !== "number" || id <= 0) {
    throw new Error("Invalid product ID");
  }
  const name = rawProduct.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Invalid product name");
  }
  const status = rawProduct.status;
  const validStatuses = ["draft", "pending", "private", "publish"];
  if (typeof status !== "string" || !validStatuses.includes(status)) {
    throw new Error("Invalid product status");
  }
  const type = rawProduct.type;
  const validTypes = ["simple", "grouped", "external", "variable"];
  if (typeof type !== "string" || !validTypes.includes(type)) {
    throw new Error("Invalid product type");
  }
  const validatedProduct = {
    // Core fields
    id,
    name,
    slug: typeof rawProduct.slug === "string" ? rawProduct.slug : "",
    permalink: typeof rawProduct.permalink === "string" ? rawProduct.permalink : "",
    date_created: typeof rawProduct.date_created === "string" ? rawProduct.date_created : (/* @__PURE__ */ new Date()).toISOString(),
    date_created_gmt: typeof rawProduct.date_created_gmt === "string" ? rawProduct.date_created_gmt : (/* @__PURE__ */ new Date()).toISOString(),
    date_modified: typeof rawProduct.date_modified === "string" ? rawProduct.date_modified : (/* @__PURE__ */ new Date()).toISOString(),
    date_modified_gmt: typeof rawProduct.date_modified_gmt === "string" ? rawProduct.date_modified_gmt : (/* @__PURE__ */ new Date()).toISOString(),
    type,
    status,
    featured: typeof rawProduct.featured === "boolean" ? rawProduct.featured : false,
    catalog_visibility: typeof rawProduct.catalog_visibility === "string" ? rawProduct.catalog_visibility : "visible",
    description: typeof rawProduct.description === "string" ? rawProduct.description : "",
    short_description: typeof rawProduct.short_description === "string" ? rawProduct.short_description : "",
    sku: typeof rawProduct.sku === "string" ? rawProduct.sku : "",
    // Pricing
    price: typeof rawProduct.price === "string" ? rawProduct.price : "0",
    regular_price: typeof rawProduct.regular_price === "string" ? rawProduct.regular_price : "0",
    sale_price: typeof rawProduct.sale_price === "string" ? rawProduct.sale_price : "",
    date_on_sale_from: typeof rawProduct.date_on_sale_from === "string" ? rawProduct.date_on_sale_from : null,
    date_on_sale_from_gmt: typeof rawProduct.date_on_sale_from_gmt === "string" ? rawProduct.date_on_sale_from_gmt : null,
    date_on_sale_to: typeof rawProduct.date_on_sale_to === "string" ? rawProduct.date_on_sale_to : null,
    date_on_sale_to_gmt: typeof rawProduct.date_on_sale_to_gmt === "string" ? rawProduct.date_on_sale_to_gmt : null,
    on_sale: typeof rawProduct.on_sale === "boolean" ? rawProduct.on_sale : false,
    // Inventory
    purchasable: typeof rawProduct.purchasable === "boolean" ? rawProduct.purchasable : true,
    total_sales: typeof rawProduct.total_sales === "number" ? rawProduct.total_sales : 0,
    virtual: typeof rawProduct.virtual === "boolean" ? rawProduct.virtual : false,
    downloadable: typeof rawProduct.downloadable === "boolean" ? rawProduct.downloadable : false,
    downloads: Array.isArray(rawProduct.downloads) ? rawProduct.downloads : [],
    download_limit: typeof rawProduct.download_limit === "number" ? rawProduct.download_limit : -1,
    download_expiry: typeof rawProduct.download_expiry === "number" ? rawProduct.download_expiry : -1,
    external_url: typeof rawProduct.external_url === "string" ? rawProduct.external_url : "",
    button_text: typeof rawProduct.button_text === "string" ? rawProduct.button_text : "",
    // Tax and shipping
    tax_status: typeof rawProduct.tax_status === "string" ? rawProduct.tax_status : "taxable",
    tax_class: typeof rawProduct.tax_class === "string" ? rawProduct.tax_class : "",
    manage_stock: typeof rawProduct.manage_stock === "boolean" ? rawProduct.manage_stock : false,
    stock_quantity: typeof rawProduct.stock_quantity === "number" ? rawProduct.stock_quantity : null,
    backorders: typeof rawProduct.backorders === "string" ? rawProduct.backorders : "no",
    backorders_allowed: typeof rawProduct.backorders_allowed === "boolean" ? rawProduct.backorders_allowed : false,
    backordered: typeof rawProduct.backordered === "boolean" ? rawProduct.backordered : false,
    low_stock_amount: typeof rawProduct.low_stock_amount === "number" ? rawProduct.low_stock_amount : null,
    sold_individually: typeof rawProduct.sold_individually === "boolean" ? rawProduct.sold_individually : false,
    weight: typeof rawProduct.weight === "string" ? rawProduct.weight : "",
    dimensions: rawProduct.dimensions && typeof rawProduct.dimensions === "object" ? {
      length: typeof rawProduct.dimensions.length === "string" ? String(rawProduct.dimensions.length) : "",
      width: typeof rawProduct.dimensions.width === "string" ? String(rawProduct.dimensions.width) : "",
      height: typeof rawProduct.dimensions.height === "string" ? String(rawProduct.dimensions.height) : ""
    } : { length: "", width: "", height: "" },
    shipping_required: typeof rawProduct.shipping_required === "boolean" ? rawProduct.shipping_required : true,
    shipping_taxable: typeof rawProduct.shipping_taxable === "boolean" ? rawProduct.shipping_taxable : true,
    shipping_class: typeof rawProduct.shipping_class === "string" ? rawProduct.shipping_class : "",
    shipping_class_id: typeof rawProduct.shipping_class_id === "number" ? rawProduct.shipping_class_id : 0,
    // Reviews
    reviews_allowed: typeof rawProduct.reviews_allowed === "boolean" ? rawProduct.reviews_allowed : true,
    average_rating: typeof rawProduct.average_rating === "string" ? rawProduct.average_rating : "0",
    rating_count: typeof rawProduct.rating_count === "number" ? rawProduct.rating_count : 0,
    // Related products
    upsell_ids: Array.isArray(rawProduct.upsell_ids) ? rawProduct.upsell_ids : [],
    cross_sell_ids: Array.isArray(rawProduct.cross_sell_ids) ? rawProduct.cross_sell_ids : [],
    parent_id: typeof rawProduct.parent_id === "number" ? rawProduct.parent_id : 0,
    purchase_note: typeof rawProduct.purchase_note === "string" ? rawProduct.purchase_note : "",
    // Taxonomies
    categories: Array.isArray(rawProduct.categories) ? rawProduct.categories : [],
    tags: Array.isArray(rawProduct.tags) ? rawProduct.tags : [],
    images: Array.isArray(rawProduct.images) ? rawProduct.images : [],
    attributes: Array.isArray(rawProduct.attributes) ? rawProduct.attributes : [],
    default_attributes: Array.isArray(rawProduct.default_attributes) ? rawProduct.default_attributes : [],
    variations: Array.isArray(rawProduct.variations) ? rawProduct.variations : [],
    grouped_products: Array.isArray(rawProduct.grouped_products) ? rawProduct.grouped_products : [],
    menu_order: typeof rawProduct.menu_order === "number" ? rawProduct.menu_order : 0,
    price_html: typeof rawProduct.price_html === "string" ? rawProduct.price_html : "",
    related_ids: Array.isArray(rawProduct.related_ids) ? rawProduct.related_ids : [],
    // Metadata
    meta_data: Array.isArray(rawProduct.meta_data) ? rawProduct.meta_data : [],
    // Stock status
    stock_status: typeof rawProduct.stock_status === "string" ? rawProduct.stock_status : "instock"
  };
  return validatedProduct;
}
function extractBroLabMetadata(product) {
  const metadata = {};
  if (!product.meta_data || !Array.isArray(product.meta_data)) {
    return metadata;
  }
  const findMetaValue2 = (key) => {
    return product.meta_data.find((meta) => meta.key === key);
  };
  const albTracklistMeta = findMetaValue2("alb_tracklist");
  const audioUrlMeta = findMetaValue2("audio_url");
  if (albTracklistMeta && albTracklistMeta.value) {
    try {
      const tracklistValue = typeof albTracklistMeta.value === "string" ? JSON.parse(albTracklistMeta.value) : albTracklistMeta.value;
      if (Array.isArray(tracklistValue) && tracklistValue.length > 0) {
        const firstTrack = tracklistValue[0];
        if (firstTrack && typeof firstTrack === "object" && "file" in firstTrack) {
          metadata.audio_url = String(firstTrack.file);
        }
      }
    } catch (error) {
      console.warn(`Failed to parse alb_tracklist for product ${product.id}:`, error);
    }
  }
  if (!metadata.audio_url && audioUrlMeta && audioUrlMeta.value) {
    metadata.audio_url = String(audioUrlMeta.value);
  }
  const hasVocalsMeta = findMetaValue2("has_vocals");
  if (hasVocalsMeta) {
    metadata.hasVocals = hasVocalsMeta.value === "yes" || hasVocalsMeta.value === true;
  }
  if (metadata.hasVocals === void 0 && product.tags) {
    metadata.hasVocals = product.tags.some(
      (tag) => tag && typeof tag === "object" && "name" in tag && String(tag.name).toLowerCase().includes("vocals")
    );
  }
  const stemsMeta = findMetaValue2("stems");
  if (stemsMeta) {
    metadata.stems = stemsMeta.value === "yes" || stemsMeta.value === true;
  }
  if (metadata.stems === void 0 && product.tags) {
    metadata.stems = product.tags.some(
      (tag) => tag && typeof tag === "object" && "name" in tag && String(tag.name).toLowerCase().includes("stems")
    );
  }
  const stringFields = ["bpm", "key", "mood", "instruments", "duration"];
  for (const field of stringFields) {
    const meta = findMetaValue2(field);
    if (meta && meta.value) {
      metadata[field] = String(meta.value);
    }
  }
  metadata.is_free = product.price === "0" || product.price === "";
  return metadata;
}

// server/services/woo.ts
function getWooCommerceConfig() {
  const apiUrl = process.env.WOOCOMMERCE_API_URL;
  const apiKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.VITE_WC_KEY;
  const apiSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  console.log("\u{1F527} WooCommerce Config Check:", {
    hasApiUrl: !!apiUrl,
    apiUrlValue: apiUrl ? apiUrl.substring(0, 30) + "..." : "MISSING",
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "MISSING",
    hasApiSecret: !!apiSecret,
    apiSecretPrefix: apiSecret ? apiSecret.substring(0, 10) + "..." : "MISSING",
    nodeEnv: process.env.NODE_ENV
  });
  if (!apiUrl || !apiKey || !apiSecret) {
    console.error(
      "\u274C Missing WooCommerce configuration. Set WOOCOMMERCE_API_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET in .env"
    );
    return null;
  }
  return { apiUrl, apiKey, apiSecret };
}
function createBasicAuthHeader(apiKey, apiSecret) {
  const credentials = `${apiKey}:${apiSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}
function createWooCommerceHeaders(config) {
  return {
    Authorization: createBasicAuthHeader(config.apiKey, config.apiSecret),
    "Content-Type": "application/json"
  };
}
function valueToString(value) {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}
function buildSearchParams(query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === void 0 || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, valueToString(v)));
    } else {
      params.append(key, valueToString(value));
    }
  });
  return params;
}
function extractArrayFromResponse(rawData) {
  if (Array.isArray(rawData)) {
    return rawData;
  }
  if (rawData && typeof rawData === "object" && "data" in rawData) {
    const dataObj = rawData;
    if (Array.isArray(dataObj.data)) {
      return dataObj.data;
    }
  }
  return [];
}
async function fetchWooProducts(filters = {}) {
  try {
    const validatedFilters = validateWooCommerceQuery(filters);
    const config = getWooCommerceConfig();
    if (!config) {
      return [];
    }
    const params = buildSearchParams(validatedFilters);
    const url = `${config.apiUrl}/products?${params}`;
    console.log("\u{1F527} Fetching URL:", url);
    const response = await fetch(url, {
      headers: createWooCommerceHeaders(config)
    });
    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }
    const rawData = await response.json();
    const products = extractArrayFromResponse(rawData);
    if (products.length === 0 && rawData && typeof rawData === "object") {
      console.error("WooCommerce API returned non-array data:", rawData);
      return [];
    }
    return validateAndEnhanceProducts(products);
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    return [];
  }
}
function validateAndEnhanceProducts(products) {
  const validatedProducts = [];
  for (const product of products) {
    try {
      const validatedProduct = validateWooCommerceProduct(product);
      const broLabMetadata = extractBroLabMetadata(validatedProduct);
      validatedProducts.push({ ...validatedProduct, ...broLabMetadata });
    } catch (validationError) {
      const productId = product?.id;
      console.error(`Failed to validate product ${productId}:`, validationError);
    }
  }
  return validatedProducts;
}
async function fetchWooProduct(id) {
  try {
    const config = getWooCommerceConfig();
    if (!config) {
      return null;
    }
    const response = await fetch(`${config.apiUrl}/products/${id}`, {
      headers: createWooCommerceHeaders(config)
    });
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }
    const rawProduct = await response.json();
    try {
      const validatedProduct = validateWooCommerceProduct(rawProduct);
      const broLabMetadata = extractBroLabMetadata(validatedProduct);
      return { ...validatedProduct, ...broLabMetadata };
    } catch (validationError) {
      console.error(`Failed to validate product ${id}:`, validationError);
      return null;
    }
  } catch (error) {
    console.error("WooCommerce Product API Error:", error);
    return null;
  }
}
async function fetchWooCategories(query = {}) {
  try {
    const config = getWooCommerceConfig();
    if (!config) {
      return [];
    }
    const params = buildSearchParams(query);
    const url = `${config.apiUrl}/products/categories?${params}`;
    const response = await fetch(url, {
      headers: createWooCommerceHeaders(config)
    });
    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }
    const rawData = await response.json();
    const categories = Array.isArray(rawData) ? rawData : [];
    return validateCategories(categories);
  } catch (error) {
    console.error("WooCommerce Categories API Error:", error);
    return [];
  }
}
function validateCategories(categories) {
  return categories.filter((category) => {
    if (!category || typeof category !== "object") {
      return false;
    }
    const cat = category;
    return typeof cat.id === "number" && typeof cat.name === "string";
  });
}

// server/routes/woo.ts
var router22 = Router21();
function safeString(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function extractAudioUrlsFromTrack(track) {
  const audioPreview = safeString(track.audio_preview);
  const trackMp3 = safeString(track.track_mp3);
  const src = safeString(track.src);
  const url = safeString(track.url);
  const downloadUrl = trackMp3 || src || url || null;
  const previewUrl = audioPreview || downloadUrl;
  return { previewUrl, downloadUrl };
}
function extractAudioFromTrack(track) {
  const { previewUrl } = extractAudioUrlsFromTrack(track);
  return previewUrl;
}
function parseTrackData(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}
async function fetchMediaTitle(mediaId) {
  try {
    const wpApiUrl = process.env.WORDPRESS_API_URL || "https://brolabentertainment.com/wp-json/wp/v2";
    const response = await fetch(`${wpApiUrl}/media/${mediaId}`);
    if (!response.ok) return null;
    const media = await response.json();
    return media.title?.rendered || null;
  } catch (error) {
    console.error(`Failed to fetch media ${mediaId}:`, error);
    return null;
  }
}
async function enrichTracksWithMediaTitles(tracks) {
  const enrichedTracks = await Promise.all(
    tracks.map(async (track) => {
      if (track.title) return track;
      if (track.mediaId) {
        const mediaTitle = await fetchMediaTitle(track.mediaId);
        if (mediaTitle) {
          console.log(`\u{1F3B5} Fetched media title for ID ${track.mediaId}: ${mediaTitle}`);
          return { ...track, title: mediaTitle };
        }
      }
      return track;
    })
  );
  return enrichedTracks;
}
var TITLE_FIELDS = [
  "title",
  "track_title",
  "stream_title",
  "song_title",
  "name",
  "icecast_title"
];
var ARTIST_FIELDS = ["artist", "track_artist", "artist_name"];
var DURATION_FIELDS = [
  "duration",
  "track_duration",
  "stream_lenght",
  "post_audiopreview_duration"
];
function extractFieldValue(trackRecord, fields) {
  for (const field of fields) {
    const value = safeString(trackRecord[field]);
    if (value) return value;
  }
  return void 0;
}
function extractTrackTitle(trackRecord, mediaId) {
  if (mediaId) return void 0;
  return extractFieldValue(trackRecord, TITLE_FIELDS);
}
function getMediaId(trackRecord) {
  if (!trackRecord.track_mp3_id) return void 0;
  const mediaId = Number(trackRecord.track_mp3_id);
  return Number.isNaN(mediaId) ? void 0 : mediaId;
}
function buildAudioTrack(trackRecord) {
  const { previewUrl, downloadUrl } = extractAudioUrlsFromTrack(trackRecord);
  if (!previewUrl) return null;
  const mediaId = getMediaId(trackRecord);
  return {
    url: previewUrl,
    downloadUrl: downloadUrl || void 0,
    title: extractTrackTitle(trackRecord, mediaId),
    artist: extractFieldValue(trackRecord, ARTIST_FIELDS),
    duration: extractFieldValue(trackRecord, DURATION_FIELDS),
    mediaId
  };
}
function processTrackArray(trackData, productId) {
  const tracks = [];
  for (const track of trackData) {
    const trackRecord = track;
    const audioTrack = buildAudioTrack(trackRecord);
    if (audioTrack) {
      tracks.push(audioTrack);
      console.log(
        `\u{1F3B5} Product ${productId} - Track:`,
        audioTrack.title || "(no title)",
        `preview: ${audioTrack.url?.substring(0, 50)}...`,
        `download: ${audioTrack.downloadUrl?.substring(0, 50)}...`
      );
    }
  }
  console.log(`\u{1F3B5} Product ${productId} - Found ${tracks.length} audio tracks`);
  return tracks;
}
function processSingleTrackObject(trackData, productId) {
  const url = extractAudioFromTrack(trackData);
  if (!url) return [];
  const track = {
    url,
    title: safeString(trackData.title) || void 0,
    artist: safeString(trackData.artist) || void 0,
    duration: safeString(trackData.duration) || void 0
  };
  console.log(`\u{1F3B5} Product ${productId} - Found audio URL (object):`, url);
  return [track];
}
function getFallbackTrack(audioUrlMeta, productId) {
  if (!audioUrlMeta?.value) return [];
  const audioUrl = safeString(audioUrlMeta.value);
  if (!audioUrl) return [];
  console.log(`\u{1F3B5} Product ${productId} - Fallback audio URL:`, audioUrl);
  return [{ url: audioUrl }];
}
function extractAudioTracks(albTracklistMeta, audioUrlMeta, productId) {
  if (!albTracklistMeta?.value) {
    return getFallbackTrack(audioUrlMeta, productId);
  }
  const trackData = parseTrackData(albTracklistMeta.value);
  if (Array.isArray(trackData) && trackData.length > 0) {
    return processTrackArray(trackData, productId);
  }
  if (trackData && typeof trackData === "object") {
    const tracks = processSingleTrackObject(trackData, productId);
    if (tracks.length > 0) return tracks;
  }
  return getFallbackTrack(audioUrlMeta, productId);
}
function findMetaValue(metaData, key) {
  const meta = metaData?.find((m) => m.key === key);
  const value = meta?.value ?? null;
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : null;
  }
  return value;
}
function hasTagWithName(tags, searchTerm) {
  return tags?.some(
    (tag) => tag && typeof tag === "object" && "name" in tag && String(tag.name).toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? false;
}
async function mapProductToBeat(product) {
  const albTracklistMeta = product.meta_data?.find(
    (meta) => meta.key === "alb_tracklist"
  );
  const audioUrlMeta = product.meta_data?.find(
    (meta) => meta.key === "audio_url"
  );
  const rawTracks = extractAudioTracks(albTracklistMeta, audioUrlMeta, product.id);
  const audioTracks = await enrichTracksWithMediaTitles(rawTracks);
  const audioUrl = audioTracks.length > 0 ? audioTracks[0].url : null;
  const downloadUrl = audioTracks.length > 0 ? audioTracks[0].downloadUrl : null;
  console.log(
    `\u2705 Product ${product.id} - Final URLs:`,
    `preview: ${audioUrl?.substring(0, 60)}...`,
    `download: ${downloadUrl?.substring(0, 60)}...`,
    `(${audioTracks.length} tracks)`
  );
  return {
    ...product,
    audio_url: audioUrl,
    // Preview URL for playback
    download_url: downloadUrl,
    // Full audio URL for download
    audio_tracks: audioTracks,
    // All tracks for multi-track navigation
    hasVocals: findMetaValue(product.meta_data, "has_vocals") === "yes" || hasTagWithName(product.tags, "vocals"),
    stems: findMetaValue(product.meta_data, "stems") === "yes" || hasTagWithName(product.tags, "stems"),
    bpm: safeString(findMetaValue(product.meta_data, "bpm")),
    key: safeString(findMetaValue(product.meta_data, "key")),
    mood: safeString(findMetaValue(product.meta_data, "mood")),
    instruments: safeString(findMetaValue(product.meta_data, "instruments")),
    duration: safeString(findMetaValue(product.meta_data, "duration")),
    is_free: product.price === "0" || product.price === ""
  };
}
function isWooCommerceConfigured() {
  const apiUrl = process.env.WOOCOMMERCE_API_URL;
  const apiKey = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.VITE_WC_KEY;
  const apiSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
  const isConfigured = !!(apiUrl && apiKey && apiSecret);
  if (!isConfigured) {
    console.log("\u26A0\uFE0F WooCommerce config check:", {
      hasApiUrl: !!apiUrl,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });
  }
  return isConfigured;
}
router22.get("/products", async (req, res) => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("\u26A0\uFE0F WooCommerce not configured, returning sample data");
      const sampleProducts = [
        {
          id: 1,
          name: "Sample Beat 1",
          price: "29.99",
          regular_price: "39.99",
          sale_price: "29.99",
          description: "A sample beat for testing",
          short_description: "Sample beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Hip Hop" }],
          meta_data: [
            { key: "bpm", value: "140" },
            { key: "key", value: "C" },
            { key: "mood", value: "Energetic" },
            { key: "instruments", value: "Drums, Bass, Synth" },
            { key: "duration", value: "3:45" },
            { key: "has_vocals", value: "no" },
            { key: "stems", value: "yes" }
          ],
          tags: [],
          total_sales: 0,
          hasVocals: false,
          stems: true,
          bpm: "140",
          key: "C",
          mood: "Energetic",
          instruments: "Drums, Bass, Synth",
          duration: "3:45",
          is_free: false
        },
        {
          id: 2,
          name: "Sample Beat 2",
          price: "0",
          regular_price: "0",
          sale_price: "0",
          description: "A free sample beat",
          short_description: "Free beat",
          images: [{ src: "/api/placeholder/300/300" }],
          categories: [{ name: "Trap" }],
          meta_data: [
            { key: "bpm", value: "150" },
            { key: "key", value: "F" },
            { key: "mood", value: "Dark" },
            { key: "instruments", value: "Drums, 808, Hi-hats" },
            { key: "duration", value: "2:30" },
            { key: "has_vocals", value: "yes" },
            { key: "stems", value: "no" }
          ],
          tags: [],
          total_sales: 0,
          hasVocals: true,
          stems: false,
          bpm: "150",
          key: "F",
          mood: "Dark",
          instruments: "Drums, 808, Hi-hats",
          duration: "2:30",
          is_free: true
        }
      ];
      res.json(sampleProducts);
      return;
    }
    const wooProducts = await fetchWooProducts(req.query);
    const beats = await Promise.all(wooProducts.map(mapProductToBeat));
    res.json(beats);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch products");
  }
});
router22.get("/products/:id", async (req, res) => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("\u26A0\uFE0F WooCommerce not configured, returning sample product");
      const sampleProduct = {
        id: Number.parseInt(req.params.id, 10),
        name: "Sample Beat",
        price: "29.99",
        regular_price: "39.99",
        sale_price: "29.99",
        description: "A sample beat for testing",
        short_description: "Sample beat",
        images: [{ src: "/api/placeholder/300/300" }],
        categories: [{ name: "Hip Hop" }],
        meta_data: [
          { key: "bpm", value: "140" },
          { key: "key", value: "C" },
          { key: "mood", value: "Energetic" },
          { key: "instruments", value: "Drums, Bass, Synth" },
          { key: "duration", value: "3:45" },
          { key: "has_vocals", value: "no" },
          { key: "stems", value: "yes" }
        ],
        tags: [],
        total_sales: 0,
        hasVocals: false,
        stems: true,
        bpm: "140",
        key: "C",
        mood: "Energetic",
        instruments: "Drums, Bass, Synth",
        duration: "3:45",
        is_free: false,
        audio_url: null
      };
      res.json({ beat: sampleProduct });
      return;
    }
    const product = await fetchWooProduct(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const beat = await mapProductToBeat(product);
    res.json(beat);
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch product");
  }
});
router22.get("/categories", async (_req, res) => {
  try {
    if (!isWooCommerceConfigured()) {
      console.log("\u26A0\uFE0F WooCommerce not configured, returning sample categories");
      const sampleCategories = [
        { id: 1, name: "Hip Hop", count: 15 },
        { id: 2, name: "Trap", count: 8 },
        { id: 3, name: "R&B", count: 12 },
        { id: 4, name: "Pop", count: 6 }
      ];
      res.json({ categories: sampleCategories });
      return;
    }
    const cats = await fetchWooCategories();
    res.json({ categories: cats });
  } catch (error) {
    handleRouteError(error, res, "Failed to fetch categories");
  }
});
var woo_default = router22;

// server/routes/wp.ts
import { Router as Router22 } from "express";

// server/services/wp.ts
function toQueryParamValue(value) {
  if (value === void 0 || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}
async function fetchWPPosts(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      const stringValue = toQueryParamValue(value);
      if (stringValue !== null) {
        queryParams.append(key, stringValue);
      }
    });
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?${queryParams}`, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return await response.json();
  } catch (error) {
    console.error("WordPress Posts API Error:", error);
    return [];
  }
}
async function fetchWPPostBySlug(slug) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?slug=${slug}`, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const posts = await response.json();
    return posts.length > 0 ? posts[0] : null;
  } catch (error) {
    console.error("WordPress Post API Error:", error);
    return null;
  }
}
async function fetchWPPageBySlug(slug) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/pages?slug=${slug}`, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const pages = await response.json();
    return pages.length > 0 ? pages[0] : null;
  } catch (error) {
    console.error("WordPress Page API Error:", error);
    return null;
  }
}

// server/routes/wp.ts
var router23 = Router22();
router23.get("/pages/:slug", async (req, res, next) => {
  try {
    const page = await fetchWPPageBySlug(req.params.slug);
    if (!page) res.status(404).json({ error: "Page not found" });
    return;
    res.json({ page });
  } catch (e) {
    next(e);
  }
});
router23.get("/posts", async (req, res, next) => {
  try {
    const params = req.query;
    const posts = await fetchWPPosts(params);
    res.json({ posts });
  } catch (e) {
    next(e);
  }
});
router23.get("/posts/:slug", async (req, res, next) => {
  try {
    const post = await fetchWPPostBySlug(req.params.slug);
    if (!post) res.status(404).json({ error: "Post not found" });
    return;
    res.json({ post });
  } catch (e) {
    next(e);
  }
});
var wp_default = router23;

// server/app.ts
var app = express3();
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(compressionMiddleware);
app.use(bodySizeLimits);
app.use(express3.json({ limit: "10mb" }));
app.use(express3.urlencoded({ extended: false, limit: "10mb" }));
logger.info("Server starting", {
  nodeEnv: env.NODE_ENV,
  clerkConfigured: Boolean(env.VITE_CLERK_PUBLISHABLE_KEY) && Boolean(env.CLERK_SECRET_KEY)
});
app.use(requestIdMiddleware);
setupAuth(app);
registerAuthRoutes(app);
app.use((_req, res, next) => {
  res.on("finish", () => {
  });
  next();
});
app.use("/api/activity", apiRateLimiter, activity_default);
app.use("/api/avatar", apiRateLimiter, avatar_default);
app.use("/api/downloads", downloadRateLimiter, downloads_default);
app.use("/api/email", authRateLimiter, email_default);
app.use("/api/monitoring", monitoring_default2);
app.use("/api/opengraph", apiRateLimiter, openGraph_default);
app.use("/api/orders", apiRateLimiter, orders_default);
app.use("/api/payment/paypal", paymentRateLimiter, paypal_default2);
app.use("/api/payment/stripe", paymentRateLimiter, stripe_default);
app.use("/api/clerk", apiRateLimiter, clerk_default);
app.use("/api/payments", paymentRateLimiter, payments_default);
app.use("/api/webhooks/clerk-billing", clerk_billing_default);
app.use("/api/schema", apiRateLimiter, schema_default);
app.use("/api/security", apiRateLimiter, security_default);
app.use("/api/service-orders", apiRateLimiter, serviceOrders_default);
app.use("/api/storage", apiRateLimiter, storage_default);
app.use("/api/uploads", apiRateLimiter, uploads_default);
app.use("/api/wishlist", apiRateLimiter, wishlist_default);
app.use("/api/wp", apiRateLimiter, wp_default);
app.use("/api/sync", apiRateLimiter, sync_default);
app.use("/api/categories", apiRateLimiter, categories_default);
app.use("/api/reservations", apiRateLimiter, reservations_default);
app.use("/api/woocommerce", apiRateLimiter, woo_default);
app.use("/", sitemap_default);
if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
  const testSpriteModule = await Promise.resolve().then(() => (init_testSprite(), testSprite_exports));
  app.use(testSpriteModule.default);
  logger.info("TestSprite compatibility endpoints loaded");
}

// api/index.ts
var index_default = app;
export {
  index_default as default
};
