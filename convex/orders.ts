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
        order: await ctx.db.get(orderId)
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
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }

      const clerkId = identity.subject;
      const limit = args.limit || 50; // Limite par défaut

      console.log(`📋 Listing orders for user: ${clerkId}`);

      // Récupérer l'utilisateur
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

      if (!user) {
        console.log(`⚠️ User not found for clerkId: ${clerkId}`);
        return [];
      }

      // Récupérer les commandes de l'utilisateur
      let ordersQuery = ctx.db
        .query("orders")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .order("desc")
        .take(limit);

      const orders = await ordersQuery;

      // Filtrer par statut si spécifié
      const filteredOrders = args.status 
        ? orders.filter(order => order.status === args.status)
        : orders;

      console.log(`✅ Found ${filteredOrders.length} orders`);
      return filteredOrders;
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

      console.log(`✅ Order ${args.orderId} status updated from ${previousStatus} to ${args.status}`);
      return { 
        success: true,
        order: await ctx.db.get(args.orderId)
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

// Save invoice URL
export const saveInvoiceUrl = mutation({
  args: {
    orderId: v.id("orders"),
    invoiceUrl: v.string(),
  },
  handler: async (ctx, { orderId, invoiceUrl }) => {
    await ctx.db.patch(orderId, {
      // Note: invoiceUrl field doesn't exist in schema, skipping for now
    });

    return await ctx.db.get(orderId);
  },
});
