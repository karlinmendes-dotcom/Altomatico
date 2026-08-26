import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Originality Engine — Verifica originalidade do conteúdo
// ═══════════════════════════════════════════════════════════════

export const checkOriginality = action({
  args: {
    content: v.string(),
    title: v.string(),
    previousTitles: v.optional(v.array(v.string())),
    previousScripts: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const previousContext = args.previousTitles?.length
      ? `\n\nTítulos anteriores do canal:\n${args.previousTitles.join("\n")}`
      : "";

    const prompt = `Você é um analista de originalidade de conteúdo.

Analise o seguinte conteúdo e avalie sua originalidade:

Título: ${args.title}
Conteúdo: ${args.content.slice(0, 2000)}
${previousContext}

AVALIE:
1. Repetição de estrutura (comparar com títulos anteriores se disponíveis)
2. Repetição de abertura/hook
3. Novidade do ângulo
4. Originalidade do tema
5. Potencial de conteúdo repetitivo

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "originalityScore": número de 0 a 100,
  "structureRepetition": "low|medium|high",
  "hookRepetition": "low|medium|high",
  "angleNovelty": "low|medium|high",
  "themeOriginality": "low|medium|high",
  "repetitiveRisk": "low|medium|high",
  "recommendation": "approve|revise|reject",
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
            temperature: 0.4,
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
        originalityScore: 60,
        structureRepetition: "medium",
        hookRepetition: "medium",
        angleNovelty: "medium",
        themeOriginality: "medium",
        repetitiveRisk: "medium",
        recommendation: "revise",
        reason: "Análise automática - score intermediário",
      };
    }
  },
});
