import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// CRUD de Conteúdo
// ═══════════════════════════════════════════════════════════════

export const create = mutation({
  args: {
    title: v.string(),
    topic: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi")),
    contentType: v.string(),
    niche: v.optional(v.string()),
    tone: v.optional(v.string()),
    voice: v.optional(v.string()),
    style: v.optional(v.string()),
    description: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("contents", {
      ...args,
      status: "idea",
      progress: 0,
      retryCount: 0,
      tags: [],
      aiGenerated: true,
      requiresDisclosure: true,
      disclosureReason: "Conteúdo gerado por inteligência artificial",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    contentId: v.id("contents"),
    status: v.union(
      v.literal("idea"),
      v.literal("research"),
      v.literal("strategy"),
      v.literal("script"),
      v.literal("production"),
      v.literal("review"),
      v.literal("approved"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("archived")
    ),
    progress: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.progress !== undefined) updates.progress = args.progress;
    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
      updates.errorAt = now;
    }
    if (args.status === "published") updates.completedAt = now;
    if (args.status === "failed") updates.errorAt = now;
    await ctx.db.patch(args.contentId, updates);
  },
});

export const updateScript = mutation({
  args: {
    contentId: v.id("contents"),
    script: v.string(),
    hook: v.optional(v.string()),
    cta: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    aiModel: v.optional(v.string()),
    aiPrompt: v.optional(v.string()),
    aiResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const { contentId, ...updates } = args;
    await ctx.db.patch(contentId, {
      ...updates,
      status: "script",
      progress: 30,
      updatedAt: now,
    });
  },
});

export const updateSEO = mutation({
  args: {
    contentId: v.id("contents"),
    seoTitle: v.string(),
    seoTitleAlternatives: v.optional(v.array(v.string())),
    seoDescription: v.string(),
    seoKeywords: v.array(v.string()),
    seoHashtags: v.array(v.string()),
    seoScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const { contentId, ...updates } = args;
    await ctx.db.patch(contentId, {
      ...updates,
      updatedAt: now,
    });
  },
});

export const updateScores = mutation({
  args: {
    contentId: v.id("contents"),
    originalityScore: v.optional(v.number()),
    policyScore: v.optional(v.number()),
    opportunityScore: v.optional(v.number()),
    confidenceScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const { contentId, ...updates } = args;
    await ctx.db.patch(contentId, { ...updates, updatedAt: now });
  },
});

export const updatePolicy = mutation({
  args: {
    contentId: v.id("contents"),
    policyCheck: v.object({
      copyrightRisk: v.optional(v.string()),
      spamRisk: v.optional(v.string()),
      reusedContentRisk: v.optional(v.string()),
      misinformationRisk: v.optional(v.string()),
      aiDisclosureRequired: v.optional(v.boolean()),
      overallRisk: v.optional(v.string()),
      approved: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.contentId, {
      policyCheck: args.policyCheck,
      updatedAt: now,
    });
  },
});

export const updateMedia = mutation({
  args: {
    contentId: v.id("contents"),
    thumbnailUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    mediaUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const { contentId, ...updates } = args;
    await ctx.db.patch(contentId, { ...updates, updatedAt: now });
  },
});

export const schedule = mutation({
  args: {
    contentId: v.id("contents"),
    scheduledFor: v.string(),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"), v.literal("unlisted"))),
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
  },
});

export const markPublished = mutation({
  args: {
    contentId: v.id("contents"),
    publishedUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.contentId, {
      publishedUrl: args.publishedUrl,
      publishedAt: now,
      status: "published",
      progress: 100,
      completedAt: now,
      updatedAt: now,
    });
  },
});

export const markFailed = mutation({
  args: {
    contentId: v.id("contents"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.contentId, {
      status: "failed",
      errorMessage: args.errorMessage,
      errorAt: now,
      updatedAt: now,
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contents")
      .order("desc")
      .collect();
  },
});

export const listByPlatform = query({
  args: {
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contents")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .order("desc")
      .collect();
  },
});

export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("idea"),
      v.literal("research"),
      v.literal("strategy"),
      v.literal("script"),
      v.literal("production"),
      v.literal("review"),
      v.literal("approved"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contents")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { contentId: v.id("contents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contentId);
  },
});

export const getScheduled = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    return await ctx.db
      .query("contents")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
  },
});

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    const statuses = ["idea", "research", "strategy", "script", "production", "review", "approved", "scheduled", "published", "failed"] as const;
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const items = await ctx.db
        .query("contents")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      counts[status] = items.length;
    }
    return counts;
  },
});

export const countByPlatform = query({
  args: {},
  handler: async (ctx) => {
    const platforms = ["youtube", "instagram", "multi"] as const;
    const counts: Record<string, number> = {};
    for (const platform of platforms) {
      const items = await ctx.db
        .query("contents")
        .withIndex("by_platform", (q) => q.eq("platform", platform))
        .collect();
      counts[platform] = items.length;
    }
    return counts;
  },
});

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("contents")
      .order("desc")
      .take(limit);
  },
});
