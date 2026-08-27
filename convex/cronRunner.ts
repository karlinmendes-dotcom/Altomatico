import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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

    // Buscar todas as conexões ativas com nicho configurado
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_userId", (q) => q.eq("userId", "default"))
      .collect();

    const activeChannels = connections.filter(
      (c) => c.isActive && c.niche
    );

    if (activeChannels.length === 0) {
      await ctx.db.insert("logs", {
        action: "cron_daily_run",
        details: "Nenhum canal ativo com nicho configurado",
        level: "info",
        source: "cron_runner",
        success: true,
        timestamp: new Date().toISOString(),
      });
      return { processed: 0, message: "Nenhum canal ativo" };
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
        // Gerar conteúdo via IA
        const contentType = channel.platform === "youtube" ? "long_video" : channel.platform === "instagram" ? "reel" : "short";

        await ctx.db.insert("contentQueue", {
          userId: "default",
          title: `Conteúdo automático — ${channel.niche}`,
          description: `Gerado pelo cron diário para ${channel.platform}`,
          platform: channel.platform as "youtube" | "instagram" | "tiktok",
          contentType: contentType as "short" | "reel" | "long_video",
          source: channel.mode === "URL_CLIPS" ? "youtube_cut" : "ai_generated",
          aiPrompt: channel.systemPrompt || `Nicho: ${channel.niche}`,
          status: "draft", // SEMPRE como rascunho
          retryCount: 0,
          createdAt: now,
          updatedAt: now,
        });

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
