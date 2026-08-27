import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Content Queue — Fila de publicações rápidas
// ═══════════════════════════════════════════════════════════════

// ─── Mutation: Criar item na fila ────────────────────────────
export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("multi")
    ),
    contentType: v.union(
      v.literal("short"),
      v.literal("reel"),
      v.literal("post"),
      v.literal("carousel"),
      v.literal("long_video")
    ),
    source: v.union(
      v.literal("ai_generated"),
      v.literal("youtube_cut"),
      v.literal("manual")
    ),
    aiPrompt: v.optional(v.string()),
    aiScript: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("contentQueue", {
      ...args,
      status: "draft",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── Mutation: Atualizar status ──────────────────────────────
export const updateStatus = mutation({
  args: {
    queueId: v.id("contentQueue"),
    status: v.union(
      v.literal("draft"),
      v.literal("ai_generating"),
      v.literal("ready"),
      v.literal("scheduled"),
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    youtubeVideoId: v.optional(v.string()),
    instagramContainerId: v.optional(v.string()),
    tiktokPublishId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.errorMessage) updates.errorMessage = args.errorMessage;
    if (args.publishedAt) updates.publishedAt = args.publishedAt;
    if (args.scheduledAt) updates.scheduledAt = args.scheduledAt;
    if (args.youtubeVideoId) updates.youtubeVideoId = args.youtubeVideoId;
    if (args.instagramContainerId) updates.instagramContainerId = args.instagramContainerId;
    if (args.tiktokPublishId) updates.tiktokPublishId = args.tiktokPublishId;
    await ctx.db.patch(args.queueId, updates);
  },
});

// ─── Mutation: Salvar dados de IA ────────────────────────────
export const saveAiData = mutation({
  args: {
    queueId: v.id("contentQueue"),
    aiScript: v.optional(v.string()),
    aiNarration: v.optional(v.string()),
    aiHashtags: v.optional(v.array(v.string())),
    aiThumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.aiScript) updates.aiScript = args.aiScript;
    if (args.aiNarration) updates.aiNarration = args.aiNarration;
    if (args.aiHashtags) updates.aiHashtags = args.aiHashtags;
    if (args.aiThumbnailUrl) updates.aiThumbnailUrl = args.aiThumbnailUrl;
    await ctx.db.patch(args.queueId, updates);
  },
});

// ─── Mutation: Deletar da fila ───────────────────────────────
export const remove = mutation({
  args: { queueId: v.id("contentQueue") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.queueId);
  },
});

// ─── Query: Listar fila do usuário ───────────────────────────
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentQueue")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// ─── Query: Listar por status ────────────────────────────────
export const listByStatus = query({
  args: {
    userId: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("ai_generating"),
      v.literal("ready"),
      v.literal("scheduled"),
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentQueue")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", args.status)
      )
      .order("desc")
      .collect();
  },
});

// ─── Query: Listar por plataforma ────────────────────────────
export const listByPlatform = query({
  args: {
    userId: v.string(),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("multi")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentQueue")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .order("desc")
      .collect();
  },
});

// ─── Query: Contar por status ────────────────────────────────
export const countByStatus = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const statuses = ["draft", "ai_generating", "ready", "scheduled", "publishing", "published", "failed"] as const;
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const items = await ctx.db
        .query("contentQueue")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", args.userId).eq("status", status)
        )
        .collect();
      counts[status] = items.length;
    }
    return counts;
  },
});
