import type {
  ActivityLog,
  CartItem,
  Download,
  File,
  InsertFile,
  InsertOrder,
  InsertReservation,
  InsertServiceOrder,
  Order,
  Reservation,
  ReservationStatusEnum,
  ServiceOrder,
  User,
} from "../../shared/schema";
import {
  convexUserToUser,
  createConvexUserId,
  userToConvexUserInput,
} from "../../shared/types/ConvexUser";
import {
  createOrder as convexCreateOrder,
  createReservation as convexCreateReservation,
  getUserByClerkId as convexGetUserByClerkId,
  logActivity as convexLogActivity,
  logDownload as convexLogDownload,
  upsertSubscription as convexUpsertSubscription,
  upsertUser as convexUpsertUser,
} from "./convex";

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  // TODO: Implement with Convex
  console.log("Getting user by email:", email);
  return null;
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
  // TODO: Implement with Convex
  console.log("Getting user by username:", username);
  return null;
}

// Get user by Clerk ID
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const convexUser = await convexGetUserByClerkId(clerkId);
  if (!convexUser) return null;

  // Convert Convex User to shared schema User using type-safe conversion
  return convexUserToUser(convexUser);
}

// Upsert user
export async function upsertUser(user: {
  clerkId: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
}): Promise<User | null> {
  // Convert input to ConvexUserInput format
  const convexUserInput = userToConvexUserInput(user);
  const result = await convexUpsertUser(convexUserInput);
  if (!result) throw new Error("Failed to upsert user");

  // Convert Convex User to shared schema User using type-safe conversion
  return convexUserToUser(result);
}

// Log a download event (idempotent: increments count if already exists)
export async function logDownload({
  userId,
  productId,
  license,
}: {
  userId: number;
  productId: number;
  license: string;
}): Promise<Download> {
  console.log("🔧 Logging download for user:", userId, "product:", productId, "license:", license);

  try {
    const result = await convexLogDownload({
      userId: createConvexUserId(userId),
      beatId: productId,
      licenseType: license,
    });

    // Map to expected format
    return {
      id: result?.toString() || "0",
      user_id: userId,
      product_id: productId,
      license: license,
      downloaded_at: new Date().toISOString(),
      download_count: 1,
    } as Download;
  } catch (error) {
    console.error("🚨 Failed to log download:", error);
    throw error;
  }
}

// List all downloads for a user
export async function listDownloads(userId: number): Promise<Download[]> {
  // TODO: Implement with Convex
  console.log("Listing downloads for user:", userId);
  return [];
}

// Create a service order
export async function createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder> {
  // TODO: Implement with Convex
  console.log("Creating service order:", order);
  return {} as ServiceOrder;
}

// List all service orders for a user
export async function listServiceOrders(userId: number): Promise<ServiceOrder[]> {
  // TODO: Implement with Convex
  console.log("Listing service orders for user:", userId);
  return [];
}

export async function getUserById(id: number): Promise<User | null> {
  // TODO: Implement with Convex
  console.log("Getting user by ID:", id);
  return null;
}

// Subscription helpers
export async function upsertSubscription({
  stripeSubId,
  userId,
  plan,
}: {
  stripeSubId: string;
  userId: number;
  plan: string;
  _status?: string;
  _current_period_end?: string;
}): Promise<string | null> {
  // Convert the user ID to proper Convex ID format using type-safe conversion
  const convexUserId = createConvexUserId(userId);

  return await convexUpsertSubscription({
    userId: convexUserId,
    stripeCustomerId: stripeSubId, // Use stripeCustomerId instead of stripeSubscriptionId
    plan,
  });
}

export async function getSubscription(userId: number): Promise<unknown> {
  // TODO: Implement with Convex
  console.log("Getting subscription for user:", userId);
  return null;
}

export async function subscriptionStatusHelper(userId: number): Promise<string> {
  // TODO: Implement with Convex
  console.log("Getting subscription status for user:", userId);
  return "none";
}

// File management helpers
export async function createFileRecord(fileData: InsertFile): Promise<File> {
  // TODO: Implement with Convex
  console.log("Creating file record:", fileData);
  return {} as File;
}

export async function getFileById(fileId: string): Promise<File | null> {
  // TODO: Implement with Convex
  console.log("Getting file by ID:", fileId);
  return null;
}

export async function getUserFiles(
  userId: number,
  filters?: {
    role?: string;
    reservation_id?: string;
    order_id?: number;
  }
): Promise<File[]> {
  // TODO: Implement with Convex
  console.log("Getting user files:", userId, filters);
  return [];
}

export async function deleteFileRecord(fileId: string): Promise<void> {
  // TODO: Implement with Convex
  console.log("Deleting file record:", fileId);
}

export async function logActivity(activity: Omit<ActivityLog, "id">): Promise<ActivityLog> {
  // Convert user_id to proper Convex ID format using type-safe conversion
  const convexUserId = activity.user_id
    ? createConvexUserId(activity.user_id)
    : createConvexUserId(0);

  const result = await convexLogActivity({
    userId: convexUserId,
    action: activity.action,
    details: activity.details,
  });
  if (!result) throw new Error("Failed to log activity");

  // Convert Convex result to ActivityLog format
  return {
    id: Number.parseInt(result.toString().slice(-8), 10) || 0,
    user_id: activity.user_id,
    action: activity.action,
    details: activity.details,
    timestamp: new Date().toISOString(),
  } as ActivityLog;
}

// Save the invoice PDF URL in the order
export async function saveInvoiceUrl(orderId: number, url: string): Promise<void> {
  // TODO: Implement with Convex
  console.log("Saving invoice URL:", orderId, url);
}

// Generate or retrieve the invoice number (BRLB-YYYY-000123)
export async function ensureInvoiceNumber(orderId: number): Promise<string> {
  // TODO: Implement with Convex
  console.log("Ensuring invoice number for order:", orderId);
  return `BRLB-${new Date().getFullYear()}-${String(orderId).padStart(6, "0")}`;
}

// Retrieve the order and its items for the invoice
export async function getOrderInvoiceData(
  orderId: number
): Promise<{ order: Order; items: CartItem[] }> {
  // TODO: Implement with Convex
  console.log("Getting order invoice data:", orderId);
  return { order: {} as Order, items: [] };
}

// Create a new order
export async function createOrder(order: InsertOrder): Promise<Order> {
  // Transform InsertOrder to match Convex OrderData interface
  const convexOrderData = {
    items: order.items.map(item => ({
      productId: item.productId || 0,
      title: item.title,
      name: item.title, // Use title as name for compatibility
      price: item.price || 0,
      license: item.license || "basic",
      quantity: item.quantity || 1,
    })),
    total: order.total,
    email: order.email,
    status: order.status,
    currency: "USD", // Default currency
    paymentId: order.stripe_payment_intent_id || undefined,
    paymentStatus: order.status === "paid" ? "succeeded" : "pending",
  };

  const result = await convexCreateOrder(convexOrderData);
  if (!result) throw new Error("Failed to create order");

  // Convert Convex result to Order format
  return {
    id: Number.parseInt(result.orderId?.toString().slice(-8) ?? "0", 10) || 0,
    user_id: order.user_id,
    session_id: order.session_id,
    email: order.email,
    total: order.total,
    status: order.status,
    stripe_payment_intent_id: order.stripe_payment_intent_id,
    items: order.items.map(item => ({
      id: 0,
      beat_id: item.productId || 0,
      license_type: item.license || "basic",
      price: item.price || 0,
      quantity: item.quantity || 1,
      session_id: order.session_id,
      user_id: order.user_id,
      created_at: new Date().toISOString(),
    })),
    created_at: new Date().toISOString(),
  } as Order;
}

// List orders for a user
export async function listUserOrders(userId: number): Promise<Order[]> {
  // TODO: Implement with Convex
  console.log("Listing user orders:", userId);
  return [];
}

// List items for an order
export async function listOrderItems(orderId: number): Promise<CartItem[]> {
  // TODO: Implement with Convex
  console.log("Listing order items:", orderId);
  return [];
}

// Reservation helpers
export async function createReservation(
  reservation: InsertReservation & { clerkId?: string }
): Promise<Reservation> {
  // Validate required clerkId
  if (!reservation.clerkId) {
    throw new Error("Authentication error: clerkId is required for reservation creation");
  }

  // Transform InsertReservation to match Convex ReservationData interface
  const convexReservationData = {
    serviceType: reservation.service_type,
    details: reservation.details as Record<string, unknown>, // Keep as object for Convex
    preferredDate: reservation.preferred_date,
    durationMinutes: reservation.duration_minutes,
    totalPrice: reservation.total_price,
    notes: reservation.notes || undefined,
    clerkId: reservation.clerkId, // Use actual clerkId when available
  };

  console.log("🚀 DB Layer: Creating reservation with Convex data:", {
    serviceType: convexReservationData.serviceType,
    preferredDate: convexReservationData.preferredDate,
    durationMinutes: convexReservationData.durationMinutes,
    totalPrice: convexReservationData.totalPrice,
    clerkId: convexReservationData.clerkId
      ? `${convexReservationData.clerkId.substring(0, 8)}...`
      : "undefined",
  });

  try {
    const result = await convexCreateReservation(convexReservationData);
    if (!result) {
      throw new Error("Convex reservation creation returned null result");
    }

    console.log("✅ DB Layer: Reservation created with ID:", result.toString());

    // Convert Convex result to Reservation format
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Reservation;
  } catch (error) {
    console.error("❌ DB Layer: Failed to create reservation:", error);

    // Re-throw with more specific error messages
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

export async function getReservationById(id: string): Promise<Reservation | null> {
  // TODO: Implement with Convex
  console.log("Getting reservation by ID:", id);
  return null;
}

export async function getUserReservations(userId: string | number): Promise<Reservation[]> {
  // TODO: Implement with Convex
  console.log("Getting user reservations:", userId);
  return [];
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatusEnum
): Promise<Reservation> {
  // TODO: Implement with Convex
  console.log("Updating reservation status:", id, status);
  return {} as Reservation;
}

export async function getReservationsByDateRange(
  startDate: string,
  endDate: string
): Promise<Reservation[]> {
  // TODO: Implement with Convex
  console.log("Getting reservations by date range:", startDate, endDate);
  return [];
}

// Update user avatar
export async function updateUserAvatar(userId: string | number, avatarUrl: string): Promise<void> {
  // TODO: Implement with Convex
  console.log("Updating user avatar:", userId, avatarUrl);
}
