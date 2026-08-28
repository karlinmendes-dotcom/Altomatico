import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Media Router Engine — Roteador Inteligente de Mídia
// Lê o motor configurado e aciona a pipeline correta
// ═══════════════════════════════════════════════════════════════

type MotorType = "animation_2d" | "url_clips" | "stock_video" | "static_post";

interface ChannelConfig {
  niche: string;
  systemPrompt: string;
  motorType: MotorType;
  platform: "youtube" | "instagram" | "tiktok";
  targetUrl?: string;
  motorConfig?: {
    animationStyle?: string;
    frameRate?: number;
    clipDuration?: number;
    cropMode?: string;
    stockSource?: string;
    ttsVoice?: string;
    imageSize?: string;
    designTemplate?: string;
  };
}

interface RenderResult {
  success: boolean;
  motorType: MotorType;
  videoUrl?: string;
  imageUrl?: string;
  mediaUrl?: string;
  title: string;
  caption: string;
  hashtags: string[];
  script: string;
  narrationText?: string;
  footageUrls?: string[];
  error?: string;
}

// ─── Funções auxiliares ──────────────────────────────────────

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini error: ${await response.text()}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini retornou vazio");
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

async function fetchStockVideos(pixabayKey: string, query: string, count: number = 3): Promise<string[]> {
  const urls: string[] = [];
  try {
    const res = await fetch(
      `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(query.slice(0, 100))}&per_page=${count}&min_width=720`
    );
    const data = await res.json();
    if (data.hits) {
      for (const hit of data.hits) {
        const url = hit.videos?.portrait?.url || hit.videos?.medium?.url || hit.videos?.small?.url || "";
        if (url) urls.push(url);
      }
    }
  } catch (err) {
    console.error("Pixabay error:", err);
  }
  return urls;
}

async function fetchStockImages(pixabayKey: string, query: string, count: number = 3): Promise<string[]> {
  const urls: string[] = [];
  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query.slice(0, 100))}&per_page=${count}&image_type=photo&orientation=vertical`
    );
    const data = await res.json();
    if (data.hits) {
      for (const hit of data.hits) {
        urls.push(hit.largeImageURL || hit.webformatURL || "");
      }
    }
  } catch (err) {
    console.error("Pixabay images error:", err);
  }
  return urls;
}

async function fetchMusic(pixabayKey: string, mood: string): Promise<string> {
  try {
    const res = await fetch(
      `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(mood + " lofi background")}&per_page=1`
    );
    const data = await res.json();
    return data.hits?.[0]?.videos?.small?.url || data.hits?.[0]?.videos?.medium?.url || "";
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════
// MOTOR 1: ANIMAÇÃO 2D / STICK FIGURE
// ═══════════════════════════════════════════════════════════════

async function motorAnimation2D(
  geminiKey: string,
  config: ChannelConfig
): Promise<RenderResult> {
  console.log("🎨 Motor 1: Animação 2D");

  // Gerar roteiro cômico decupado em cenas
  const scriptPrompt = `Você é um roteirista de ANIMAÇÃO 2D / STICK FIGURE para vídeos cômicos.

Nicho: ${config.niche}
${config.systemPrompt ? `Instruções: ${config.systemPrompt}` : ""}

Gere um roteiro CÔMICO para animação 2D, cena a cena.
Cada cena deve ter:
1. Narração (tom cômico, exagerado)
2. Descrição da cena para desenho 2D (ex: "stick figure surpreso com boca aberta")
3. Duração em segundos
4. Expressão facial do personagem

Total: 30-60 segundos. 4-8 cenas.
Estilo: cômico, engraçado, viral.

JSON (sem markdown):
{
  "title": "título cômico (máx 60 chars)",
  "hook": "gancho cômico 3s",
  "scenes": [{
    "narration": "narração cômica",
    "visualDescription": "descrição para stick figure 2D",
    "duration": 5,
    "facialExpression": "surpreso",
    "musicMood": "cômico"
  }],
  "caption": "legenda com emojis",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "totalDuration": 45
}`;

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096);
  const script = parseJSON(scriptText, {
    title: "Animação 2D",
    hook: "",
    scenes: [{ narration: scriptText, visualDescription: "stick figure", duration: 8, musicMood: "cômico" }],
    caption: "",
    hashtags: [],
    totalDuration: 30,
  });

  // Gerar descrições de frames para cada cena
  const frameDescriptions = script.scenes.map((s: { visualDescription: string }) => s.visualDescription);
  const narrationText = script.scenes.map((s: { narration: string }) => s.narration).join("\n\n");

  return {
    success: true,
    motorType: "animation_2d",
    title: script.title,
    caption: script.caption,
    hashtags: script.hashtags,
    script: narrationText,
    narrationText,
    footageUrls: frameDescriptions, // Descrições para gerar frames
  };
}

// ═══════════════════════════════════════════════════════════════
// MOTOR 2: CORTE DE VÍDEO POR URL
// ═══════════════════════════════════════════════════════════════

async function motorUrlClips(
  geminiKey: string,
  config: ChannelConfig
): Promise<RenderResult> {
  console.log("✂️ Motor 2: Corte de Vídeo por URL");

  if (!config.targetUrl) {
    throw new Error("URL do vídeo não fornecida para o modo URL_CLIPS");
  }

  // Gerar roteiro baseado na URL
  const scriptPrompt = `Você é um editor de vídeo especializado em CORTES VIRAISS para ${config.platform}.

Nicho: ${config.niche}
URL do vídeo original: ${config.targetUrl}
${config.systemPrompt ? `Instruções: ${config.systemPrompt}` : ""}

Analise o contexto da URL e gere um roteiro para CORTAR o melhor trecho:
1. Identifique o momento mais viral/engajante
2. Crie o roteiro do corte (15-60 segundos)
3. Adicione legendas dinâmicas
4. Sugira Cortes/zooms

JSON (sem markdown):
{
  "title": "título viral para o corte",
  "hook": "gancho do trecho",
  "scenes": [{
    "narration": "narração/texto sobreposto",
    "visualDescription": "descrição do que aparece no vídeo",
    "duration": 15,
    "subtitleText": "texto da legenda dinâmica",
    "zoomEffect": "zoom_in"
  }],
  "caption": "legenda para rede social",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "totalDuration": 30
}`;

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096);
  const script = parseJSON(scriptText, {
    title: "Corte Viral",
    hook: "",
    scenes: [{ narration: scriptText, visualDescription: "vídeo original", duration: 15, subtitleText: "", zoomEffect: "none" }],
    caption: "",
    hashtags: [],
    totalDuration: 15,
  });

  const narrationText = script.scenes.map((s: { narration: string }) => s.narration).join("\n\n");

  return {
    success: true,
    motorType: "url_clips",
    title: script.title,
    caption: script.caption,
    hashtags: script.hashtags,
    script: narrationText,
    narrationText,
    footageUrls: [config.targetUrl], // URL original para download
  };
}

// ═══════════════════════════════════════════════════════════════
// MOTOR 3: VÍDEOS DE BANCO DE DADOS (Pexels/Pixabay + TTS)
// ═══════════════════════════════════════════════════════════════

async function motorStockVideo(
  geminiKey: string,
  pixabayKey: string | undefined,
  config: ChannelConfig
): Promise<RenderResult> {
  console.log("🎬 Motor 3: Stock Videos + TTS");

  // Gerar roteiro
  const platformLabel = config.platform === "youtube" ? "YouTube Shorts" : config.platform === "instagram" ? "Instagram Reels" : "TikTok";

  const scriptPrompt = `Você é um roteirista profissional de vídeos curtos para ${platformLabel}.

Nicho: ${config.niche}
${config.systemPrompt ? `Instruções: ${config.systemPrompt}` : ""}

Gere roteiro para vídeo de 30-60 segundos, cena a cena.
Cada cena: narração, descrição visual ESPECÍFICA para stock, duração, mood música.
3-6 cenas. Português brasileiro. Gancho forte nos 3s iniciais.

JSON (sem markdown):
{
  "title": "título (máx 60 chars)",
  "hook": "gancho 3s",
  "scenes": [{ "narration": "texto", "visualDescription": "descrição específica para stock", "duration": 8, "musicMood": "inspirador" }],
  "caption": "legenda com emojis",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10"],
  "totalDuration": 45
}`;

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096);
  const script = parseJSON(scriptText, {
    title: "Vídeo Stock",
    hook: "",
    scenes: [{ narration: scriptText, visualDescription: "stock video", duration: 30, musicMood: "inspirador" }],
    caption: "",
    hashtags: [],
    totalDuration: 30,
  });

  // Buscar vídeos de stock
  let footageUrls: string[] = [];
  if (pixabayKey) {
    for (const scene of script.scenes) {
      const urls = await fetchStockVideos(pixabayKey, scene.visualDescription, 1);
      footageUrls.push(...urls);
      await new Promise((r) => setTimeout(r, 200)); // Rate limit
    }
  }

  // Buscar música
  let musicUrl = "";
  if (pixabayKey && script.scenes.length > 0) {
    musicUrl = await fetchMusic(pixabayKey, script.scenes[0].musicMood || "inspirador");
  }

  const narrationText = script.scenes.map((s: { narration: string }) => s.narration).join("\n\n");

  return {
    success: true,
    motorType: "stock_video",
    title: script.title,
    caption: script.caption,
    hashtags: script.hashtags,
    script: narrationText,
    narrationText,
    footageUrls,
  };
}

// ═══════════════════════════════════════════════════════════════
// MOTOR 4: POSTS ESTÁTICOS / CARROSSEIS
// ═══════════════════════════════════════════════════════════════

async function motorStaticPost(
  geminiKey: string,
  pixabayKey: string | undefined,
  config: ChannelConfig
): Promise<RenderResult> {
  console.log("🖼️ Motor 4: Post Estático");

  // Gerar texto do post
  const scriptPrompt = `Você é um designer de posts para ${config.platform}.

Nicho: ${config.niche}
${config.systemPrompt ? `Instruções: ${config.systemPrompt}` : ""}

Gere um POST ESTÁTICO completo:
1. Texto da arte (curto, impactante, máximo 20 palavras)
2. Descrição visual para buscar imagem de stock
3. Legenda completa com emojis
4. 10 hashtags estratégicas
5. Texto alternativo para acessibilidade

JSON (sem markdown):
{
  "title": "texto da arte (máx 20 palavras)",
  "imageDescription": "descrição ESPECÍFICA para buscar imagem stock",
  "caption": "legenda completa com emojis e quebras de linha",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10"],
  "altText": "descrição da imagem para acessibilidade"
}`;

  const scriptText = await callGemini(geminiKey, scriptPrompt, 2048);
  const script = parseJSON(scriptText, {
    title: "Post Estático",
    imageDescription: "imagem de stock",
    caption: "",
    hashtags: [],
    altText: "",
  });

  // Buscar imagem de stock
  let imageUrl = "";
  if (pixabayKey) {
    const images = await fetchStockImages(pixabayKey, script.imageDescription || config.niche, 1);
    if (images.length > 0) imageUrl = images[0];
  }

  return {
    success: true,
    motorType: "static_post",
    imageUrl,
    mediaUrl: imageUrl,
    title: script.title,
    caption: script.caption,
    hashtags: script.hashtags,
    script: script.title,
  };
}

// ═══════════════════════════════════════════════════════════════
// ACTION PRINCIPAL: ROTEADOR INTELIGENTE DE MÍDIA
// ═══════════════════════════════════════════════════════════════

export const routeToMotor = action({
  args: {
    niche: v.string(),
    systemPrompt: v.optional(v.string()),
    motorType: v.union(
      v.literal("animation_2d"),
      v.literal("url_clips"),
      v.literal("stock_video"),
      v.literal("static_post")
    ),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("tiktok")),
    targetUrl: v.optional(v.string()),
    motorConfig: v.optional(v.object({
      animationStyle: v.optional(v.string()),
      frameRate: v.optional(v.number()),
      clipDuration: v.optional(v.number()),
      cropMode: v.optional(v.string()),
      stockSource: v.optional(v.string()),
      ttsVoice: v.optional(v.string()),
      imageSize: v.optional(v.string()),
      designTemplate: v.optional(v.string()),
    })),
  },
  handler: async (_ctx, args) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY não configurada");

    const pixabayKey = process.env.PIXABAY_API_KEY;

    const config: ChannelConfig = {
      niche: args.niche,
      systemPrompt: args.systemPrompt || "",
      motorType: args.motorType,
      platform: args.platform,
      targetUrl: args.targetUrl,
      motorConfig: args.motorConfig,
    };

    let result: RenderResult;

    switch (args.motorType) {
      case "animation_2d":
        result = await motorAnimation2D(geminiKey, config);
        break;
      case "url_clips":
        result = await motorUrlClips(geminiKey, config);
        break;
      case "stock_video":
        result = await motorStockVideo(geminiKey, pixabayKey, config);
        break;
      case "static_post":
        result = await motorStaticPost(geminiKey, pixabayKey, config);
        break;
      default:
        throw new Error(`Motor desconhecido: ${args.motorType}`);
    }

    return {
      ...result,
      message: `Motor ${args.motorType} executado com sucesso!`,
    };
  },
});

// ─── Query: Listar mot disponíveis ───────────────────────────

export const getAvailableMotors = action({
  args: {},
  handler: async () => {
    return {
      motors: [
        {
          id: "animation_2d",
          name: "Animação 2D / Stick Figure",
          description: "Gera roteiro cômico e frames para animação 2D",
          icon: "🎨",
          bestFor: "Canais de entretenimento, humor, curiosidades",
          examples: ["A Idade da Pedra", "História em quadrinhos", "Explicações cômicas"],
        },
        {
          id: "url_clips",
          name: "Corte de Vídeo por URL",
          description: "Recorta trechos virais de vídeos existentes",
          icon: "✂️",
          bestFor: "Podcasts, reações, cortes de lives",
          examples: ["Corte de podcast", "Reação a viral", "Melhor momento"],
        },
        {
          id: "stock_video",
          name: "Vídeos de Banco + Voz IA",
          description: "Monta vídeo com clips de stock e narração TTS",
          icon: "🎬",
          bestFor: "Conteúdo educativo, documentários, motivação",
          examples: ["Fatos curiosos", "Dicas de vida", "História do dia"],
        },
        {
          id: "static_post",
          name: "Posts Estáticos / Carrosséis",
          description: "Gera imagens formatadas com texto e legenda",
          icon: "🖼️",
          bestFor: "Posts de Instagram, LinkedIn, Frases",
          examples: ["Frase motivacional", "Dica rápida", "Anúncio"],
        },
      ],
    };
  },
});
