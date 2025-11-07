import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, mutation } from "./_generated/server";

// Generate an upload URL for Convex storage
export const generateUploadUrl = action({
  args: {},
  handler: async ctx => {
    const url = await ctx.storage.generateUploadUrl();
    return { url } as const;
  },
});

// Get storage URL from storage ID
export const getStorageUrl = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    return url;
  },
});
