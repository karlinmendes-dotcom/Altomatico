import { v } from "convex/values";
import { action, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════
// TikTok Connection — OAuth + Token Management
// ═══════════════════════════════════════════════════════════════

// ─── Action: Gerar URL de autorização TikTok ─────────────────

export const getTiktokAuthUrl = action({
  args: {
    redirectUri: v.string(),
  },
  handler: async (_ctx, args) => {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) throw new Error("TIKTOK_CLIENT_KEY não configurada no servidor");

    const scopes = [
      "user.info.basic",
      "user.info.profile",
      "video.publish",
      "video.list",
    ].join(",");

    const authUrl =
      `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(args.redirectUri)}` +
      `&state=altomatico_tt`;

    return { authUrl };
  },
});

// ─── Action: Testar token TikTok ─────────────────────────────

export const testTiktokToken = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,video_count,likes_count",
      {
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Token inválido: ${err}`);
    }

    const data = await res.json();
    const user = data.data?.user;

    if (!user) {
      throw new Error("Não foi possível obter dados do perfil");
    }

    return {
      openId: user.open_id || "",
      displayName: user.display_name || "",
      avatarUrl: user.avatar_url || "",
      followerCount: user.follower_count || 0,
      videoCount: user.video_count || 0,
      likesCount: user.likes_count || 0,
      message: `Conta TikTok @${user.display_name} encontrada!`,
    };
  },
});

// ─── Action: Salvar conexão TikTok ───────────────────────────

export const saveTiktokConnection = action({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    openId: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    followerCount: v.optional(v.number()),
    expiresAt: v.number(),
    refreshExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Salvar via internal mutation
    await ctx.runMutation(internal.tiktokConnection._saveConnection, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      openId: args.openId,
      displayName: args.displayName || "",
      avatarUrl: args.avatarUrl || "",
      followerCount: args.followerCount || 0,
      expiresAt: args.expiresAt,
      refreshExpiresAt: args.refreshExpiresAt,
    });

    return {
      success: true,
      displayName: args.displayName,
      followerCount: args.followerCount,
      message: `TikTok @${args.displayName} conectado com sucesso!`,
    };
  },
});

// ─── Action: Refresh token TikTok ────────────────────────────

export const refreshTiktokToken = action({
  args: {
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      throw new Error("TikTok credentials não configuradas");
    }

    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: args.refreshToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro ao renovar token: ${err}`);
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 86400;
    const refreshExpiresIn = data.refresh_expires_in || 86400 * 30;

    const expiresAt = Date.now() + expiresIn * 1000;
    const refreshExpiresAt = Date.now() + refreshExpiresIn * 1000;

    // Atualizar no banco
    await ctx.runMutation(internal.tiktokConnection._updateTokens, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken || args.refreshToken,
      expiresAt,
      refreshExpiresAt,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      expiresAt,
      message: "Token renovado com sucesso!",
    };
  },
});

// ─── Internal Mutations ──────────────────────────────────────

export const _saveConnection = internalMutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    openId: v.string(),
    displayName: v.string(),
    avatarUrl: v.string(),
    followerCount: v.number(),
    expiresAt: v.number(),
    refreshExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Salvar ou atualizar conexão
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "tiktok")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tiktokAccessToken: args.accessToken,
        tiktokRefreshToken: args.refreshToken,
        tiktokTokenExpiresAt: args.expiresAt,
        tiktokOpenId: args.openId,
        tiktokCreatorUsername: args.displayName,
        isActive: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("connections", {
        userId: "default",
        platform: "tiktok",
        tiktokAccessToken: args.accessToken,
        tiktokRefreshToken: args.refreshToken,
        tiktokTokenExpiresAt: args.expiresAt,
        tiktokOpenId: args.openId,
        tiktokCreatorUsername: args.displayName,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const _updateTokens = internalMutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    refreshExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const conn = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "tiktok")
      )
      .first();

    if (conn) {
      await ctx.db.patch(conn._id, {
        tiktokAccessToken: args.accessToken,
        tiktokRefreshToken: args.refreshToken,
        tiktokTokenExpiresAt: args.expiresAt,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ─── Query: Status da conexão TikTok ─────────────────────────

export const getConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const conn = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "tiktok")
      )
      .first();

    if (!conn || !conn.isActive) {
      return { connected: false };
    }

    const isExpired =
      conn.tiktokTokenExpiresAt &&
      conn.tiktokTokenExpiresAt < Date.now();

    return {
      connected: true,
      openId: conn.tiktokOpenId,
      username: conn.tiktokCreatorUsername,
      isExpired,
      expiresAt: conn.tiktokTokenExpiresAt,
    };
  },
});
