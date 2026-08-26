import { v } from "convex/values";
import { action } from "./_generated/server";

// Geração de conteúdo via Gemini — roda no servidor, API key nunca exposta ao frontend
export const generateInstagramPost = action({
  args: {
    topic: v.string(),
    niche: v.optional(v.string()),
    tone: v.optional(v.string()),
    postType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = buildInstagramPrompt(args.topic, args.niche, args.tone, args.postType);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 2048,
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

    return parseInstagramResponse(text);
  },
});

export const generateYouTubeScript = action({
  args: {
    topic: v.string(),
    style: v.optional(v.string()),
    duration: v.optional(v.string()),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = buildYouTubePrompt(args.topic, args.style, args.duration);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 4096,
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

    return parseYouTubeResponse(text);
  },
});

export const generateSEO = action({
  args: {
    topic: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = buildSEOPrompt(args.topic, args.platform);

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
            maxOutputTokens: 2048,
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

    return parseSEOResponse(text);
  },
});

// ─── Prompt Builders ───────────────────────────────────────────────

function buildInstagramPrompt(topic: string, niche?: string, tone?: string, postType?: string): string {
  return `Você é um especialista em marketing de conteúdo para Instagram.

Gere um post completo para Instagram sobre: "${topic}"

${niche ? `Nicho: ${niche}` : ""}
${tone ? `Tom de voz: ${tone}` : "Tom: profissional e engajante"}
${postType ? `Tipo: ${postType}` : "Tipo: post no feed"}

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "caption": "legenda completa do post com emojis",
  "hashtags": ["#tag1", "#tag2", ...],
  "firstLine": "primeira frase chamativa",
  "cta": "chamada para ação"
}

Regras:
- Legenda deve ter entre 100 e 300 caracteres
- Primeira frase deve ser um gancho forte
- Hashtags devem ser relevantes (máximo 15)
- Incluir emojis de forma natural
- CTA deve ser claro e direto`;
}

function buildYouTubePrompt(topic: string, style?: string, duration?: string): string {
  return `Você é um roteirista profissional de YouTube.

Gere um roteiro completo para um vídeo sobre: "${topic}"

${style ? `Estilo: ${style}` : "Estilo: educativo/entretenimento"}
${duration ? `Duração alvo: ${duration}` : "Duração: 3-5 minutos"}

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título chamativo do vídeo (máx 60 chars)",
  "script": "roteiro completo com marcações de cena",
  "hook": "primeiros 5 segundos do vídeo",
  "chapters": [
    {"time": "0:00", "title": "Abertura"},
    {"time": "0:15", "title": "Conteúdo"},
    {"time": "X:XX", "title": "Conclusão"}
  ],
  "tags": ["tag1", "tag2", ...],
  "description": "descrição completa do YouTube"
}

Regras:
- Roteiro deve ser natural e envolvente
- Hook nos primeiros 3 segundos
- Capítulos com timestamps reais
- Tags relevantes (máximo 20)
- Descrição com CTA e links`;
}

function buildSEOPrompt(topic: string, platform: string): string {
  return `Você é um especialista em SEO para ${platform}.

Analise o tema "${topic}" e gere otimização completa.

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "titles": [
    "Título principal otimizado",
    "Título alternativo 1",
    "Título alternativo 2"
  ],
  "keywords": ["palavra-chave1", "palavra-chave2", ...],
  "description": "meta description otimizada",
  "hashtags": ["#tag1", "#tag2", ...],
  "score": 85,
  "explanation": "breve explicação do score"
}

Regras:
- Títulos com até 60 caracteres
- Keywords com volume de busca considerável
- Hashtags relevantes e não spam
- Score de 0-100 baseado em oportunidade`;
}

// ─── Response Parsers ──────────────────────────────────────────────

function parseInstagramResponse(text: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      caption: text.slice(0, 300),
      hashtags: ["#conteudo", "#marketing"],
      firstLine: text.split("\n")[0] || "Novo conteúdo!",
      cta: "Salve e compartilhe!",
    };
  }
}

function parseYouTubeResponse(text: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      title: "Novo Vídeo",
      script: text,
      hook: text.split("\n")[0] || "",
      chapters: [{ time: "0:00", title: "Início" }],
      tags: [],
      description: text.slice(0, 500),
    };
  }
}

function parseSEOResponse(text: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      titles: ["Título Otimizado"],
      keywords: [],
      description: text.slice(0, 160),
      hashtags: [],
      score: 50,
      explanation: "Análise automática",
    };
  }
}
