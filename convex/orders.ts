import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { optionalAuth, requireAuth } from "./lib/authHelpers";
import { ValidationError, validateAndSanitizeOrder } from "./lib/validation";

// Type definitions
type OrderItem = {
  productId?: number;
  name?: string;
  title?: string;
  price?: number;
  license?: string;
  quantity?: number;
  wordpressId?: number;
  beatId?: number;
};

type Order = Doc<"orders">;

export const createOrder = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.number(),
        name: v.string(),
        price: v.number(),
        license: v.string(),
        quantity: v.number(),
      })
    ),
    total: v.number(),
    email: v.string(),
    status: v.optional(v.string()),
    currency: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const { clerkId, user: existingUser, identity } = await requireAuth(ctx);

      // Validation des données de commande
      const validatedOrder = validateAndSanitizeOrder({
        ...args,
        status: args.status || "pending",
      });

      console.log(`🛒 Creating order for user: ${clerkId}`);

      // Récupérer ou créer l'utilisateur
      let user = existingUser;

      if (!user) {
        // Créer l'utilisateur s'il n'existe pas
        const userId = await ctx.db.insert("users", {
          clerkId: identity.subject,
          email: identity.email || args.email,
          username: identity.name || `user_${identity.subject.slice(-8)}`,
          firstName: identity.givenName || "",
          lastName: identity.familyName || "",
          imageUrl: identity.pictureUrl || "",
          role: "user",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        user = await ctx.db.get(userId);
      }

      // À ce point, user ne peut plus être null
      if (!user) {
        throw new Error("Impossible de créer ou récupérer l'utilisateur");
      }

      const now = Date.now();

      // Créer la commande liée à l'utilisateur
      const orderId = await ctx.db.insert("orders", {
        userId: user._id,
        sessionId: args.sessionId,
        items: validatedOrder.items,
        total: validatedOrder.total,
        email: validatedOrder.email,
        status: validatedOrder.status,
        currency: validatedOrder.currency || "USD",
        subtotal: undefined,
        tax: 0,
        itemsCount: (validatedOrder.items || []).length,
        createdAt: now,
        updatedAt: now,
      });

      // Log de l'activité
      await ctx.db.insert("activityLog", {
        userId: user._id,
        action: "order_created",
        details: {
          orderId: orderId,
          total: validatedOrder.total,
          itemCount: validatedOrder.items.length,
          currency: validatedOrder.currency,
        },
        timestamp: now,
      });

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: user._id,
        clerkId: clerkId,
        action: "order_created",
        resource: "orders",
        details: {
          operation: "create",
          resource: "orders",
          resourceId: orderId,
          orderId: orderId,
          total: validatedOrder.total,
          email: validatedOrder.email,
        },
        timestamp: now,
      });

      console.log(`✅ Order created: ${orderId}`);
      return {
        orderId,
        success: true,
        order: await ctx.db.get(orderId),
      };
    } catch (error) {
      console.error(`❌ Error creating order:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log de l'erreur
      const authResult = await optionalAuth(ctx);
      await ctx.db.insert("auditLogs", {
        clerkId: authResult?.clerkId,
        action: "order_creation_error",
        resource: "orders",
        details: {
          operation: "create",
          resource: "orders",
          error: errorMessage,
          email: args.email,
          total: args.total,
        },
        timestamp: Date.now(),
      });

      if (error instanceof ValidationError) {
        throw new Error(`Validation error: ${errorMessage}`);
      }

      throw new Error(`Failed to create order: ${errorMessage}`);
    }
  },
});

// Idempotent order creation (server-calculated totals)
export const createOrderIdempotent = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.number(),
        title: v.string(),
        type: v.string(), // 'beat'|'subscription'|'service'
        qty: v.number(),
        unitPrice: v.number(), // cents
        metadata: v.optional(
          v.object({
            beatGenre: v.optional(v.string()),
            beatBpm: v.optional(v.number()),
            beatKey: v.optional(v.string()),
            downloadFormat: v.optional(v.string()),
            licenseTerms: v.optional(v.string()),
          })
        ),
      })
    ),
    currency: v.string(),
    email: v.string(),
    metadata: v.optional(
      v.object({
        source: v.union(v.literal("web"), v.literal("mobile"), v.literal("api")),
        campaign: v.optional(v.string()),
        referrer: v.optional(v.string()),
        discountCode: v.optional(v.string()),
        giftMessage: v.optional(v.string()),
        deliveryInstructions: v.optional(v.string()),
      })
    ),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clerkId, user: existingUser, identity } = await requireAuth(ctx);

    // Return existing order if idempotencyKey exists
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("orders")
        .withIndex("by_idempotency", q => q.eq("idempotencyKey", args.idempotencyKey))
        .first();
      if (existing) return { orderId: existing._id, order: existing, idempotent: true } as const;
    }

    let user = existingUser;
    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId,
        email: identity.email || args.email,
        username: identity.name || `user_${clerkId.slice(-8)}`,
        firstName: identity.givenName || "",
        lastName: identity.familyName || "",
        imageUrl: identity.pictureUrl || "",
        role: "user",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }
    if (!user) throw new Error("User creation failed");

    // Compute totals (cents)
    const itemsCount = args.items.reduce((n, it) => n + Math.max(1, Number(it.qty || 1)), 0);
    const subtotal = args.items.reduce(
      (sum, it) => sum + Math.max(0, Math.round(it.unitPrice)) * Math.max(1, Math.round(it.qty)),
      0
    );
    const tax = 0; // v1: no tax
    const total = subtotal + tax;

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      email: args.email,
      status: "draft",
      currency: args.currency,
      subtotal,
      tax,
      total,
      itemsCount,
      items: args.items.map(it => ({
        productId: it.productId,
        title: it.title,
        type: it.type,
        qty: it.qty,
        unitPrice: it.unitPrice,
        totalPrice: it.unitPrice * it.qty,
        metadata: it.metadata,
      })),
      paymentProvider: undefined,
      checkoutSessionId: undefined,
      paymentIntentId: undefined,
      invoiceId: undefined,
      invoiceUrl: undefined,
      invoiceNumber: undefined,
      idempotencyKey: args.idempotencyKey,
      metadata: args.metadata,
      sessionId: undefined,
      notes: undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Persist detailed items in orderItems table
    for (const it of args.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: it.productId,
        type: it.type,
        title: it.title,
        sku: undefined,
        qty: it.qty,
        unitPrice: it.unitPrice,
        totalPrice: it.unitPrice * it.qty,
        metadata: it.metadata,
      });
    }

    return { orderId, order: await ctx.db.get(orderId), idempotent: false } as const;
  },
});

// Save Stripe Checkout session/PI identifiers on order
export const saveStripeCheckoutSession = mutation({
  args: {
    orderId: v.id("orders"),
    checkoutSessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, checkoutSessionId, paymentIntentId }) => {
    const now = Date.now();
    await ctx.db.patch(orderId, {
      paymentProvider: "stripe",
      checkoutSessionId,
      paymentIntentId,
      status: "pending",
      updatedAt: now,
    });
    return await ctx.db.get(orderId);
  },
});

// Get order with its items, payments and invoice
export const getOrderWithRelations = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", q => q.eq("orderId", orderId))
      .collect();
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", q => q.eq("orderId", orderId))
      .order("desc")
      .collect();
    const invoice = order.invoiceId ? await ctx.db.get(order.invoiceId) : null;
    return { order, items, payments, invoice } as const;
  },
});

// Get order status history from activity logs
export const getOrderStatusHistory = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return [];

    // Get activity logs related to order status changes
    const activities = await ctx.db
      .query("activityLog")
      .filter(q =>
        q.and(
          q.eq(q.field("userId"), order.userId),
          q.or(
            q.eq(q.field("action"), "order_created"),
            q.eq(q.field("action"), "order_status_updated"),
            q.eq(q.field("action"), "payment_succeeded"),
            q.eq(q.field("action"), "payment_failed")
          )
        )
      )
      .order("desc")
      .collect();

    // Filter activities related to this specific order and format
    return activities
      .filter(activity => {
        const details = activity.details as { orderId?: string } | undefined;
        return details?.orderId === orderId;
      })
      .map(activity => {
        const details = activity.details as
          | {
              status?: string;
              oldStatus?: string;
              newStatus?: string;
            }
          | undefined;
        return {
          timestamp: activity.timestamp,
          status: details?.newStatus || details?.status || "unknown",
          action: activity.action,
        };
      });
  },
});

// Admin listing with filters
export const listOrdersAdmin = query({
  args: {
    status: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    email: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authorization should be enforced by the caller (Express) using Clerk roles
    let qBase = ctx.db.query("orders");
    if (args.status) qBase = qBase.filter(qq => qq.eq(qq.field("status"), args.status));
    let results = await qBase.order("desc").take(Math.max(1, Math.min(args.limit || 50, 200)));
    if (args.email) results = results.filter(o => String(o.email) === args.email);
    if (args.from !== undefined) {
      const fromValue = args.from;
      results = results.filter(o => Number(o.createdAt) >= fromValue);
    }
    if (args.to !== undefined) {
      const toValue = args.to;
      results = results.filter(o => Number(o.createdAt) <= toValue);
    }
    return results;
  },
});

// Atomic counter: returns next value
export const incrementCounter = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const existing = await ctx.db
      .query("counters")
      .withIndex("by_name", q => q.eq("name", name))
      .first();
    if (!existing) {
      const id = await ctx.db.insert("counters", { name, value: 1 });
      const doc = await ctx.db.get(id);
      return Number(doc?.value) || 1;
    }
    await ctx.db.patch(existing._id, { value: Number(existing.value) + 1 });
    const updated = await ctx.db.get(existing._id);
    return Number(updated?.value) || Number(existing.value) + 1;
  },
});

// Record payment row for an order
export const recordPayment = mutation({
  args: {
    orderId: v.id("orders"),
    provider: v.string(),
    status: v.string(),
    amount: v.number(),
    currency: v.string(),
    stripeEventId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    paypalTransactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("payments", { ...args, createdAt: now });

    // Update order status if succeeded/failed
    const order = await ctx.db.get(args.orderId);
    if (order) {
      const statusMap: Record<string, string> = {
        succeeded: "paid",
        failed: "payment_failed",
        refunded: "refunded",
      };
      const newStatus = statusMap[args.status] || order.status;
      await ctx.db.patch(order._id, { status: newStatus, updatedAt: now });

      // Create downloads for paid orders
      if (args.status === "succeeded" && newStatus === "paid" && order.userId) {
        await createDownloadsFromOrder(ctx, order);
      }
    }
    return { success: true } as const;
  },
});

// Helper function to create downloads from a paid order
async function createDownloadsFromOrder(ctx: MutationCtx, order: Order): Promise<void> {
  try {
    console.log(`🎵 Creating downloads for paid order: ${order._id}`);

    if (!order.userId) {
      console.warn(`⚠️ Order ${order._id} has no userId, skipping download creation`);
      return;
    }

    // Process each item in the order
    for (const item of order.items || []) {
      if (item.productId && item.license) {
        // Check if download already exists to avoid duplicates
        const existingDownload = await ctx.db
          .query("downloads")
          .withIndex("by_user_beat", q =>
            q.eq("userId", order.userId!).eq("beatId", item.productId!)
          )
          .filter(q => q.eq(q.field("licenseType"), item.license))
          .first();

        if (existingDownload) {
          console.log(`ℹ️ Download already exists for beat ${item.productId} (${item.license})`);
          continue;
        }

        // Create new download record
        const downloadId = await ctx.db.insert("downloads", {
          userId: order.userId,
          beatId: item.productId,
          licenseType: item.license,
          downloadCount: 0, // Initialize to 0, will increment on actual download
          timestamp: Date.now(),
        });

        console.log(
          `✅ Created download record: ${downloadId} for beat ${item.productId} (${item.license})`
        );

        // Log activity
        const beatTitle = item.title || item.name || `Beat ${item.productId}`;
        await ctx.db.insert("activityLog", {
          userId: order.userId,
          action: "download_granted",
          details: {
            description: `Download access granted for "${beatTitle}"`,
            beatId: item.productId,
            beatTitle: item.title || item.name,
            licenseType: item.license,
            orderId: order._id,
            severity: "info",
          },
          timestamp: Date.now(),
        });
      }
    }
  } catch (error) {
    console.error("❌ Error creating downloads from order:", error);
    // Don't throw error to avoid breaking payment processing
  }
}

// Mark a Stripe event as processed (idempotency)
export const markProcessedEvent = mutation({
  args: { provider: v.string(), eventId: v.string() },
  handler: async (ctx, { provider, eventId }) => {
    const existing = await ctx.db
      .query("processedEvents")
      .withIndex("by_provider_eventId", q => q.eq("provider", provider).eq("eventId", eventId))
      .first();
    if (existing) return { alreadyProcessed: true } as const;
    await ctx.db.insert("processedEvents", { provider, eventId, processedAt: Date.now() });
    return { alreadyProcessed: false } as const;
  },
});

// Set invoice for order using Convex storage key
export const setInvoiceForOrder = mutation({
  args: {
    orderId: v.id("orders"),
    storageId: v.string(), // key from upload URL
    amount: v.number(),
    currency: v.string(),
    taxAmount: v.optional(v.number()),
    billingInfo: v.optional(
      v.object({
        email: v.string(),
        name: v.string(),
        address: v.object({
          line1: v.string(),
          line2: v.optional(v.string()),
          city: v.string(),
          state: v.optional(v.string()),
          postalCode: v.string(),
          country: v.string(),
        }),
        phone: v.optional(v.string()),
        companyName: v.optional(v.string()),
        taxId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { orderId, storageId, amount, currency, taxAmount, billingInfo }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    // Build next invoice number BRL-YYYY-####
    const year = new Date().getFullYear();
    // Call sibling mutation through Convex's internal action is not available here; inline increment
    const existing = await ctx.db
      .query("counters")
      .withIndex("by_name", q => q.eq("name", "invoice_seq"))
      .first();
    let seq = 1;
    if (existing) {
      await ctx.db.patch(existing._id, { value: Number(existing.value) + 1 });
      const updated = await ctx.db.get(existing._id);
      seq = Number(updated?.value) || Number(existing.value) + 1;
    } else {
      const id = await ctx.db.insert("counters", { name: "invoice_seq", value: 1 });
      const doc = await ctx.db.get(id);
      seq = Number(doc?.value) || 1;
    }
    const padded = String(seq).padStart(4, "0");
    const number = `BRL-${year}-${padded}`;

    const issuedAt = Date.now();
    const pdfUrl = await ctx.storage.getUrl(storageId as Id<"_storage">);

    const invoiceId = await ctx.db.insert("invoicesOrders", {
      orderId,
      number,
      pdfKey: storageId,
      pdfUrl: pdfUrl || undefined,
      amount,
      currency,
      issuedAt,
      taxAmount,
      billingInfo,
      createdAt: issuedAt,
    });

    await ctx.db.patch(orderId, {
      invoiceId,
      invoiceUrl: pdfUrl || undefined,
      invoiceNumber: number,
      updatedAt: issuedAt,
    });

    return { invoiceId, number, url: pdfUrl } as const;
  },
});

// Helper: Normalize order status
function normalizeOrderStatus(status: string): string {
  const allowedStatuses = new Set([
    "pending",
    "processing",
    "completed",
    "cancelled",
    "refunded",
    "paid",
    "failed",
  ]);
  return allowedStatuses.has(status) ? status : "pending";
}

// Helper: Extract product IDs from order items
function extractProductIds(items: OrderItem[]): Set<number> {
  const uniqueProductIds = new Set<number>();
  for (const item of items) {
    const idCandidates = [item.wordpressId, item.productId, item.beatId].filter(
      (x): x is number => typeof x === "number"
    );

    for (const pid of idCandidates) {
      if (!Number.isNaN(pid)) uniqueProductIds.add(pid);
    }
  }
  return uniqueProductIds;
}

// Helper: Build price map from beats
async function buildPriceMap(ctx: QueryCtx, productIds: Set<number>): Promise<Map<number, number>> {
  const priceMap = new Map<number, number>();
  for (const pid of Array.from(productIds)) {
    const beat = await ctx.db
      .query("beats")
      .withIndex("by_wordpress_id", q => q.eq("wordpressId", pid))
      .first();
    if (beat && typeof beat.price === "number") {
      priceMap.set(pid, Number(beat.price));
    }
  }
  return priceMap;
}

// Helper: Calculate display total for an item
function calculateItemDisplayTotal(item: OrderItem, priceMap: Map<number, number>): number {
  const idCandidates = [item.wordpressId, item.productId, item.beatId].filter(
    (x): x is number => typeof x === "number"
  );

  let priceCents = 0;
  for (const pid of idCandidates) {
    if (!Number.isNaN(pid) && priceMap.has(pid)) {
      priceCents = priceMap.get(pid)!;
      break;
    }
  }

  if (priceCents === 0 && typeof item.price === "number") {
    priceCents = item.price >= 100 ? Math.round(item.price) : Math.round(item.price * 100);
  }

  const qty = Number(item.quantity || 1);
  return Math.max(0, priceCents) * Math.max(1, qty);
}

export const listOrders = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const { clerkId, user } = await requireAuth(ctx);
      const limit = Math.max(1, Math.min(args.limit || 20, 100));

      console.log(`📋 Listing orders for user: ${clerkId}`);

      if (!user) {
        console.log(`⚠️ User not found for clerkId: ${clerkId}`);
        return { items: [], cursor: undefined, hasMore: false } as const;
      }

      let q = ctx.db.query("orders").withIndex("by_user", q => q.eq("userId", user._id));

      if (typeof args.cursor === "number") {
        q = q.filter(qq => qq.lt(qq.field("createdAt"), args.cursor!));
      }

      if (args.status) {
        q = q.filter(qq => qq.eq(qq.field("status"), args.status!));
      }

      const results = await q.order("desc").take(limit + 1);
      const hasMore = results.length > limit;
      const sliced = hasMore ? results.slice(0, limit) : results;

      const items = sliced.map(o => ({
        id: o._id,
        items: o.items,
        total: Number(o.total || 0),
        currency: o.currency || "USD",
        status: normalizeOrderStatus(String(o.status)),
        createdAt: Number(o.createdAt || Date.now()),
        invoiceUrl: o.invoiceUrl,
        email: o.email,
      }));

      // Collect all product IDs from all orders
      const allProductIds = new Set<number>();
      for (const order of items) {
        const orderProductIds = extractProductIds(order.items);
        for (const id of orderProductIds) {
          allProductIds.add(id);
        }
      }

      const priceMap = await buildPriceMap(ctx, allProductIds);

      const itemsEnriched = items.map(o => {
        let displayTotal = 0;
        for (const item of o.items) {
          displayTotal += calculateItemDisplayTotal(item, priceMap);
        }
        if (displayTotal === 0 && o.total > 0) {
          displayTotal = o.total;
        }
        return { ...o, displayTotal };
      });

      const nextCursor = itemsEnriched.length > 0 ? itemsEnriched.at(-1)?.createdAt : undefined;

      console.log(`✅ Found ${itemsEnriched.length} orders${hasMore ? ", has more" : ""}`);
      return { items: itemsEnriched, cursor: nextCursor, hasMore } as const;
    } catch (error) {
      console.error(`❌ Error listing orders:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list orders: ${errorMessage}`);
    }
  },
});

// Get order by ID (alias for backward compatibility)
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    return order;
  },
});

// Get order by ID with authentication
export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    try {
      const { clerkId, user } = await requireAuth(ctx);
      console.log(`🔍 Getting order ${orderId} for user: ${clerkId}`);

      const order = await ctx.db.get(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Vérifier que l'utilisateur a le droit d'accéder à cette commande
      if (!user) {
        throw new Error("User not found");
      }

      if (order.userId !== user._id) {
        console.log(`🚫 Access denied for order ${orderId}`);
        throw new Error("Access denied");
      }

      console.log(`✅ Order retrieved: ${orderId}`);
      return order;
    } catch (error) {
      console.error(`❌ Error getting order:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get order: ${errorMessage}`);
    }
  },
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.string(),
    paymentStatus: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const { clerkId, user } = await requireAuth(ctx);
      console.log(`🔄 Updating order ${args.orderId} status to: ${args.status}`);

      // Validation du statut
      const validStatuses = ["pending", "processing", "completed", "cancelled", "refunded"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(`Invalid status: ${args.status}`);
      }

      const order = await ctx.db.get(args.orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Vérifier que l'utilisateur a le droit de modifier cette commande
      if (!user) {
        throw new Error("User not found");
      }

      if (order.userId !== user._id) {
        console.log(`🚫 Access denied for order ${args.orderId}`);
        throw new Error("Access denied");
      }

      const now = Date.now();
      const previousStatus = order.status;

      // Mettre à jour la commande
      const updateData: {
        status: string;
        updatedAt: number;
        paymentStatus?: string;
        notes?: string;
      } = {
        status: args.status,
        updatedAt: now,
      };

      if (args.paymentStatus) {
        updateData.paymentStatus = args.paymentStatus;
      }

      if (args.notes) {
        updateData.notes = args.notes;
      }

      await ctx.db.patch(args.orderId, updateData);

      // Log de l'activité
      await ctx.db.insert("activityLog", {
        userId: user._id,
        action: "order_status_updated",
        details: {
          orderId: args.orderId,
          previousStatus,
          newStatus: args.status,
          paymentStatus: args.paymentStatus,
        },
        timestamp: now,
      });

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: user._id,
        clerkId: clerkId,
        action: "order_status_updated",
        resource: "orders",
        details: {
          operation: "update",
          resource: "orders",
          resourceId: args.orderId,
          orderId: args.orderId,
          previousStatus,
          newStatus: args.status,
          paymentStatus: args.paymentStatus,
          changes: [
            {
              field: "status",
              oldValue: previousStatus,
              newValue: args.status,
              changeType: "update" as const,
            },
          ],
        },
        timestamp: now,
      });

      console.log(
        `✅ Order ${args.orderId} status updated from ${previousStatus} to ${args.status}`
      );
      return {
        success: true,
        order: await ctx.db.get(args.orderId),
      };
    } catch (error) {
      console.error(`❌ Error updating order status:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log de l'erreur
      const authResult = await optionalAuth(ctx);
      await ctx.db.insert("auditLogs", {
        clerkId: authResult?.clerkId,
        action: "update_order_status_error",
        resource: "orders",
        details: {
          operation: "update",
          resource: "orders",
          resourceId: args.orderId,
          error: errorMessage,
          orderId: args.orderId,
          status: args.status,
        },
        timestamp: Date.now(),
      });

      throw new Error(`Failed to update order status: ${errorMessage}`);
    }
  },
});

// Update order from webhook (no auth required). Tries to match by sessionId, then paymentId, then email (most recent pending order).
export const markOrderFromWebhook = mutation({
  args: {
    email: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    status: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const now = Date.now();

      // Try to find the order by provided identifiers
      let order: {
        _id: Id<"orders">;
        userId?: Id<"users">;
        paymentIntentId?: string;
        notes?: string;
        status: string;
      } | null = null;

      if (args.sessionId) {
        order = await ctx.db
          .query("orders")
          .withIndex("by_created_at")
          .filter(q => q.eq(q.field("sessionId"), args.sessionId))
          .order("desc")
          .first();
      }

      if (!order && args.paymentId) {
        order = await ctx.db
          .query("orders")
          .withIndex("by_payment_intent")
          .filter(q => q.eq(q.field("paymentIntentId"), args.paymentId))
          .order("desc")
          .first();
      }

      // Try by checkoutSessionId
      if (!order && args.sessionId) {
        order = await ctx.db
          .query("orders")
          .withIndex("by_checkout_session")
          .filter(q => q.eq(q.field("checkoutSessionId"), args.sessionId))
          .order("desc")
          .first();
      }

      if (!order && args.email) {
        order = await ctx.db
          .query("orders")
          .withIndex("by_email", q => q.eq("email", args.email!))
          .order("desc")
          .first();
      }

      if (!order) {
        console.warn("markOrderFromWebhook: No matching order found", {
          sessionId: args.sessionId,
          paymentId: args.paymentId,
          email: args.email,
        });
        return { updated: false } as const;
      }

      const newStatus = args.status || "completed";
      await ctx.db.patch(order._id, {
        status: newStatus,
        updatedAt: now,
        notes: args.notes ?? order.notes,
      });

      if (order.userId) {
        await ctx.db.insert("activityLog", {
          userId: order.userId,
          action: "order_updated",
          details: {
            orderId: order._id,
            status: newStatus,
            paymentIntentId: order.paymentIntentId,
          },
          timestamp: now,
        });
      }

      console.log("✅ Order updated from webhook", {
        orderId: order._id,
        status: newStatus,
      });

      return { updated: true, orderId: order._id } as const;
    } catch (error) {
      console.error("❌ markOrderFromWebhook error:", error);
      throw error;
    }
  },
});

// Save invoice URL
export const saveInvoiceUrl = mutation({
  args: {
    orderId: v.id("orders"),
    invoiceUrl: v.string(),
  },
  handler: async (ctx, { orderId, invoiceUrl }) => {
    await ctx.db.patch(orderId, {
      invoiceUrl,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(orderId);
  },
});
// Restore order data
export const restore = mutation({
  args: {
    orderId: v.string(),
    state: v.object({
      items: v.optional(v.array(v.object({}))),
      total: v.optional(v.number()),
      status: v.optional(v.string()),
      email: v.optional(v.string()),
      currency: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { orderId, state }) => {
    try {
      console.log("Order data restore:", {
        orderId,
        stateSize: JSON.stringify(state).length,
        timestamp: Date.now(),
      });

      // Restore order data
      await ctx.db.patch(orderId as Id<"orders">, {
        ...state,
        updatedAt: Date.now(),
      });

      console.log("Order data restored successfully:", { orderId });
      return { success: true, orderId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error restoring order data:", error);
      throw error;
    }
  },
});

// Regenerate downloads from existing paid orders (for migration/cleanup)
export const regenerateDownloadsFromOrders = mutation({
  args: {
    userId: v.optional(v.id("users")), // If provided, only process this user
  },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireAuth(ctx);

    console.log("🔄 Regenerating downloads from paid orders...");

    try {
      let ordersToProcess;

      if (args.userId) {
        // Process specific user
        ordersToProcess = await ctx.db
          .query("orders")
          .withIndex("by_user", q => q.eq("userId", args.userId))
          .filter(q => q.eq(q.field("status"), "paid"))
          .collect();
      } else {
        // Process current user only
        if (!currentUser) {
          throw new Error("User not found");
        }

        ordersToProcess = await ctx.db
          .query("orders")
          .withIndex("by_user", q => q.eq("userId", currentUser._id))
          .filter(q => q.eq(q.field("status"), "paid"))
          .collect();
      }

      let created = 0;
      let skipped = 0;

      for (const order of ordersToProcess) {
        for (const item of order.items || []) {
          // Check if all required fields are present
          if (!order.userId || !item.productId || !item.license) continue;

          const userId = order.userId;
          const beatId = item.productId;
          const licenseType = item.license;

          // Check if download already exists
          const existingDownload = await ctx.db
            .query("downloads")
            .withIndex("by_user_beat", q => q.eq("userId", userId).eq("beatId", beatId))
            .filter(q => q.eq(q.field("licenseType"), licenseType))
            .first();

          if (existingDownload) {
            skipped++;
            continue;
          }

          // Create new download record
          await ctx.db.insert("downloads", {
            userId,
            beatId,
            licenseType,
            downloadCount: 0,
            timestamp: order.createdAt,
          });

          created++;

          // Log activity
          const beatTitle = item.title || item.name || `Beat ${beatId}`;
          await ctx.db.insert("activityLog", {
            userId,
            action: "download_granted",
            details: {
              description: `Download access granted for "${beatTitle}"`,
              beatId,
              beatTitle: item.title || item.name,
              licenseType,
              orderId: order._id,
              severity: "info",
            },
            timestamp: order.createdAt,
          });
        }
      }

      console.log(`✅ Regeneration completed: ${created} created, ${skipped} skipped`);

      return {
        success: true,
        created,
        skipped,
        ordersProcessed: ordersToProcess.length,
      };
    } catch (error) {
      console.error("❌ Error regenerating downloads:", error);
      throw error;
    }
  },
});
