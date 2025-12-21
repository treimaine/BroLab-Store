import type { Id } from "../../convex/_generated/dataModel";
import type {
  ActivityLog,
  CartItem,
  File as DbFile,
  Download,
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
  createFileRecord as convexCreateFileRecord,
  createOrder as convexCreateOrder,
  createReservation as convexCreateReservation,
  generateInvoiceNumber as convexGenerateInvoiceNumber,
  getOrderInvoiceData as convexGetOrderInvoiceData,
  getReservationById as convexGetReservationById,
  getReservationsByDateRange as convexGetReservationsByDateRange,
  getSubscription as convexGetSubscription,
  getSubscriptionStatus as convexGetSubscriptionStatus,
  getUserByClerkId as convexGetUserByClerkId,
  getUserByEmail as convexGetUserByEmail,
  getUserById as convexGetUserById,
  getUserByUsername as convexGetUserByUsername,
  getUserReservations as convexGetUserReservations,
  listDownloads as convexListDownloads,
  listOrderItems as convexListOrderItems,
  listUserOrders as convexListUserOrders,
  logActivity as convexLogActivity,
  logDownload as convexLogDownload,
  saveInvoiceUrl as convexSaveInvoiceUrl,
  updateReservationStatus as convexUpdateReservationStatus,
  updateUserAvatar as convexUpdateUserAvatar,
  upsertSubscription as convexUpsertSubscription,
  upsertUser as convexUpsertUser,
} from "./convex";

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export async function getUserByEmail(email: string): Promise<User | null> {
  const convexUser = await convexGetUserByEmail(email);
  if (!convexUser) return null;
  return convexUserToUser(convexUser);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const convexUser = await convexGetUserByUsername(username);
  if (!convexUser) return null;
  return convexUserToUser(convexUser);
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const convexUser = await convexGetUserByClerkId(clerkId);
  if (!convexUser) return null;
  return convexUserToUser(convexUser);
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const convexUserId = createConvexUserId(id);
    const convexUser = await convexGetUserById(convexUserId);
    if (!convexUser) return null;
    return convexUserToUser(convexUser);
  } catch (error) {
    console.error("Failed to get user by ID:", error);
    return null;
  }
}

export async function upsertUser(user: {
  clerkId: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
}): Promise<User | null> {
  const convexUserInput = userToConvexUserInput(user);
  const result = await convexUpsertUser(convexUserInput);
  if (!result) throw new Error("Failed to upsert user");
  return convexUserToUser(result);
}

export async function updateUserAvatar(userId: string | number, avatarUrl: string): Promise<void> {
  try {
    const clerkId = typeof userId === "string" ? userId : `user_${userId}`;
    await convexUpdateUserAvatar(clerkId, avatarUrl);
  } catch (error) {
    console.error("Failed to update user avatar:", error);
  }
}

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

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

export async function listDownloads(userId: number): Promise<Download[]> {
  try {
    const convexUserId = createConvexUserId(userId);
    const downloads = await convexListDownloads(convexUserId);

    return downloads.map(d => ({
      id: d._id.toString(),
      user_id: userId,
      product_id: d.beatId,
      license: d.licenseType,
      downloaded_at: new Date(d.timestamp).toISOString(),
      download_count: d.downloadCount || 1,
    })) as Download[];
  } catch (error) {
    console.error("Failed to list downloads:", error);
    return [];
  }
}

// ============================================================================
// SERVICE ORDER FUNCTIONS
// ============================================================================

export async function createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder> {
  console.log("Creating service order:", order);

  const estimatedPrice = order.details?.duration ? order.details.duration * 50 : 100;

  const orderData = {
    items: [
      {
        productId: 0,
        title: order.service_type,
        name: order.service_type,
        price: estimatedPrice,
        license: "service",
        quantity: 1,
      },
    ],
    total: estimatedPrice,
    email: "",
    status: "pending",
    currency: "USD",
  };

  const result = await convexCreateOrder(orderData);
  if (!result) throw new Error("Failed to create service order");

  return {
    id: Number.parseInt(result.orderId?.toString().slice(-8) ?? "0", 10) || 0,
    user_id: order.user_id,
    service_type: order.service_type,
    status: "pending",
    estimated_price: estimatedPrice,
    details: order.details,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as ServiceOrder;
}

export async function listServiceOrders(userId: number): Promise<ServiceOrder[]> {
  try {
    const convexUserId = createConvexUserId(userId);
    const orders = await convexListUserOrders(convexUserId);

    const serviceOrders = orders.filter(o =>
      o.items?.some((item: Record<string, unknown>) => item.license === "service")
    );

    return serviceOrders.map(o => {
      const firstItem = o.items?.[0] as Record<string, unknown> | undefined;
      const serviceType = typeof firstItem?.title === "string" ? firstItem.title : "unknown";
      return {
        id: Number.parseInt(o._id.toString().slice(-8), 10) || 0,
        user_id: userId,
        service_type: serviceType,
        status: o.status as "pending" | "in_progress" | "completed" | "cancelled",
        estimated_price: o.total,
        details: {},
        created_at: new Date(o.createdAt).toISOString(),
        updated_at: new Date(o.updatedAt).toISOString(),
      };
    }) as ServiceOrder[];
  } catch (error) {
    console.error("Failed to list service orders:", error);
    return [];
  }
}

// ============================================================================
// SUBSCRIPTION FUNCTIONS
// ============================================================================

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
  const convexUserId = createConvexUserId(userId);
  return await convexUpsertSubscription({
    userId: convexUserId,
    stripeCustomerId: stripeSubId,
    plan,
  });
}

export async function getSubscription(userId: number): Promise<unknown> {
  try {
    const convexUserId = createConvexUserId(userId);
    return await convexGetSubscription(convexUserId);
  } catch (error) {
    console.error("Failed to get subscription:", error);
    return null;
  }
}

export async function subscriptionStatusHelper(userId: number): Promise<string> {
  try {
    const convexUserId = createConvexUserId(userId);
    return await convexGetSubscriptionStatus(convexUserId);
  } catch (error) {
    console.error("Failed to get subscription status:", error);
    return "none";
  }
}

// ============================================================================
// FILE MANAGEMENT FUNCTIONS
// ============================================================================

export async function createFileRecord(fileData: InsertFile): Promise<DbFile> {
  try {
    const result = await convexCreateFileRecord({
      filename: fileData.filename,
      originalName: fileData.original_name,
      storagePath: fileData.storage_path,
      mimeType: fileData.mime_type,
      size: fileData.size,
      role: fileData.role,
      reservationId: fileData.reservation_id as Id<"reservations"> | undefined,
      orderId: fileData.order_id as unknown as Id<"orders"> | undefined,
      clerkId: "", // Will be set by the Convex function from auth context
    });

    if (!result) throw new Error("Failed to create file record");

    return {
      id: result,
      user_id: fileData.user_id,
      filename: fileData.filename,
      original_name: fileData.original_name,
      storage_path: fileData.storage_path,
      mime_type: fileData.mime_type,
      size: fileData.size,
      role: fileData.role,
      reservation_id: fileData.reservation_id,
      order_id: fileData.order_id,
      created_at: new Date().toISOString(),
    } as DbFile;
  } catch (error) {
    console.error("Failed to create file record:", error);
    throw error;
  }
}

export async function getFileById(fileId: string): Promise<DbFile | null> {
  console.log("Getting file by ID:", fileId);
  return null;
}

export async function getUserFiles(
  userId: number,
  filters?: { role?: string; reservation_id?: string; order_id?: number }
): Promise<DbFile[]> {
  console.log("Getting user files:", userId, filters);
  return [];
}

export async function deleteFileRecord(fileId: string): Promise<void> {
  console.log("Deleting file record:", fileId);
}

// ============================================================================
// ACTIVITY LOG FUNCTIONS
// ============================================================================

export async function logActivity(activity: Omit<ActivityLog, "id">): Promise<ActivityLog> {
  const convexUserId = activity.user_id
    ? createConvexUserId(activity.user_id)
    : createConvexUserId(0);

  const result = await convexLogActivity({
    userId: convexUserId,
    action: activity.action,
    details: activity.details,
  });
  if (!result) throw new Error("Failed to log activity");

  return {
    id: Number.parseInt(result.toString().slice(-8), 10) || 0,
    user_id: activity.user_id,
    action: activity.action,
    details: activity.details,
    timestamp: new Date().toISOString(),
  } as ActivityLog;
}

// ============================================================================
// INVOICE FUNCTIONS
// ============================================================================

export async function saveInvoiceUrl(orderId: number, url: string): Promise<void> {
  try {
    const convexOrderId = `orders:${orderId}` as Id<"orders">;
    await convexSaveInvoiceUrl(convexOrderId, url);
  } catch (error) {
    console.error("Failed to save invoice URL:", error);
  }
}

export async function ensureInvoiceNumber(orderId: number): Promise<string> {
  try {
    const convexOrderId = `orders:${orderId}` as Id<"orders">;
    const invoiceNumber = await convexGenerateInvoiceNumber(convexOrderId);
    return invoiceNumber || `BRLB-${new Date().getFullYear()}-${String(orderId).padStart(6, "0")}`;
  } catch (error) {
    console.error("Failed to ensure invoice number:", error);
    return `BRLB-${new Date().getFullYear()}-${String(orderId).padStart(6, "0")}`;
  }
}

export async function getOrderInvoiceData(
  orderId: number
): Promise<{ order: Order; items: CartItem[] }> {
  try {
    const convexOrderId = `orders:${orderId}` as Id<"orders">;
    const data = await convexGetOrderInvoiceData(convexOrderId);

    if (!data) {
      return { order: {} as Order, items: [] };
    }

    const order = { id: orderId, ...data.order } as Order;

    const items = (data.items || []).map((item: Record<string, unknown>) => ({
      id: 0,
      beat_id: item.productId as number,
      license_type: (item.license as string) || "basic",
      price: item.price as number,
      quantity: (item.quantity as number) || 1,
      session_id: null,
      user_id: null,
      created_at: new Date().toISOString(),
    })) as CartItem[];

    return { order, items };
  } catch (error) {
    console.error("Failed to get order invoice data:", error);
    return { order: {} as Order, items: [] };
  }
}

// ============================================================================
// ORDER FUNCTIONS
// ============================================================================

interface OrderItem {
  productId?: number;
  title: string;
  price?: number;
  license?: string;
  quantity?: number;
}

export async function createOrder(order: InsertOrder): Promise<Order> {
  const convexOrderData = {
    items: order.items.map((item: OrderItem) => ({
      productId: item.productId || 0,
      title: item.title,
      name: item.title,
      price: item.price || 0,
      license: item.license || "basic",
      quantity: item.quantity || 1,
    })),
    total: order.total,
    email: order.email,
    status: order.status,
    currency: "USD",
    paymentId: order.stripe_payment_intent_id || undefined,
    paymentStatus: order.status === "paid" ? "succeeded" : "pending",
  };

  const result = await convexCreateOrder(convexOrderData);
  if (!result) throw new Error("Failed to create order");

  return {
    id: Number.parseInt(result.orderId?.toString().slice(-8) ?? "0", 10) || 0,
    user_id: order.user_id,
    session_id: order.session_id,
    email: order.email,
    total: order.total,
    status: order.status,
    stripe_payment_intent_id: order.stripe_payment_intent_id,
    items: order.items.map((item: OrderItem) => ({
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

export async function listUserOrders(userId: number): Promise<Order[]> {
  try {
    const convexUserId = createConvexUserId(userId);
    const orders = await convexListUserOrders(convexUserId);

    return orders.map(o => ({
      id: Number.parseInt(o._id.toString().slice(-8), 10) || 0,
      user_id: userId,
      email: o.email,
      total: o.total,
      status: o.status,
      items: o.items || [],
      created_at: new Date(o.createdAt).toISOString(),
    })) as Order[];
  } catch (error) {
    console.error("Failed to list user orders:", error);
    return [];
  }
}

export async function listOrderItems(orderId: number): Promise<CartItem[]> {
  try {
    const convexOrderId = `orders:${orderId}` as Id<"orders">;
    const items = await convexListOrderItems(convexOrderId);

    return items.map(item => ({
      id: Number.parseInt(item._id.toString().slice(-8), 10) || 0,
      beat_id: item.productId,
      license_type: item.type,
      price: item.unitPrice,
      quantity: item.qty,
      session_id: null,
      user_id: null,
      created_at: new Date().toISOString(),
    })) as CartItem[];
  } catch (error) {
    console.error("Failed to list order items:", error);
    return [];
  }
}

// ============================================================================
// RESERVATION FUNCTIONS
// ============================================================================

export async function createReservation(
  reservation: InsertReservation & { clerkId?: string }
): Promise<Reservation> {
  if (!reservation.clerkId) {
    throw new Error("Authentication error: clerkId is required for reservation creation");
  }

  const convexReservationData = {
    serviceType: reservation.service_type,
    details: reservation.details as Record<string, unknown>,
    preferredDate: reservation.preferred_date,
    durationMinutes: reservation.duration_minutes,
    totalPrice: reservation.total_price,
    notes: reservation.notes || undefined,
    clerkId: reservation.clerkId,
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
  try {
    const convexReservationId = id as Id<"reservations">;
    const reservation = await convexGetReservationById(convexReservationId, true);

    if (!reservation) return null;

    return {
      id: reservation._id.toString(),
      user_id: reservation.userId
        ? Number.parseInt(reservation.userId.toString().slice(-8), 10)
        : null,
      service_type: reservation.serviceType,
      status: reservation.status,
      details: reservation.details,
      preferred_date: reservation.preferredDate,
      duration_minutes: reservation.durationMinutes,
      total_price: reservation.totalPrice,
      notes: reservation.notes,
      created_at: new Date(reservation.createdAt).toISOString(),
      updated_at: new Date(reservation.updatedAt).toISOString(),
    } as Reservation;
  } catch (error) {
    console.error("Failed to get reservation by ID:", error);
    return null;
  }
}

export async function getUserReservations(userId: string | number): Promise<Reservation[]> {
  try {
    const clerkId = typeof userId === "string" ? userId : `user_${userId}`;
    const reservations = await convexGetUserReservations(clerkId);

    return reservations.map(r => ({
      id: r._id.toString(),
      user_id: r.userId ? Number.parseInt(r.userId.toString().slice(-8), 10) : null,
      service_type: r.serviceType,
      status: r.status,
      details: r.details,
      preferred_date: r.preferredDate,
      duration_minutes: r.durationMinutes,
      total_price: r.totalPrice,
      notes: r.notes,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
    })) as Reservation[];
  } catch (error) {
    console.error("Failed to get user reservations:", error);
    return [];
  }
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatusEnum
): Promise<Reservation> {
  try {
    const convexReservationId = id as Id<"reservations">;
    const result = await convexUpdateReservationStatus(convexReservationId, status);

    if (!result?.success) {
      throw new Error("Failed to update reservation status");
    }

    const updated = await getReservationById(id);
    if (!updated) {
      throw new Error("Failed to fetch updated reservation");
    }

    return updated;
  } catch (error) {
    console.error("Failed to update reservation status:", error);
    throw error;
  }
}

export async function getReservationsByDateRange(
  startDate: string,
  endDate: string
): Promise<Reservation[]> {
  try {
    const reservations = await convexGetReservationsByDateRange(startDate, endDate);

    return reservations.map(r => ({
      id: r._id.toString(),
      user_id: r.userId ? Number.parseInt(r.userId.toString().slice(-8), 10) : null,
      service_type: r.serviceType,
      status: r.status,
      details: r.details,
      preferred_date: r.preferredDate,
      duration_minutes: r.durationMinutes,
      total_price: r.totalPrice,
      notes: r.notes,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
    })) as Reservation[];
  } catch (error) {
    console.error("Failed to get reservations by date range:", error);
    return [];
  }
}
