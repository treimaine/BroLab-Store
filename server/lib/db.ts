import type {
  ActivityLog,
  CartItem,
  Download,
  File,
  InsertFile,
  InsertOrder,
  InsertReservation,
  Order,
  Reservation,
  ReservationStatusEnum,
  ServiceOrder,
  ServiceOrderInput,
  User,
} from "../../shared/schema";
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
  return await convexGetUserByClerkId(clerkId);
}

// Upsert user
export async function upsertUser(user: Partial<User>): Promise<User> {
  const result = await convexUpsertUser(user);
  if (!result) throw new Error("Failed to upsert user");
  return result as User;
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
      userId: String(userId),
      beatId: productId,
      licenseType: license,
    });

    // Map to expected format
    return {
      id: (result as any)?.toString() || "0",
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
export async function createServiceOrder(order: ServiceOrderInput): Promise<ServiceOrder> {
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
  status,
  current_period_end,
}: {
  stripeSubId: string;
  userId: number;
  plan: string;
  status: string;
  current_period_end: string;
}): Promise<any> {
  return await convexUpsertSubscription({
    userId: String(userId),
    stripeSubscriptionId: stripeSubId,
    plan,
    status,
    currentPeriodEnd: current_period_end,
  });
}

export async function getSubscription(userId: number): Promise<any> {
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
  const result = await convexLogActivity({
    userId: String(activity.user_id || 0),
    action: activity.action,
    details: activity.details,
  });
  if (!result) throw new Error("Failed to log activity");
  return result as ActivityLog;
}

// Sauvegarde l'URL de la facture PDF dans la commande
export async function saveInvoiceUrl(orderId: number, url: string): Promise<void> {
  // TODO: Implement with Convex
  console.log("Saving invoice URL:", orderId, url);
}

// Génère ou récupère le numéro de facture (BRLB-YYYY-000123)
export async function ensureInvoiceNumber(orderId: number): Promise<string> {
  // TODO: Implement with Convex
  console.log("Ensuring invoice number for order:", orderId);
  return `BRLB-${new Date().getFullYear()}-${String(orderId).padStart(6, "0")}`;
}

// Récupère la commande et ses items pour la facture
export async function getOrderInvoiceData(
  orderId: number
): Promise<{ order: Order; items: CartItem[] }> {
  // TODO: Implement with Convex
  console.log("Getting order invoice data:", orderId);
  return { order: {} as Order, items: [] };
}

// Crée une nouvelle commande
export async function createOrder(order: InsertOrder): Promise<Order> {
  const result = await convexCreateOrder(order);
  if (!result) throw new Error("Failed to create order");
  return result as Order;
}

// Liste les commandes d'un utilisateur
export async function listUserOrders(userId: number): Promise<Order[]> {
  // TODO: Implement with Convex
  console.log("Listing user orders:", userId);
  return [];
}

// Liste les items d'une commande
export async function listOrderItems(orderId: number): Promise<CartItem[]> {
  // TODO: Implement with Convex
  console.log("Listing order items:", orderId);
  return [];
}

// Reservation helpers
export async function createReservation(reservation: InsertReservation): Promise<Reservation> {
  const result = await convexCreateReservation(reservation);
  if (!result) throw new Error("Failed to create reservation");
  return result as Reservation;
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
