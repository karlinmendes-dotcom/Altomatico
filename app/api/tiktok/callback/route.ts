import { NextRequest, NextResponse } from "next/server";

/**
 * TikTok OAuth Callback
 *
 * Fluxo:
 * 1. Usuário clica "Conectar TikTok" → redireciona para TikTok OAuth
 * 2. TikTok redireciona para esta rota com ?code=...
 * 3. Trocamos code por access_token + refresh_token
 * 4. Buscamos informações do perfil
 * 5. Salvamos no Convex e redirecionamos
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/connections?tiktok_error=${encodeURIComponent(error)}`,
        baseUrl
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/connections?tiktok_error= Código de autorização não recebido",
        baseUrl
      )
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/connections?tiktok_error= TikTok Client Key ou Secret não configurado",
        baseUrl
      )
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/tiktok/callback`;

    // Passo 1: Trocar code por tokens
    const tokenRes = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("TikTok token exchange error:", errText);
      return NextResponse.redirect(
        new URL(
          `/dashboard/connections?tiktok_error=${encodeURIComponent("Falha ao obter token: " + errText)}`,
          baseUrl
        )
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const openId = tokenData.open_id;
    const expiresIn = tokenData.expires_in || 86400;
    const refreshExpiresIn = tokenData.refresh_expires_in || 86400 * 30;

    // Passo 2: Buscar informações do perfil
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,video_count",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let displayName = "";
    let avatarUrl = "";
    let followerCount = 0;

    if (userRes.ok) {
      const userData = await userRes.json();
      const user = userData.data?.user;
      if (user) {
        displayName = user.display_name || "";
        avatarUrl = user.avatar_url || "";
        followerCount = user.follower_count || 0;
      }
    }

    const expiresAt = Date.now() + expiresIn * 1000;
    const refreshExpiresAt = Date.now() + refreshExpiresIn * 1000;

    // Passo 3: Redirecionar com dados
    const params = new URLSearchParams({
      tiktok_connected: "true",
      token: accessToken,
      refresh_token: refreshToken || "",
      open_id: openId || "",
      display_name: displayName,
      avatar_url: avatarUrl,
      follower_count: followerCount.toString(),
      expires_at: expiresAt.toString(),
      refresh_expires_at: refreshExpiresAt.toString(),
    });

    return NextResponse.redirect(
      new URL(`/dashboard/connections?${params.toString()}`, baseUrl)
    );
  } catch (err) {
    console.error("TikTok OAuth error:", err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/connections?tiktok_error=${encodeURIComponent("Erro interno: " + String(err))}`,
        baseUrl
      )
    );
  }
}
