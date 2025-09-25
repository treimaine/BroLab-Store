/**
 * User and Subscription Type Definitions for BroLab Entertainment
 *
 * This module contains all type definitions related to users, authentication, subscriptions,
 * and user management in the BroLab Entertainment marketplace platform.
 */

// ================================
// ENUMS
// ================================

/**
 * User roles in the system
 */
export enum UserRole {
  CUSTOMER = "customer",
  PRODUCER = "producer",
  ADMIN = "admin",
  MODERATOR = "moderator",
  SUPPORT = "support",
}

/**
 * User account status
 */
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification",
  BANNED = "banned",
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  UNPAID = "unpaid",
  TRIALING = "trialing",
}

/**
 * Invoice status for subscription billing
 */
export enum InvoiceStatus {
  PAID = "paid",
  OPEN = "open",
  VOID = "void",
  UNCOLLECTIBLE = "uncollectible",
  DRAFT = "draft",
}

/**
 * Subscription plan types
 */
export enum SubscriptionPlan {
  FREE = "free",
  BASIC = "basic",
  PREMIUM = "premium",
  UNLIMITED = "unlimited",
  PRODUCER = "producer",
}

/**
 * Authentication methods
 */
export enum AuthMethod {
  EMAIL = "email",
  GOOGLE = "google",
  FACEBOOK = "facebook",
  APPLE = "apple",
  TWITTER = "twitter",
}

/**
 * Notification types
 */
export enum NotificationType {
  EMAIL = "email",
  PUSH = "push",
  SMS = "sms",
  IN_APP = "in_app",
}

/**
 * Privacy settings
 */
export enum PrivacyLevel {
  PUBLIC = "public",
  PRIVATE = "private",
  FRIENDS = "friends",
}

/**
 * Theme preferences
 */
export enum Theme {
  LIGHT = "light",
  DARK = "dark",
  AUTO = "auto",
}

/**
 * Audio quality preferences
 */
export enum AudioQuality {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * Download format preferences
 */
export enum DownloadFormat {
  MP3 = "mp3",
  WAV = "wav",
  FLAC = "flac",
}

/**
 * Quota types for user limits
 */
export enum QuotaType {
  DOWNLOADS = "downloads",
  STORAGE = "storage",
  API_CALLS = "api_calls",
}

/**
 * Resource types for quota usage tracking
 */
export enum ResourceType {
  DOWNLOAD = "download",
  UPLOAD = "upload",
  API_CALL = "api_call",
  STORAGE = "storage",
}

/**
 * Reset periods for quotas
 */
export enum ResetPeriod {
  DAILY = "daily",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

/**
 * Language codes supported by the platform
 */
export enum Language {
  EN = "en", // English
  FR = "fr", // French
  ES = "es", // Spanish
  DE = "de", // German
  IT = "it", // Italian
  PT = "pt", // Portuguese
}

// ================================
// CORE INTERFACES
// ================================

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  /** Email notifications enabled */
  email: boolean;
  /** Push notifications enabled */
  push: boolean;
  /** SMS notifications enabled */
  sms: boolean;
  /** Marketing emails enabled */
  marketing: boolean;
  /** Product updates enabled */
  updates: boolean;
  /** New beat notifications */
  newBeats: boolean;
  /** Order status notifications */
  orderUpdates: boolean;
  /** Download notifications */
  downloadNotifications: boolean;
  /** Subscription notifications */
  subscriptionUpdates: boolean;
}

/**
 * User privacy preferences
 */
export interface PrivacyPreferences {
  /** Profile visibility level */
  profileVisibility: PrivacyLevel;
  /** Show activity to others */
  showActivity: boolean;
  /** Allow analytics tracking */
  allowAnalytics: boolean;
  /** Show in search results */
  showInSearch: boolean;
  /** Allow direct messages */
  allowDirectMessages: boolean;
  /** Show purchase history */
  showPurchaseHistory: boolean;
}

/**
 * User audio preferences
 */
export interface AudioPreferences {
  /** Default volume (0-100) */
  defaultVolume: number;
  /** Auto-play beats in browser */
  autoplay: boolean;
  /** Preferred audio quality */
  quality: AudioQuality;
  /** Preferred download format */
  downloadFormat: DownloadFormat;
  /** Enable crossfade between tracks */
  crossfade: boolean;
  /** Crossfade duration in seconds */
  crossfadeDuration: number;
}

/**
 * User preferences collection
 */
export interface UserPreferences {
  /** Preferred language */
  language: Language;
  /** Theme preference */
  theme: Theme;
  /** Notification settings */
  notifications: NotificationPreferences;
  /** Privacy settings */
  privacy: PrivacyPreferences;
  /** Audio settings */
  audio: AudioPreferences;
  /** Timezone */
  timezone?: string;
  /** Currency preference */
  currency?: string;
}

/**
 * Device information for user sessions
 */
export interface DeviceInfo {
  /** Device type */
  type: "desktop" | "mobile" | "tablet";
  /** Operating system */
  os: string;
  /** Browser name */
  browser: string;
  /** Browser version */
  version: string;
  /** Screen resolution */
  screenResolution?: string;
  /** Device fingerprint for security */
  fingerprint?: string;
}

/**
 * Location information (privacy-safe)
 */
export interface LocationInfo {
  /** Country code */
  country?: string;
  /** Region/state */
  region?: string;
  /** City */
  city?: string;
  /** Timezone */
  timezone?: string;
  /** Hashed IP address for privacy */
  ipHash?: string;
}

/**
 * Subscription event for history tracking
 */
export interface SubscriptionEvent {
  /** Event type */
  type: "created" | "upgraded" | "downgraded" | "cancelled" | "renewed" | "expired";
  /** Plan ID */
  planId: string;
  /** Event timestamp */
  timestamp: string;
  /** Amount charged (if applicable) */
  amount?: number;
  /** Currency */
  currency?: string;
  /** Additional event details */
  details?: Record<string, unknown>;
}

/**
 * User metadata for additional information
 */
export interface UserMetadata {
  /** How the user signed up */
  signupSource?: string;
  /** Referral code used */
  referralCode?: string;
  /** Last activity timestamp */
  lastActiveAt?: string;
  /** Device information */
  deviceInfo?: DeviceInfo;
  /** Location information */
  locationInfo?: LocationInfo;
  /** Subscription history */
  subscriptionHistory?: SubscriptionEvent[];
  /** Custom fields */
  customFields?: Record<string, unknown>;
}

/**
 * User quota information
 */
export interface UserQuota {
  /** Monthly download limit */
  monthlyDownloads: number;
  /** Downloads used this month */
  downloadsUsed: number;
  /** Remaining downloads */
  downloadsRemaining: number;
  /** When quota resets */
  resetDate: string;
  /** Whether quota is unlimited */
  unlimited: boolean;
}

/**
 * User subscription details
 */
export interface UserSubscription {
  /** Subscription ID */
  id: string;
  /** User ID */
  userId: number;
  /** Subscription plan */
  plan: SubscriptionPlan;
  /** Subscription status */
  status: SubscriptionStatus;
  /** When subscription started */
  startedAt: string;
  /** When subscription expires */
  expiresAt: string;
  /** When subscription was created */
  createdAt: string;
  /** Stripe subscription ID */
  stripeSubscriptionId?: string;
  /** Current period start */
  currentPeriodStart?: string;
  /** Current period end */
  currentPeriodEnd?: string;
  /** Whether subscription auto-renews */
  autoRenew: boolean;
  /** Subscription price */
  price: number;
  /** Currency */
  currency: string;
  /** Trial end date if applicable */
  trialEnd?: string;
  /** Cancellation date if cancelled */
  cancelledAt?: string;
  /** Cancellation reason */
  cancellationReason?: string;
}

/**
 * User analytics and statistics
 */
export interface UserAnalytics {
  /** Total beats purchased */
  totalPurchases: number;
  /** Total amount spent */
  totalSpent: number;
  /** Total downloads */
  totalDownloads: number;
  /** Favorite genres */
  favoriteGenres: string[];
  /** Average session duration */
  averageSessionDuration: number;
  /** Last login date */
  lastLogin: string;
  /** Account age in days */
  accountAge: number;
  /** Engagement score (0-100) */
  engagementScore: number;
}

/**
 * Core User interface
 */
export interface User {
  /** Unique user identifier */
  id: number;
  /** Clerk authentication ID */
  clerkId: string;
  /** Username (unique) */
  username: string;
  /** Email address */
  email: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Full display name */
  displayName: string;
  /** Profile image URL */
  imageUrl: string;
  /** Avatar URL (alias for imageUrl) */
  avatar: string;
  /** User role */
  role: UserRole;
  /** Account status */
  status: UserStatus;
  /** Whether account is active */
  isActive: boolean;
  /** User preferences */
  preferences: UserPreferences;
  /** User metadata */
  metadata: UserMetadata;
  /** Current subscription */
  subscription?: UserSubscription;
  /** Download quota information */
  quota: UserQuota;
  /** Stripe customer ID */
  stripeCustomerId?: string;
  /** When user was created */
  createdAt: string;
  /** When user was last updated */
  updatedAt: string;
  /** Last login timestamp */
  lastLoginAt: string;
  /** Email verification status */
  emailVerified: boolean;
  /** When email was verified */
  emailVerifiedAt: string;
  /** User analytics */
  analytics: UserAnalytics;
}

/**
 * User profile for public display
 */
export interface UserProfile {
  /** User ID */
  id: number;
  /** Username */
  username: string;
  /** Display name */
  displayName?: string;
  /** Avatar URL */
  avatar?: string;
  /** User role */
  role: UserRole;
  /** Member since date */
  memberSince: string;
  /** Whether profile is public */
  isPublic: boolean;
  /** Bio/description */
  bio?: string;
  /** Social media links */
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    soundcloud?: string;
  };
}

/**
 * User creation input
 */
export interface UserInput {
  /** Clerk ID */
  clerkId: string;
  /** Username */
  username: string;
  /** Email address */
  email: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Profile image URL */
  imageUrl?: string;
  /** User role */
  role?: UserRole;
  /** User preferences */
  preferences?: Partial<UserPreferences>;
  /** User metadata */
  metadata?: Partial<UserMetadata>;
}

/**
 * User update input
 */
export interface UserUpdateInput {
  /** Username */
  username?: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Display name */
  displayName?: string;
  /** Profile image URL */
  imageUrl?: string;
  /** User preferences */
  preferences?: Partial<UserPreferences>;
  /** User metadata */
  metadata?: Partial<UserMetadata>;
  /** Bio */
  bio?: string;
  /** Social links */
  socialLinks?: Partial<UserProfile["socialLinks"]>;
}

/**
 * User search criteria
 */
export interface UserSearchCriteria {
  /** Search query (username, email, name) */
  query?: string;
  /** Filter by role */
  role?: UserRole[];
  /** Filter by status */
  status?: UserStatus[];
  /** Filter by subscription plan */
  subscriptionPlan?: SubscriptionPlan[];
  /** Filter by registration date range */
  registrationDateRange?: {
    start: string;
    end: string;
  };
  /** Sort criteria */
  sortBy?: "newest" | "oldest" | "username" | "email" | "last_active";
  /** Number of results per page */
  limit?: number;
  /** Page offset */
  offset?: number;
}

/**
 * User search results
 */
export interface UserSearchResults {
  /** Array of matching users */
  users: UserProfile[];
  /** Total number of matching users */
  total: number;
  /** Current page */
  page: number;
  /** Number of results per page */
  limit: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Search criteria used */
  criteria: UserSearchCriteria;
}

// ================================
// CONSTANTS
// ================================

/** Default user preferences */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: Language.EN,
  theme: Theme.AUTO,
  notifications: {
    email: true,
    push: true,
    sms: false,
    marketing: false,
    updates: true,
    newBeats: true,
    orderUpdates: true,
    downloadNotifications: true,
    subscriptionUpdates: true,
  },
  privacy: {
    profileVisibility: PrivacyLevel.PUBLIC,
    showActivity: true,
    allowAnalytics: true,
    showInSearch: true,
    allowDirectMessages: true,
    showPurchaseHistory: false,
  },
  audio: {
    defaultVolume: 75,
    autoplay: false,
    quality: AudioQuality.HIGH,
    downloadFormat: DownloadFormat.MP3,
    crossfade: false,
    crossfadeDuration: 3,
  },
} as const;

/** Subscription plan features */
export const SUBSCRIPTION_FEATURES: Record<
  SubscriptionPlan,
  {
    monthlyDownloads: number;
    price: number;
    features: readonly string[];
  }
> = {
  [SubscriptionPlan.FREE]: {
    monthlyDownloads: 3,
    price: 0,
    features: ["3 downloads per month", "Basic quality", "Community support"],
  },
  [SubscriptionPlan.BASIC]: {
    monthlyDownloads: 10,
    price: 9.99,
    features: ["10 downloads per month", "High quality", "Email support", "Basic license"],
  },
  [SubscriptionPlan.PREMIUM]: {
    monthlyDownloads: 50,
    price: 29.99,
    features: ["50 downloads per month", "Premium quality", "Priority support", "Premium license"],
  },
  [SubscriptionPlan.UNLIMITED]: {
    monthlyDownloads: -1, // Unlimited
    price: 99.99,
    features: ["Unlimited downloads", "Highest quality", "24/7 support", "Unlimited license"],
  },
  [SubscriptionPlan.PRODUCER]: {
    monthlyDownloads: -1, // Unlimited
    price: 199.99,
    features: ["Unlimited downloads", "Producer tools", "Analytics", "Revenue sharing"],
  },
} as const;

/** User role permissions */
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  [UserRole.CUSTOMER]: ["purchase", "download", "wishlist", "profile"],
  [UserRole.PRODUCER]: ["purchase", "download", "wishlist", "profile", "upload", "analytics"],
  [UserRole.MODERATOR]: ["purchase", "download", "wishlist", "profile", "moderate", "support"],
  [UserRole.SUPPORT]: ["purchase", "download", "wishlist", "profile", "support", "user_management"],
  [UserRole.ADMIN]: ["*"], // All permissions
} as const;
