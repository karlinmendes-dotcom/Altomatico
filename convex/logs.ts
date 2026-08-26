import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// Logs de Rastreabilidade
// ═══════════════════════════════════════════════════════════════

export const create = mutation({
  args: {
    action: v.string(),
    contentId: v.optional(v.id("contents")),
    taskId: v.optional(v.id("tasks")),
    details: v.optional(v.string()),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    source: v.string(),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    duration: v.optional(v.number()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("logs", {
      ...args,
      timestamp: new Date().toISOString(),
    });
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("logs")
      .order("desc")
      .take(args.limit || 50);
  },
});

export const listByContent = query({
  args: { contentId: v.id("contents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("logs")
      .withIndex("by_contentId", (q) => q.eq("contentId", args.contentId))
      .order("desc")
      .collect();
  },
});

export const listErrors = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("logs")
      .withIndex("by_level", (q) => q.eq("level", "error"))
      .order("desc")
      .take(args.limit || 20);
  },
});
