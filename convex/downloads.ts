import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Vous devez être connecté pour télécharger");
      }

      const clerkId = identity.subject;

      console.log(
        "🔧 Logging download for user:",
        clerkId,
        "product:",
        args.productId,
        "license:",
        args.license
      );

      // Get user by Clerk ID
      let user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

      if (!user) {
        // Créer l'utilisateur s'il n'existe pas
        const email =
          (identity.emailAddresses as Array<{ emailAddress: string }>)?.[0]?.emailAddress || "";
        const username =
          (identity.username as string) ||
          email.split("@")[0] ||
          `user_${identity.subject.slice(-8)}`;
        const firstName = (identity.firstName as string) || undefined;
        const lastName = (identity.lastName as string) || undefined;
        const imageUrl = (identity.imageUrl as string) || undefined;

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
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        // Retourner un tableau vide au lieu de lever une erreur
        return [];
      }

      const clerkId = identity.subject;

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

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

// Check download quota for user
export const checkDownloadQuota = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { canDownload: false, reason: "Not authenticated" };
    }

    const clerkId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return { canDownload: false, reason: "User not found" };
    }

    // Get user's subscription status (for future quota implementation)
    const _subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .first();

    // For now, allow unlimited downloads
    // You can implement quota logic based on subscription plan
    return { canDownload: true, quota: "unlimited" };
  },
});
