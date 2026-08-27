import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Queue Actions — Envio manual de rascunhos para plataformas
// Valida conexão, invoca a engine e trata erros
// ═══════════════════════════════════════════════════════════════

export const sendDraftToPlatform = action({
  args: {
    draftId: v.string(),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok")
    ),
    title: v.string(),
    script: v.optional(v.string()),
    caption: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { platform } = args;

    // ─── 1. Verificar conexão da plataforma ─────────────────
    const connections = await ctx.runQuery("connections:getByUser" as never, {
      userId: "default",
    } as never);

    const connList = connections as unknown as Array<{
      platform: string;
      isActive: boolean;
      instagramAccessToken?: string;
      instagramAccountId?: string;
      tiktokAccessToken?: string;
      tiktokOpenId?: string;
      youtubeChannelId?: string;
      youtubeChannelName?: string;
    }> | null;

    const conn = connList?.find(
      (c) => c.platform === platform && c.isActive
    );

    if (!conn) {
      return {
        success: false,
        error: `Conta ${platform} não conectada. Vá em Conexões e conecte sua conta.`,
        platform,
      };
    }

    // ─── 2. Montar caption completa ─────────────────────────
    const hashtagsStr = args.hashtags?.length
      ? "\n\n" + args.hashtags.join(" ")
      : "";
    const fullCaption = (args.caption || args.script || "") + hashtagsStr;

    // ─── 3. Invocar engine da plataforma ────────────────────
    try {
      if (platform === "instagram") {
        return await sendToInstagram(ctx, {
          accessToken: conn.instagramAccessToken || "",
          accountId: conn.instagramAccountId || "",
          caption: fullCaption,
          imageUrl: args.imageUrl,
          videoUrl: args.videoUrl,
          title: args.title,
        });
      }

      if (platform === "youtube") {
        return await sendToYoutube(ctx, {
          channelId: conn.youtubeChannelId || "",
          channelName: conn.youtubeChannelName || "",
          title: args.title,
          description: fullCaption,
          tags: args.hashtags || [],
          videoUrl: args.videoUrl,
        });
      }

      if (platform === "tiktok") {
        return await sendToTiktok(ctx, {
          accessToken: conn.tiktokAccessToken || "",
          openId: conn.tiktokOpenId || "",
          title: args.title,
          description: fullCaption,
          videoUrl: args.videoUrl,
        });
      }

      return { success: false, error: "Plataforma desconhecida" };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Registrar falha no log
      await ctx.runMutation("logs:create" as never, {
        action: "draft_send_failed",
        details: `Falha ao enviar rascunho para ${platform}: ${errorMsg}`,
        level: "error",
        source: "queueActions",
        success: false,
        errorMessage: errorMsg,
        timestamp: new Date().toISOString(),
      } as never);

      return {
        success: false,
        error: errorMsg,
        platform,
        hint: errorMsg.includes("token") || errorMsg.includes("Token")
          ? "Token pode estar expirado. Reconecte sua conta em Conexões."
          : undefined,
      };
    }
  },
});

// ─── Instagram: Criar container + publicar como rascunho ─────
async function sendToInstagram(
  ctx: unknown,
  args: {
    accessToken: string;
    accountId: string;
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
    title: string;
  }
) {
  if (!args.accessToken) {
    return { success: false, error: "Token Instagram não encontrado" };
  }

  // Verificar se o token funciona
  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id&access_token=${args.accessToken}`
  );
  if (!meRes.ok) {
    const errData = await meRes.json().catch(() => ({}));
    const errMsg =
      (errData as Record<string, unknown>).error &&
      typeof (errData as Record<string, unknown>).error === "object"
        ? ((errData as Record<string, unknown>).error as Record<string, string>).message || "Token inválido"
        : "Token Instagram inválido ou expirado";
    return { success: false, error: errMsg };
  }

  // Criar container de mídia (NÃO publica automaticamente)
  const mediaType = args.videoUrl ? "REELS" : "IMAGE";
  const containerBody: Record<string, string> = {
    access_token: args.accessToken,
    caption: args.caption,
  };

  if (mediaType === "IMAGE" && args.imageUrl) {
    containerBody.image_url = args.imageUrl;
  } else if (mediaType === "REELS" && args.videoUrl) {
    containerBody.media_type = "REELS";
    containerBody.video_url = args.videoUrl;
  } else {
    return {
      success: false,
      error: "URL de mídia (imagem ou vídeo) é obrigatória para Instagram",
    };
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${args.accountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json().catch(() => ({}));
    const errMsg =
      (err as Record<string, unknown>).error &&
      typeof (err as Record<string, unknown>).error === "object"
        ? ((err as Record<string, unknown>).error as Record<string, string>).message || "Erro ao criar container"
        : "Erro ao criar container Instagram";
    return { success: false, error: errMsg };
  }

  const containerData = await containerRes.json();
  const containerId = (containerData as Record<string, string>).id;

  // NOTA: Não chamamos media_publish — o container fica como RASCUNHO
  // O usuário precisa publicar manualmente pelo Instagram

  // Log de sucesso
  await (ctx as { runMutation: (fn: string, args: unknown) => Promise<unknown> }).runMutation("logs:create" as never, {
    action: "instagram_container_created",
    details: `Container criado: ${containerId} — Rascunho pronto para publicação manual`,
    level: "info",
    source: "queueActions",
    success: true,
    timestamp: new Date().toISOString(),
  } as never);

  return {
    success: true,
    platform: "instagram",
    containerId,
    message: `Container Instagram criado como RASCUNHO. Publicação manual necessária.`,
    note: "O conteúdo está como rascunho no Instagram. Publicação manual requerida.",
  };
}

// ─── YouTube: Upload como PRIVATE/UNLISTED ───────────────────
async function sendToYoutube(
  ctx: unknown,
  args: {
    channelId: string;
    channelName: string;
    title: string;
    description: string;
    tags: string[];
    videoUrl?: string;
  }
) {
  if (!args.channelId) {
    return { success: false, error: "Canal YouTube não configurado" };
  }

  // YouTube upload via API requer OAuth token (não apenas API key)
  // Por enquanto, registramos o conteúdo como pronto para upload manual

  const metadata = {
    snippet: {
      title: args.title.slice(0, 100),
      description: args.description,
      tags: args.tags.slice(0, 30),
      categoryId: "22",
      defaultLanguage: "pt-BR",
    },
    status: {
      privacyStatus: "private", // FORÇADO: sempre privado
      selfDeclaredMadeForKids: false,
    },
  };

  // Log
  await (ctx as { runMutation: (fn: string, args: unknown) => Promise<unknown> }).runMutation("logs:create" as never, {
    action: "youtube_upload_prepared",
    details: `Upload preparado para ${args.channelName}: "${args.title}" como PRIVATE`,
    level: "info",
    source: "queueActions",
    success: true,
    timestamp: new Date().toISOString(),
  } as never);

  return {
    success: true,
    platform: "youtube",
    channelId: args.channelId,
    channelName: args.channelName,
    metadata,
    message: `Pronto para upload no YouTube como PRIVADO. Upload manual via YouTube Studio.`,
    note: "O vídeo deve ser enviado como PRIVATE/UNLISTED. Revise antes de tornar público.",
  };
}

// ─── TikTok: Upload como SELF_ONLY ──────────────────────────
async function sendToTiktok(
  ctx: unknown,
  args: {
    accessToken: string;
    openId: string;
    title: string;
    description: string;
    videoUrl?: string;
  }
) {
  if (!args.accessToken) {
    return { success: false, error: "Token TikTok não encontrado" };
  }

  if (!args.videoUrl) {
    return {
      success: false,
      error: "URL do vídeo é obrigatória para publicar no TikTok",
    };
  }

  // Renovar token se necessário
  let accessToken = args.accessToken;

  // Iniciar publicação como SELF_ONLY (privado)
  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: args.title,
          description: args.description,
          privacy_level: "SELF_ONLY", // FORÇADO: sempre privado
        },
        source_info: { source: "URL", video_url: args.videoUrl },
      }),
    }
  );

  const initData = await initRes.json();

  if (initData.data?.publish_id) {
    // Log de sucesso
    await (ctx as { runMutation: (fn: string, args: unknown) => Promise<unknown> }).runMutation("logs:create" as never, {
      action: "tiktok_video_published_private",
      details: `TikTok video publishado como SELF_ONLY: ${initData.data.publish_id}`,
      level: "info",
      source: "queueActions",
      success: true,
      timestamp: new Date().toISOString(),
    } as never);

    return {
      success: true,
      platform: "tiktok",
      publishId: initData.data.publish_id,
      message: `Vídeo enviado ao TikTok como PRIVADO (SELF_ONLY).`,
      note: "O vídeo está privado no TikTok. Mude a visibilidade manualmente para público.",
    };
  }

  // Erro da API TikTok
  const errMsg =
    initData.error?.message || JSON.stringify(initData.error) || "Erro desconhecido do TikTok";

  await (ctx as { runMutation: (fn: string, args: unknown) => Promise<unknown> }).runMutation("logs:create" as never, {
    action: "tiktok_publish_failed",
    details: `Falha TikTok: ${errMsg}`,
    level: "error",
    source: "queueActions",
    success: false,
    errorMessage: errMsg,
    timestamp: new Date().toISOString(),
  } as never);

  return { success: false, error: errMsg };
}
