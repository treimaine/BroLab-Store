import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Generate a unique invoice number for an order using atomic counter logic.
 * Format: BRLB-{YEAR}-{6-DIGIT-SEQUENCE}
 *
 * This mutation is idempotent - if the order already has an invoice number,
 * it returns the existing number without generating a new one.
 *
 * Requirements: 4.1, 4.2, 4.4
 */
export const generateInvoiceNumber = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<string> => {
    // Check if order exists
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error(`Order not found: ${args.orderId}`);
    }

    // Idempotency check: return existing invoice number if present
    if (order.invoiceNumber) {
      return order.invoiceNumber;
    }

    const year = new Date().getFullYear();
    const counterName = `invoice_${year}`;

    // Get or create counter for the current year
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", q => q.eq("name", counterName))
      .first();

    let sequence: number;
    if (counter) {
      // Increment existing counter atomically
      sequence = counter.value + 1;
      await ctx.db.patch(counter._id, { value: sequence });
    } else {
      // Create new counter for this year starting at 1
      sequence = 1;
      await ctx.db.insert("counters", { name: counterName, value: 1 });
    }

    // Generate invoice number in format BRLB-{YEAR}-{6-DIGIT-SEQUENCE}
    const invoiceNumber = `BRLB-${year}-${String(sequence).padStart(6, "0")}`;

    // Update order with the generated invoice number
    await ctx.db.patch(args.orderId, { invoiceNumber });

    return invoiceNumber;
  },
});
