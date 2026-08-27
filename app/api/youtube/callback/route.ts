import { NextRequest, NextResponse } from "next/server";

/**
 * YouTube OAuth Callback
 *
 * 1. Facebook redireciona com code
 * 2. Trocamos por token
 * 3. Buscamos info do canal
 * 4. Salvamos e redirecionamos
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/connections?youtube_error=${encodeURIComponent(error)}`,
        baseUrl
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/connections?youtube_error= Código de autorização não recebido",
        baseUrl
      )
    );
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/connections?youtube_error= YouTube Client ID ou Secret não configurado",
        baseUrl
      )
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/youtube/callback`;

    // Trocar code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(
        new URL(
          `/dashboard/connections?youtube_error=${encodeURIComponent("Falha ao obter token: " + errText)}`,
          baseUrl
        )
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Buscar informações do canal
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&access_token=${accessToken}`
    );

    let channelId = "";
    let channelName = "";
    let channelThumbnail = "";

    if (channelRes.ok) {
      const channelData = await channelRes.json();
      const items = channelData.items || [];
      if (items.length > 0) {
        channelId = items[0].id;
        channelName = items[0].snippet?.title || "";
        channelThumbnail =
          items[0].snippet?.thumbnails?.default?.url || "";
      }
    }

    const params = new URLSearchParams({
      youtube_connected: "true",
      token: accessToken,
      refresh_token: refreshToken || "",
      channel_id: channelId,
      channel_name: channelName,
      channel_thumbnail: channelThumbnail,
      expires_at: expiresAt.toString(),
    });

    return NextResponse.redirect(
      new URL(`/dashboard/connections?${params.toString()}`, baseUrl)
    );
  } catch (err) {
    console.error("YouTube OAuth error:", err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/connections?youtube_error=${encodeURIComponent("Erro interno: " + String(err))}`,
        baseUrl
      )
    );
  }
}
