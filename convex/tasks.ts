import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// Fila de Tarefas
// ═══════════════════════════════════════════════════════════════

export const create = mutation({
  args: {
    contentId: v.id("contents"),
    type: v.union(
      v.literal("research"),
      v.literal("script"),
      v.literal("video"),
      v.literal("thumbnail"),
      v.literal("seo"),
      v.literal("publish"),
      v.literal("analytics"),
      v.literal("policy_check"),
      v.literal("originality_check")
    ),
    priority: v.optional(v.number()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("tasks", {
      contentId: args.contentId,
      type: args.type,
      status: "queued",
      priority: args.priority || 5,
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      metadata: args.metadata,
      createdAt: now,
    });
  },
});

export const startProcessing = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.taskId, {
      status: "processing",
      startedAt: now,
    });
  },
});

export const complete = mutation({
  args: {
    taskId: v.id("tasks"),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.taskId, {
      status: "completed",
      progress: 100,
      result: args.result,
      completedAt: now,
    });
  },
});

export const fail = mutation({
  args: {
    taskId: v.id("tasks"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const newRetryCount = task.retryCount + 1;
    if (newRetryCount < task.maxRetries) {
      await ctx.db.patch(args.taskId, {
        status: "queued",
        error: args.error,
        retryCount: newRetryCount,
      });
    } else {
      await ctx.db.patch(args.taskId, {
        status: "failed",
        error: args.error,
        retryCount: newRetryCount,
      });
    }
  },
});

export const updateProgress = mutation({
  args: {
    taskId: v.id("tasks"),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { progress: args.progress });
  },
});

// ═══════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════

export const listByContent = query({
  args: { contentId: v.id("contents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_contentId", (q) => q.eq("contentId", args.contentId))
      .collect();
  },
});

export const getQueued = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});
