import { mutation, query, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════
// Scheduler — Agendamento de conteúdos + Cron Diário
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

// ═══════════════════════════════════════════════════════════════
// CRON JOB — Geração diária automática de conteúdo
// Roda uma vez por dia para cada canal ativo com config
// ═══════════════════════════════════════════════════════════════

// ─── Action: Processar cron para um canal ─────────────────────
export const processChannelCron = action({
  args: {
    connectionId: v.id("connections"),
  },
  handler: async (ctx, args) => {
    // Buscar a conexão
    const connRaw = await ctx.runQuery("channelConfig:getChannelConfig" as never, {
      connectionId: args.connectionId,
    } as never);
    if (!connRaw) throw new Error("Conexão não encontrada");
    const conn = connRaw as unknown as {
      platform: string;
      niche: string;
      systemPrompt: string;
      mode: string;
      targetUrl: string;
    };
    if (!conn.niche) throw new Error("Canal sem nicho configurado");

    const { platform, niche, systemPrompt, mode, targetUrl } = conn;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const prompt = `Você é um criador de conteúdo profissional para ${platform}.

Nicho: ${niche}
${systemPrompt ? `Instruções personalizadas: ${systemPrompt}` : ""}

Gere um roteiro curto para um post ${platform === "youtube" ? "YouTube" : platform === "instagram" ? "Instagram" : "TikTok"}:

1. Título chamativo (máx 60 caracteres)
2. Roteiro cena a cena (máx 30 segundos)
3. Legenda com hashtags (8-12 tags relevantes ao nicho)
4. Conceito visual (descrição do que aparece na tela)
5. Melhor horário para postar

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título do post",
  "script": "roteiro completo",
  "caption": "legenda com emojis e quebras de linha",
  "hashtags": ["#tag1", "#tag2", ...],
  "visualConcept": "descrição visual",
  "bestTime": "horário sugerido",
  "hook": "gancho dos primeiros 3 segundos",
  "duration": "duração sugerida"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) throw new Error("Erro na API Gemini");
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let generated: Record<string, unknown>;
    try {
      generated = JSON.parse(cleaned);
    } catch {
      generated = { title: "Conteúdo automático", script: text, caption: "", hashtags: [], visualConcept: "", bestTime: "12:00", hook: "", duration: "30s" };
    }

    // Criar item na fila como DRAFT (nunca publicado automaticamente)
    const now = Date.now();
    const contentType = platform === "youtube" ? "long_video" as const : platform === "instagram" ? "reel" as const : "short" as const;
    const queueId = await ctx.runMutation("contentQueue:create" as never, {
      userId: "default",
      title: (generated.title as string) || "Conteúdo automático",
      description: (generated.script as string) || "",
      platform: platform as "youtube" | "instagram" | "tiktok",
      contentType,
      source: mode === "URL_CLIPS" ? "youtube_cut" as const : "ai_generated" as const,
      aiPrompt: systemPrompt || `Nicho: ${niche}`,
      aiScript: (generated.script as string) || "",
      aiHashtags: (generated.hashtags as string[]) || [],
      status: "draft", // SEMPRE como rascunho
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    } as never);

    // Atualizar último run do cron
    await ctx.runMutation("channelConfig:markCronRun" as never, {
      connectionId: args.connectionId,
    } as never);

    // Log
    await ctx.runMutation("logs:create" as never, {
      action: "cron_content_generated",
      details: `Canal ${platform}#${args.connectionId} — Conteúdo gerado: ${(generated.title as string) || "Sem título"}`,
      level: "info",
      source: "scheduler_cron",
      success: true,
      timestamp: new Date().toISOString(),
    } as never);

    return {
      success: true,
      queueId,
      title: generated.title,
      mode,
      note: "Conteúdo criado como RASCUNHO. Nada foi publicado automaticamente.",
    };
  },
});

// ─── Internal Mutation: Criar log ────────────────────────────
export const _createLog = internalMutation({
  args: {
    action: v.string(),
    details: v.optional(v.string()),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    source: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("logs", {
      ...args,
      timestamp: new Date().toISOString(),
    });
  },
});
