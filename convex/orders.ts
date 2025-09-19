import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ValidationError, validateAndSanitizeOrder } from "./lib/validation";

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
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const clerkId = identity.subject;

      // Validation des données de commande
      const validatedOrder = validateAndSanitizeOrder({
        ...args,
        status: args.status || "pending",
      });

      console.log(`🛒 Creating order for user: ${clerkId}`);

      // Récupérer ou créer l'utilisateur
      let user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

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
      } as any);

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
      const identity = await ctx.auth.getUserIdentity();
      await ctx.db.insert("auditLogs", {
        clerkId: identity?.subject,
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
        metadata: v.optional(v.any()),
      })
    ),
    currency: v.string(),
    email: v.string(),
    metadata: v.optional(v.any()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;

    // Return existing order if idempotencyKey exists
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("orders")
        .withIndex("by_idempotency", q => q.eq("idempotencyKey", args.idempotencyKey!))
        .first();
      if (existing) return { orderId: existing._id, order: existing, idempotent: true } as const;
    }

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();
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
        metadata: it.metadata || {},
      })),
      paymentProvider: undefined,
      checkoutSessionId: undefined,
      paymentIntentId: undefined,
      invoiceId: undefined,
      invoiceUrl: undefined,
      invoiceNumber: undefined,
      idempotencyKey: args.idempotencyKey,
      metadata: args.metadata || {},
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
        metadata: it.metadata || {},
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
    const invoice = order.invoiceId ? await ctx.db.get(order.invoiceId as any) : null;
    return { order, items, payments, invoice } as const;
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
    if (args.status) qBase = qBase.filter(qq => qq.eq(qq.field("status"), args.status!));
    let results = await qBase.order("desc").take(Math.max(1, Math.min(args.limit || 50, 200)));
    if (args.email) results = results.filter(o => (o.email as string) === args.email);
    if (args.from) results = results.filter(o => (o.createdAt as number) >= args.from!);
    if (args.to) results = results.filter(o => (o.createdAt as number) <= args.to!);
    return results as any;
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
      return (doc?.value as number) || 1;
    }
    await ctx.db.patch(existing._id, { value: (existing.value as number) + 1 });
    const updated = await ctx.db.get(existing._id);
    return (updated?.value as number) || (existing.value as number) + 1;
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
    }
    return { success: true } as const;
  },
});

// Mark a Stripe event as processed (idempotency)
export const markProcessedEvent = mutation({
  args: { provider: v.string(), eventId: v.string() },
  handler: async (ctx, { provider, eventId }) => {
    const existing = await ctx.db
      .query("processedEvents")
      .withIndex("by_provider_event", q => q.eq("provider", provider).eq("eventId", eventId))
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
    billingInfo: v.optional(v.any()),
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
    if (!existing) {
      const id = await ctx.db.insert("counters", { name: "invoice_seq", value: 1 });
      const doc = await ctx.db.get(id);
      seq = (doc?.value as number) || 1;
    } else {
      await ctx.db.patch(existing._id, { value: (existing.value as number) + 1 });
      const updated = await ctx.db.get(existing._id);
      seq = (updated?.value as number) || (existing.value as number) + 1;
    }
    const padded = String(seq).padStart(4, "0");
    const number = `BRL-${year}-${padded}`;

    const issuedAt = Date.now();
    const pdfUrl = await ctx.storage.getUrl(storageId as any);

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

export const listOrders = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
    cursor: v.optional(v.number()), // manual cursor: createdAt of last item from previous page
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const clerkId = identity.subject;
      const limit = Math.max(1, Math.min(args.limit || 20, 100));

      console.log(`📋 Listing orders for user: ${clerkId}`);

      // Récupérer l'utilisateur
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

      if (!user) {
        console.log(`⚠️ User not found for clerkId: ${clerkId}`);
        return { items: [], cursor: undefined as number | undefined, hasMore: false } as const;
      }

      // Build base query
      let q = ctx.db.query("orders").withIndex("by_user", q => q.eq("userId", user._id));

      // Cursor-based pagination: createdAt strictly less than previous page's last createdAt
      if (typeof args.cursor === "number") {
        q = q.filter(qq => qq.lt(qq.field("createdAt"), args.cursor!));
      }

      // Status filter if provided
      if (args.status) {
        q = q.filter(qq => qq.eq(qq.field("status"), args.status!));
      }

      const results = await q.order("desc").take(limit + 1);

      const allowedStatuses = new Set([
        "pending",
        "processing",
        "completed",
        "cancelled",
        "refunded",
        "paid", // tolerated inbound but normalized to completed for UI metrics
        "failed", // tolerated inbound
      ]);

      const hasMore = results.length > limit;
      const sliced = hasMore ? results.slice(0, limit) : results;

      const items = sliced.map(o => {
        const normalizedStatusRaw = allowedStatuses.has(String(o.status))
          ? String(o.status)
          : "pending";
        const normalizedStatus = normalizedStatusRaw;
        return {
          id: o._id,
          items: o.items,
          total: Number(o.total || 0),
          currency: o.currency || "USD",
          status: normalizedStatus,
          createdAt: Number(o.createdAt || Date.now()),
          invoiceUrl: o.invoiceUrl,
          email: o.email,
        };
      });

      // Enrich pricing from Convex beats (synced from Woo/WordPress)
      const uniqueProductIds = new Set<number>();
      for (const order of items as any[]) {
        for (const it of (order.items || []) as any[]) {
          const idCandidates = [it.wordpressId, it.productId, it.beatId].map((x: any) =>
            typeof x === "string" || typeof x === "number" ? Number(x) : NaN
          );
          for (const pid of idCandidates) {
            if (!Number.isNaN(pid)) uniqueProductIds.add(pid);
          }
        }
      }

      const priceMap = new Map<number, number>();
      for (const pid of Array.from(uniqueProductIds)) {
        const beat = await ctx.db
          .query("beats")
          .withIndex("by_wordpress_id", q => q.eq("wordpressId", pid))
          .first();
        if (beat && typeof beat.price === "number") {
          // beat.price is stored in cents per schema
          priceMap.set(pid, Number(beat.price));
        }
      }

      const itemsEnriched = (items as any[]).map(o => {
        let displayTotal = 0;
        for (const it of (o.items || []) as any[]) {
          const idCandidates = [it.wordpressId, it.productId, it.beatId].map((x: any) =>
            typeof x === "string" || typeof x === "number" ? Number(x) : NaN
          );
          let priceCents = 0;
          for (const pid of idCandidates) {
            if (!Number.isNaN(pid) && priceMap.has(pid)) {
              priceCents = priceMap.get(pid)!;
              break;
            }
          }
          if (priceCents === 0 && typeof it.price === "number") {
            // Fallback: infer if price is dollars (<100) or cents (>=100)
            priceCents = it.price >= 100 ? Math.round(it.price) : Math.round(it.price * 100);
          }
          const qty = Number(it.quantity || 1);
          displayTotal += Math.max(0, priceCents) * Math.max(1, qty);
        }
        // Fallback to stored total if enrichment missing
        if (displayTotal === 0 && (o.total || 0) > 0) displayTotal = Number(o.total || 0);
        return { ...o, displayTotal };
      });

      const nextCursor =
        itemsEnriched.length > 0 ? itemsEnriched[itemsEnriched.length - 1].createdAt : undefined;

      console.log(`✅ Found ${itemsEnriched.length} orders${hasMore ? ", has more" : ""}`);
      return { items: itemsEnriched, cursor: nextCursor, hasMore } as const;
    } catch (error) {
      console.error(`❌ Error listing orders:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list orders: ${errorMessage}`);
    }
  },
});

// Get order by ID
export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const clerkId = identity.subject;
      console.log(`🔍 Getting order ${orderId} for user: ${clerkId}`);

      const order = await ctx.db.get(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Vérifier que l'utilisateur a le droit d'accéder à cette commande
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

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
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const clerkId = identity.subject;
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
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

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
      const updateData: any = {
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
      const identity = await ctx.auth.getUserIdentity();
      await ctx.db.insert("auditLogs", {
        clerkId: identity?.subject,
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
      let order: any = null;

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
    state: v.any(),
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
        _restoredAt: Date.now(),
        _restoredFrom: "order_restore",
      });

      console.log("Order data restored successfully:", { orderId });
      return { success: true, orderId, timestamp: Date.now() };
    } catch (error) {
      console.error("Error restoring order data:", error);
      throw error;
    }
  },
});
