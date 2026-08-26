import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// VIDEO PIPELINE — Conecta tudo: Gemini + Pixabay + Publicação
// Pipeline completo de criação de conteúdo
// ═══════════════════════════════════════════════════════════════

// ─── PIPELINE COMPLETO: Criar Vídeo do Zero ──────────────────

export const createVideoPipeline = action({
  args: {
    topic: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi")),
    channelName: v.optional(v.string()),
    channelNiche: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    videoStyle: v.optional(v.string()), // "short", "long", "reel", "story"
    voiceLanguage: v.optional(v.string()), // "pt-BR", "en-US"
    tone: v.optional(v.string()),
    autoPublish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const pixabayKey = process.env.PIXABAY_API_KEY;

    if (!geminiKey) throw new Error("GEMINI_API_KEY não configurada");
    if (!pixabayKey) throw new Error("PIXABAY_API_KEY não configurada");

    const results: Record<string, unknown> = {
      step: "init",
      topic: args.topic,
      platform: args.platform,
      materials: null,
      script: null,
      seo: null,
      voiceConfig: null,
      videoConfig: null,
      publishPayload: null,
      errors: [],
    };

    // ═══ PASSO 1: PESQUISA + ESTRATÉGIA ═══
    results.step = "research";
    try {
      const researchPrompt = `Atue como PESQUISADOR DE CONTEÚDO DIGITAL.

Analise o tema: "${args.topic}"
Plataforma: ${args.platform}
Nicho: ${args.channelNiche || "geral"}

Gere uma pesquisa rápida com:
1. Tendências atuais relacionadas
2. Melhor ângulo para o conteúdo
3. Palavras-chave principais
4. Materiais visuais sugeridos (o que deve aparecer no vídeo)
5. Melhor formato para a plataforma

Responda em JSON:
{
  "bestAngle": "melhor ângulo",
  "keywords": ["palavra1", "palavra2"],
  "visualSuggestions": ["sugestão1", "sugestão2"],
  "bestFormat": "short|long|reel",
  "trendingScore": 85
}`;

      const researchResult = await callGemini(geminiKey, researchPrompt, 1024);
      results.script = parseJSON(researchResult, { bestAngle: args.topic, keywords: [], visualSuggestions: [] });
    } catch (e) {
      (results.errors as string[]).push(`Pesquisa: ${e}`);
    }

    // ═══ PASSO 2: ROTEIRO COMPLETO ═══
    results.step = "script";
    try {
      const scriptPrompt = `Atue como ROTEIRISTA PROFISSIONAL de conteúdo digital.

TEMA: "${args.topic}"
PLATAFORMA: ${args.platform}
FORMATO: ${args.videoStyle || "short"}
TOM: ${args.tone || "profissional e engajante"}
IDIOMA: ${args.voiceLanguage || "pt-BR"}

Crie um roteiro COMPLETO para narração:

1. **HOOK** (0-3 segundos): Gancho irresistível
2. **DESENVOLVIMENTO**: Conteúdo principal com fatos/valores
3. **CONCLUSão**: Resumo + CTA
4. **MATERIAL VISUAL**: O que deve aparecer na tela em cada momento

O roteiro deve ser:
- Falado, não lido (linguagem natural)
- Curto e direto (ideal para TTS)
- Com marcações de tempo

Responda em JSON:
{
  "title": "título otimizado",
  "narrationScript": "roteiro completo para narração",
  "hook": "gancho dos primeiros 3 segundos",
  "cta": "chamada para ação",
  "visualTimeline": [
    {"time": "0:00-0:03", "visual": "o que aparece", "text": "texto na tela"}
  ],
  "estimatedDuration": "30s",
  "musicMood": "inspirador|energético|calmo|tenso"
}`;

      const scriptResult = await callGemini(geminiKey, scriptPrompt, 2048);
      results.script = parseJSON(scriptResult, { title: args.topic, narrationScript: "", hook: "", visualTimeline: [] });
    } catch (e) {
      (results.errors as string[]).push(`Roteiro: ${e}`);
    }

    // ═══ PASSO 3: BUSCAR MATERIAIS NO PIXABAY ═══
    results.step = "materials";
    try {
      const scriptData = results.script as Record<string, unknown>;
      const visualTimeline = (scriptData?.visualTimeline as Array<{ visual: string }>) || [];
      const searchTerms = visualTimeline.length > 0
        ? visualTimeline.map(v => v.visual).join(" ")
        : args.topic;

      // Buscar vídeos
      const videoParams = new URLSearchParams({
        key: pixabayKey,
        q: searchTerms.slice(0, 100),
        video_type: "all",
        per_page: "5",
        safesearch: "true",
      });

      const imageParams = new URLSearchParams({
        key: pixabayKey,
        q: searchTerms.slice(0, 100),
        image_type: "photo",
        orientation: args.platform === "instagram" ? "vertical" : "horizontal",
        per_page: "5",
        safesearch: "true",
      });

      const [videoRes, imageRes] = await Promise.all([
        fetch(`https://pixabay.com/api/videos/?${videoParams}`),
        fetch(`https://pixabay.com/api/?${imageParams}`),
      ]);

      const videoData = videoRes.ok ? await videoRes.json() : { hits: [] };
      const imageData = imageRes.ok ? await imageRes.json() : { hits: [] };

      results.materials = {
        videos: (videoData.hits || []).slice(0, 3).map((hit: Record<string, unknown>) => ({
          id: hit.id,
          url: (hit.videos as Record<string, Record<string, string>>)?.medium?.url || "",
          duration: hit.duration,
          tags: hit.tags,
        })),
        images: (imageData.hits || []).slice(0, 5).map((hit: Record<string, unknown>) => ({
          id: hit.id,
          url: hit.largeImageURL || hit.webformatURL,
          tags: hit.tags,
        })),
        totalFound: (videoData.totalHits || 0) + (imageData.totalHits || 0),
      };
    } catch (e) {
      (results.errors as string[]).push(`Materiais: ${e}`);
    }

    // ═══ PASSO 4: SEO + METADADOS ═══
    results.step = "seo";
    try {
      const scriptData = results.script as Record<string, unknown>;
      const seoPrompt = `Atue como ESPECIALISTA EM SEO para ${args.platform}.

CONTEÚDO:
- Título: ${scriptData?.title || args.topic}
- Roteiro: ${(scriptData?.narrationScript as string || "").slice(0, 500)}
- Nicho: ${args.channelNiche || "geral"}

Gere metadados otimizados:

Responda em JSON:
{
  "titles": {
    "main": "título principal (até 60 chars)",
    "alt1": "título alternativo 1",
    "alt2": "título alternativo 2"
  },
  "description": "descrição completa com CTA e hashtags",
  "tags": ["tag1", "tag2"],
  "hashtags": ["#tag1", "#tag2"],
  "seoScore": 85
}`;

      const seoResult = await callGemini(geminiKey, seoPrompt, 1024);
      results.seo = parseJSON(seoResult, { titles: { main: args.topic }, description: "", tags: [], hashtags: [] });
    } catch (e) {
      (results.errors as string[]).push(`SEO: ${e}`);
    }

    // ═══ PASSO 5: CONFIGURAÇÃO DE VOZ ═══
    results.step = "voice";
    results.voiceConfig = {
      language: args.voiceLanguage || "pt-BR",
      voice: args.voiceLanguage?.startsWith("pt") ? "pt-BR-AntonioNeural" : "en-US-GuyNeural",
      rate: "+0%",
      pitch: "+0Hz",
      volume: "+0%",
      provider: "edge-tts",
      note: "Edge TTS é gratuito. Execute localmente com: edge-tts --voice pt-BR-AntonioNeural --text 'texto' --write-media output.mp3",
    };

    // ═══ PASSO 6: CONFIGURAÇÃO DO VÍDEO ═══
    results.step = "video-config";
    const isShort = args.videoStyle === "short" || args.videoStyle === "reel";
    results.videoConfig = {
      format: isShort ? "vertical (9:16)" : "horizontal (16:9)",
      resolution: isShort ? "1080x1920" : "1920x1080",
      fps: 30,
      codec: "h264",
      tools: ["FFmpeg", "MoviePy", "Python"],
      renderCommand: isShort
        ? "python render_video.py --input script.json --output video.mp4 --format short"
        : "python render_video.py --input script.json --output video.mp4 --format long",
      note: "Use o motor Python existente (/youtube) para renderizar o vídeo com FFmpeg",
    };

    // ═══ PASSO 7: PAYLOAD DE PUBLICAÇÃO ═══
    results.step = "publish";
    const scriptData = results.script as Record<string, unknown>;
    const seoData = results.seo as Record<string, unknown>;

    if (args.platform === "youtube" || args.platform === "multi") {
      results.publishPayload = {
        youtube: {
          title: (seoData?.titles as Record<string, string>)?.main || scriptData?.title || args.topic,
          description: seoData?.description || "",
          tags: seoData?.tags || [],
          categoryId: "22",
          privacyStatus: "private",
          language: "pt-BR",
        },
        instagram: args.platform === "multi" ? {
          caption: seoData?.description || "",
          hashtags: seoData?.hashtags || [],
          mediaType: isShort ? "REELS" : "IMAGE",
        } : null,
      };
    } else {
      results.publishPayload = {
        instagram: {
          caption: seoData?.description || "",
          hashtags: seoData?.hashtags || [],
          mediaType: isShort ? "REELS" : "IMAGE",
        },
      };
    }

    results.step = "complete";
    results.message = "Pipeline completo! Todos os materiais gerados.";
    results.summary = {
      title: (scriptData?.title as string) || args.topic,
      materialsFound: ((results.materials as Record<string, unknown>)?.totalFound as number) || 0,
      seoScore: (results.seo as Record<string, unknown>)?.seoScore || 0,
      estimatedDuration: scriptData?.estimatedDuration || "30s",
      nextStep: "Execute o render com FFmpeg/MoviePy usando os materiais gerados",
    };

    return results;
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
    throw new Error(`Erro Gemini: ${err}`);
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
