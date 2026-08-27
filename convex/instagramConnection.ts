import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════
// Instagram Connection — Salvar e testar conexão
// ═══════════════════════════════════════════════════════════════

// ─── Action: Testar token Instagram ──────────────────────────

export const testInstagramToken = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (_ctx, args) => {
    // Buscar info do perfil
    const userRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${args.accessToken}`
    );

    if (!userRes.ok) {
      const err = await userRes.text();
      throw new Error(`Token inválido: ${err}`);
    }

    const userData = await userRes.json();

    // Buscar páginas vinculadas
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${args.accessToken}`
    );

    let pages: Array<{ id: string; name: string; access_token: string }> = [];
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      pages = pagesData.data || [];
    }

    // Para cada página, buscar conta Instagram vinculada
    const results: Array<{
      pageId: string;
      pageName: string;
      igAccountId: string;
      igUsername: string;
    }> = [];

    for (const page of pages) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${args.accessToken}`
      );

      if (igRes.ok) {
        const igData = await igRes.json();
        if (igData.instagram_business_account) {
          results.push({
            pageId: page.id,
            pageName: page.name,
            igAccountId: igData.instagram_business_account.id,
            igUsername: igData.instagram_business_account.username || "",
          });
        }
      }
    }

    return {
      userId: userData.id,
      userName: userData.name,
      pagesFound: pages.length,
      instagramAccounts: results,
      message:
        results.length > 0
          ? `Encontrado(s) ${results.length} Instagram account(s)`
          : "Nenhuma conta Instagram Business vinculada encontrada. Verifique se sua conta é Business/Creator.",
    };
  },
});

// ─── Internal Mutations ─────────────────────────────────────

export const _saveConnection = internalMutation({
  args: {
    accessToken: v.string(),
    instagramAccountId: v.string(),
    instagramUsername: v.optional(v.string()),
    facebookPageId: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Salvar ou atualizar conexão na tabela connections
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "instagram")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        instagramAccessToken: args.accessToken,
        instagramTokenExpiresAt: args.expiresAt,
        facebookPageId: args.facebookPageId,
        instagramAccountId: args.instagramAccountId,
        instagramUsername: args.instagramUsername,
        isActive: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("connections", {
        userId: "default",
        platform: "instagram",
        instagramAccessToken: args.accessToken,
        instagramTokenExpiresAt: args.expiresAt,
        facebookPageId: args.facebookPageId,
        instagramAccountId: args.instagramAccountId,
        instagramUsername: args.instagramUsername,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Atualizar settings
    const settings = await ctx.db
      .query("userSettings")
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        instagramConnected: true,
        instagramAccountId: args.instagramAccountId,
        instagramUsername: args.instagramUsername,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: "default",
        instagramConnected: true,
        instagramAccountId: args.instagramAccountId,
        instagramUsername: args.instagramUsername,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

// ─── Action: Salvar conexão Instagram completa ────────────────

export const saveInstagramConnection = action({
  args: {
    accessToken: v.string(),
    instagramAccountId: v.string(),
    instagramUsername: v.optional(v.string()),
    facebookPageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verificar se o token funciona
    const testRes = await fetch(
      `https://graph.facebook.com/v19.0/${args.instagramAccountId}?fields=username,name,biography,followers_count,media_count,profile_picture_url&access_token=${args.accessToken}`
    );

    let accountInfo = null;
    if (testRes.ok) {
      accountInfo = await testRes.json();
    }

    const username = accountInfo?.username || args.instagramUsername || "";
    const expiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 dias

    // Salvar via internal mutation
    await ctx.runMutation(internal.instagramConnection._saveConnection, {
      accessToken: args.accessToken,
      expiresAt,
      facebookPageId: args.facebookPageId || "",
      instagramAccountId: args.instagramAccountId,
      instagramUsername: username,
    });

    return {
      success: true,
      username,
      followers: accountInfo?.followers_count || 0,
      mediaCount: accountInfo?.media_count || 0,
      biography: accountInfo?.biography || "",
      message: `Instagram @${username} conectado com sucesso!`,
    };
  },
});

// ─── Query: Status da conexão Instagram ──────────────────────

export const getConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const conn = await ctx.db
      .query("connections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", "default").eq("platform", "instagram")
      )
      .first();

    if (!conn || !conn.isActive) {
      return { connected: false };
    }

    const isExpired =
      conn.instagramTokenExpiresAt &&
      conn.instagramTokenExpiresAt < Date.now();

    return {
      connected: true,
      instagramAccountId: conn.instagramAccountId,
      instagramUsername: conn.instagramUsername,
      facebookPageId: conn.facebookPageId,
      isExpired,
      expiresAt: conn.instagramTokenExpiresAt,
    };
  },
});
