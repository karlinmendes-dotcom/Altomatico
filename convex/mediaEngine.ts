import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Media Engine — Banco de mídias 100% gratuitas
// Fallback: Pixabay → Pexels → Unsplash
// ═══════════════════════════════════════════════════════════════

interface MediaResult {
  url: string;
  thumbnailUrl?: string;
  downloadUrl: string;
  source: "pixabay" | "pexels" | "unsplash";
  sourceId: string;
  author?: string;
  tags?: string[];
  duration?: number;
  width?: number;
  height?: number;
}

// ─── Buscar vídeos de stock ──────────────────────────────────

export const searchVideos = action({
  args: {
    query: v.string(),
    count: v.optional(v.number()),
    orientation: v.optional(
      v.union(
        v.literal("portrait"),
        v.literal("landscape"),
        v.literal("square")
      )
    ),
  },
  handler: async (_ctx, args) => {
    const count = args.count || 5;
    const results: MediaResult[] = [];

    // Tentar Pixabay primeiro
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (pixabayKey) {
      try {
        const orientation =
          args.orientation === "portrait"
            ? "vertical"
            : args.orientation === "landscape"
              ? "horizontal"
              : "";
        const url = `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(args.query)}&per_page=${count}${orientation ? `&orientation=${orientation}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.hits) {
          for (const hit of data.hits) {
            const videoUrl =
              hit.videos?.large?.url ||
              hit.videos?.medium?.url ||
              hit.videos?.small?.url ||
              "";
            results.push({
              url: hit.pageURL,
              downloadUrl: videoUrl,
              source: "pixabay",
              sourceId: String(hit.id),
              author: hit.user,
              tags: hit.tags?.split(", "),
              width: hit.videos?.large?.width,
              height: hit.videos?.large?.height,
            });
          }
        }
      } catch (err) {
        console.error("Pixabay error:", err);
      }
    }

    // Se Pixabay não retornou suficiente, tentar Pexels
    if (results.length < count && process.env.PEXELS_API_KEY) {
      try {
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(args.query)}&per_page=${count - results.length}${args.orientation ? `&orientation=${args.orientation}` : ""}`;
        const res = await fetch(url, {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        });
        const data = await res.json();

        if (data.videos) {
          for (const video of data.videos) {
            const bestFile =
              video.video_files?.find(
                (f: { quality: string }) => f.quality === "hd"
              ) || video.video_files?.[0];
            if (bestFile) {
              results.push({
                url: video.url,
                downloadUrl: bestFile.link,
                source: "pexels",
                sourceId: String(video.id),
                author: video.user?.name,
                duration: video.duration,
                width: bestFile.width,
                height: bestFile.height,
              });
            }
          }
        }
      } catch (err) {
        console.error("Pexels error:", err);
      }
    }

    return { results, total: results.length };
  },
});

// ─── Buscar imagens de stock ─────────────────────────────────

export const searchImages = action({
  args: {
    query: v.string(),
    count: v.optional(v.number()),
    orientation: v.optional(
      v.union(
        v.literal("portrait"),
        v.literal("landscape"),
        v.literal("square")
      )
    ),
  },
  handler: async (_ctx, args) => {
    const count = args.count || 5;
    const results: MediaResult[] = [];

    // Pixabay primeiro
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (pixabayKey) {
      try {
        const orientation =
          args.orientation === "portrait"
            ? "vertical"
            : args.orientation === "landscape"
              ? "horizontal"
              : "";
        const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(args.query)}&image_type=photo&per_page=${count}${orientation ? `&orientation=${orientation}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.hits) {
          for (const hit of data.hits) {
            results.push({
              url: hit.pageURL,
              downloadUrl: hit.largeImageURL || hit.webformatURL,
              thumbnailUrl: hit.previewURL,
              source: "pixabay",
              sourceId: String(hit.id),
              author: hit.user,
              tags: hit.tags?.split(", "),
              width: hit.imageWidth,
              height: hit.imageHeight,
            });
          }
        }
      } catch (err) {
        console.error("Pixabay images error:", err);
      }
    }

    // Pexels fallback
    if (results.length < count && process.env.PEXELS_API_KEY) {
      try {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(args.query)}&per_page=${count - results.length}${args.orientation ? `&orientation=${args.orientation}` : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: process.env.PEXELS_API_KEY },
        });
        const data = await res.json();

        if (data.photos) {
          for (const photo of data.photos) {
            results.push({
              url: photo.url,
              downloadUrl: photo.src?.large2x || photo.src?.large || photo.src?.original,
              thumbnailUrl: photo.src?.medium,
              source: "pexels",
              sourceId: String(photo.id),
              author: photo.photographer,
              width: photo.width,
              height: photo.height,
            });
          }
        }
      } catch (err) {
        console.error("Pexels images error:", err);
      }
    }

    // Unsplash fallback
    if (results.length < count && process.env.UNSPLASH_ACCESS_KEY) {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(args.query)}&per_page=${count - results.length}${args.orientation ? `&orientation=${args.orientation}` : ""}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
        });
        const data = await res.json();

        if (data.results) {
          for (const photo of data.results) {
            results.push({
              url: photo.links?.html || "",
              downloadUrl:
                photo.urls?.regular || photo.urls?.full || "",
              thumbnailUrl: photo.urls?.thumb,
              source: "unsplash",
              sourceId: photo.id,
              author: photo.user?.name,
              width: photo.width,
              height: photo.height,
            });
          }
        }
      } catch (err) {
        console.error("Unsplash error:", err);
      }
    }

    return { results, total: results.length };
  },
});

// ─── Buscar músicas de fundo ─────────────────────────────────

export const searchMusic = action({
  args: {
    query: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const count = args.count || 5;
    const results: MediaResult[] = [];

    // Pixabay Audio
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (pixabayKey) {
      try {
        const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(args.query)}&media_type=music&per_page=${count}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.hits) {
          for (const hit of data.hits) {
            results.push({
              url: hit.pageURL,
              downloadUrl: hit.audio || hit.audio_url || "",
              source: "pixabay",
              sourceId: String(hit.id),
              author: hit.user,
              tags: hit.tags?.split(", "),
              duration: hit.duration,
            });
          }
        }
      } catch (err) {
        console.error("Pixabay audio error:", err);
      }
    }

    return { results, total: results.length };
  },
});

// ─── Processamento de URL_CLIPS ─────────────────────────────
// Extração e processamento de trechos de vídeos existentes

export const processUrlClip = action({
  args: {
    queueId: v.string(),
    targetUrl: v.string(),
    duration: v.optional(v.string()), // "15s", "30s", "60s"
    orientation: v.optional(v.union(
      v.literal("portrait"),
      v.literal("landscape")
    )),
  },
  handler: async (_ctx, args) => {
    // 1. Validar URL
    const isYouTube = args.targetUrl.includes("youtube.com") || args.targetUrl.includes("youtu.be");
    const isTikTok = args.targetUrl.includes("tiktok.com");
    const isInstagram = args.targetUrl.includes("instagram.com");
    const isTwitch = args.targetUrl.includes("twitch.tv");

    if (!isYouTube && !isTikTok && !isInstagram && !isTwitch) {
      throw new Error("URL não suportada. Use URLs do YouTube, TikTok, Instagram ou Twitch.");
    }

    // 2. Placeholder: Em produção, aqui seria integrado com:
    //    - yt-dlp para download do vídeo
    //    - ffmpeg para extração do trecho
    //    - Conversão para formato vertical (9:16)
    //    - Upload para armazenamento temporário
    //
    // Por agora, retornamos instruções de processamento

    const platform = isYouTube ? "YouTube" : isTikTok ? "TikTok" : isInstagram ? "Instagram" : "Twitch";
    const duration = args.duration || "30s";
    const orient = args.orientation || "portrait";

    return {
      queueId: args.queueId,
      targetUrl: args.targetUrl,
      platform,
      duration,
      orientation: orient,
      status: "processing",
      message: `Processamento de clip de ${platform} iniciado. Duração: ${duration}. Orientação: ${orient}.`,
      pipeline: [
        "1. Download do vídeo fonte",
        `2. Extração de trecho de ${duration}`,
        "3. Conversão para formato vertical (9:16)",
        "4. Otimização de qualidade",
        "5. Upload para armazenamento",
      ],
      note: "Este é um placeholder da pipeline. Em produção, integrar com yt-dlp + ffmpeg.",
    };
  },
});

// ─── Processar fila de clips ─────────────────────────────────
// Chamado pelo cron para itens com source='youtube_cut'

export const processClipQueue = action({
  args: {},
  handler: async (_ctx) => {
    // Em produção, buscaria itens da contentQueue com source='youtube_cut'
    // e processaria cada um sequencialmente
    return {
      processed: 0,
      message: "Pipeline de clips em modo placeholder",
      note: "Integrar com mediaEngine.processUrlClip para processamento real",
    };
  },
});

// ─── Síntese de voz (Edge TTS) ──────────────────────────────

export const generateVoice = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const voice = args.voice || "pt-BR-FranciscaNeural";
    const lang = args.language || "pt-BR";

    // Edge TTS é gratuito e não precisa de API key
    // Retorna instruções para o frontend usar o serviço
    return {
      service: "edge-tts",
      voice,
      language: lang,
      text: args.text,
      message: "Use Edge TTS para gerar áudio. O serviço é gratuito e suporta múltiplas vozes em português.",
      voices: [
        { id: "pt-BR-FranciscaNeural", name: "Francisca (Feminina)", lang: "pt-BR" },
        { id: "pt-BR-AntonioNeural", name: "Antonio (Masculino)", lang: "pt-BR" },
        { id: "pt-BR-LeilaNeural", name: "Leila (Feminina)", lang: "pt-BR" },
        { id: "pt-BR-ValerioNeural", name: "Valerio (Masculino)", lang: "pt-BR" },
        { id: "en-US-JennyNeural", name: "Jenny (Feminine)", lang: "en-US" },
        { id: "en-US-GuyNeural", name: "Guy (Masculine)", lang: "en-US" },
      ],
    };
  },
});
