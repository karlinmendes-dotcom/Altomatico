import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Channel Config — Configuração de negócio por canal/conexão
// ═══════════════════════════════════════════════════════════════

// ─── Mutation: Salvar configuração do canal ──────────────────

export const saveChannelConfig = mutation({
  args: {
    connectionId: v.id("connections"),
    niche: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("AUTO_GENERATED"), v.literal("URL_CLIPS"))),
    targetUrl: v.optional(v.string()),
    postFrequency: v.optional(v.number()),
    autoPublish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (args.niche !== undefined) updates.niche = args.niche;
    if (args.systemPrompt !== undefined) updates.systemPrompt = args.systemPrompt;
    if (args.mode !== undefined) updates.mode = args.mode;
    if (args.targetUrl !== undefined) updates.targetUrl = args.targetUrl;
    if (args.postFrequency !== undefined) updates.postFrequency = args.postFrequency;
    if (args.autoPublish !== undefined) updates.autoPublish = args.autoPublish;

    await ctx.db.patch(args.connectionId, updates);

    await ctx.db.insert("logs", {
      action: "channel_config_saved",
      details: `Config salva para conexão ${args.connectionId}`,
      level: "info",
      source: "channelConfig",
      success: true,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  },
});

// ─── Query: Buscar configuração do canal ─────────────────────

export const getChannelConfig = query({
  args: {
    connectionId: v.id("connections"),
  },
  handler: async (ctx, args) => {
    const conn = await ctx.db.get(args.connectionId);
    if (!conn) return null;

    return {
      connectionId: conn._id,
      platform: conn.platform,
      niche: conn.niche || "",
      systemPrompt: conn.systemPrompt || "",
      mode: conn.mode || "AUTO_GENERATED",
      targetUrl: conn.targetUrl || "",
      postFrequency: conn.postFrequency || 1,
      autoPublish: conn.autoPublish ?? false,
      lastCronRunAt: conn.lastCronRunAt || 0,
      contentCount: conn.contentCount || 0,
    };
  },
});

// ─── Query: Buscar todos os canais ativos com config ─────────

export const getActiveChannels = query({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_userId", (q) => q.eq("userId", "default"))
      .collect();

    return connections
      .filter((c) => c.isActive && c.niche)
      .map((c) => ({
        connectionId: c._id,
        platform: c.platform,
        niche: c.niche || "",
        systemPrompt: c.systemPrompt || "",
        mode: c.mode || ("AUTO_GENERATED" as const),
        targetUrl: c.targetUrl || "",
        postFrequency: c.postFrequency || 1,
        autoPublish: c.autoPublish ?? false,
        lastCronRunAt: c.lastCronRunAt || 0,
        contentCount: c.contentCount || 0,
      }));
  },
});

// ─── Mutation: Atualizar último run do cron ───────────────────

export const markCronRun = mutation({
  args: {
    connectionId: v.id("connections"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const conn = await ctx.db.get(args.connectionId);
    if (!conn) throw new Error("Conexão não encontrada");

    await ctx.db.patch(args.connectionId, {
      lastCronRunAt: now,
      contentCount: (conn.contentCount || 0) + 1,
      updatedAt: now,
    });

    return { success: true };
  },
});
