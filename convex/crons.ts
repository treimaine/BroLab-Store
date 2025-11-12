import type { FunctionReference } from "convex/server";
import { cronJobs } from "convex/server";

/**
 * Scheduled jobs for automatic cleanup and maintenance
 * Security: Automatic expiration cleanup for tokens
 */
const crons = cronJobs();

// Use string-based references with proper typing to avoid type instantiation issues
const cleanupEmailVerificationsRef =
  "emailVerifications:cleanupExpired" as unknown as FunctionReference<"mutation", "internal">;

const cleanupPasswordResetsRef = "passwordResets:cleanupExpired" as unknown as FunctionReference<
  "mutation",
  "internal"
>;

/**
 * Cleanup expired email verification tokens
 * Runs every hour to remove expired tokens (24h expiration)
 */
crons.hourly(
  "cleanup expired email verifications",
  { minuteUTC: 0 }, // Run at the top of every hour
  cleanupEmailVerificationsRef
);

/**
 * Cleanup expired password reset tokens
 * Runs every hour to remove expired tokens (15min expiration)
 * Note: Running hourly is sufficient since tokens expire in 15min
 */
crons.hourly(
  "cleanup expired password resets",
  { minuteUTC: 30 }, // Run at 30 minutes past every hour
  cleanupPasswordResetsRef
);

export default crons;
