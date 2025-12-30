import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalAuth } from "./lib/authHelpers";

/**
 * Create a new license record
 */
export const createLicense = mutation({
  args: {
    orderId: v.string(),
    itemId: v.string(),
    beatId: v.number(),
    beatTitle: v.string(),
    licenseType: v.string(),
    licenseNumber: v.string(),
    buyerEmail: v.string(),
    buyerName: v.string(),
    buyerUserId: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    pdfStorageId: v.string(),
    pdfUrl: v.string(),
    purchaseDate: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if license already exists (idempotency)
    const existing = await ctx.db
      .query("licenses")
      .withIndex("by_order_item", q => q.eq("orderId", args.orderId).eq("itemId", args.itemId))
      .first();

    if (existing) {
      console.log(`ℹ️ License already exists for order ${args.orderId}, item ${args.itemId}`);
      return existing._id;
    }

    const licenseId = await ctx.db.insert("licenses", {
      orderId: args.orderId,
      itemId: args.itemId,
      beatId: args.beatId,
      beatTitle: args.beatTitle,
      licenseType: args.licenseType,
      licenseNumber: args.licenseNumber,
      buyerEmail: args.buyerEmail,
      buyerName: args.buyerName,
      buyerUserId: args.buyerUserId,
      price: args.price,
      currency: args.currency,
      pdfStorageId: args.pdfStorageId,
      pdfUrl: args.pdfUrl,
      purchaseDate: args.purchaseDate,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✅ License created: ${args.licenseNumber}`);

    // Log to audit
    await ctx.db.insert("auditLogs", {
      action: "license_created",
      resource: "licenses",
      details: {
        operation: "create",
        resource: "licenses",
        resourceId: licenseId,
        licenseNumber: args.licenseNumber,
        orderId: args.orderId,
        beatId: args.beatId,
        licenseType: args.licenseType,
      },
      timestamp: now,
    });

    return licenseId;
  },
});

/**
 * Get license by order and item ID
 */
export const getLicenseByOrderItem = query({
  args: {
    orderId: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_order_item", q => q.eq("orderId", args.orderId).eq("itemId", args.itemId))
      .first();

    return license;
  },
});

/**
 * Get all licenses for an order
 */
export const getLicensesByOrder = query({
  args: {
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    const licenses = await ctx.db
      .query("licenses")
      .withIndex("by_order", q => q.eq("orderId", args.orderId))
      .collect();

    return licenses;
  },
});

/**
 * Get all licenses for a user (by email)
 */
export const getLicensesByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const licenses = await ctx.db
      .query("licenses")
      .withIndex("by_buyer_email", q => q.eq("buyerEmail", args.email.toLowerCase()))
      .order("desc")
      .collect();

    return licenses;
  },
});

/**
 * Get license by license number
 */
export const getLicenseByNumber = query({
  args: {
    licenseNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_number", q => q.eq("licenseNumber", args.licenseNumber))
      .first();

    return license;
  },
});

/**
 * Get user's licenses (authenticated)
 */
export const getMyLicenses = query({
  args: {},
  handler: async ctx => {
    const authResult = await optionalAuth(ctx);
    if (!authResult) {
      return [];
    }

    const { clerkId, user } = authResult;

    if (!user) {
      return [];
    }

    // Get licenses by user ID or email
    const licensesByUserId = await ctx.db
      .query("licenses")
      .withIndex("by_buyer_user_id", q => q.eq("buyerUserId", clerkId))
      .order("desc")
      .collect();

    // Also get by email in case some were created before user ID was available
    const licensesByEmail = user.email
      ? await ctx.db
          .query("licenses")
          .withIndex("by_buyer_email", q => q.eq("buyerEmail", user.email))
          .order("desc")
          .collect()
      : [];

    // Merge and deduplicate
    const allLicenses = [...licensesByUserId];
    const seenIds = new Set(licensesByUserId.map(l => l._id));

    for (const license of licensesByEmail) {
      if (!seenIds.has(license._id)) {
        allLicenses.push(license);
        seenIds.add(license._id);
      }
    }

    // Sort by purchase date descending
    return allLicenses.sort((a, b) => b.purchaseDate - a.purchaseDate);
  },
});
