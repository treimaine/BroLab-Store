import { query } from "../_generated/server";

export interface EnrichedDownload {
  _id: string;
  beatId: number;
  licenseType: string;
  timestamp: number;
  downloadUrl?: string;
  // Joined
  beatTitle?: string;
  artist?: string;
  imageUrl?: string;
  duration?: number;
  // Quota info
  quotaLimit?: number | -1;
  quotaUsed?: number;
  quotaRemaining?: number | "unlimited";
}

export const getUserDownloadsEnriched = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as EnrichedDownload[];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [] as EnrichedDownload[];

    const [downloads, subscription, quota] = await Promise.all([
      ctx.db
        .query("downloads")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .order("desc")
        .collect(),
      ctx.db
        .query("subscriptions")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .filter(q => q.eq(q.field("status"), "active"))
        .first(),
      ctx.db
        .query("quotas")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .filter(q => q.eq(q.field("quotaType"), "downloads"))
        .filter(q => q.eq(q.field("isActive"), true))
        .first(),
    ]);

    const beatIds = Array.from(new Set(downloads.map(d => d.beatId)));
    const beats = await Promise.all(
      beatIds.map(async id =>
        ctx.db
          .query("beats")
          .withIndex("by_wordpress_id", q => q.eq("wordpressId", id))
          .first()
      )
    );
    const beatMap = new Map<number, any>();
    beats.forEach(b => {
      if (b) beatMap.set(b.wordpressId as number, b);
    });

    const limit = quota
      ? quota.limit
      : subscription
        ? subscription.planId === "ultimate"
          ? -1
          : subscription.planId === "artist"
            ? 20
            : 5
        : 0;
    const used = quota ? quota.used : downloads.length;
    const remaining = limit === -1 ? "unlimited" : Math.max(limit - used, 0);

    return downloads.map(d => ({
      _id: d._id as any,
      beatId: d.beatId,
      licenseType: d.licenseType,
      timestamp: d.timestamp,
      downloadUrl: d.downloadUrl,
      beatTitle: beatMap.get(d.beatId)?.title,
      artist: undefined,
      imageUrl: beatMap.get(d.beatId)?.imageUrl,
      duration: beatMap.get(d.beatId)?.duration,
      quotaLimit: limit,
      quotaUsed: used,
      quotaRemaining: remaining,
    }));
  },
});
