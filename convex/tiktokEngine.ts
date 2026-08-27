import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// TikTok Engine — OAuth + Content Posting API
// Uses connections table + contentQueue from new schema
// ═══════════════════════════════════════════════════════════════

// ─── Gerar URL de autorização OAuth ───────────────────────────
export const getTiktokAuthUrl = action({
  args: { redirectUri: v.string() },
  handler: async (_ctx, args) => {
    const clientId = process.env.TIKTOK_CLIENT_KEY;
    if (!clientId) throw new Error("TIKTOK_CLIENT_KEY não configurado");
    const scopes = ["user.info.basic", "video.upload", "video.publish"].join(" ");
    const authUrl =
      `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(args.redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=tiktok_auth`;
    return { authUrl };
  },
});

// ─── Trocar código OAuth por tokens ──────────────────────────
export const exchangeTiktokCode = action({
  args: { code: v.string(), redirectUri: v.string() },
  handler: async (ctx, args) => {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      throw new Error("TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET devem estar configurados");
    }
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey, client_secret: clientSecret,
        code: args.code, grant_type: "authorization_code", redirect_uri: args.redirectUri,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(`Erro TikTok OAuth: ${tokenData.error.message || tokenData.error}`);

    const accessToken = tokenData.data?.access_token;
    const refreshToken = tokenData.data?.refresh_token;
    const openId = tokenData.data?.open_id;
    const expiresIn = tokenData.data?.expires_in || 86400;
    if (!accessToken || !openId) throw new Error("Resposta TikTok inválida");
    const expiresAt = Date.now() + expiresIn * 1000;

    let creatorUsername = "";
    try {
      const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,username", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userResponse.json();
      creatorUsername = userData.data?.user?.display_name || userData.data?.user?.username || "";
    } catch { /* ignora */ }

    const apiMod = await import("./_generated/api");
    await ctx.runMutation(apiMod.api.helpers.saveTiktokTokens, {
      accessToken, refreshToken, expiresAt, openId, creatorUsername,
    });
    return { openId, creatorUsername, connected: true };
  },
});

// ─── Status da conexão TikTok ───────────────────────────────
export const getTiktokStatus = query({
  args: {},
  handler: async (ctx) => {
    const conn = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "tiktok")
      )
      .first();
    return {
      connected: conn?.isActive ?? false,
      username: conn?.tiktokCreatorUsername ?? "",
      openId: conn?.tiktokOpenId ?? "",
      hasToken: !!conn?.tiktokAccessToken,
    };
  },
});

// ─── Desconectar TikTok ─────────────────────────────────────
export const disconnectTiktok = mutation({
  args: {},
  handler: async (ctx) => {
    const conn = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "tiktok")
      )
      .first();
    if (conn) {
      await ctx.db.patch(conn._id, {
        tiktokAccessToken: undefined,
        tiktokRefreshToken: undefined,
        tiktokTokenExpiresAt: undefined as unknown as number,
        tiktokOpenId: undefined,
        tiktokCreatorUsername: undefined,
        isActive: false,
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});

// ─── Publicar vídeo no TikTok ───────────────────────────────
export const publishVideo = action({
  args: {
    videoUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    privacyLevel: v.optional(v.union(
      v.literal("PUBLIC_TO_EVERYONE"), v.literal("MUTUAL_FOLLOW_FRIENDS"), v.literal("SELF_ONLY")
    )),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.runQuery("connections:getByUser" as never, { userId: "default" } as never) as Array<Record<string, unknown>> | null;
    const tiktokConn = connections?.find((c) => c.platform === "tiktok");

    let accessToken = tiktokConn?.tiktokAccessToken as string | undefined;
    if (!accessToken) throw new Error("TikTok não conectado. Conecte sua conta primeiro.");

    // Renovar token inline se expirado
    const expiresAt = tiktokConn?.tiktokTokenExpiresAt as number | undefined;
    if (expiresAt && expiresAt <= Date.now()) {
      const clientKey = process.env.TIKTOK_CLIENT_KEY;
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
      const refreshToken = tiktokConn?.tiktokRefreshToken as string | undefined;
      if (clientKey && clientSecret && refreshToken) {
        const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey, client_secret: clientSecret,
            refresh_token: refreshToken, grant_type: "refresh_token",
          }),
        });
        const data = await response.json();
        if (data.data?.access_token) {
          accessToken = data.data.access_token;
          const newExpiresAt = Date.now() + (data.data.expires_in || 86400) * 1000;
          await ctx.runMutation("helpers:saveTiktokTokens" as never, {
            accessToken: data.data.access_token,
            refreshToken: data.data.refresh_token || refreshToken,
            expiresAt: newExpiresAt,
            openId: data.data.open_id || tiktokConn?.tiktokOpenId || "",
            creatorUsername: tiktokConn?.tiktokCreatorUsername as string | undefined,
          } as never);
        }
      }
    }
    if (!accessToken) throw new Error("Token TikTok inválido ou expirado");

    const initResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        post_info: { title: args.title, description: args.description || args.title, privacy_level: args.privacyLevel || "PUBLIC_TO_EVERYONE" },
        source_info: { source: "URL", video_url: args.videoUrl },
      }),
    });
    const initData = await initResponse.json();

    if (initData.data?.publish_id) {
      const now = Date.now();
      const contentResult = await ctx.runMutation("contentQueue:create" as never, {
        userId: "default",
        title: args.title,
        description: args.description || args.title,
        platform: "tiktok",
        contentType: "short",
        status: "draft",
        source: "ai_generated",
        videoUrl: args.videoUrl,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      } as never);
      return {
        success: true, publishId: initData.data.publish_id,
        videoUrl: `https://tiktok.com/@${(tiktokConn?.tiktokCreatorUsername as string) || "user"}/video/${initData.data.publish_id}`,
        contentId: contentResult,
      };
    }
    if (initData.error) throw new Error(`Erro TikTok Upload: ${initData.error.message || JSON.stringify(initData.error)}`);
    throw new Error("Resposta inesperada do TikTok");
  },
});
