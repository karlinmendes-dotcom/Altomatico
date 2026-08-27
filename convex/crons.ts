import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ═══════════════════════════════════════════════════════════════
// CRON JOBS — Agendamento diário de geração de conteúdo
// ═══════════════════════════════════════════════════════════════

// ─── Geração diária de conteúdo ──────────────────────────────
// Roda todo dia às 06:00 UTC (03:00 horário de Brasília)
// Para cada canal ativo com nicho configurado, gera conteúdo como DRAFT
crons.interval(
  "daily-content-generation",
  { hours: 24 },
  internal.cronRunner.runDailyContentGeneration
);

// ─── Verificação de tokens expirados ─────────────────────────
// Roda a cada 6 horas para verificar e alertar sobre tokens próximos ao vencimento
crons.interval(
  "token-expiry-check",
  { hours: 6 },
  internal.cronRunner.checkExpiredTokens
);

export default crons;
