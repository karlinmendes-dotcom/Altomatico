import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// INSTAGRAM ENGINE — 3 Agentes Gemini
// Pipeline: Estrategista → Copywriter → Publicador
// ═══════════════════════════════════════════════════════════════

// ─── AGENTE 1: ESTRATEGISTA DE CONTEÚDO E MARCA ──────────────

export const agent1_estrategista = action({
  args: {
    brandName: v.optional(v.string()),
    niche: v.string(),
    targetAudience: v.string(),
    brandTone: v.optional(v.string()),
    brandColors: v.optional(v.string()),
    brandKeywords: v.optional(v.array(v.string())),
    weekCount: v.optional(v.number()), // quantas semanas gerar
    contentCount: v.optional(v.number()), // quantos conteúdos por semana
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const weekCount = args.weekCount || 1;
    const contentCount = args.contentCount || 5;

    const prompt = `Atue como DIRETOR DE CRIAÇÃO e ESTRATEGISTA DE CONTEÚDO especialista em Instagram.

CONTEXTO DA MARCA:
- Nome da marca: ${args.brandName || "Marca não especificada"}
- Nicho: ${args.niche}
- Público-alvo: ${args.targetAudience}
- Tom de voz: ${args.brandTone || "profissional e engajante"}
- Cores/Identidade visual: ${args.brandColors || "A definir"}
- Palavras-chave da marca: ${args.brandKeywords?.join(", ") || "Nenhuma definida"}

SUA TAREFA:
Crie um calendário editorial com ${contentCount} ideias de conteúdo para ${weekCount} semana(s).
Para cada item, forneça:

1. **Tipo**: Reel, Post, Carousel, ou Story
2. **Gancho**: Frase dos primeiros 3 segundos (para Reels) ou primeira linha (para Posts)
3. **Roteiro cena a cena** (para Reels) ou **texto de cada slide** (para Carousel)
4. **Conceito visual**: Descrição do que deve aparecer na tela
5. **Duração sugerida**
6. **Melhor horário para postar**
7. **Objetivo**: Engajar, Converter, Educativo, Entreter
8. **Ângulo criativo**: Por que esse conteúdo funciona

IMPORTANTE:
- Tudo em português brasileiro
- Respeite a identidade da marca
- Varie os formatos (não faça tudo igual)
- Cada conteúdo deve ter um objetivo claro
- Use linguagem natural, sem parecer robô

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "calendar": [
    {
      "week": 1,
      "day": "Segunda",
      "type": "reel|post|carousel|story",
      "title": "título curto do conteúdo",
      "hook": "gancho dos primeiros 3 segundos ou primeira linha",
      "script": "roteiro cena a cena (reels) ou texto por slide (carousel)",
      "visualConcept": "conceito visual descritivo",
      "duration": "15s, 30s, 60s, ou N/A",
      "bestTime": "horário sugerido",
      "objective": "engajar|converter|educar|entreter",
      "creativeAngle": "por que esse conteúdo funciona",
      "estimatedReach": "baixo|médio|alto"
    }
  ],
  "brandGuidelines": {
    "visualStyle": "estilo visual consistente",
    "colorPalette": "paleta de cores sugerida",
    "typography": "tipografia recomendada",
    "emojiStyle": "estilo de emojis"
  },
  "weeklyStrategy": "resumo da estratégia da semana"
}`;

    const result = await callGemini(apiKey, prompt, 4096);
    return parseJSON(result, {
      calendar: [],
      brandGuidelines: { visualStyle: "", colorPalette: "", typography: "", emojiStyle: "" },
      weeklyStrategy: "Estratégia automática",
    });
  },
});

// ─── AGENTE 2: COPYWRITER & ESPECIALISTA EM SEO SOCIAL ────────

export const agent2_copywriter = action({
  args: {
    contentIdea: v.string(), // JSON string do calendário (item individual)
    brandTone: v.optional(v.string()),
    brandName: v.optional(v.string()),
    niche: v.optional(v.string()),
    platform: v.optional(v.string()), // feed, reels, stories
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = `Atue como COPYWRITER SÊNIOR de Redes Sociais especializado em Instagram.

CONTEXTO:
- Marca: ${args.brandName || "Marca"}
- Nicho: ${args.niche || "Geral"}
- Tom de voz: ${args.brandTone || "profissional e engajante"}
- Tipo de conteúdo: ${args.platform || "feed"}

IDEIA DO CONTEÚDO:
${args.contentIdea}

SUA TAREFA:
Escreva uma LEGENDA COMPLETA para Instagram que respeite rigorosamente o tom de voz da marca.

A legenda deve conter:

1. **PRIMEIRA LINHA** altamente chamativa (quebra de padrão, gancho forte)
   - Essa linha aparece antes do "ver mais" — ela precisa prender
   - Não comece com emoji
   - Use curiosidade, impacto ou provocação

2. **CORPO DO TEXTO** fluido com:
   - Parágrafos curtos (máximo 2-3 linhas cada)
   - Quebras de linha naturais
   - Emojis de forma estratégica (não excessiva)
   - Linguagem conversacional e acessível
   - Valor real para o leitor

3. **CHAMADA PARA AÇÃO (CTA)** focada em:
   - Conversão (comprar, cadastrar, baixar)
   - Engajamento (comentar, salvar, compartilhar)
   - Deve ser clara e direta

4. **BLOCO DE HASHTAGS** (8 a 12):
   - Mistura de hashtags broad, medium e niche
   - Todas relevantes ao conteúdo
   - Sem spam
   - Sem hashtags proibidas

REGRAS:
- Máximo 2200 caracteres na legenda
- Hashtags no final (não no meio do texto)
- 1 CTA claro por post
- Emojis que combinam com o nicho
- Não use jargão técnico desnecessário
- Tudo em português brasileiro

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "caption": "legenda completa formatada com emojis e quebras de linha",
  "firstLine": "primeira frase chamativa (aparece antes do ver mais)",
  "cta": "chamada para ação",
  "hashtags": ["#tag1", "#tag2", ...],
  "altText": "texto alternativo para acessibilidade",
  "bestPostingTime": "melhor horário para postar",
  "estimatedEngagement": "alto|médio|baixo",
  "contentNotes": "notas adicionais sobre o conteúdo"
}`;

    const result = await callGemini(apiKey, prompt, 2048);
    return parseJSON(result, {
      caption: "",
      firstLine: "",
      cta: "",
      hashtags: [],
      altText: "",
      bestPostingTime: "12:00",
      estimatedEngagement: "médio",
      contentNotes: "",
    });
  },
});

// ─── AGENTE 3: PUBLICADOR & ENGENHEIRO DE AUTOMAÇÃO ───────────

export const agent3_publicador = action({
  args: {
    caption: v.string(),
    hashtags: v.array(v.string()),
    contentType: v.string(), // "reel", "post", "carousel", "story"
    scheduledFor: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    altText: v.optional(v.string()),
    locationName: v.optional(v.string()),
    brandName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    // Validar legenda
    const captionLength = args.caption.length;
    const hashtagsString = args.hashtags.join(" ");
    const totalLength = captionLength + hashtagsString.length + 2;

    const validation: {
      captionValid: boolean;
      captionLength: number;
      hashtagsCount: number;
      totalLength: number;
      withinLimits: boolean;
      warnings: string[];
    } = {
      captionValid: true,
      captionLength,
      hashtagsCount: args.hashtags.length,
      totalLength,
      withinLimits: totalLength <= 2200,
      warnings: [],
    };

    if (captionLength > 2200) {
      validation.warnings.push(`Legenda excede 2200 caracteres (${captionLength})`);
    }
    if (args.hashtags.length > 30) {
      validation.warnings.push(`Muitas hashtags (${args.hashtags.length}). Máximo recomendado: 30`);
    }

    // Gerar payload para Instagram Graph API
    const payload: Record<string, unknown> = {
      caption: args.caption + "\n\n" + hashtagsString,
      media_type: args.contentType === "carousel" ? "CAROUSEL_ALBUM" : args.contentType === "reel" ? "REELS" : "IMAGE",
    };

    if (args.altText) {
      payload.accessibility_caption = args.altText;
    }

    if (args.locationName) {
      payload.location = args.locationName;
    }

    if (args.scheduledFor) {
      payload.scheduled_publish_time = new Date(args.scheduledFor).getTime() / 1000;
    }

    // Gerar instruções de publicação
    const prompt = `Atue como ENGENHEIRO DE AUTOMAÇÃO DE MÍDIAS SOCIAIS.

Marque: ${args.brandName || "Marca"}
Tipo de conteúdo: ${args.contentType}
Legenda pronta: ${args.caption.slice(0, 200)}...
Hashtags: ${args.hashtags.join(", ")}
${args.scheduledFor ? `Agendamento: ${args.scheduledFor}` : "Publicação: Imediata"}

Gere as INSTRUÇÕES DE PUBLICAÇÃO em formato JSON:
{
  "instagramApiEndpoint": "endpoint correto do Instagram Graph API",
  "httpMethod": "POST",
  "requiredFields": ["campo1", "campo2"],
  "publishingSteps": ["passo1", "passo2", "passo3"],
  "automationNotes": "notas sobre automação",
  "fallbackAction": "o fazer se a API falhar"
}`;

    const apiInstructions = await callGemini(apiKey, prompt, 1024);
    const parsedInstructions = parseJSON(apiInstructions, {
      instagramApiEndpoint: "https://graph.facebook.com/v18.0/{media-id}/publish",
      httpMethod: "POST",
      requiredFields: ["caption", "media_type"],
      publishingSteps: [],
      automationNotes: "",
      fallbackAction: "Retry em 5 minutos",
    });

    return {
      validation,
      payload,
      apiInstructions: parsedInstructions,
      ready: validation.withinLimits,
      message: validation.withinLimits
        ? "Conteúdo pronto para publicação!"
        : "Legenda muito longa. Revise antes de publicar.",
    };
  },
});

// ─── PIPELINE COMPLETO — Executa os 3 agentes em sequência ───

export const fullInstagramPipeline = action({
  args: {
    niche: v.string(),
    targetAudience: v.string(),
    brandName: v.optional(v.string()),
    brandTone: v.optional(v.string()),
    brandColors: v.optional(v.string()),
    brandKeywords: v.optional(v.array(v.string())),
    contentCount: v.optional(v.number()),
    autoGenerate: v.optional(v.boolean()), // gerar conteúdo completo automaticamente
  },
  handler: async (ctx, args) => {
    const results = {
      step1_calendar: null as unknown,
      step2_caption: null as unknown,
      step3_publish: null as unknown,
      errors: [] as string[],
    };

    // AGENTE 1: Estrategista
    try {
      const { agent1_estrategista } = await import("./instagramEngine");
      // Nota: não podemos chamar action de dentro de action diretamente
      // Vamos retornar as instruções para o frontend sequenciar
    } catch (e) {
      results.errors.push(`Erro no Agente 1: ${e}`);
    }

    return {
      instructions: {
        agent1: "Chame instagramEngine.agent1_estrategista com os dados da marca",
        agent2: "Chame instagramEngine.agent2_copywriter com cada item do calendário",
        agent3: "Chame instagramEngine.agent3_publicador com a legenda e hashtags geradas",
      },
      note: "Para executar o pipeline completo, o frontend deve chamar cada agente em sequência.",
    };
  },
});

// ─── Funções auxiliares ──────────────────────────────────────

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
    throw new Error(`Erro na API Gemini: ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini retornou resposta vazia");
  return text;
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}
