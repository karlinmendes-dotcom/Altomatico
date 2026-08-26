import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// PIXABAY ENGINE — Vídeos, Imagens e Músicas 100% Gratuitos
// ═══════════════════════════════════════════════════════════════

const PIXABAY_BASE = "https://pixabay.com/api";

// ─── Buscar Vídeos de Stock ──────────────────────────────────

export const searchVideos = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    minWidth: v.optional(v.number()),
    minHeight: v.optional(v.number()),
    minDuration: v.optional(v.number()),
    maxDuration: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error("PIXABAY_API_KEY não configurada");

    const params = new URLSearchParams({
      key: apiKey,
      q: args.query,
      video_type: "all",
      per_page: String(args.perPage || 10),
      safesearch: "true",
    });

    if (args.minWidth) params.set("min_width", String(args.minWidth));
    if (args.minHeight) params.set("min_height", String(args.minHeight));
    if (args.minDuration) params.set("min_duration", String(args.minDuration));
    if (args.maxDuration) params.set("max_duration", String(args.maxDuration));

    const response = await fetch(`${PIXABAY_BASE}/videos/?${params}`);
    if (!response.ok) throw new Error(`Erro Pixabay: ${response.status}`);

    const data = await response.json();
    return {
      total: data.totalHits,
      videos: (data.hits || []).map((hit: Record<string, unknown>) => ({
        id: hit.id,
        pageURL: hit.pageURL,
        tags: hit.tags,
        duration: hit.duration,
        pictureId: hit.picture_id,
        videos: {
          large: (hit.videos as Record<string, Record<string, string>>)?.large?.url || "",
          medium: (hit.videos as Record<string, Record<string, string>>)?.medium?.url || "",
          small: (hit.videos as Record<string, Record<string, string>>)?.small?.url || "",
          tiny: (hit.videos as Record<string, Record<string, string>>)?.tiny?.url || "",
        },
        pictureLarge: (hit.videos as Record<string, Record<string, string>>)?.large?.url || "",
        user: hit.user,
        views: hit.views,
        downloads: hit.downloads,
        likes: hit.likes,
      })),
    };
  },
});

// ─── Buscar Imagens de Stock ─────────────────────────────────

export const searchImages = action({
  args: {
    query: v.string(),
    imageType: v.optional(v.string()), // "photo", "illustration", "vector"
    orientation: v.optional(v.string()), // "horizontal", "vertical", "square"
    minWidth: v.optional(v.number()),
    minHeight: v.optional(v.number()),
    perPage: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error("PIXABAY_API_KEY não configurada");

    const params = new URLSearchParams({
      key: apiKey,
      q: args.query,
      image_type: args.imageType || "photo",
      per_page: String(args.perPage || 10),
      safesearch: "true",
    });

    if (args.orientation) params.set("orientation", args.orientation);
    if (args.minWidth) params.set("min_width", String(args.minWidth));
    if (args.minHeight) params.set("min_height", String(args.minHeight));
    if (args.color) params.set("colors", args.color);

    const response = await fetch(`${PIXABAY_BASE}/?${params}`);
    if (!response.ok) throw new Error(`Erro Pixabay: ${response.status}`);

    const data = await response.json();
    return {
      total: data.totalHits,
      images: (data.hits || []).map((hit: Record<string, unknown>) => ({
        id: hit.id,
        pageURL: hit.pageURL,
        tags: hit.tags,
        webformatURL: hit.webformatURL,
        largeImageURL: hit.largeImageURL,
        fullHDURL: hit.fullHDURL,
        previewURL: hit.previewURL,
        imageWidth: hit.imageWidth,
        imageHeight: hit.imageHeight,
        user: hit.user,
        views: hit.views,
        downloads: hit.downloads,
        likes: hit.likes,
      })),
    };
  },
});

// ─── Buscar Músicas de Fundo ─────────────────────────────────

export const searchMusic = action({
  args: {
    query: v.string(),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error("PIXABAY_API_KEY não configurada");

    // Pixabay tem uma API de áudio separada
    const params = new URLSearchParams({
      key: apiKey,
      q: args.query,
      per_page: String(args.perPage || 10),
    });

    try {
      const response = await fetch(`https://pixabay.com/api/music/?${params}`);
      if (!response.ok) {
        // Se a API de música não estiver disponível, usar busca de vídeos como alternativa
        return { total: 0, tracks: [], note: "API de música Pixabay não disponível. Use vídeos de stock com áudio." };
      }
      const data = await response.json();
      return {
        total: data.totalHits,
        tracks: (data.hits || []).map((hit: Record<string, unknown>) => ({
          id: hit.id,
          audio: hit.audio,
          audioURL: hit.audio,
          tags: hit.tags,
          duration: hit.duration,
          user: hit.user,
          downloads: hit.downloads,
        })),
      };
    } catch {
      return { total: 0, tracks: [], note: "Busca de música retornou erro. Use vídeos de stock." };
    }
  },
});

// ─── Buscar Materiais para um Conteúdo ───────────────────────

export const getMaterialsForContent = action({
  args: {
    topic: v.string(),
    platform: v.union(v.literal("youtube"), v.literal("instagram")),
    videoStyle: v.optional(v.string()), // "landscape", "portrait", "square"
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) throw new Error("PIXABAY_API_KEY não configurada");

    const count = args.count || 5;
    const orientation = args.platform === "instagram" ? "vertical" : "horizontal";

    // Buscar vídeos e imagens em paralelo
    const videoParams = new URLSearchParams({
      key: apiKey,
      q: args.topic,
      video_type: "all",
      per_page: String(count),
      safesearch: "true",
    });

    const imageParams = new URLSearchParams({
      key: apiKey,
      q: args.topic,
      image_type: "photo",
      orientation,
      per_page: String(count),
      safesearch: "true",
    });

    try {
      const [videoRes, imageRes] = await Promise.all([
        fetch(`${PIXABAY_BASE}/videos/?${videoParams}`),
        fetch(`${PIXABAY_BASE}/?${imageParams}`),
      ]);

      const videoData = videoRes.ok ? await videoRes.json() : { hits: [] };
      const imageData = imageRes.ok ? await imageRes.json() : { hits: [] };

      return {
        videos: (videoData.hits || []).map((hit: Record<string, unknown>) => ({
          id: hit.id,
          url: (hit.videos as Record<string, Record<string, string>>)?.medium?.url || "",
          duration: hit.duration,
          tags: hit.tags,
        })),
        images: (imageData.hits || []).map((hit: Record<string, unknown>) => ({
          id: hit.id,
          url: hit.largeImageURL || hit.webformatURL,
          tags: hit.tags,
          width: hit.imageWidth,
          height: hit.imageHeight,
        })),
        totalVideos: videoData.totalHits || 0,
        totalImages: imageData.totalHits || 0,
      };
    } catch (err) {
      return { videos: [], images: [], totalVideos: 0, totalImages: 0, error: String(err) };
    }
  },
});
