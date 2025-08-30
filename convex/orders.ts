import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateAndSanitizeOrder, ValidationError } from "./lib/validation";

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
        woocommerceId: undefined,
        items: validatedOrder.items,
        total: validatedOrder.total,
        email: validatedOrder.email,
        status: validatedOrder.status,
        currency: validatedOrder.currency,
        paymentId: args.paymentId,
        paymentStatus: args.paymentId ? "pending" : undefined,
        taxAmount: 0, // TODO: Calculate tax
        discountAmount: 0,
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
        resource: "order",
        details: {
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
        resource: "order",
        details: {
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
        const normalizedStatus = normalizedStatusRaw === "paid" ? "completed" : normalizedStatusRaw;
        return {
          id: o._id,
          items: o.items,
          total: Number(o.total || 0),
          currency: o.currency || "USD",
          status: normalizedStatus,
          paymentStatus: o.paymentStatus,
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
      for (const pid of uniqueProductIds) {
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
        resource: "order",
        details: {
          orderId: args.orderId,
          previousStatus,
          newStatus: args.status,
          paymentStatus: args.paymentStatus,
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
        resource: "order",
        details: {
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
      let order = null as any;

      if (args.sessionId) {
        order = await ctx.db
          .query("orders")
          .filter(q => q.eq(q.field("sessionId"), args.sessionId))
          .order("desc")
          .first();
      }

      if (!order && args.paymentId) {
        order = await ctx.db
          .query("orders")
          .filter(q => q.eq(q.field("paymentId"), args.paymentId))
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
      const newPaymentStatus = args.paymentStatus || "succeeded";

      await ctx.db.patch(order._id, {
        status: newStatus,
        paymentStatus: newPaymentStatus,
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
            paymentStatus: newPaymentStatus,
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
