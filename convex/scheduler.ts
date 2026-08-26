import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// Scheduler — Agendamento de conteúdos
// ═══════════════════════════════════════════════════════════════

export const scheduleContent = mutation({
  args: {
    contentId: v.id("contents"),
    scheduledFor: v.string(), // ISO date string
    visibility: v.optional(v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("unlisted")
    )),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.contentId, {
      scheduledFor: args.scheduledFor,
      visibility: args.visibility || "public",
      status: "scheduled",
      progress: 90,
      updatedAt: now,
    });

    // Log
    await ctx.db.insert("logs", {
      action: "content_scheduled",
      contentId: args.contentId,
      details: `Agendado para ${args.scheduledFor}`,
      level: "info",
      source: "scheduler",
      success: true,
      timestamp: now,
    });

    return { success: true, scheduledFor: args.scheduledFor };
  },
});

export const unscheduleContent = mutation({
  args: { contentId: v.id("contents") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.contentId, {
      scheduledFor: undefined,
      status: "script", // Voltar para roteiro
      progress: 30,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const getScheduledContents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contents")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .order("asc")
      .collect();
  },
});

export const getContentsByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allContents = await ctx.db
      .query("contents")
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledFor"), args.startDate),
          q.lte(q.field("scheduledFor"), args.endDate)
        )
      )
      .order("asc")
      .collect();
    return allContents;
  },
});

// ═══════════════════════════════════════════════════════════════
// Content Calendar — Calendário visual
// ═══════════════════════════════════════════════════════════════

export const getCalendarEvents = query({
  args: {
    month: v.number(), // 0-11
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const startDate = new Date(args.year, args.month, 1).toISOString();
    const endDate = new Date(args.year, args.month + 1, 0, 23, 59, 59).toISOString();

    const contents = await ctx.db
      .query("contents")
      .filter((q) =>
        q.or(
          q.and(
            q.gte(q.field("createdAt"), startDate),
            q.lte(q.field("createdAt"), endDate)
          ),
          q.and(
            q.gte(q.field("scheduledFor"), startDate),
            q.lte(q.field("scheduledFor"), endDate)
          )
        )
      )
      .collect();

    return contents.map((c) => ({
      id: c._id,
      title: c.title,
      platform: c.platform,
      status: c.status,
      date: c.scheduledFor || c.createdAt,
      contentType: c.contentType,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════
// Quick Actions — Ações rápidas do dashboard
// ═══════════════════════════════════════════════════════════════

export const approveContent = mutation({
  args: { contentId: v.id("contents") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.contentId, {
      status: "approved",
      progress: 80,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const rejectContent = mutation({
  args: {
    contentId: v.id("contents"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.contentId, {
      status: "failed",
      errorMessage: args.reason || "Rejeitado pelo usuário",
      errorAt: now,
      updatedAt: now,
    });
    return { success: true };
  },
});
