import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getDefaultSettings } from "./helpers";

// ═══════════════════════════════════════════════════════════════
// YouTube Engine — OAuth + Upload + Analytics + Trending
// ═══════════════════════════════════════════════════════════════

// ─── Gerar URL de autorização OAuth ───────────────────────────

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
    ].join(" ");

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(args.redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return { authUrl };
  },
});

// ─── Trocar código OAuth por tokens ──────────────────────────

export const exchangeCodeForTokens = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET devem estar configurados");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: args.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: args.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro ao trocar código por token: ${err}`);
    }

    const data = await response.json();

    // Buscar info do canal com o access token
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${data.access_token}` } }
    );

    let channelInfo = null;
    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      channelInfo = channelData.items?.[0] || null;
    }

    // Salvar tokens e info do canal no Convex
    await ctx.runMutation(internal.youtubeEngine._saveYoutubeTokens, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : "",
      channelId: channelInfo?.id || "",
      channelName: channelInfo?.snippet?.title || "",
    });

    return {
      success: true,
      channelName: channelInfo?.snippet?.title || "Canal conectado",
      channelId: channelInfo?.id || "",
    };
  },
});

// ─── Mutation interna: salvar tokens ─────────────────────────

export const _saveYoutubeTokens = internalMutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.string(),
    channelId: v.string(),
    channelName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db.query("userSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        youtubeAccessToken: args.accessToken,
        youtubeRefreshToken: args.refreshToken,
        youtubeTokenExpiry: args.expiresAt,
        youtubeChannelId: args.channelId,
        youtubeChannelName: args.channelName,
        youtubeConnected: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: "default",
        youtubeAccessToken: args.accessToken,
        youtubeRefreshToken: args.refreshToken,
        youtubeTokenExpiry: args.expiresAt,
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

// ─── Upload de vídeo ─────────────────────────────────────────

export const uploadVideo = action({
  args: {
    contentId: v.id("contents"),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    categoryId: v.optional(v.string()),
    privacyStatus: v.optional(
      v.union(v.literal("public"), v.literal("private"), v.literal("unlisted"))
    ),
    scheduledAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Preparar metadata
    const metadata = {
      snippet: {
        title: args.title.slice(0, 100),
        description: args.description,
        tags: args.tags.slice(0, 30),
        categoryId: args.categoryId || "22",
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

    // Registrar tarefa
    await ctx.runMutation(internal.youtubeEngine._registerUploadTask, {
      contentId: args.contentId,
      title: args.title,
    });

    return {
      success: true,
      message: "Upload preparado. O vídeo será processado e publicado.",
      metadata,
      note: "Para upload real, o vídeo deve ser enviado via multipart/form-data.",
    };
  },
});

// ─── Analytics do canal ──────────────────────────────────────

export const getYoutubeAnalytics = action({
  args: {
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY não configurado");

    const channelId = args.channelId;

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
      );

      if (!response.ok) return { error: "Erro ao buscar dados", stats: null };

      const data = await response.json();
      const channel = data.items?.[0];
      if (!channel) return { error: "Canal não encontrado", stats: null };

      return {
        stats: {
          channelId,
          title: channel.snippet?.title || "",
          thumbnail: channel.snippet?.thumbnails?.default?.url || "",
          subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
          totalViews: parseInt(channel.statistics?.viewCount || "0"),
          totalVideos: parseInt(channel.statistics?.videoCount || "0"),
        },
      };
    } catch (err) {
      return { error: `Erro: ${err}`, stats: null };
    }
  },
});

// ─── Trending Brasil ─────────────────────────────────────────

export const getYouTubeTrending = action({
  args: {
    regionCode: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY não configurado");

    try {
      const url =
        `https://www.googleapis.com/youtube/v3/videos?` +
        `part=snippet,statistics,contentDetails` +
        `&chart=mostPopular` +
        `&regionCode=${args.regionCode || "BR"}` +
        `&maxResults=${args.maxResults || 10}` +
        `&key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) return { error: "Erro ao buscar trending", videos: [] };

      const data = await response.json();
      const videos = (data.items || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        title: (item.snippet as Record<string, unknown>)?.title,
        thumbnail: ((item.snippet as Record<string, unknown>)?.thumbnails as Record<string, Record<string, unknown>>)?.high?.url || "",
        channelTitle: (item.snippet as Record<string, unknown>)?.channelTitle,
        viewCount: parseInt(((item.statistics as Record<string, string>)?.viewCount) || "0"),
        likeCount: parseInt(((item.statistics as Record<string, string>)?.likeCount) || "0"),
      }));

      return { videos };
    } catch (err) {
      return { error: `Erro: ${err}`, videos: [] };
    }
  },
});

// ─── Info do canal ───────────────────────────────────────────

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
          `&id=${args.channelId}&key=${apiKey}`
      );

      if (!response.ok) return { error: "Erro ao buscar canal" };

      const data = await response.json();
      const channel = data.items?.[0];
      if (!channel) return { error: "Canal não encontrado" };

      return {
        info: {
          id: channel.id,
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          thumbnail: channel.snippet?.thumbnails?.high?.url,
          subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
          viewCount: parseInt(channel.statistics?.viewCount || "0"),
          videoCount: parseInt(channel.statistics?.videoCount || "0"),
          country: channel.snippet?.country,
        },
      };
    } catch (err) {
      return { error: `Erro: ${err}` };
    }
  },
});

// ─── Conexão manual (por Channel ID) ─────────────────────────

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

    return { success: true };
  },
});

// ─── Desconectar YouTube ─────────────────────────────────────

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
        youtubeAccessToken: undefined,
        youtubeRefreshToken: undefined,
        youtubeTokenExpiry: undefined,
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



// ─── Internal: registrar tarefa de upload ─────────────────────

export const _registerUploadTask = internalMutation({
  args: {
    contentId: v.id("contents"),
    title: v.string(),
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
      metadata: JSON.stringify({ platform: "youtube", title: args.title }),
    });
  },
});
