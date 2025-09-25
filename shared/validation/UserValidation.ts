import { z } from "zod";

// ================================
// USER VALIDATION SCHEMAS
// ================================

/**
 * User role validation
 */
export const UserRole = z.enum(["user", "producer", "admin", "service_role", "moderator"]);

/**
 * User status validation
 */
export const UserStatus = z.enum([
  "active",
  "inactive",
  "suspended",
  "pending_verification",
  "banned",
]);

/**
 * Subscription plan validation
 */
export const SubscriptionPlan = z.enum(["free", "basic", "pro", "unlimited", "enterprise"]);

/**
 * Subscription status validation
 */
export const SubscriptionStatus = z.enum([
  "active",
  "inactive",
  "cancelled",
  "past_due",
  "unpaid",
  "trialing",
]);

/**
 * User preferences validation
 */
export const UserPreferencesSchema = z.object({
  language: z.enum(["en", "fr", "es", "de", "it", "pt"]).default("en"),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),
  timezone: z.string().max(50).default("UTC"),

  // Notification preferences
  emailNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),

  // Audio preferences
  autoPlay: z.boolean().default(false),
  audioQuality: z.enum(["128", "192", "256", "320"]).default("192"),

  // Privacy preferences
  profileVisibility: z.enum(["public", "private", "friends_only"]).default("public"),
  showActivity: z.boolean().default(true),

  // Theme preferences
  theme: z.enum(["light", "dark", "auto"]).default("auto"),
  compactMode: z.boolean().default(false),
});

/**
 * User profile validation
 */
export const UserProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  bio: z.string().max(500).optional(),
  website: z.string().url("Invalid website URL").optional(),
  location: z.string().max(100).optional(),

  // Social media links
  socialLinks: z
    .object({
      instagram: z.string().url().optional(),
      twitter: z.string().url().optional(),
      youtube: z.string().url().optional(),
      soundcloud: z.string().url().optional(),
      spotify: z.string().url().optional(),
    })
    .optional(),

  // Producer-specific fields
  producerInfo: z
    .object({
      stageName: z.string().max(50).optional(),
      genres: z.array(z.string()).max(10).optional(),
      yearsActive: z.number().min(0).max(50).optional(),
      equipment: z.string().max(1000).optional(),
      collaborationRate: z.number().min(0).max(100000).optional(), // in cents
    })
    .optional(),

  // Avatar
  avatarUrl: z.string().url().optional(),
  avatarStorageId: z.string().optional(),
});

/**
 * User subscription validation
 */
export const UserSubscriptionSchema = z.object({
  plan: SubscriptionPlan,
  status: SubscriptionStatus,

  // Billing
  billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
  amount: z.number().min(0), // in cents
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]).default("USD"),

  // Dates
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  trialEndDate: z.string().datetime().optional(),

  // Quotas and limits
  downloadQuota: z.number().min(0).default(0), // 0 = unlimited
  downloadCount: z.number().min(0).default(0),

  // External IDs
  stripeSubscriptionId: z.string().optional(),
  clerkSubscriptionId: z.string().optional(),

  // Features
  features: z.array(z.string()).default([]),

  // Auto-renewal
  autoRenew: z.boolean().default(true),
  cancelAtPeriodEnd: z.boolean().default(false),
});

/**
 * User analytics validation
 */
export const UserAnalyticsSchema = z.object({
  // Activity metrics
  totalLogins: z.number().min(0).default(0),
  lastLoginAt: z.string().datetime().optional(),
  totalSessionTime: z.number().min(0).default(0), // in seconds

  // Purchase metrics
  totalPurchases: z.number().min(0).default(0),
  totalSpent: z.number().min(0).default(0), // in cents
  averageOrderValue: z.number().min(0).default(0), // in cents

  // Engagement metrics
  beatsPlayed: z.number().min(0).default(0),
  beatsDownloaded: z.number().min(0).default(0),
  beatsLiked: z.number().min(0).default(0),

  // Producer metrics (if applicable)
  beatsUploaded: z.number().min(0).default(0),
  totalEarnings: z.number().min(0).default(0), // in cents

  // Referral metrics
  referralCount: z.number().min(0).default(0),
  referralEarnings: z.number().min(0).default(0), // in cents
});

/**
 * Complete user validation schema
 */
export const UserSchema = z.object({
  id: z.string().optional(),
  clerkId: z.string().min(1, "Clerk ID is required"),

  // Basic information
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),

  email: z.string().email("Valid email is required").max(255, "Email is too long"),

  // Optional fields
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),

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
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  identityVerified: z.boolean().default(false),

  // Security
  twoFactorEnabled: z.boolean().default(false),
  lastPasswordChange: z.string().datetime().optional(),

  // Timestamps
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  lastActiveAt: z.string().datetime().optional(),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
});

/**
 * User registration validation
 */
export const RegisterUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),

  email: z.string().email("Valid email is required").max(255, "Email is too long"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),

  // Terms and privacy
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: "You must accept the privacy policy",
  }),

  // Marketing consent
  marketingConsent: z.boolean().default(false),

  // Referral code
  referralCode: z.string().max(20).optional(),
});

/**
 * User login validation
 */
export const LoginUserSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"), // Can be email or username
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

/**
 * User profile update validation
 */
export const UpdateUserProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  location: z.string().max(100).optional(),

  // Social links
  socialLinks: z
    .object({
      instagram: z.string().url().optional(),
      twitter: z.string().url().optional(),
      youtube: z.string().url().optional(),
      soundcloud: z.string().url().optional(),
      spotify: z.string().url().optional(),
    })
    .optional(),

  // Producer info
  producerInfo: z
    .object({
      stageName: z.string().max(50).optional(),
      genres: z.array(z.string()).max(10).optional(),
      yearsActive: z.number().min(0).max(50).optional(),
      equipment: z.string().max(1000).optional(),
      collaborationRate: z.number().min(0).max(100000).optional(),
    })
    .optional(),
});

/**
 * User preferences update validation
 */
export const UpdateUserPreferencesSchema = UserPreferencesSchema.partial();

/**
 * Password change validation
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * User filter validation for admin queries
 */
export const UserFilterSchema = z.object({
  role: UserRole.optional(),
  status: UserStatus.optional(),
  subscriptionPlan: SubscriptionPlan.optional(),
  subscriptionStatus: SubscriptionStatus.optional(),

  // Search
  search: z.string().max(100).optional(),

  // Date filters
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  lastActiveAfter: z.string().datetime().optional(),

  // Verification filters
  emailVerified: z.boolean().optional(),
  identityVerified: z.boolean().optional(),

  // Pagination
  page: z.number().positive().default(1),
  limit: z.number().min(1).max(100).default(20),

  // Sorting
  sortBy: z.enum(["created_at", "last_active_at", "username", "email"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Validate username availability (to be used with database check)
 */
export const validateUsernameFormat = (username: string): boolean => {
  if (username.length < 3 || username.length > 30) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;

  // Reserved usernames
  const reserved = [
    "admin",
    "administrator",
    "root",
    "api",
    "www",
    "mail",
    "ftp",
    "support",
    "help",
    "info",
    "contact",
    "about",
    "terms",
    "privacy",
    "brolabentertainment",
    "brolab",
    "system",
    "null",
    "undefined",
  ];

  return !reserved.includes(username.toLowerCase());
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (
  password: string
): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push("Password should be at least 8 characters");

  if (password.length >= 12) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/\d/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push("Add special characters");

  // Common patterns
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push("Avoid repeating characters");

  return {
    isValid: score >= 4,
    score,
    feedback,
  };
};

/**
 * Validate subscription quota usage
 */
export const validateSubscriptionQuota = (
  subscription: { downloadQuota: number; downloadCount: number },
  requestedDownloads: number = 1
): boolean => {
  // Unlimited quota (0 means unlimited)
  if (subscription.downloadQuota === 0) return true;

  // Check if user has enough quota
  return subscription.downloadCount + requestedDownloads <= subscription.downloadQuota;
};

/**
 * Validate user permissions for action
 */
export const validateUserPermissions = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    user: 0,
    producer: 1,
    moderator: 2,
    admin: 3,
    service_role: 4,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 999;

  return userLevel >= requiredLevel;
};

// ================================
// TYPE EXPORTS
// ================================

export type User = z.infer<typeof UserSchema>;
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;
export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type UserFilter = z.infer<typeof UserFilterSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UserSubscription = z.infer<typeof UserSubscriptionSchema>;
export type UserAnalytics = z.infer<typeof UserAnalyticsSchema>;

export type UserRoleType = z.infer<typeof UserRole>;
export type UserStatusType = z.infer<typeof UserStatus>;
export type SubscriptionPlanType = z.infer<typeof SubscriptionPlan>;
export type SubscriptionStatusType = z.infer<typeof SubscriptionStatus>;
