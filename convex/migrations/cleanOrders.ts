import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Migration: clean orders documents to match current schema
// - Move taxAmount -> tax (if tax missing)
// - Remove discountAmount and taxAmount fields
// - Uppercase currency; default to USD if missing
// - Normalize totals/amount-like fields that look like dollars to cents
// - Convert string userId (clerkId) to users._id where possible

export const cleanOrders = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { dryRun = true, limit = 500 }) => {
    let scanned = 0;
    let updated = 0;
    let skipped = 0;

    // Collect a page of recent orders to keep migration bounded
    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .take(Math.max(1, Math.min(limit, 1000)));

    for (const o of orders as any[]) {
      scanned++;

      const patch: Record<string, any> = {};
      const unset: string[] = [];

      // Normalize currency
      if (!o.currency || typeof o.currency !== "string") {
        patch.currency = "USD";
      } else {
        const up = String(o.currency).toUpperCase();
        if (up !== o.currency) patch.currency = up;
      }

      // Move taxAmount -> tax if tax missing
      if ((o as any).taxAmount != null && (o as any).tax == null) {
        const taxAmount = Number((o as any).taxAmount);
        if (Number.isFinite(taxAmount)) patch.tax = taxAmount;
      }

      // Remove extra fields after copying
      if ((o as any).taxAmount !== undefined) unset.push("taxAmount");
      if ((o as any).discountAmount !== undefined) unset.push("discountAmount");

      // Normalize totals: if likely dollars (< 1000) and schema elsewhere uses cents, convert to cents
      // Heuristic: if any item.unitPrice/totalPrice appears to be cents (>= 100) then keep as-is.
      const totalNum = Number(o.total);
      if (Number.isFinite(totalNum)) {
        const looksLikeDollars =
          totalNum > 0 && totalNum < 1000 && Math.abs(totalNum - Math.round(totalNum)) < 1e-6;
        const items: any[] = Array.isArray(o.items) ? o.items : [];
        const anyItemLooksLikeCents = items.some(it => {
          const up = Number(it.unitPrice || it.totalPrice || it.price);
          return Number.isFinite(up) && up >= 100;
        });
        if (!anyItemLooksLikeCents && looksLikeDollars) {
          patch.total = Math.round(totalNum * 100);
        }
      }

      // userId normalization: if userId is a string (clerkId), try to map to users._id
      if (o.userId && typeof o.userId === "string") {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", q => q.eq("clerkId", o.userId))
          .first();
        if (user?._id) patch.userId = user._id;
      }

      // Apply patch
      if (Object.keys(patch).length > 0 || unset.length > 0) {
        if (dryRun) {
          skipped++;
        } else {
          await ctx.db.patch(o._id, patch as any);
          // Convex doesn't have an explicit unset API; patch undefined to clear optional fields
          const unsetPatch: Record<string, any> = {};
          for (const key of unset) unsetPatch[key] = undefined;
          if (Object.keys(unsetPatch).length > 0) {
            await ctx.db.patch(o._id, unsetPatch as any);
          }
          updated++;
        }
      }
    }

    return { scanned, updated, skipped, dryRun } as const;
  },
});
