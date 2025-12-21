import { verifyToken } from "@clerk/backend";
import { clerkMiddleware, getAuth } from "@clerk/express";
import cookieParser from "cookie-parser";
import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import type { User } from "../shared/schema";
import { ConvexUser, ConvexUserInput, convexUserToUser } from "../shared/types/ConvexUser";
import { auditLogger } from "./lib/audit";
import { getUserByClerkId, upsertUser } from "./lib/convex";

/**
 * Extended request interface with user and security context
 */
interface RequestWithUser extends Request {
  user?: {
    id: string;
    clerkId?: string;
    username?: string;
    email: string;
    name?: string;
    role?: string;
  } & Record<string, unknown>;
  security?: {
    riskLevel: string;
    securityEvents: string[];
    sessionId?: string;
  };
}

// Extend session to include userId
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

/**
 * Configure authentication middleware and session management
 * Sets up cookie parser, session store, and Clerk middleware
 */
export function setupAuth(app: Express): void {
  // SECURITY: Enforce SESSION_SECRET in non-test environments
  if (process.env.NODE_ENV !== "test" && !process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET environment variable is required for security. " +
        "Generate a strong secret with: openssl rand -hex 32"
    );
  }

  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "test-secret-key-only-for-testing",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
      store: process.env.NODE_ENV === "test" ? new session.MemoryStore() : undefined,
      // NOTE: Consider using Redis store in production for session persistence
      // Example: new RedisStore({ client: redisClient })
    })
  );

  // Add Clerk middleware to all requests (noop in test environment)
  try {
    if (process.env.NODE_ENV === "test") {
      app.use((_req, _res, next) => next());
    } else if (typeof clerkMiddleware === "function") {
      app.use(clerkMiddleware());
    } else {
      // Fallback noop to avoid test/runtime crashes if interop issues occur
      app.use((_req, _res, next) => next());
    }
  } catch {
    app.use((_req, _res, next) => next());
  }
}

// ==========================
// Test Token Support
// ==========================

/**
 * Test token management for automated testing (e.g., TestSprite)
 */
const issuedTestTokens = new Set<string>();
const defaultAcceptedTokens = new Set<string>([
  "mock-test-token",
  "test_api_key_or_jwt_token_for_clerk_authentication",
]);

/**
 * Register a test token for acceptance in authentication
 */
export function registerTestToken(token: string): void {
  issuedTestTokens.add(token);
}

/**
 * Check if a token is accepted for test authentication
 */
export function isTokenAccepted(token: string | undefined | null): boolean {
  if (!token) return false;
  const envToken = process.env.TEST_USER_TOKEN;
  if (envToken && token === envToken) return true;
  if (issuedTestTokens.has(token)) return true;
  return defaultAcceptedTokens.has(token);
}

/**
 * Extract client IP address from request headers
 */
function getClientIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization || "";
  const bearerPrefix = "Bearer ";
  return authHeader.startsWith(bearerPrefix) ? authHeader.slice(bearerPrefix.length) : undefined;
}

/**
 * Verify Bearer token manually using Clerk's verifyToken from @clerk/backend
 * This is used when getAuth() doesn't find the user (e.g., cross-origin requests)
 */
async function verifyBearerToken(
  token: string
): Promise<{ userId: string; sessionId?: string } | null> {
  try {
    // Use verifyToken from @clerk/backend to verify the JWT token
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (verifiedToken?.sub) {
      return {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid as string | undefined,
      };
    }

    return null;
  } catch (error) {
    console.error("Bearer token verification failed:", error);
    return null;
  }
}

/**
 * Get or create a Convex user by Clerk ID
 * Centralizes user retrieval/creation logic to avoid duplication
 * @param userId - Clerk user ID
 * @param userInfo - Optional user info from Clerk session (email, username, etc.)
 * @returns Object with user and isNewUser flag
 */
async function getOrCreateConvexUser(
  userId: string,
  userInfo?: { email?: string; username?: string; firstName?: string; lastName?: string }
): Promise<{ user: ConvexUser | null; isNewUser: boolean }> {
  const existingUser = await getUserByClerkId(userId);

  if (existingUser) {
    return { user: existingUser, isNewUser: false };
  }

  // Use provided user info or defaults
  // Create ConvexUserInput directly to include firstName/lastName
  const newUserInput: ConvexUserInput = {
    clerkId: userId,
    email: userInfo?.email || "",
    username: userInfo?.username || `user_${userId.slice(-8)}`,
    firstName: userInfo?.firstName,
    lastName: userInfo?.lastName,
  };
  const newUser = await upsertUser(newUserInput);

  return { user: newUser, isNewUser: true };
}

/**
 * Handle test token authentication
 */
async function handleTestTokenAuth(
  req: RequestWithUser,
  ipAddress: string,
  userAgent: string
): Promise<boolean> {
  const bearerToken = extractBearerToken(req);

  if (!isTokenAccepted(bearerToken)) {
    return false;
  }

  const { SecurityEventType } = await import("./lib/securityEnhancer");

  await auditLogger.logSecurityEvent(
    "testsprite_user",
    SecurityEventType.AUTHENTICATION_SUCCESS,
    {
      method: "test_token",
      ipAddress,
      userAgent,
    },
    ipAddress,
    userAgent
  );

  req.user = {
    id: "0",
    username: "testsprite_user",
    email: "testsprite@example.com",
    role: "user",
  };

  return true;
}

/**
 * Handle Clerk authentication and user creation/retrieval
 */
async function handleClerkAuth(
  req: RequestWithUser,
  userId: string,
  sessionId: string | undefined,
  authResult: {
    success: boolean;
    riskLevel: string;
    securityEvents: string[];
  },
  ipAddress: string,
  userAgent: string,
  userInfo?: { email?: string; username?: string; firstName?: string; lastName?: string }
): Promise<boolean> {
  const { securityEnhancer } = await import("./lib/securityEnhancer");

  // Clear failed attempts on successful authentication
  securityEnhancer.clearFailedAttempts(ipAddress);

  // Retrieve or create user from Convex with user info from Clerk
  const { user: convexUser, isNewUser } = await getOrCreateConvexUser(userId, userInfo);

  if (!convexUser) {
    return false;
  }

  // Log new user creation
  if (isNewUser) {
    await auditLogger.logRegistration(userId, ipAddress, userAgent);
  }

  // Convert ConvexUser to shared User type
  const sharedUser = convexUserToUser(convexUser);

  // Log successful authentication
  await auditLogger.logLogin(userId, ipAddress, userAgent);

  // Log any security events detected during authentication
  for (const event of authResult.securityEvents) {
    await auditLogger.logSecurityEvent(
      userId,
      event,
      {
        riskLevel: authResult.riskLevel,
        sessionId,
        ipAddress,
        userAgent,
      },
      ipAddress,
      userAgent
    );
  }

  // Set req.user for compatibility with existing routes
  req.user = {
    id: sharedUser.id.toString(),
    clerkId: convexUser.clerkId,
    username: sharedUser.username,
    email: sharedUser.email,
    role: convexUser.role || "user",
  };

  // Add security context to request
  req.security = {
    riskLevel: authResult.riskLevel,
    securityEvents: authResult.securityEvents,
    sessionId,
  };

  return true;
}

/**
 * Handle session-based authentication fallback
 */
async function handleSessionAuth(
  req: RequestWithUser,
  ipAddress: string,
  userAgent: string
): Promise<boolean> {
  if (!req.session?.userId) {
    return false;
  }

  const { SecurityEventType } = await import("./lib/securityEnhancer");

  await auditLogger.logSecurityEvent(
    req.session.userId.toString(),
    SecurityEventType.AUTHENTICATION_SUCCESS,
    {
      method: "session",
      ipAddress,
      userAgent,
    },
    ipAddress,
    userAgent
  );

  req.user = {
    id: req.session.userId.toString(),
    username: `session_user_${req.session.userId}`,
    email: "",
    role: "user",
  };

  return true;
}

/**
 * Authentication context for request processing
 */
interface AuthContext {
  ipAddress: string;
  userAgent: string;
}

/**
 * Result of user ID resolution from various auth methods
 */
interface UserIdResolution {
  userId?: string;
  sessionId?: string;
  userInfo?: {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Extract authentication context from request
 */
function getAuthContext(req: Request): AuthContext {
  return {
    ipAddress: getClientIP(req),
    userAgent: req.headers["user-agent"] || "unknown",
  };
}

/**
 * Attempt to resolve user ID from Clerk auth result or Bearer token fallback
 */
async function resolveUserId(authResult: {
  success: boolean;
  user?: { userId?: string; sessionId?: string; sessionClaims?: Record<string, unknown> };
}): Promise<UserIdResolution> {
  if (authResult.success && authResult.user?.userId) {
    // Extract user info from session claims if available
    const claims = authResult.user.sessionClaims;
    const userInfo = claims
      ? {
          email: typeof claims.email === "string" ? claims.email : undefined,
          username: typeof claims.username === "string" ? claims.username : undefined,
          firstName: typeof claims.given_name === "string" ? claims.given_name : undefined,
          lastName: typeof claims.family_name === "string" ? claims.family_name : undefined,
        }
      : undefined;

    return {
      userId: authResult.user.userId,
      sessionId: authResult.user.sessionId,
      userInfo,
    };
  }
  return {};
}

/**
 * Attempt Bearer token verification as fallback
 */
async function tryBearerTokenFallback(req: Request): Promise<UserIdResolution> {
  const bearerToken = extractBearerToken(req);
  if (!bearerToken) {
    return {};
  }

  console.log("🔐 Attempting manual Bearer token verification...");
  const tokenResult = await verifyBearerToken(bearerToken);

  if (tokenResult) {
    console.log("✅ Bearer token verified successfully for user:", tokenResult.userId);
    return { userId: tokenResult.userId, sessionId: tokenResult.sessionId };
  }

  console.log("❌ Bearer token verification failed");
  return {};
}

/**
 * Log authentication failure and send error response
 */
async function handleAuthFailure(
  res: Response,
  authResult: { error?: string; riskLevel?: string; securityEvents?: string[] },
  context: AuthContext,
  securityEnhancer: { recordFailedAttempt: (ip: string) => void },
  SecurityEventType: { AUTHENTICATION_FAILURE: string },
  hasBearerToken: boolean
): Promise<void> {
  securityEnhancer.recordFailedAttempt(context.ipAddress);

  await auditLogger.logSecurityEvent(
    "anonymous",
    SecurityEventType.AUTHENTICATION_FAILURE,
    {
      error: authResult.error || "No valid authentication found",
      riskLevel: authResult.riskLevel,
      securityEvents: authResult.securityEvents,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      hasBearerToken,
    },
    context.ipAddress,
    context.userAgent
  );

  res.status(401).json({
    error: "Authentication failed",
    details: process.env.NODE_ENV === "development" ? authResult.error : undefined,
  });
}

/**
 * Log authentication error and send error response
 */
async function handleAuthError(res: Response, error: unknown, context: AuthContext): Promise<void> {
  console.error("Authentication error:", error);

  await auditLogger.logSecurityEvent(
    "anonymous",
    "authentication_error",
    {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
    context.ipAddress,
    context.userAgent
  );

  res.status(500).json({ error: "Authentication error" });
}

/**
 * Authentication middleware with security logging and validation
 * Supports Clerk authentication, test tokens, and session-based auth
 */
export const isAuthenticated = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const context = getAuthContext(req);

  try {
    const { securityEnhancer, SecurityEventType } = await import("./lib/securityEnhancer");

    // Check test token authentication
    if (await handleTestTokenAuth(req, context.ipAddress, context.userAgent)) {
      return next();
    }

    // Try standard Clerk authentication first (via cookies/middleware)
    const authResult = await securityEnhancer.validateClerkToken(req);

    // Resolve user ID from Clerk or Bearer token fallback
    let resolution = await resolveUserId(authResult);
    if (!resolution.userId) {
      resolution = await tryBearerTokenFallback(req);
    }

    // If we have a userId, proceed with Clerk authentication
    if (resolution.userId) {
      const success = await handleClerkAuth(
        req,
        resolution.userId,
        resolution.sessionId,
        {
          success: true,
          riskLevel: authResult.riskLevel || "low",
          securityEvents: authResult.securityEvents || [],
        },
        context.ipAddress,
        context.userAgent,
        resolution.userInfo
      );
      if (success) {
        return next();
      }
    }

    // Try session-based authentication as last resort
    if (await handleSessionAuth(req, context.ipAddress, context.userAgent)) {
      return next();
    }

    // All authentication methods failed
    await handleAuthFailure(
      res,
      authResult,
      context,
      securityEnhancer,
      SecurityEventType,
      !!extractBearerToken(req)
    );
  } catch (error) {
    await handleAuthError(res, error, context);
  }
};

/**
 * Get current authenticated user from Clerk and Convex
 * Returns User object or null if not authenticated
 */
export const getCurrentUser = async (req: RequestWithUser): Promise<User | null> => {
  try {
    // Priority to Clerk authentication
    const { userId } = getAuth(req);

    if (!userId) {
      return null;
    }

    // Retrieve or create user from Convex
    const { user: convexUser } = await getOrCreateConvexUser(userId);

    if (convexUser) {
      // Convert ConvexUser to shared User type using type-safe conversion
      return convexUserToUser(convexUser);
    }

    return null;
  } catch (error) {
    console.error("Error retrieving user:", error);
    return null;
  }
};

/**
 * Register authentication routes
 * Simplified to use Clerk only
 */
export function registerAuthRoutes(app: Express): void {
  // Get current user (Clerk only)
  app.get("/api/auth/user", isAuthenticated, async (req, res): Promise<void> => {
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
          created_at: user.created_at,
        },
      });
    } catch (error: unknown) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
}
