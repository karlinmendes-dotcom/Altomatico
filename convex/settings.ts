import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// Configurações do Usuário
// ═══════════════════════════════════════════════════════════════

export const createOrUpdate = mutation({
  args: {
    userId: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    preferredLlm: v.optional(v.string()),
    preferredVoice: v.optional(v.string()),
    language: v.optional(v.string()),
    country: v.optional(v.string()),
    youtubeChannelId: v.optional(v.string()),
    youtubeChannelName: v.optional(v.string()),
    youtubeConnected: v.optional(v.boolean()),
    instagramAccountId: v.optional(v.string()),
    instagramUsername: v.optional(v.string()),
    instagramConnected: v.optional(v.boolean()),
    brandName: v.optional(v.string()),
    brandNiche: v.optional(v.string()),
    brandTone: v.optional(v.string()),
    brandVoice: v.optional(v.string()),
    brandStyle: v.optional(v.string()),
    automationMode: v.optional(v.union(
      v.literal("manual"),
      v.literal("semi"),
      v.literal("automatic")
    )),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    } else {
      return await ctx.db.insert("userSettings", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userSettings").first();
  },
});
