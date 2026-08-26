import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// YOUTUBE AUTOMATION — 3 Agentes Gemini
// Pipeline: Decupagem → Roteiro/Narração → SEO/Publicador
// ═══════════════════════════════════════════════════════════════

// ─── AGENTE 1: ANALISTA DE CORTES E DECUPAGEM ────────────────

export const agent1_decupador = action({
  args: {
    videoTranscription: v.optional(v.string()), // transcrição do vídeo longo
    topic: v.string(), // tema se não tiver transcrição
    channelNiche: v.optional(v.string()),
    channelName: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    numberOfClips: v.optional(v.number()),
    clipDuration: v.optional(v.string()), // "30s", "60s", "90s"
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const clipCount = args.numberOfClips || 3;
    const clipDuration = args.clipDuration || "30-60 segundos";

    const transcriptionContext = args.videoTranscription
      ? `\nTRANSCRIÇÃO DO VÍDEO ORIGINAL:\n${args.videoTranscription.slice(0, 8000)}`
      : "";

    const prompt = `Atue como EDITOR DE CONTEÚDO e ESPECIALISTA EM ENGAJAMENTO no YouTube.

CONTEXTO:
- Canal: ${args.channelName || "Canal não especificado"}
- Nicho: ${args.channelNiche || "Geral"}
- Público-alvo: ${args.targetAudience || "Público geral"}
- Tema: ${args.topic}
- Duração desejada dos cortes: ${clipDuration}
${transcriptionContext}

SUA TAREFA:
${args.videoTranscription
  ? `Analise a transcrição acima e identifique os ${clipCount} MELHORES trechos com maior potencial de viralização.`
  : `Crie ${clipCount} ideias de Shorts virais sobre o tema "${args.topic}" com potencial de viralização.`
}

Para cada trecho/ideia, forneça:

1. **Timestamp** (se aplicável): Início e fim exato
2. **Título chamativo**: Até 60 caracteres (estilo clickbait ético)
3. **Gancho**: Frase dos primeiros 3 segundos que prende
4. **Resumo do conteúdo**: O que será falado/mostrado
5. **Motivo da escolha**: Por que esse trecho tem potencial
6. **Emoção alvo**: Curiosidade, impacto, risada, inspiração, urgência
7. **Formato sugerido**: Vertical (Short) ou Horizontal (normal)
8. **Potencial de viralização**: 1-10
9. **Público que vai engajar**: Descrição demográfica

IMPORTANTE:
- Priorize trechos com EMOCÃO forte
- O gancho precisa ser irresistível (curiosidade ou impacto)
- Considere o algoritmo do YouTube (retenção nos primeiros 3s)
- Tudo em português brasileiro

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "clips": [
    {
      "number": 1,
      "timestamp": {"start": "0:00", "end": "0:45"},
      "title": "título chamativo do Short",
      "hook": "frase dos primeiros 3 segundos",
      "summary": "resumo do conteúdo",
      "reason": "motivo da escolha",
      "targetEmotion": "curiosidade|impacto|risada|inspiração|urgência",
      "format": "vertical|horizontal",
      "viralPotential": 8,
      "targetAudience": "descrição do público",
      "suggestedMusic": "estilo de música de fundo",
      "suggestedThumbnail": "conceito da thumbnail"
    }
  ],
  "overallStrategy": "estratégia geral para esses cortes",
  "bestClip": 1,
  "postingSchedule": {
    "bestDay": "melhor dia da semana",
    "bestTime": "melhor horário",
    "frequency": "frequência de postagem sugerida"
  }
}`;

    const result = await callGemini(apiKey, prompt, 4096);
    return parseJSON(result, {
      clips: [],
      overallStrategy: "Estratégia automática",
      bestClip: 1,
      postingSchedule: { bestDay: "Sexta", bestTime: "18:00", frequency: "3x por semana" },
    });
  },
});

// ─── AGENTE 2: ROTEIRISTA, NARRADOR E DIRETOR SONORO ─────────

export const agent2_roteirista = action({
  args: {
    clipData: v.string(), // JSON string do clip selecionado (agent1)
    brandName: v.optional(v.string()),
    brandTone: v.optional(v.string()),
    voiceStyle: v.optional(v.string()), // "masculina_profissional", "feminina_casual", etc
    musicStyle: v.optional(v.string()),
    includeSubtitles: v.optional(v.boolean()),
    videoDuration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = `Atue como DIRETOR DE ÁUDIO, ROTEIRISTA e DIRETOR SONORO do YouTube.

CONTEXTO:
- Marca: ${args.brandName || "Marca"}
- Tom de voz: ${args.brandTone || "profissional e envolvente"}
- Estilo de narração: ${args.voiceStyle || "masculina profissional"}
- Estilo de música: ${args.musicStyle || "Lo-fi inspirador"}
- Duração alvo: ${args.videoDuration || "30-60 segundos"}

DADOS DO CLIP SELECIONADO:
${args.clipData}

SUA TAREFA:
Crie o ROTEIRO COMPLETO para narração com IA (ElevenLabs/TTS), ajustando:

1. **ROTEIRO PARA NARRAÇÃO**:
   - Reescreva o texto para ficar PERFEITO em narração de IA
   - Ajuste pontuação (pausas curtas com vírgulas, pausas longas com pontos)
   - Use frases curtas e diretas
   - Ritmo acelerado para Short, moderado para vídeo longo
   - Evite palavras difíceis de pronunciar

2. **DIREÇÃO DE ÁUDIO**:
   - Estilo da música de fundo
   - Volume da música: -22dB (referência)
   - Volume da voz: 0dB (referência)
   - Efeitos sonoros sugeridos (se aplicável)
   - Momentos de silêncio dramático

3. **DIREÇÃO VISUAL**:
   - O que aparece na tela em cada momento
   - Transições sugeridas
   - Texto na tela (se aplicável)
   - Zoom, efeitos visuais

4. **SUBTITULOS** (se solicitado):
   - SRT formatado
   - Palavras destacadas em amarelo
   - Timing preciso

IMPORTANTE:
- O roteiro deve ser falado, não lido
- Use linguagem coloquial brasileira
- Marque pausas com "..."
- Marque ênfases com MAIÚSCULAS
- Tudo em português brasileiro

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "narrationScript": "roteiro completo para narração com marcações de pausa",
  "audioDirection": {
    "musicStyle": "estilo da música de fundo",
    "musicVolume": "-22dB",
    "voiceVolume": "0dB",
    "soundEffects": ["efeito1 no timestamp X", "efeito2 no timestamp Y"],
    "silenceMoments": ["momento de silêncio em X:XX"]
  },
  "visualDirection": [
    {
      "time": "0:00-0:03",
      "visual": "o que aparece na tela",
      "transition": "tipo de transição",
      "text": "texto na tela (se houver)"
    }
  ],
  "subtitles": {
    "enabled": true,
    "style": "palavras em destaque amarelo",
    "srtContent": "1\\n00:00:00,000 --> 00:00:03,000\\nPrimeira frase...\\n"
  },
  "productionNotes": "notas de produção",
  "estimatedFinalDuration": "duração final estimada"
}`;

    const result = await callGemini(apiKey, prompt, 4096);
    return parseJSON(result, {
      narrationScript: "",
      audioDirection: { musicStyle: "", musicVolume: "-22dB", voiceVolume: "0dB", soundEffects: [], silenceMoments: [] },
      visualDirection: [],
      subtitles: { enabled: false, style: "", srtContent: "" },
      productionNotes: "",
      estimatedFinalDuration: "30-60s",
    });
  },
});

// ─── AGENTE 3: PUBLICADOR SEO DO YOUTUBE ─────────────────────

export const agent3_seoUploader = action({
  args: {
    title: v.string(),
    narrationScript: v.string(),
    videoDescription: v.optional(v.string()),
    channelNiche: v.optional(v.string()),
    targetKeywords: v.optional(v.array(v.string())),
    scheduledFor: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"), v.literal("unlisted"))),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor");

    const prompt = `Atue como ESPECIALISTA EM SEO para YouTube e GESTOR DE PUBLICAÇÃO.

CONTEXTO:
- Nicho: ${args.channelNiche || "Geral"}
- Palavras-chave alvo: ${args.targetKeywords?.join(", ") || "Não definidas"}
- Categoria: ${args.category || "Pessoas e Blogs"}

CONTEÚDO:
- Título: ${args.title}
- Roteiro/Narração: ${args.narrationScript.slice(0, 2000)}
${args.videoDescription ? `- Descrição adicional: ${args.videoDescription}` : ""}

SUA TAREFA:
Crie os METADADOS COMPLETOS de publicação otimizados para SEO:

1. **TÍTULO OTIMIZADO** (até 60 caracteres):
   - Palavra-chave principal no início
   - Gerar 3 alternativas para teste A/B
   - Clickbait ético (sem ser enganoso)

2. **DESCRIÇÃO COMPLETA** (até 5000 caracteres):
   - Primeira linha com gancho (aparece nas buscas)
   - Resumo do conteúdo
   - Marcadores de tempo (capítulos)
   - CTA claro
   - Hashtags naturais (3-5)
   - Links sugeridos

3. **TAGS** (até 500 caracteres total):
   - Palavra-chave principal
   - Palavras-chave de cauda longa
   - Tags relacionadas
   - Tags de trending

4. **CAPÍTULOS/TIMESTAMPS**:
   - Para vídeos longos: marque momentos
   - Para Shorts: não usar

5. **CONFIGURAÇÕES DE PUBLICAÇÃO**:
   - Melhor horário
   - Idioma
   - Categoria
   - Visibilidade

IMPORTANTE:
- Tags devem ser relevantes (não spam)
- Descrição deve ser natural para humanos E bots
- Título deve funcionar tanto na busca quanto nas recomendações
- Tudo em português brasileiro

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "titles": {
    "main": "título principal otimizado",
    "alternative1": "título alternativo 1",
    "alternative2": "título alternativo 2"
  },
  "description": "descrição completa formatada para YouTube",
  "tags": ["tag1", "tag2", ...],
  "chapters": [
    {"time": "0:00", "title": "Título do capítulo"}
  ],
  "hashtags": ["#tag1", "#tag2"],
  "settings": {
    "category": "categoria do YouTube",
    "language": "pt-BR",
    "visibility": "public|private|unlisted",
    "bestTime": "melhor horário para publicar",
    "madeForKids": false,
    "commentsEnabled": true
  },
  "seoScore": 85,
  "seoExplanation": "explicação do score de SEO"
}`;

    const result = await callGemini(apiKey, prompt, 4096);
    return parseJSON(result, {
      titles: { main: args.title, alternative1: args.title, alternative2: args.title },
      description: args.videoDescription || "",
      tags: [],
      chapters: [],
      hashtags: [],
      settings: {
        category: "Pessoas e Blogs",
        language: "pt-BR",
        visibility: args.visibility || "private",
        bestTime: "18:00",
        madeForKids: false,
        commentsEnabled: true,
      },
      seoScore: 50,
      seoExplanation: "Análise automática",
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
