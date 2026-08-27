import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Connections — Gerenciamento de conexões com plataformas
// ═══════════════════════════════════════════════════════════════

// ─── Query: Buscar conexões por usuário ──────────────────────
export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ─── Query: Buscar conexão específica ────────────────────────
export const getByPlatform = query({
  args: {
    userId: v.string(),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();
  },
});

// ─── Mutation: Salvar tokens YouTube ─────────────────────────
export const saveYoutubeTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    channelId: v.string(),
    channelName: v.string(),
    channelThumbnail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "youtube")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        youtubeAccessToken: args.accessToken,
        youtubeRefreshToken: args.refreshToken,
        youtubeTokenExpiresAt: args.expiresAt,
        youtubeChannelId: args.channelId,
        youtubeChannelName: args.channelName,
        youtubeChannelThumbnail: args.channelThumbnail,
        isActive: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("connections", {
        userId: "default",
        platform: "youtube",
        youtubeAccessToken: args.accessToken,
        youtubeRefreshToken: args.refreshToken,
        youtubeTokenExpiresAt: args.expiresAt,
        youtubeChannelId: args.channelId,
        youtubeChannelName: args.channelName,
        youtubeChannelThumbnail: args.channelThumbnail,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});

// ─── Mutation: Salvar tokens Instagram ───────────────────────
export const saveInstagramTokens = mutation({
  args: {
    accessToken: v.string(),
    expiresAt: v.number(),
    facebookPageId: v.string(),
    instagramAccountId: v.string(),
    instagramUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "instagram")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        instagramAccessToken: args.accessToken,
        instagramTokenExpiresAt: args.expiresAt,
        facebookPageId: args.facebookPageId,
        instagramAccountId: args.instagramAccountId,
        instagramUsername: args.instagramUsername,
        isActive: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("connections", {
        userId: "default",
        platform: "instagram",
        instagramAccessToken: args.accessToken,
        instagramTokenExpiresAt: args.expiresAt,
        facebookPageId: args.facebookPageId,
        instagramAccountId: args.instagramAccountId,
        instagramUsername: args.instagramUsername,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});

// ─── Mutation: Desconectar plataforma ────────────────────────
export const disconnect = mutation({
  args: {
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok")
    ),
  },
  handler: async (ctx, args) => {
    const conn = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", args.platform)
      )
      .first();

    if (conn) {
      await ctx.db.patch(conn._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});
