import { v } from "convex/values";
import { mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Maintenance — Limpeza de dados antigos
// Executado semanalmente pelo cron
// ═══════════════════════════════════════════════════════════════

// ─── Limpar logs antigos (mais de 30 dias) ──────────────────
export const cleanupOldLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now - thirtyDaysMs).toISOString();

    // Buscar logs antigos
    const oldLogs = await ctx.db
      .query("logs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .order("asc")
      .take(100);

    let deleted = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deleted++;
    }

    // Log da manutenção
    if (deleted > 0) {
      await ctx.db.insert("logs", {
        action: "maintenance_cleanup_logs",
        details: `${deleted} logs antigos removidos (mais de 30 dias)`,
        level: "info",
        source: "maintenance",
        success: true,
        timestamp: new Date().toISOString(),
      });
    }

    return { deleted, message: `${deleted} logs removidos` };
  },
});

// ─── Limpar contentQueue antigo (FAILED/PUBLISHED > 60 dias) ─
export const cleanupOldQueueItems = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const cutoff = now - sixtyDaysMs;

    // Buscar itens FAILED antigos
    const failedItems = await ctx.db
      .query("contentQueue")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", "default").eq("status", "failed")
      )
      .collect();

    let deletedFailed = 0;
    for (const item of failedItems) {
      if (item.createdAt < cutoff) {
        await ctx.db.delete(item._id);
        deletedFailed++;
      }
    }

    // Buscar itens published antigos
    const publishedItems = await ctx.db
      .query("contentQueue")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", "default").eq("status", "published")
      )
      .collect();

    let deletedPublished = 0;
    for (const item of publishedItems) {
      if (item.createdAt < cutoff) {
        await ctx.db.delete(item._id);
        deletedPublished++;
      }
    }

    const total = deletedFailed + deletedPublished;

    // Log da manutenção
    if (total > 0) {
      await ctx.db.insert("logs", {
        action: "maintenance_cleanup_queue",
        details: `${deletedFailed} failed + ${deletedPublished} published removidos (mais de 60 dias)`,
        level: "info",
        source: "maintenance",
        success: true,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      deletedFailed,
      deletedPublished,
      total,
      message: `${total} itens da fila removidos`,
    };
  },
});

// ─── Limpar cronJobs antigos (mais de 30 dias) ──────────────
export const cleanupOldCronJobs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoff = now - thirtyDaysMs;

    const oldJobs = await ctx.db
      .query("cronJobs")
      .withIndex("by_scheduledAt", (q) => q.lt("scheduledAt", cutoff))
      .order("asc")
      .take(100);

    let deleted = 0;
    for (const job of oldJobs) {
      await ctx.db.delete(job._id);
      deleted++;
    }

    return { deleted, message: `${deleted} cron jobs antigos removidos` };
  },
});

// ─── Manutenção completa (chama todas as limpezas) ──────────
export const runFullMaintenance = mutation({
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
      source: "maintenance",
      success: true,
      timestamp: new Date().toISOString(),
    });

    return { totalDeleted, message: `Manutenção concluída: ${totalDeleted} registros limpos` };
  },
});
