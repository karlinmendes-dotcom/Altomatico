import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// AI ENGINE — Cérebro central do Altomatico
// Research Engine + Strategy Engine + Script Engine
// ═══════════════════════════════════════════════════════════════

// ─── Research Engine ──────────────────────────────────────────

export const researchTopic = action({
  args: {
    topic: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi")),
    niche: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = `Você é um pesquisador de conteúdo digital sênior.

Pesquise profundamente o tema: "${args.topic}"
Plataforma: ${args.platform}
${args.niche ? `Nicho: ${args.niche}` : ""}
Idioma: ${args.language || "português"}

TAREFAS:
1. Identifique tendências atuais relacionadas a esse tema
2. Encontre oportunidades de conteúdo (lacunas no mercado)
3. Analise concorrentes e o que eles estão fazendo
4. Identifique perguntas frequentes do público
5. Sugira ângulos inexplorados
6. Avalie o potencial de viralização (sem promessas)
7. Identifique oportunidades para Shorts/Reels

DIFERENCIE CLARAMENTE:
- FATO (informação verificada)
- TENDÊNCIA (padrão observado)
- OPORTUNIDADE (lacuna identificada)
- HIPÓTESE (suposição fundamentada)

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "topic": "tema analisado",
  "trends": [
    {"trend": "nome da tendência", "relevance": 0-100, "type": "trend|opportunity|gap"}
  ],
  "audienceQuestions": ["pergunta1", "pergunta2", ...],
  "competitorAnalysis": {
    "whatTheyDo": ["o que concorrentes fazem"],
    "gaps": ["lacunas identificadas"],
    "opportunities": ["oportunidades para se destacar"]
  },
  "angles": [
    {"angle": "ângulo 1", "potential": 0-100, "difficulty": "easy|medium|hard"},
    {"angle": "ângulo 2", "potential": 0-100, "difficulty": "easy|medium|hard"},
    {"angle": "ângulo 3", "potential": 0-100, "difficulty": "easy|medium|hard"}
  ],
  "shortsOpportunities": ["oportunidade1", "oportunidade2"],
  "confidence": 0.85,
  "summary": "resumo executivo da pesquisa"
}`;

    const result = await callGemini(apiKey, prompt, 4096);
    return parseJSON(result, {
      topic: args.topic,
      trends: [],
      audienceQuestions: [],
      competitorAnalysis: { whatTheyDo: [], gaps: [], opportunities: [] },
      angles: [],
      shortsOpportunities: [],
      confidence: 0.5,
      summary: "Pesquisa automática",
    });
  },
});

// ─── Strategy Engine ──────────────────────────────────────────

export const createStrategy = action({
  args: {
    topic: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi")),
    researchData: v.optional(v.string()), // JSON string da pesquisa
    brandNiche: v.optional(v.string()),
    brandTone: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    objective: v.optional(v.string()), // "educar", "entreter", "converter", "engajar"
    automationMode: v.optional(v.union(
      v.literal("manual"),
      v.literal("semi"),
      v.literal("automatic")
    )),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = `Você é um estrategista de conteúdo digital profissional.

Crie uma estratégia completa para o conteúdo sobre: "${args.topic}"

CONTEXTO:
- Plataforma: ${args.platform}
- Nicho: ${args.brandNiche || "geral"}
- Tom de voz: ${args.brandTone || "profissional e engajante"}
- Público-alvo: ${args.targetAudience || "público geral interessado no tema"}
- Objetivo: ${args.objective || "engajar e educar"}
${args.researchData ? `\nDados da pesquisa:\n${args.researchData}` : ""}

Para cada ideia, gere MÚLTIPLOS ÂNGULOS:

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "strategy": {
    "mainAngle": "ângulo principal escolhido",
    "whyChosen": "por que este ângulo foi escolhido",
    "targetAudience": "público-alvo detalhado",
    "contentObjective": "objetivo principal",
    "emotion": "emoção que queremos despertar"
  },
  "ideas": [
    {
      "title": "título da ideia",
      "angle": "ângulo abordado",
      "hook": "gancho dos primeiros 3 segundos",
      "promise": "o que o conteúdo promete",
      "format": "long|short|reel|carousel|story",
      "duration": "duração sugerida",
      "difficulty": "easy|medium|hard",
      "opportunityScore": 0-100,
      "retentionPotential": "high|medium|low",
      "sharePotential": "high|medium|low"
    }
  ],
  "bestIdea": {
    "title": "melhor ideia selecionada",
    "reason": "por que esta é a melhor"
  },
  "contentPipeline": ["etapa1", "etapa2", "etapa3"],
  "estimatedTime": "tempo estimado de produção",
  "confidence": 0.8
}`;

    const result = await callGemini(apiKey, prompt, 4096);
    return parseJSON(result, {
      strategy: {
        mainAngle: args.topic,
        whyChosen: "Estratégia automática",
        targetAudience: args.targetAudience || "Geral",
        contentObjective: args.objective || "Engajar",
        emotion: "curiosidade",
      },
      ideas: [],
      bestIdea: { title: args.topic, reason: "Tema principal" },
      contentPipeline: ["Pesquisa", "Roteiro", "Produção"],
      estimatedTime: "2 horas",
      confidence: 0.5,
    });
  },
});

// ─── Script Engine ────────────────────────────────────────────

export const generateScript = action({
  args: {
    topic: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi")),
    strategy: v.optional(v.string()), // JSON string da estratégia
    style: v.optional(v.string()), // "educativo", "entretenimento", "storytelling", "tutorial"
    duration: v.optional(v.string()), // "30s", "1min", "3min", "5min", "10min"
    tone: v.optional(v.string()),
    voice: v.optional(v.string()),
    includeChapters: v.optional(v.boolean()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = `Você é um roteirista profissional de conteúdo digital.

Gere um roteiro COMPLETO para ${args.platform} sobre: "${args.topic}"

CONTEXTO:
- Estilo: ${args.style || "educativo e envolvente"}
- Duração alvo: ${args.duration || "3-5 minutos"}
- Tom: ${args.tone || "profissional e acessível"}
${args.strategy ? `\nEstratégia:\n${args.strategy}` : ""}

ESTRUTURA DO ROTEIRO (adapte conforme a plataforma):

Para YOUTUBE (longo):
1. HOOK (0-5s) — Gancho irresistible
2. OPEN LOOP — Crie uma pergunta/expectativa
3. CONTEXTO — Dê contexto ao tema
4. CONTEÚDO PRINCIPAL — Desenvolva o tema
5. PADRÃO DE INTERRUPÇÃO — Quebre a monotonia
6. PAYOFF — Entregue a promessa
7. CTA — Chamada para ação
8. ENCERRAMENTO

Para YOUTUBE SHORT / INSTAGRAM REEL:
1. HOOK (0-3s) — Impacto imediato
2. CONTEÚDO RÁPIDO — Vá direto ao ponto
3. PLOT TWIST ou VALOR — Surpreenda ou entregue
4. CTA RÁPIDO — Ação clara

Para INSTAGRAM POST:
1. PRIMEIRA LINHA — Gancho (aparece antes do "ver mais")
2. CONTEÚDO — Valor com parágrafos curtos
3. CTA — Ação clara
4. HASHTAGS — Relevantes

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título otimizado (máx 60 chars para YouTube)",
  "titleAlternatives": ["título alt 1", "título alt 2", "título alt 3"],
  "script": "roteiro completo formatado com marcações de cena",
  "hook": "primeiros 3-5 segundos",
  "openLoop": "pergunta/expectativa criada",
  "cta": "chamada para ação",
  "chapters": [
    {"time": "0:00", "title": "Abertura"},
    {"time": "0:30", "title": "Conteúdo"},
    {"time": "X:XX", "title": "Conclusão"}
  ],
  "visualNotes": ["nota visual 1", "nota visual 2"],
  "brollSuggestions": ["sugestão de B-roll 1", "sugestão de B-roll 2"],
  "musicMood": "humor da música sugerida",
  "wordCount": 500,
  "estimatedDuration": "3:30",
  "platformAdaptations": {
    "youtube_long": "adaptação para vídeo longo",
    "youtube_short": "adaptação para Short",
    "instagram_reel": "adaptação para Reel",
    "instagram_post": "adaptação para post"
  }
}`;

    const result = await callGemini(apiKey, prompt, 4096);
    return parseJSON(result, {
      title: args.topic,
      titleAlternatives: [],
      script: result,
      hook: "",
      openLoop: "",
      cta: "Inscreva-se e ative o sininho!",
      chapters: [{ time: "0:00", title: "Início" }],
      visualNotes: [],
      brollSuggestions: [],
      musicMood: "inspirador",
      wordCount: 0,
      estimatedDuration: args.duration || "3-5 min",
      platformAdaptations: {},
    });
  },
});

// ─── Trend Score Engine ───────────────────────────────────────

export const calculateTrendScore = action({
  args: {
    topic: v.string(),
    platform: v.string(),
    niche: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = `Você é um analista de tendências de conteúdo digital.

Calcule o "CONTENT OPPORTUNITY SCORE" para o tema: "${args.topic}"
Plataforma: ${args.platform}
${args.niche ? `Nicho: ${args.niche}` : ""}

AVALIE cada componente de 0 a 100:

FÓRMULA CONCEITUAL:
+ Trend Score (tendência atual)
+ Search Opportunity (oportunidade de busca)
+ Audience Relevance (relevância para o público)
+ Novelty (novidade)
+ Content Gap (lacuna no mercado)
+ Retention Potential (potencial de retenção)
+ Share Potential (potencial de compartilhamento)
- Competition (concorrência)
- Policy Risk (risco de política)
- Repetition Risk (risco de repetição)
= SCORE TOTAL

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "topic": "${args.topic}",
  "components": {
    "trendScore": {"value": 0-100, "reason": "explicação"},
    "searchOpportunity": {"value": 0-100, "reason": "explicação"},
    "audienceRelevance": {"value": 0-100, "reason": "explicação"},
    "novelty": {"value": 0-100, "reason": "explicação"},
    "contentGap": {"value": 0-100, "reason": "explicação"},
    "retentionPotential": {"value": 0-100, "reason": "explicação"},
    "sharePotential": {"value": 0-100, "reason": "explicação"},
    "competition": {"value": 0-100, "reason": "explicação"},
    "policyRisk": {"value": 0-100, "reason": "explicação"},
    "repetitionRisk": {"value": 0-100, "reason": "explicação"}
  },
  "totalScore": 0-100,
  "recommendation": "publish|revise|reject",
  "confidence": 0.0-1.0,
  "summary": "resumo da análise"
}`;

    const result = await callGemini(apiKey, prompt, 2048);
    return parseJSON(result, {
      topic: args.topic,
      components: {},
      totalScore: 50,
      recommendation: "revise",
      confidence: 0.5,
      summary: "Análise automática",
    });
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
