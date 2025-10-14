import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../convex/_generated/dataModel";
import {
  CONVEX_FUNCTIONS,
  ConvexOperationWrapper,
  type ConvexFunctionCaller,
} from "../../shared/types/ConvexIntegration";
import type { ConvexUser, ConvexUserInput } from "../../shared/types/ConvexUser";

// Initialize Convex client for server-side operations
const convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL environment variable is required");
}

const convex = new ConvexHttpClient(convexUrl);

// Create type-safe wrapper for Convex operations
const convexWrapper = new ConvexOperationWrapper(convex as ConvexFunctionCaller);

export { convex, convexWrapper };

// Type definitions that match Convex schema exactly - these are the corrected interface definitions

export interface DownloadData extends Record<string, unknown> {
  userId: Id<"users">;
  beatId: number;
  licenseType: string;
  downloadUrl?: string;
  fileSize?: number;
  downloadCount?: number;
  expiresAt?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface OrderData extends Record<string, unknown> {
  items: Array<{
    productId: number;
    title: string;
    name?: string; // Keep for backward compatibility
    price: number;
    license: string;
    quantity: number;
  }>;
  total: number;
  email: string;
  status: string;
  currency?: string;
  paymentId?: string;
  paymentStatus?: string;
}

export interface ReservationData extends Record<string, unknown> {
  serviceType: string;
  details: Record<string, unknown>; // Flexible to match Convex function signature
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  notes?: string;
  clerkId?: string; // For server-side authentication
}

export interface SubscriptionData extends Record<string, unknown> {
  userId: Id<"users">;
  stripeCustomerId?: string;
  plan?: string;
}

export interface ActivityData extends Record<string, unknown> {
  userId: Id<"users">;
  action: string;
  details?: Record<string, unknown>; // Flexible to support various activity event structures
}

// Type-safe Convex function implementations using the wrapper

export async function getUserByClerkId(clerkId: string): Promise<ConvexUser | null> {
  try {
    const result = await convexWrapper.query<ConvexUser>(CONVEX_FUNCTIONS.GET_USER_BY_CLERK_ID, {
      clerkId,
    });
    return result.data || null;
  } catch (error) {
    console.error("getUserByClerkId failed:", error);
    return null;
  }
}

export async function upsertUser(userData: ConvexUserInput): Promise<ConvexUser | null> {
  try {
    const result = await convexWrapper.mutation<ConvexUser>(CONVEX_FUNCTIONS.UPSERT_USER, userData);
    return result.data || null;
  } catch (error) {
    console.error("upsertUser failed:", error);
    return null;
  }
}

export async function logDownload(downloadData: DownloadData): Promise<Id<"downloads"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"downloads">>(
      CONVEX_FUNCTIONS.LOG_DOWNLOAD,
      downloadData
    );
    return result.data || null;
  } catch (error) {
    console.error("logDownload failed:", error);
    return null;
  }
}

export async function createOrder(
  orderData: OrderData
): Promise<{ success: boolean; orderId: Id<"orders">; message: string } | null> {
  try {
    const result = await convexWrapper.mutation<{
      success: boolean;
      orderId: Id<"orders">;
      message: string;
    }>(CONVEX_FUNCTIONS.CREATE_ORDER, orderData);
    return result.data || null;
  } catch (error) {
    console.error("createOrder failed:", error);
    return null;
  }
}

export async function createReservation(
  reservationData: ReservationData & { clerkId?: string }
): Promise<Id<"reservations"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"reservations">>(
      CONVEX_FUNCTIONS.CREATE_RESERVATION,
      reservationData
    );
    return result.data || null;
  } catch (error) {
    console.error("createReservation failed:", error);
    return null;
  }
}

export async function upsertSubscription(
  subscriptionData: SubscriptionData
): Promise<Id<"users"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"users">>(
      CONVEX_FUNCTIONS.UPSERT_SUBSCRIPTION,
      subscriptionData
    );
    return result.data || null;
  } catch (error) {
    console.error("upsertSubscription failed:", error);
    return null;
  }
}

export async function logActivity(activityData: ActivityData): Promise<Id<"activityLog"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"activityLog">>(
      CONVEX_FUNCTIONS.LOG_ACTIVITY,
      activityData
    );
    return result.data || null;
  } catch (error) {
    console.error("logActivity failed:", error);
    return null;
  }
}

/**
 * INTERFACE DEFINITIONS CORRECTED FOR CONVEX INTEGRATION
 *
 * This file provides the corrected interface definitions that match the Convex schema exactly:
 *
 * 1. DownloadData - Matches convex/downloads/record.ts expectations
 * 2. OrderData - Matches convex/orders/createOrder.ts expectations
 * 3. ReservationData - Matches convex/reservations/createReservation.ts expectations
 * 4. SubscriptionData - Matches convex/subscriptions/updateSubscription.ts expectations
 * 5. ActivityData - Matches convex/activity/logActivity.ts expectations
 *
 * The API import issue with "Type instantiation is excessively deep and possibly infinite"
 * is a known TypeScript limitation with complex generated types. The interface definitions
 * are now correct and type-safe for Convex integration.
 *
 * To resolve the API import issue in the future:
 * - Consider using Convex's official client-side hooks instead of server-side calls
 * - Use dynamic imports with proper error handling
 * - Consider upgrading to newer versions of Convex that may have resolved this issue
 */
