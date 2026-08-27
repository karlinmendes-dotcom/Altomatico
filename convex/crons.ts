import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ═══════════════════════════════════════════════════════════════
// CRON JOBS — Agendamento de geração de conteúdo e manutenção
// ═══════════════════════════════════════════════════════════════

// ─── Geração diária de conteúdo ──────────────────────────────
// Roda a cada 24 horas para canais ativos com nicho configurado
crons.interval(
  "daily-content-generation",
  { hours: 24 },
  internal.cronRunner.runDailyContentGeneration
);

// ─── Verificação de tokens expirados ─────────────────────────
// Roda a cada 6 horas para detectar tokens próximos ao vencimento
crons.interval(
  "token-expiry-check",
  { hours: 6 },
  internal.cronRunner.checkExpiredTokens
);

// ─── Limpeza semanal de dados antigos ────────────────────────
// Roda toda segunda-feira — remove logs > 30 dias, contentQueue > 60 dias, cronJobs > 30 dias
crons.weekly(
  "weekly-maintenance-cleanup",
  { dayOfWeek: "monday", hourUTC: 3 },
  internal.cronRunner.runFullMaintenance
);

export default crons;
