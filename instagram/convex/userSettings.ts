import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Buscar configurações do usuário
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    return existing;
  },
});

// Criar ou atualizar configurações do usuário
export const upsert = mutation({
  args: {
    userId: v.string(),
    youtubeApiKey: v.optional(v.string()),
    instagramApiKey: v.optional(v.string()),
    preferredLlm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        youtubeApiKey: args.youtubeApiKey,
        instagramApiKey: args.instagramApiKey,
        preferredLlm: args.preferredLlm,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: args.userId,
        youtubeApiKey: args.youtubeApiKey,
        instagramApiKey: args.instagramApiKey,
        preferredLlm: args.preferredLlm,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
