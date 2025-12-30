import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalAuth, requireAuth } from "./lib/authHelpers";

// Log a download event (idempotent: increments count if already exists)
export const logDownload = mutation({
  args: {
    productId: v.number(),
    license: v.string(),
    productName: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const { clerkId, user: existingUser, identity } = await requireAuth(ctx);

      console.log(
        "🔧 Logging download for user:",
        clerkId,
        "product:",
        args.productId,
        "license:",
        args.license
      );

      let user = existingUser;

      if (!user) {
        // Créer l'utilisateur s'il n'existe pas
        const email = identity.email || "";
        const username =
          (identity.username as string) ||
          email.split("@")[0] ||
          `user_${identity.subject.slice(-8)}`;
        const firstName = identity.givenName || undefined;
        const lastName = identity.familyName || undefined;
        const imageUrl = identity.pictureUrl || undefined;

        const userId = await ctx.db.insert("users", {
          clerkId: identity.subject,
          email,
          username,
          firstName,
          lastName,
          imageUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        user = await ctx.db.get(userId);
        console.log(`✅ Created new user: ${userId}`);
      }

      if (!user) {
        throw new Error("Failed to create or find user");
      }

      const userId = user._id;

      // Check if download already exists
      const existingDownload = await ctx.db
        .query("downloads")
        .withIndex("by_user", q => q.eq("userId", userId))
        .filter(q => q.eq(q.field("beatId"), args.productId))
        .filter(q => q.eq(q.field("licenseType"), args.license))
        .first();

      if (existingDownload) {
        // Update timestamp
        await ctx.db.patch(existingDownload._id, {
          timestamp: Date.now(),
        });
        return await ctx.db.get(existingDownload._id);
      } else {
        // Create new download record
        const downloadId = await ctx.db.insert("downloads", {
          userId,
          beatId: args.productId,
          licenseType: args.license,
          timestamp: Date.now(),
        });
        return await ctx.db.get(downloadId);
      }
    } catch (error) {
      console.error(`❌ Error creating download:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create download: ${errorMessage}`);
    }
  },
});

// Get user downloads
export const getUserDownloads = query({
  args: {},
  handler: async ctx => {
    try {
      const authResult = await optionalAuth(ctx);
      if (!authResult) {
        // Retourner un tableau vide au lieu de lever une erreur
        return [];
      }

      const { user } = authResult;

      if (!user) {
        return [];
      }

      const downloads = await ctx.db
        .query("downloads")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .order("desc")
        .collect();

      return downloads;
    } catch (error) {
      console.error(`❌ Error getting downloads:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get downloads: ${errorMessage}`);
    }
  },
});

// NOTE: checkDownloadQuota has been moved to convex/subscriptions/checkDownloadQuota.ts
// Use that version for proper quota checking with subscription support
