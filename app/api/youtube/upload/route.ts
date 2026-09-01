import { NextRequest, NextResponse } from "next/server";

/**
 * YouTube Upload — Envia vídeo para o YouTube via Data API v3
 * Usa upload resumable com OAuth 2.0
 *
 * O cliente envia:
 * - video: arquivo binário do vídeo (FormData)
 * - title, description, tags, privacyStatus
 * - accessToken: token OAuth do YouTube
 * - refreshToken: token de refresh (opcional, para renovar)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const videoFile = formData.get("video") as File | null;
    const title = (formData.get("title") as string) || "Mangá Video";
    const description = (formData.get("description") as string) || "";
    const tags = (formData.get("tags") as string) || "";
    const privacyStatus = (formData.get("privacyStatus") as string) || "private";
    const accessToken = formData.get("accessToken") as string | null;
    const refreshToken = formData.get("refreshToken") as string | null;

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: "Nenhum vídeo enviado" },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Token de acesso YouTube não fornecido",
          hint: "Conecte sua conta YouTube via OAuth em Conexões antes de enviar.",
        },
        { status: 401 }
      );
    }

    console.log(`[youtube-upload] Iniciando upload: "${title}" (${(videoFile.size / 1024 / 1024).toFixed(1)}MB)`);

    // ─── Montar metadados do vídeo ─────────────────────────
    const videoMetadata = {
      snippet: {
        title: title.slice(0, 100), // YouTube limit: 100 chars
        description: description.slice(0, 5000), // YouTube limit: 5000 chars
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30), // YouTube limit: 30 tags
        categoryId: "24", // Entertainment
      },
      status: {
        privacyStatus: privacyStatus as "public" | "private" | "unlisted",
        selfDeclaredMadeForKids: false,
        // Shorts-friendly: não definir embeddable (YouTube detecta automaticamente)
      },
    };

    // ─── Passo 1: Iniciar sessão de upload resumável ───────
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": videoFile.type || "video/webm",
          "X-Upload-Content-Length": String(videoFile.size),
        },
        body: JSON.stringify(videoMetadata),
      }
    );

    if (initRes.status === 401 && refreshToken) {
      // Token expirado — tentar renovar
      console.log("[youtube-upload] Token expirado, renovando...");
      const refreshed = await refreshYouTubeToken(refreshToken);
      if (refreshed) {
        // Retry com novo token
        const retryRes = await fetch(
          "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${refreshed.accessToken}`,
              "Content-Type": "application/json; charset=UTF-8",
              "X-Upload-Content-Type": videoFile.type || "video/webm",
              "X-Upload-Content-Length": String(videoFile.size),
            },
            body: JSON.stringify(videoMetadata),
          }
        );

        if (!retryRes.ok) {
          const errText = await retryRes.text();
          console.error("[youtube-upload] Retry failed:", errText);
          return NextResponse.json(
            { success: false, error: `Upload falhou após renovação: ${retryRes.status}` },
            { status: 502 }
          );
        }

        const uploadUrl = retryRes.headers.get("Location");
        if (!uploadUrl) {
          return NextResponse.json(
            { success: false, error: "YouTube não retornou URL de upload" },
            { status: 502 }
          );
        }

        // Upload com novo token
        return await uploadVideoToUrl(uploadUrl, videoFile, refreshed.accessToken);
      }
    }

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error("[youtube-upload] Init error:", errText);
      return NextResponse.json(
        {
          success: false,
          error: `Falha ao iniciar upload: ${initRes.status}`,
          details: errText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      return NextResponse.json(
        { success: false, error: "YouTube não retornou URL de upload" },
        { status: 502 }
      );
    }

    // ─── Passo 2: Enviar o vídeo ──────────────────────────
    return await uploadVideoToUrl(uploadUrl, videoFile, accessToken);

  } catch (error) {
    console.error("[youtube-upload] Erro:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}

// ─── Upload do vídeo para a URL resumável ──────────────────
async function uploadVideoToUrl(
  uploadUrl: string,
  videoFile: File,
  accessToken: string
): Promise<NextResponse> {
  const arrayBuffer = await videoFile.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": videoFile.type || "video/webm",
      "Content-Length": String(arrayBuffer.byteLength),
    },
    body: arrayBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error("[youtube-upload] Upload error:", errText);
    return NextResponse.json(
      { success: false, error: `Upload falhou: ${uploadRes.status}`, details: errText.slice(0, 500) },
      { status: 502 }
    );
  }

  const result = await uploadRes.json();
  const videoId = result.id;

  console.log(`[youtube-upload] ✅ Upload concluído! Video ID: ${videoId}`);

  return NextResponse.json({
    success: true,
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    message: `Vídeo enviado para o YouTube como ${result.status?.privacyStatus || "privado"}`,
    title: result.snippet?.title,
    status: result.status?.privacyStatus,
  });
}

// ─── Renovar token YouTube via refresh_token ───────────────
async function refreshYouTubeToken(
  refreshToken: string
): Promise<{ accessToken: string } | null> {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return { accessToken: data.access_token };
  } catch {
    return null;
  }
}
