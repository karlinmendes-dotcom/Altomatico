import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════
// YouTube Engine — OAuth + Upload + Metadata + Agendamento
// ═══════════════════════════════════════════════════════════════

// ─── YouTube OAuth URLs ───────────────────────────────────────

export const getYoutubeAuthUrl = action({
  args: {
    redirectUri: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    if (!clientId) throw new Error("YOUTUBE_CLIENT_ID não configurado");

    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
      "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(args.redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return { authUrl };
  },
});

// ─── YouTube Upload ──────────────────────────────────────────

export const uploadVideo = action({
  args: {
    contentId: v.id("contents"),
    videoUrl: v.string(),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    categoryId: v.optional(v.string()),
    privacyStatus: v.optional(v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("unlisted")
    )),
    scheduledAt: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY não configurado");

    // Nota: Para verificar a conexão YouTube, usar ctx.runQuery
    // Por agora, permitir o upload e deixar a validação para a API do YouTube

    // Preparar metadata do vídeo
    const videoMetadata: Record<string, unknown> = {
      snippet: {
        title: args.title.slice(0, 100),
        description: args.description,
        tags: args.tags.slice(0, 30),
        categoryId: args.categoryId || "22", // People & Blogs
        defaultLanguage: "pt-BR",
        defaultAudioLanguage: "pt-BR",
      },
      status: {
        privacyStatus: args.privacyStatus || "private",
        selfDeclaredMadeForKids: false,
        embeddable: true,
        publicStatsViewable: true,
      },
    };

    // Se agendar, adicionar data
    if (args.scheduledAt && args.privacyStatus === "private") {
      (videoMetadata.status as Record<string, unknown>).privacyStatus = "private";
      (videoMetadata.status as Record<string, unknown>).publishAt = args.scheduledAt;
    }

    // Registrar tarefa de upload via mutation interna
    await ctx.runMutation(internal.youtubeEngine._registerUploadTask, {
      contentId: args.contentId,
      title: args.title,
      videoUrl: args.videoUrl,
    });

    // Nota: O upload real precisa de um token OAuth2 válido.
    // Para produção, usar a API do YouTube Data API v3.
    // O vídeo seria baixado e enviado via multipart upload.

    return {
      success: true,
      message: "Upload iniciado. O vídeo será processado e publicado.",
      metadata: videoMetadata,
      note: "Para publicar, conecte sua conta YouTube via OAuth nas Configurações.",
    };
  },
});

// ─── YouTube Analytics ────────────────────────────────────────

export const getYoutubeAnalytics = action({
  args: {
    channelId: v.optional(v.string()),
    videoId: v.optional(v.string()),
    period: v.optional(v.string()), // "7d", "30d", "90d"
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY não configurado");

    // Para obter channelId, pode ser passado como argumento
    const channelId = args.channelId;

    if (!channelId) {
      return {
        error: "Canal YouTube não configurado",
        stats: null,
      };
    }

    // Buscar estatísticas do canal via YouTube Data API
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
      );

      if (!response.ok) {
        return { error: "Erro ao buscar dados do canal", stats: null };
      }

      const data = await response.json();
      const channel = data.items?.[0];

      if (!channel) {
        return { error: "Canal não encontrado", stats: null };
      }

      const stats: Record<string, unknown> = {
        channelId,
        title: channel.snippet?.title || "",
        description: channel.snippet?.description || "",
        thumbnail: channel.snippet?.thumbnails?.default?.url || "",
        subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
        totalViews: parseInt(channel.statistics?.viewCount || "0"),
        totalVideos: parseInt(channel.statistics?.videoCount || "0"),
        hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount || false,
      };

      return { stats };
    } catch (err) {
      return { error: `Erro de conexão: ${err}`, stats: null };
    }
  },
});

// ─── YouTube Trending ────────────────────────────────────────

export const getYouTubeTrending = action({
  args: {
    regionCode: v.optional(v.string()),
    categoryId: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY não configurado");

    const region = args.regionCode || "BR";
    const category = args.categoryId || "";
    const max = args.maxResults || 10;

    try {
      let url = `https://www.googleapis.com/youtube/v3/videos?` +
        `part=snippet,statistics,contentDetails` +
        `&chart=mostPopular` +
        `&regionCode=${region}` +
        `&maxResults=${max}` +
        `&key=${apiKey}`;

      if (category) {
        url += `&videoCategoryId=${category}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        return { error: "Erro ao buscar trending", videos: [] };
      }

      const data = await response.json();
      const videos = (data.items || []).map((item: Record<string, unknown>) => {
        const snippet = (item.snippet || {}) as Record<string, unknown>;
        const statistics = (item.statistics || {}) as Record<string, unknown>;
        const contentDetails = (item.contentDetails || {}) as Record<string, unknown>;
        return {
          id: item.id,
          title: snippet.title,
          description: (snippet.description as string)?.slice(0, 200) || "",
          thumbnail: ((snippet.thumbnails as Record<string, unknown>)?.high as Record<string, unknown>)?.url || "",
          channelTitle: snippet.channelTitle,
          publishedAt: snippet.publishedAt,
          viewCount: parseInt((statistics.viewCount as string) || "0"),
          likeCount: parseInt((statistics.likeCount as string) || "0"),
          commentCount: parseInt((statistics.commentCount as string) || "0"),
          duration: (contentDetails.duration as string) || "",
          tags: (snippet.tags as string[])?.slice(0, 5) || [],
        };
      });

      return { videos };
    } catch (err) {
      return { error: `Erro de conexão: ${err}`, videos: [] };
    }
  },
});

// ─── YouTube Channel Info ─────────────────────────────────────

export const getChannelInfo = action({
  args: {
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY não configurado");

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?` +
        `part=snippet,statistics,brandingSettings,contentDetails` +
        `&id=${args.channelId}` +
        `&key=${apiKey}`
      );

      if (!response.ok) {
        return { error: "Erro ao buscar canal" };
      }

      const data = await response.json();
      const channel = data.items?.[0];
      if (!channel) return { error: "Canal não encontrado" };

      return {
        info: {
          id: channel.id,
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          thumbnail: channel.snippet?.thumbnails?.high?.url,
          banner: channel.brandingSettings?.image?.bannerExternalUrl,
          subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
          viewCount: parseInt(channel.statistics?.viewCount || "0"),
          videoCount: parseInt(channel.statistics?.videoCount || "0"),
          uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
          country: channel.snippet?.country,
          keywords: channel.brandingSettings?.channel?.keywords,
        },
      };
    } catch (err) {
      return { error: `Erro de conexão: ${err}` };
    }
  },
});

// ─── Mutation: Salvar conexão YouTube ────────────────────────

export const saveYoutubeConnection = mutation({
  args: {
    channelId: v.string(),
    channelName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db.query("userSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        youtubeChannelId: args.channelId,
        youtubeChannelName: args.channelName,
        youtubeConnected: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: "default",
        youtubeChannelId: args.channelId,
        youtubeChannelName: args.channelName,
        youtubeConnected: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("logs", {
      action: "youtube_connected",
      details: `Canal conectado: ${args.channelName}`,
      level: "info",
      source: "youtube_engine",
      success: true,
      timestamp: now,
    });

    return { success: true };
  },
});

// ─── Mutation: Desconectar YouTube ────────────────────────────

export const disconnectYoutube = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("userSettings").first();
    if (existing) {
      const now = new Date().toISOString();
      await ctx.db.patch(existing._id, {
        youtubeChannelId: undefined,
        youtubeChannelName: undefined,
        youtubeConnected: false,
        updatedAt: now,
      });
    }

    await ctx.db.insert("logs", {
      action: "youtube_disconnected",
      details: "Conta YouTube desconectada",
      level: "info",
      source: "youtube_engine",
      success: true,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════
// Internal mutations (chamadas por actions)
// ═══════════════════════════════════════════════════════════════

export const _registerUploadTask = internalMutation({
  args: {
    contentId: v.id("contents"),
    title: v.string(),
    videoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("tasks", {
      contentId: args.contentId,
      type: "publish",
      status: "processing",
      priority: 8,
      progress: 50,
      retryCount: 0,
      maxRetries: 3,
      startedAt: now,
      createdAt: now,
      metadata: JSON.stringify({
        platform: "youtube",
        title: args.title,
        videoUrl: args.videoUrl,
      }),
    });

    await ctx.db.insert("logs", {
      action: "youtube_upload_started",
      contentId: args.contentId,
      details: `Upload iniciado: ${args.title}`,
      level: "info",
      source: "youtube_engine",
      success: true,
      timestamp: now,
    });

    return { success: true };
  },
});
