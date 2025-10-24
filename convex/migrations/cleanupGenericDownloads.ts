/**
 * Migration to clean up generic downloads and create proper downloads from paid orders
 */

import { internalMutation } from "../_generated/server";

export const cleanupGenericDownloads = internalMutation({
  handler: async (ctx: any) => {
    console.log("🧹 Starting cleanup of generic downloads...");

    try {
      // Get all users
      const users = await ctx.db.query("users").collect();
      console.log(`👥 Found ${users.length} users to process`);

      let totalCleaned = 0;
      let totalCreated = 0;

      for (const user of users) {
        console.log(`🔄 Processing user: ${user.clerkId}`);

        // Get all paid orders for this user
        const paidOrders = await ctx.db
          .query("orders")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .filter((q: any) => q.eq(q.field("status"), "paid"))
          .collect();

        console.log(`📦 Found ${paidOrders.length} paid orders for user ${user.clerkId}`);

        // Delete all existing downloads for this user (they will be recreated from orders)
        const existingDownloads = await ctx.db
          .query("downloads")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .collect();

        for (const download of existingDownloads) {
          await ctx.db.delete(download._id);
          totalCleaned++;
        }

        console.log(
          `🗑️ Deleted ${existingDownloads.length} existing downloads for user ${user.clerkId}`
        );

        // Create proper downloads from paid orders
        for (const order of paidOrders) {
          for (const item of order.items || []) {
            if (item.productId && item.license) {
              // Create download record
              const downloadId = await ctx.db.insert("downloads", {
                userId: user._id,
                beatId: item.productId,
                licenseType: item.license,
                downloadCount: 0,
                timestamp: order.createdAt, // Use order creation time
              });

              totalCreated++;

              console.log(
                `✅ Created download: ${downloadId} for beat ${item.productId} (${item.license})`
              );

              // Log activity
              await ctx.db.insert("activityLog", {
                userId: user._id,
                action: "download_granted",
                details: {
                  description: `Download access granted for "${item.title || item.name || `Beat ${item.productId}`}"`,
                  beatId: item.productId,
                  beatTitle: item.title || item.name,
                  licenseType: item.license,
                  orderId: order._id,
                  severity: "info",
                },
                timestamp: order.createdAt,
              });
            }
          }
        }
      }

      console.log(`🎉 Migration completed:`);
      console.log(`   - Cleaned up: ${totalCleaned} generic downloads`);
      console.log(`   - Created: ${totalCreated} proper downloads from paid orders`);

      return {
        success: true,
        cleaned: totalCleaned,
        created: totalCreated,
      };
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
  },
});
