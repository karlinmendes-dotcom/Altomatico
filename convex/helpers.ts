import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Query para obter settings
export const getDefaultSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userSettings").first();
  },
});

// Mutation para salvar tokens TikTok via connections table
export const saveTiktokTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    openId: v.string(),
    creatorUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Buscar conexão TikTok existente
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "tiktok")
      )
      .first();

    const expiresAtMs = args.expiresAt;

    if (existing) {
      await ctx.db.patch(existing._id, {
        tiktokAccessToken: args.accessToken,
        tiktokRefreshToken: args.refreshToken,
        tiktokTokenExpiresAt: args.expiresAt,
        tiktokOpenId: args.openId,
        tiktokCreatorUsername: args.creatorUsername,
        isActive: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("connections", {
        userId: "default",
        platform: "tiktok",
        tiktokAccessToken: args.accessToken,
        tiktokRefreshToken: args.refreshToken,
        tiktokTokenExpiresAt: args.expiresAt,
        tiktokOpenId: args.openId,
        tiktokCreatorUsername: args.creatorUsername,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
