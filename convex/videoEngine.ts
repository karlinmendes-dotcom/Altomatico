import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Video Engine — Geração completa de vídeos
// Script → Imagens/Vídeos → Narração → Música → Merge
// ═══════════════════════════════════════════════════════════════

interface VideoScript {
  title: string;
  hook: string;
  scenes: Array<{
    narration: string;
    visualDescription: string;
    duration: number; // seconds
    musicMood: string;
  }>;
  caption: string;
  hashtags: string[];
  totalDuration: number;
}

interface GeneratedVideo {
  script: VideoScript;
  footageUrls: string[];
  narrationUrl: string;
  musicUrl: string;
  thumbnailUrl: string;
  status: "ready" | "processing" | "error";
  videoUrl?: string;
  error?: string;
}

// ─── Passo 1: Gerar roteiro completo com Gemini ──────────────

async function generateVideoScript(
  apiKey: string,
  niche: string,
  systemPrompt: string,
  mode: "AUTO_GENERATED" | "URL_CLIPS",
  targetUrl?: string
): Promise<VideoScript> {
  const prompt = `Você é um roteirista profissional de vídeos curtos para redes sociais.

Nicho: ${niche}
${systemPrompt ? `Instruções: ${systemPrompt}` : ""}
Modo: ${mode === "URL_CLIPS" ? "Recorte de vídeo existente" : "Geração do zero"}
${targetUrl ? `URL de referência: ${targetUrl}` : ""}

Gere um roteiro COMPLETO para um vídeo curto (15-60 segundos) com CENA A CENA.

Para cada cena, especifique:
1. O que o narrador fala (narração)
2. O que aparece na tela (descrição visual para buscar imagem/vídeo)
3. Duração da cena em segundos
4. Mood da música de fundo

IMPORTANTE:
- Total do vídeo: 30-60 segundos
- 3-6 cenas
- Narração natural, como se falasse com um amigo
- Descrições visuais específicas para buscar imagens/vídeos de stock
- Em português brasileiro

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título chamativo para o vídeo",
  "hook": "gancho dos primeiros 3 segundos",
  "scenes": [
    {
      "narration": "texto que o narrador fala nesta cena",
      "visualDescription": "descrição específica para buscar imagem/vídeo (ex: 'pessoa caminhando na floresta tropical')",
      "duration": 8,
      "musicMood": "inspirador"
    }
  ],
  "caption": "legenda completa para a rede social com emojis",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "totalDuration": 45
}`;

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
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Erro ao gerar roteiro com Gemini");
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini retornou resposta vazia");

  // Parse JSON
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    title: parsed.title || "Vídeo Gerado",
    hook: parsed.hook || "",
    scenes: parsed.scenes || [],
    caption: parsed.caption || "",
    hashtags: parsed.hashtags || [],
    totalDuration: parsed.totalDuration || 30,
  };
}

// ─── Passo 2: Buscar vídeos de stock do Pixabay ─────────────

async function findMatchingFootage(
  pixabayKey: string,
  scenes: Array<{ visualDescription: string; duration: number }>
): Promise<string[]> {
  const footageUrls: string[] = [];

  for (const scene of scenes) {
    try {
      // Buscar vídeo no Pixabay baseado na descrição visual
      const query = encodeURIComponent(scene.visualDescription.slice(0, 100));
      const url = `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${query}&per_page=3&min_width=720`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.hits && data.hits.length > 0) {
        // Pegar o melhor vídeo disponível
        const hit = data.hits[0];
        const videoUrl =
          hit.videos?.medium?.url ||
          hit.videos?.small?.url ||
          hit.videos?.large?.url ||
          "";
        if (videoUrl) {
          footageUrls.push(videoUrl);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar footage:", err);
    }

    // Pequena pausa para não exceder rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  return footageUrls;
}

// ─── Passo 3: Gerar narração com Edge TTS ───────────────────

async function generateNarration(scenes: Array<{ narration: string }>): Promise<string> {
  // Combinar todas as narrações
  const fullNarration = scenes.map((s) => s.narration).join("\n\n");

  // Edge TTS é gratuito - usar API pública
  // Nota: Em produção, usar uma biblioteca Edge TTS ou API alternativa
  // Por agora, retornar o texto para o frontend processar

  return fullNarration;
}

// ─── Passo 4: Buscar música de fundo ────────────────────────

async function findBackgroundMusic(
  pixabayKey: string,
  mood: string
): Promise<string> {
  try {
    const query = encodeURIComponent(`${mood} background music`);
    const url = `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${query}&per_page=1&category=music`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.hits && data.hits.length > 0) {
      const hit = data.hits[0];
      return hit.videos?.small?.url || hit.videos?.medium?.url || "";
    }
  } catch (err) {
    console.error("Erro ao buscar música:", err);
  }

  return "";
}

// ─── Action Principal: Gerar Vídeo Completo ─────────────────

export const generateFullVideo = action({
  args: {
    niche: v.string(),
    systemPrompt: v.optional(v.string()),
    mode: v.union(v.literal("AUTO_GENERATED"), v.literal("URL_CLIPS")),
    targetUrl: v.optional(v.string()),
    platform: v.optional(
      v.union(
        v.literal("youtube"),
        v.literal("instagram"),
        v.literal("tiktok")
      )
    ),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY não configurada. Adicione em Settings → Environment Variables."
      );
    }

    const pixabayKey = process.env.PIXABAY_API_KEY;

    // ─── FASE 1: Gerar Roteiro ────────────────────────────
    console.log("📝 Fase 1: Gerando roteiro...");
    const script = await generateVideoScript(
      apiKey,
      args.niche,
      args.systemPrompt || "",
      args.mode,
      args.targetUrl
    );

    // ─── FASE 2: Buscar Vídeos de Stock ───────────────────
    console.log("🎬 Fase 2: Buscando vídeos de stock...");
    let footageUrls: string[] = [];
    if (pixabayKey) {
      footageUrls = await findMatchingFootage(pixabayKey, script.scenes);
    }

    // ─── FASE 3: Gerar Narração ───────────────────────────
    console.log("🗣️ Fase 3: Preparando narração...");
    const narrationText = await generateNarration(script.scenes);

    // ─── FASE 4: Buscar Música ────────────────────────────
    console.log("🎵 Fase 4: Buscando música de fundo...");
    let musicUrl = "";
    if (pixabayKey && script.scenes.length > 0) {
      musicUrl = await findBackgroundMusic(
        pixabayKey,
        script.scenes[0].musicMood || "inspirador"
      );
    }

    // ─── FASE 5: Montar Resultado ─────────────────────────
    console.log("✅ Fase 5: Montando resultado final...");

    const result: GeneratedVideo = {
      script,
      footageUrls,
      narrationUrl: "", // Será gerado pelo frontend com Edge TTS
      musicUrl,
      thumbnailUrl: footageUrls[0] || "",
      status: footageUrls.length > 0 ? "ready" : "processing",
    };

    return {
      success: true,
      video: result,
      narrationText, // Texto completo da narração para o frontend gerar áudio
      message: `Vídeo gerado! ${script.scenes.length} cenas, ${footageUrls.length} vídeos de stock encontrados.`,
    };
  },
});

// ─── Action: Gerar apenas o roteiro (mais rápido) ───────────

export const generateScriptOnly = action({
  args: {
    niche: v.string(),
    systemPrompt: v.optional(v.string()),
    mode: v.union(v.literal("AUTO_GENERATED"), v.literal("URL_CLIPS")),
    targetUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    const script = await generateVideoScript(
      apiKey,
      args.niche,
      args.systemPrompt || "",
      args.mode,
      args.targetUrl
    );

    return {
      success: true,
      script,
      message: "Roteiro gerado com sucesso!",
    };
  },
});
