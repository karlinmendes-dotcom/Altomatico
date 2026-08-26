import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Policy Guardian — Verifica conteúdo antes de publicar
// ═══════════════════════════════════════════════════════════════

export const checkContent = action({
  args: {
    content: v.string(),
    platform: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const prompt = `Você é um auditor de políticas de plataformas digitais.

Analise o seguinte conteúdo para ${args.platform} e verifique:

1. RISCO DE COPYRIGHT: O conteúdo usa material protegido?
2. SPAM: O conteúdo parece spam?
3. CONTEÚDO REUTILIZADO: É muito similar a outros conteúdos?
4. DESINFORMAÇÃO: Contém informações falsas ou enganosas?
5. DIVULGAÇÃO DE IA: Precisa de disclosure de IA?

Conteúdo:
Título: ${args.title || "N/A"}
Descrição: ${args.description || "N/A"}
Texto: ${args.content.slice(0, 2000)}

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "copyrightRisk": "low|medium|high",
  "spamRisk": "low|medium|high",
  "reusedContentRisk": "low|medium|high",
  "misinformationRisk": "low|medium|high",
  "aiDisclosureRequired": true,
  "overallRisk": "low|medium|high",
  "approved": true ou false,
  "reason": "breve explicação"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro Gemini: ${err}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini retornou resposta vazia");

    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        copyrightRisk: "medium",
        spamRisk: "low",
        reusedContentRisk: "medium",
        misinformationRisk: "low",
        aiDisclosureRequired: true,
        overallRisk: "medium",
        approved: true,
        reason: "Análise automática - revisão manual recomendada",
      };
    }
  },
});
