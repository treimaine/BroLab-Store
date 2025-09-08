import { action } from "./_generated/server";

// Generate an upload URL for Convex storage
export const generateUploadUrl = action({
  args: {},
  handler: async ctx => {
    const url = await ctx.storage.generateUploadUrl();
    return { url } as const;
  },
});
