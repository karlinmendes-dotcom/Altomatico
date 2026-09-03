import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const GEMINI_MODEL = "gemini-2.5-flash";

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini error: ${await response.text()}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return fallback; }
}

// ═══════════════════════════════════════════════════════════════
// Cron Runner — Funções internas chamadas pelos crons do Convex
// ═══════════════════════════════════════════════════════════════

// ─── Geração diária de conteúdo ──────────────────────────────
// Busca canais ativos com nicho configurado e gera conteúdo para cada um
export const runDailyContentGeneration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      await ctx.db.insert("logs", {
        action: "cron_daily_run",
        details: "GEMINI_API_KEY não configurada",
        level: "error",
        source: "cron_runner",
        success: false,
        timestamp: new Date().toISOString(),
      });
      return { processed: 0, message: "API key não configurada" };
    }

    // Buscar todas as conexões ativas com nicho configurado
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_userId", (q) => q.eq("userId", "default"))
      .collect();

    const activeChannels = connections.filter(
      (c) => c.isActive && c.niche
    );

    if (activeChannels.length === 0) {
      // Se não há canais configurados, gerar conteúdo para o padrão
      // 3 posts diários para Instagram com 3 imagens cada
      const defaultBrand = "AgendAI";
      const defaultNiche = "Tecnologia";
      const defaultTopic = "automação de agendamentos";

      try {
        await generateInstagramPosts(ctx, apiKey, defaultBrand, defaultNiche, defaultTopic);
        return { processed: 3, message: "3 posts Instagram gerados (padrão)" };
      } catch (err) {
        return { processed: 0, message: `Erro: ${err}` };
      }
    }

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const channel of activeChannels) {
      // Verificar se já rodou nas últimas 24h (respeitar frequência)
      const postFrequency = channel.postFrequency || 1;
      const intervalMs = twentyFourHours / postFrequency;

      if (channel.lastCronRunAt && (now - channel.lastCronRunAt) < intervalMs) {
        skipped++;
        continue;
      }

      // Criar registro de cron job pendente
      const jobId = await ctx.db.insert("cronJobs", {
        connectionId: channel._id,
        userId: channel.userId,
        platform: channel.platform,
        action: channel.mode === "URL_CLIPS" ? "clip_from_url" : "generate_content",
        status: "pending",
        scheduledAt: now,
        createdAt: now,
      });

      // Marcar como rodando
      await ctx.db.patch(jobId, { status: "running", startedAt: now });

      try {
        if (channel.platform === "instagram") {
          // Gerar 3 posts completos com imagens, legenda, hashtags, CTA
          await generateInstagramPosts(ctx, apiKey, channel.niche || "AgendAI", channel.niche || "Tecnologia", channel.systemPrompt || "automação de agendamentos");
        } else {
          // Gerar conteúdo normal para YouTube/TikTok
          const contentType = channel.platform === "youtube" ? "long_video" : "short";
          await ctx.db.insert("contentQueue", {
            userId: "default",
            title: `Conteúdo automático — ${channel.niche}`,
            description: `Gerado pelo cron diário para ${channel.platform}`,
            platform: channel.platform as "youtube" | "instagram" | "tiktok",
            contentType: contentType as "short" | "reel" | "long_video",
            source: channel.mode === "URL_CLIPS" ? "youtube_cut" : "ai_generated",
            aiPrompt: channel.systemPrompt || `Nicho: ${channel.niche}`,
            status: "draft",
            retryCount: 0,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Atualizar timestamp do último run
        await ctx.db.patch(channel._id, {
          lastCronRunAt: now,
          contentCount: (channel.contentCount || 0) + 1,
          updatedAt: now,
        });

        // Marcar job como concluído
        await ctx.db.patch(jobId, {
          status: "completed",
          completedAt: now,
        });

        processed++;
      } catch (err) {
        // Marcar job como falhou
        await ctx.db.patch(jobId, {
          status: "failed",
          errorMessage: String(err),
          completedAt: now,
        });
        errors++;
      }
    }

    // Log resumo
    await ctx.db.insert("logs", {
      action: "cron_daily_run",
      details: `Processados: ${processed}, Pulados: ${skipped}, Erros: ${errors}`,
      level: errors > 0 ? "warning" : "info",
      source: "cron_runner",
      success: errors === 0,
      timestamp: new Date().toISOString(),
    });

    return { processed, skipped, errors };
  },
});

// ─── Gerar 3 posts Instagram completos ────────────────────────
async function generateInstagramPosts(
  ctx: any,
  apiKey: string,
  brandName: string,
  niche: string,
  topic: string
) {
  const now = Date.now();

  // FASE 1: Gerar 3 ideias de posts
  const ideasPrompt = `Você é um social media manager profissional para a marca "${brandName}" no nicho de ${niche}.

Gere EXATAMENTE 3 posts para Instagram sobre o tema: ${topic}

Cada post deve ter:
- Um tema diferente e engajante
- Focado em ${niche}
- Tom: profissional mas acessível
- Público: empreendedores e donos de negócio

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "posts": [
    {
      "id": 1,
      "title": "Título chamativo do post",
      "theme": "tema específico",
      "imagePrompts": ["descrição imagem 1", "descrição imagem 2", "descrição imagem 3"]
    }
  ]
}`;

  const ideasText = await callGemini(apiKey, ideasPrompt, 2048);
  const ideas = parseJSON(ideasText, {
    posts: [
      { id: 1, title: `5 benefícios de usar ${brandName}`, theme: "benefícios", imagePrompts: ["Smartphone com app", "Pessoa feliz", "Gráfico crescimento"] },
      { id: 2, title: `Como ${brandName} transforma`, theme: "transformação", imagePrompts: ["Antes e depois", "Dashboard", "Clientes satisfeitos"] },
      { id: 3, title: `Dica rápida: Organize sua agenda`, theme: "dica", imagePrompts: ["Timer 5 min", "Calendário organizado", "Profissional sorrindo"] },
    ]
  });

  // FASE 2: Gerar legenda + hashtags + CTA para cada post
  for (const idea of ideas.posts) {
    const captionPrompt = `Você é um copywriter profissional para Instagram.

Marca: ${brandName}
Nicho: ${niche}
Tema: ${idea.title}

Gere uma LEGENDA COMPLETA:
1. Gancho chamativo (máx 15 palavras)
2. Desenvolvimento (3-5 parágrafos curtos)
3. Benefícios/dicas com emojis
4. CTA forte no final
5. 20 hashtags relevantes

Tudo em português brasileiro. Tom profissional mas amigável.

JSON (sem markdown):
{
  "firstLine": "gancho",
  "caption": "legenda completa",
  "cta": "chamada para ação",
  "hashtags": ["#tag1", ...],
  "altText": "texto alternativo"
}`;

    const captionText = await callGemini(apiKey, captionPrompt, 1500);
    const captionData = parseJSON(captionText, {
      firstLine: `${brandName} transforma seu negócio! 🚀`,
      caption: captionText.slice(0, 400),
      cta: `Experimente ${brandName} agora! Link na bio 👆`,
      hashtags: ["#automacao", "#agendamento", "#tecnologia", "#negocios", "#empreendedorismo"],
      altText: `Post sobre ${idea.title}`,
    });

    const fullCaption = captionData.firstLine + "\n\n" + captionData.caption + "\n\n" + captionData.cta + "\n\n" + captionData.hashtags.join(" ");

    // Salvar cada post na fila
    await ctx.db.insert("contentQueue", {
      userId: "default",
      title: idea.title,
      description: fullCaption,
      platform: "instagram",
      contentType: "reel",
      source: "ai_generated",
      aiPrompt: idea.imagePrompts.join(" | "),
      status: "ready",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Log
  await ctx.db.insert("logs", {
    action: "instagram_daily_generated",
    details: `${ideas.posts.length} posts Instagram gerados com legendas, hashtags e CTAs`,
    level: "info",
    source: "cron_runner",
    success: true,
    timestamp: new Date().toISOString(),
  });
}

// ─── Verificar tokens expirados ──────────────────────────────
export const checkExpiredTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_userId", (q) => q.eq("userId", "default"))
      .collect();

    let warnings = 0;

    for (const conn of connections) {
      if (!conn.isActive) continue;

      if (conn.instagramTokenExpiresAt && conn.instagramTokenExpiresAt < now) {
        warnings++;
        await ctx.db.insert("logs", {
          action: "token_expired",
          details: `Token Instagram expirado para conexão ${conn._id}`,
          level: "warning",
          source: "cron_runner",
          success: false,
          timestamp: new Date().toISOString(),
        });
      }

      if (conn.tiktokTokenExpiresAt && conn.tiktokTokenExpiresAt < now) {
        warnings++;
        await ctx.db.insert("logs", {
          action: "token_expired",
          details: `Token TikTok expirado para conexão ${conn._id}`,
          level: "warning",
          source: "cron_runner",
          success: false,
          timestamp: new Date().toISOString(),
        });
      }

      if (conn.youtubeTokenExpiresAt && conn.youtubeTokenExpiresAt < now) {
        warnings++;
        await ctx.db.insert("logs", {
          action: "token_expired",
          details: `Token YouTube expirado para conexão ${conn._id}`,
          level: "warning",
          source: "cron_runner",
          success: false,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (warnings > 0) {
      await ctx.db.insert("logs", {
        action: "token_check_complete",
        details: `${warnings} token(s) expirado(s) detectado(s)`,
        level: "warning",
        source: "cron_runner",
        success: false,
        timestamp: new Date().toISOString(),
      });
    }

    return { warnings };
  },
});

// ─── Manutenção completa — Limpeza semanal de dados antigos ───
// Remove logs > 30 dias, contentQueue FAILED/PUBLISHED > 60 dias, cronJobs > 30 dias
export const runFullMaintenance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

    let totalDeleted = 0;

    // 1. Limpar logs antigos (30 dias)
    const logsCutoff = new Date(now - thirtyDaysMs).toISOString();
    const oldLogs = await ctx.db
      .query("logs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", logsCutoff))
      .order("asc")
      .take(100);
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      totalDeleted++;
    }

    // 2. Limpar contentQueue FAILED antigos (60 dias)
    const failedItems = await ctx.db
      .query("contentQueue")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", "default").eq("status", "failed")
      )
      .collect();
    for (const item of failedItems) {
      if (item.createdAt < now - sixtyDaysMs) {
        await ctx.db.delete(item._id);
        totalDeleted++;
      }
    }

    // 3. Limpar contentQueue PUBLISHED antigos (60 dias)
    const publishedItems = await ctx.db
      .query("contentQueue")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", "default").eq("status", "published")
      )
      .collect();
    for (const item of publishedItems) {
      if (item.createdAt < now - sixtyDaysMs) {
        await ctx.db.delete(item._id);
        totalDeleted++;
      }
    }

    // 4. Limpar cronJobs antigos (30 dias)
    const oldJobs = await ctx.db
      .query("cronJobs")
      .withIndex("by_scheduledAt", (q) => q.lt("scheduledAt", now - thirtyDaysMs))
      .order("asc")
      .take(100);
    for (const job of oldJobs) {
      await ctx.db.delete(job._id);
      totalDeleted++;
    }

    // Log final
    await ctx.db.insert("logs", {
      action: "maintenance_full_cleanup",
      details: `Manutenção completa: ${totalDeleted} registros removidos`,
      level: "info",
      source: "cron_runner",
      success: true,
      timestamp: new Date().toISOString(),
    });

    return { totalDeleted, message: `Manutenção concluída: ${totalDeleted} registros limpos` };
  },
});
