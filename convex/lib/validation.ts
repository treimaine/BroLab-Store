import { v } from "convex/values";

// Validation schemas for different data types
export const userValidation = {
  clerkId: v.string(),
  email: v.string(),
  username: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  role: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
  metadata: v.optional(
    v.object({
      signupSource: v.optional(v.string()),
      referralCode: v.optional(v.string()),
      lastActiveAt: v.optional(v.number()),
    })
  ),
};

export const orderValidation = {
  userId: v.optional(v.id("users")),
  sessionId: v.optional(v.string()),
  email: v.string(),
  total: v.number(),
  status: v.string(),
  items: v.array(
    v.object({
      productId: v.optional(v.number()),
      title: v.optional(v.string()),
      name: v.optional(v.string()),
      price: v.optional(v.number()),
      quantity: v.optional(v.number()),
      license: v.optional(v.string()),
    })
  ),
  currency: v.optional(v.string()),
  paymentId: v.optional(v.string()),
};

export const reservationValidation = {
  userId: v.optional(v.id("users")),
  serviceType: v.string(),
  status: v.string(),
  preferredDate: v.string(),
  durationMinutes: v.number(),
  totalPrice: v.number(),
  details: v.object({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    requirements: v.optional(v.string()),
    referenceLinks: v.optional(v.array(v.string())),
    projectDescription: v.optional(v.string()),
    deadline: v.optional(v.string()),
  }),
};

// Validation functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateClerkId(clerkId: string): boolean {
  return typeof clerkId === "string" && clerkId.startsWith("user_") && clerkId.length > 10;
}

export function validateClerkIdSafe(clerkId: unknown): clerkId is string {
  return typeof clerkId === "string" && clerkId.startsWith("user_") && clerkId.length > 10;
}

export function validateOrderStatus(status: string): boolean {
  const validStatuses = [
    "pending",
    "processing",
    "paid",
    "completed",
    "failed",
    "refunded",
    "cancelled",
  ];
  return validStatuses.includes(status);
}

export function validateReservationStatus(status: string): boolean {
  const validStatuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
  return validStatuses.includes(status);
}

export function validateServiceType(serviceType: string): boolean {
  const validTypes = ["mixing", "mastering", "recording", "custom_beat", "consultation"];
  return validTypes.includes(serviceType);
}

export function validateUserRole(role: string): boolean {
  const validRoles = ["user", "admin", "artist", "moderator"];
  return validRoles.includes(role);
}

export function validatePrice(price: number): boolean {
  return price >= 0 && Number.isFinite(price);
}

export function validateDuration(duration: number): boolean {
  return duration > 0 && duration <= 480; // Max 8 hours
}

// Sanitization functions
export function sanitizeString(str: string | undefined): string | undefined {
  if (!str) return str;
  return str.trim().replaceAll(/[<>"'&]/g, "");
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeUsername(username: string | undefined): string | undefined {
  if (!username) return username;
  return username
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9_-]/g, "");
}

// Error handling utilities
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

interface UserData {
  clerkId?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  role?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export function validateAndSanitizeUser(userData: UserData) {
  const errors: string[] = [];

  // Required fields
  if (!userData.clerkId) {
    errors.push("ClerkId is required");
  } else if (!validateClerkId(userData.clerkId)) {
    errors.push("Invalid ClerkId format");
  }

  if (!userData.email) {
    errors.push("Email is required");
  } else if (!validateEmail(userData.email)) {
    errors.push("Invalid email format");
  }

  // Optional field validation
  if (userData.role && !validateUserRole(userData.role)) {
    errors.push("Invalid user role");
  }

  if (errors.length > 0) {
    throw new ValidationError(`Validation failed: ${errors.join(", ")}`);
  }

  // Sanitize data
  return {
    clerkId: userData.clerkId!,
    email: sanitizeEmail(userData.email!),
    username: sanitizeUsername(userData.username),
    firstName: sanitizeString(userData.firstName),
    lastName: sanitizeString(userData.lastName),
    imageUrl: userData.imageUrl,
    role: userData.role || "user",
    isActive: userData.isActive !== false,
    metadata: userData.metadata,
  };
}

interface OrderItem {
  productId?: number;
  title?: string;
  name?: string;
  price?: number;
  quantity?: number;
  license?: string;
}

interface OrderData {
  email?: string;
  total?: number;
  status?: string;
  items?: OrderItem[];
  currency?: string;
  [key: string]: unknown;
}

interface ValidatedOrderData {
  email: string;
  total: number;
  status: string;
  items: OrderItem[];
  currency: string;
  [key: string]: unknown;
}

export function validateAndSanitizeOrder(orderData: OrderData): ValidatedOrderData {
  const errors: string[] = [];

  // Required fields
  if (!orderData.email) {
    errors.push("Email is required");
  } else if (!validateEmail(orderData.email)) {
    errors.push("Invalid email format");
  }

  if (typeof orderData.total !== "number" || !validatePrice(orderData.total)) {
    errors.push("Invalid total amount");
  }

  if (!orderData.status || !validateOrderStatus(orderData.status)) {
    errors.push("Invalid order status");
  }

  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push("Order must contain at least one item");
  }

  if (errors.length > 0) {
    throw new ValidationError(`Order validation failed: ${errors.join(", ")}`);
  }

  return {
    ...orderData,
    email: sanitizeEmail(orderData.email!),
    total: orderData.total!,
    status: orderData.status!,
    items: orderData.items!,
    currency: orderData.currency || "USD",
  };
}

interface ReservationData {
  serviceType?: string;
  status?: string;
  preferredDate?: string;
  durationMinutes?: number;
  totalPrice?: number;
  notes?: string;
  [key: string]: unknown;
}

export function validateAndSanitizeReservation(reservationData: ReservationData) {
  const errors: string[] = [];

  // Required fields
  if (!reservationData.serviceType || !validateServiceType(reservationData.serviceType)) {
    errors.push("Invalid service type");
  }

  if (!reservationData.status || !validateReservationStatus(reservationData.status)) {
    errors.push("Invalid reservation status");
  }

  if (!reservationData.preferredDate) {
    errors.push("Preferred date is required");
  }

  if (
    typeof reservationData.durationMinutes !== "number" ||
    !validateDuration(reservationData.durationMinutes)
  ) {
    errors.push("Invalid duration");
  }

  if (
    typeof reservationData.totalPrice !== "number" ||
    !validatePrice(reservationData.totalPrice)
  ) {
    errors.push("Invalid total price");
  }

  if (errors.length > 0) {
    throw new ValidationError(`Reservation validation failed: ${errors.join(", ")}`);
  }

  return {
    ...reservationData,
    notes: sanitizeString(reservationData.notes),
  };
}
