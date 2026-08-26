import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// SEO Engine — Gera otimização completa para conteúdo
// ═══════════════════════════════════════════════════════════════

export const generateYouTubeSEO = action({
  args: {
    topic: v.string(),
    description: v.optional(v.string()),
    style: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const prompt = `Você é um especialista em SEO para YouTube.

Analise o tema "${args.topic}" e gere otimização completa para YouTube.

${args.description ? `Descrição adicional: ${args.description}` : ""}
${args.style ? `Estilo: ${args.style}` : ""}

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "titles": [
    "Título principal otimizado (máx 60 chars)",
    "Título alternativo 1",
    "Título alternativo 2",
    "Título alternativo 3"
  ],
  "description": "Descrição completa do YouTube (mín 200 chars) com CTA e hashtags naturais",
  "tags": ["tag1", "tag2", ...],
  "hashtags": ["#tag1", "#tag2", ...],
  "score": 85,
  "explanation": "breve explicação do score de oportunidade"
}

Regras:
- Títulos devem ter até 60 caracteres
- Descrição deve ter entre 200-500 caracteres
- Tags devem ser relevantes e com volume de busca (máximo 15)
- Hashtags devem ser específicas do nicho (máximo 5)
- Score de 0-100 baseado em oportunidade de SEO
- Incluir palavras-chave naturais, sem keyword stuffing`;

    const result = await callGemini(apiKey, prompt, 2048);
    return parseResponse(result, {
      titles: [args.topic],
      description: args.description || "",
      tags: [],
      hashtags: [],
      score: 50,
      explanation: "Análise automática",
    });
  },
});

export const generateInstagramSEO = action({
  args: {
    topic: v.string(),
    niche: v.optional(v.string()),
    postType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const prompt = `Você é um especialista em SEO para Instagram.

Analise o tema "${args.topic}" e gere otimização completa para Instagram.

${args.niche ? `Nicho: ${args.niche}` : ""}
${args.postType ? `Tipo de post: ${args.postType}` : ""}

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "caption": "Legenda otimizada com emojis e CTA (100-300 chars)",
  "hashtags": ["#tag1", "#tag2", ...],
  "altText": "Texto alternativo para acessibilidade",
  "bestTime": "Melhor horário para postar",
  "score": 85,
  "explanation": "breve explicação do score"
}

Regras:
- Legenda deve ter entre 100-300 caracteres
- Hashtags devem ser relevantes e mix de volume (máximo 15)
- Incluir emojis de forma natural
- CTA deve ser claro e direto
- Alt text deve descrever o conteúdo para acessibilidade
- Score de 0-100 baseado em oportunidade`;

    const result = await callGemini(apiKey, prompt, 1024);
    return parseResponse(result, {
      caption: "",
      hashtags: [],
      altText: "",
      bestTime: "12:00",
      score: 50,
      explanation: "Análise automática",
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// Hashtag Engine — Gera hashtags inteligentes por plataforma
// ═══════════════════════════════════════════════════════════════

export const generateHashtags = action({
  args: {
    topic: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram")),
    niche: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const count = args.count || 15;
    const prompt = `Você é um especialista em hashtags para ${args.platform}.

Gere hashtags relevantes para o tema: "${args.topic}"
${args.niche ? `Nicho: ${args.niche}` : ""}

Classifique cada hashtag:
- Broad: alto volume, muita concorrência
- Medium: volume moderado, concorrência média
- Niche: volume baixo, baixa concorrência (melhor para início)
- Branded: específicas da marca/nicho

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "hashtags": [
    {"tag": "#tag1", "category": "broad|medium|niche|branded", "relevance": 0-100}
  ],
  "recommended": ["#tag1", "#tag2", ...],
  "strategy": "Estratégia recomendada de uso"
}

Regras:
- Gerar ${count} hashtags no total
- Mix ideal: 2 broad, 5 medium, 5 niche, 3 branded
- Todas devem ser relevantes ao conteúdo
- Não usar hashtags proibidas ou problemáticas
- Score de relevância de 0-100`;

    const result = await callGemini(apiKey, prompt, 2048);
    return parseResponse(result, {
      hashtags: [],
      recommended: [],
      strategy: "Use mix de hashtags broad, medium e niche",
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// Content DNA — Analisa e gera metadata estratégica
// ═══════════════════════════════════════════════════════════════

export const analyzeContentDNA = action({
  args: {
    content: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const prompt = `Analise o seguinte conteúdo para ${args.platform} e extraia sua "DNA" estratégica:

"${args.content.slice(0, 2000)}"

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "topic": "tema principal",
  "niche": "nicho",
  "angle": "ângulo abordado",
  "hookType": "curiosity|shock|value|story|question",
  "emotion": "emoção predominante",
  "format": "formato do conteúdo",
  "ctaType": "like|comment|share|subscribe|visit|buy",
  "titleStyle": "how-to|list|question|statement|story",
  "confidence": 0.85
}`;

    const result = await callGemini(apiKey, prompt, 1024);
    return parseResponse(result, {
      topic: "",
      niche: "",
      angle: "",
      hookType: "curiosity",
      emotion: "neutral",
      format: "text",
      ctaType: "like",
      titleStyle: "statement",
      confidence: 0.5,
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// Funções auxiliares
// ═══════════════════════════════════════════════════════════════

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: maxTokens,
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
  return text;
}

function parseResponse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}
