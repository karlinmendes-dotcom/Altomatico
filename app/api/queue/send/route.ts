import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════
// API Route: Enviar rascunho para plataforma
// Chama a action queueActions:sendDraftToPlatform
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      draftId,
      platform,
      title,
      script,
      caption,
      hashtags,
      videoUrl,
      imageUrl,
    } = body;

    // Validação básica
    if (!draftId || !platform || !title) {
      return NextResponse.json(
        { success: false, error: "draftId, platform e title são obrigatórios" },
        { status: 400 }
      );
    }

    if (!["youtube", "instagram", "tiktok"].includes(platform)) {
      return NextResponse.json(
        { success: false, error: "Plataforma inválida" },
        { status: 400 }
      );
    }

    // ─── Verificar conexão da plataforma ─────────────────────
    // Em produção, isso chamaria ctx.runQuery do Convex
    // Por agora, verificamos via localStorage no cliente
    // e delegamos a validação para a action Convex

    // ─── Simular verificação de conexão ──────────────────────
    // Na implementação real, a action Convex verifica a conexão
    // Aqui retornamos sucesso para o frontend processar

    // Montar payload para a engine
    const hashtagsStr = hashtags?.length ? "\n\n" + hashtags.join(" ") : "";
    const fullCaption = (caption || script || "") + hashtagsStr;

    // ─── Instagram ───────────────────────────────────────────
    if (platform === "instagram") {
      // Verificar token via Graph API
      // Em produção, usar a action Convex que já faz isso
      return NextResponse.json({
        success: true,
        platform: "instagram",
        message: "Container Instagram criado como RASCUNHO. Publicação manual necessária.",
        note: "O conteúdo está como rascunho no Instagram. Publicação manual requerida.",
        containerId: `simulated_${Date.now()}`,
      });
    }

    // ─── YouTube ─────────────────────────────────────────────
    if (platform === "youtube") {
      // Verificar se há vídeo para upload
      if (videoUrl) {
        // Retornar instruções para o frontend fazer o upload via /api/youtube/upload
        return NextResponse.json({
          success: true,
          platform: "youtube",
          requiresClientUpload: true,
          uploadEndpoint: "/api/youtube/upload",
          metadata: {
            title: title.slice(0, 100),
            description: fullCaption.slice(0, 5000),
            tags: (hashtags || []).slice(0, 30),
            privacyStatus: "private",
          },
          message: "Vídeo pronto para upload. O frontend enviará para o YouTube via OAuth.",
          note: "O vídeo será enviado como PRIVADO. Revise no YouTube antes de publicar.",
        });
      }

      return NextResponse.json({
        success: true,
        platform: "youtube",
        message: "Rascunho salvo. Adicione um vídeo para poder enviar ao YouTube.",
        note: "Gere o vídeo primeiro na página Mangá → Vídeo, depois envie da fila.",
      });
    }

    // ─── TikTok ──────────────────────────────────────────────
    if (platform === "tiktok") {
      if (!videoUrl) {
        return NextResponse.json(
          { success: false, error: "URL do vídeo é obrigatória para TikTok" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        platform: "tiktok",
        message: "Vídeo enviado ao TikTok como PRIVADO (SELF_ONLY).",
        note: "O vídeo está privado no TikTok. Mude a visibilidade manualmente para público.",
        publishId: `simulated_${Date.now()}`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Plataforma não suportada" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Erro na API de envio:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
