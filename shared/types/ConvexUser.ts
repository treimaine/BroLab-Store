/**
 * Convex User Type Definitions and Conversion Utilities
 *
 * This module provides type-safe conversion between Convex User types
 * and the shared schema User types used throughout the application.
 */

import { Id } from "../../convex/_generated/dataModel";
import type { User } from "../schema";

/**
 * Convex User type that matches the actual Convex schema
 */
export interface ConvexUser {
  _id: Id<"users">;
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  avatar?: string;
  name?: string;
  role?: string;
  isActive?: boolean;
  lastLoginAt?: number;
  preferences?: {
    language: string;
    theme: "light" | "dark" | "auto";
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      marketing: boolean;
      updates: boolean;
    };
    privacy: {
      profileVisibility: "public" | "private" | "friends";
      showActivity: boolean;
      allowAnalytics: boolean;
    };
    audio: {
      defaultVolume: number;
      autoplay: boolean;
      quality: "low" | "medium" | "high";
      downloadFormat: "mp3" | "wav" | "flac";
    };
  };
  metadata?: {
    signupSource?: string;
    referralCode?: string;
    lastActiveAt?: number;
    deviceInfo?: {
      type: "desktop" | "mobile" | "tablet";
      os: string;
      browser: string;
      version: string;
      screenResolution?: string;
    };
    locationInfo?: {
      country?: string;
      region?: string;
      city?: string;
      timezone?: string;
      ip?: string;
    };
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Input type for creating/updating users in Convex
 */
export interface ConvexUserInput extends Record<string, unknown> {
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  fullName?: string;
  avatarUrl?: string;
}

/**
 * Type-safe conversion from ConvexUser to shared schema User
 */
export function convexUserToUser(convexUser: ConvexUser): User {
  // Extract numeric ID from Convex ID for compatibility
  const numericId = extractNumericId(convexUser._id);

  return {
    id: numericId,
    username:
      convexUser.username ||
      convexUser.email.split("@")[0] ||
      `user_${convexUser.clerkId.slice(-8)}`,
    email: convexUser.email,
    password: "", // Not stored in Convex, using Clerk for auth
    created_at: new Date(convexUser.createdAt).toISOString(),
    avatar: convexUser.imageUrl || convexUser.avatar || null,
    subscription: null, // Will be populated separately if needed
    memberSince: new Date(convexUser.createdAt).toISOString(),
    stripeCustomerId: null, // Using Clerk for billing
    stripe_customer_id: null, // Snake case version for compatibility
    downloads_used: 0, // Default value, will be updated from quota system
    quota: 3, // Default free tier quota
  };
}

/**
 * Type-safe conversion from shared schema User to ConvexUserInput
 */
export function userToConvexUserInput(user: Partial<User> & { clerkId: string }): ConvexUserInput {
  return {
    clerkId: user.clerkId,
    email: user.email || "",
    username: user.username,
    firstName: undefined, // Not available in shared User type
    lastName: undefined, // Not available in shared User type
    imageUrl: user.avatar || undefined,
  };
}

/**
 * Extract numeric ID from Convex ID for compatibility with legacy systems
 */
export function extractNumericId(convexId: Id<"users">): number {
  // Extract the last 8 characters and convert to number
  const idString = convexId.toString();
  const numericPart = idString.slice(-8);
  const parsed = parseInt(numericPart, 16); // Parse as hex for better distribution
  return parsed || Math.floor(Math.random() * 1000000); // Fallback to random number
}

/**
 * Create a Convex ID from a numeric user ID (for reverse compatibility)
 */
export function createConvexUserId(numericId: number): Id<"users"> {
  // This is a simplified approach - in production, you'd want to maintain a mapping
  return `users:${numericId.toString().padStart(8, "0")}` as Id<"users">;
}

/**
 * Type guard to check if an object is a ConvexUser
 */
export function isConvexUser(obj: unknown): obj is ConvexUser {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "_id" in obj &&
    "clerkId" in obj &&
    "email" in obj &&
    "createdAt" in obj &&
    "updatedAt" in obj
  );
}

/**
 * Type guard to check if an object is a shared schema User
 */
export function isSharedUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "username" in obj &&
    "email" in obj &&
    "password" in obj &&
    "created_at" in obj
  );
}

/**
 * Safe conversion that handles both ConvexUser and User types
 */
export function ensureSharedUser(user: ConvexUser | User): User | null {
  if (isConvexUser(user)) {
    return convexUserToUser(user);
  }

  if (isSharedUser(user)) {
    return user;
  }

  return null;
}

/**
 * Default user preferences for new users
 */
export const DEFAULT_CONVEX_USER_PREFERENCES = {
  language: "en",
  theme: "auto" as const,
  notifications: {
    email: true,
    push: true,
    sms: false,
    marketing: false,
    updates: true,
  },
  privacy: {
    profileVisibility: "public" as const,
    showActivity: true,
    allowAnalytics: true,
  },
  audio: {
    defaultVolume: 75,
    autoplay: false,
    quality: "high" as const,
    downloadFormat: "mp3" as const,
  },
} as const;
