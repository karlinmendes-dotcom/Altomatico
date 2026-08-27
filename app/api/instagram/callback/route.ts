import { NextRequest, NextResponse } from "next/server";

/**
 * Instagram Graph API OAuth Callback
 *
 * Fluxo:
 * 1. Usuário clica "Conectar Instagram" → redireciona para Facebook OAuth
 * 2. Facebook redireciona para esta rota com ?code=...
 * 3. Trocamos code por short-lived token
 * 4. Trocamos short-lived por long-lived token
 * 5. Buscamos informações da conta Instagram
 * 6. Salvamos no Convex e redirecionamos para /dashboard/connections
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = request.nextUrl.origin;

  // Se houve erro no OAuth
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/connections?instagram_error=${encodeURIComponent(error)}`,
        baseUrl
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/connections?instagram_error= Código de autorização não recebido",
        baseUrl
      )
    );
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/connections?instagram_error= Facebook App ID ou Secret não configurado no servidor",
        baseUrl
      )
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/instagram/callback`;

    // Passo 1: Trocar code por short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Token exchange error:", errText);
      return NextResponse.redirect(
        new URL(
          `/dashboard/connections?instagram_error=${encodeURIComponent("Falha ao trocar código por token: " + errText)}`,
          baseUrl
        )
      );
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    // Passo 2: Trocar short-lived por long-lived token
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );

    let longLivedToken = shortLivedToken;
    if (longTokenRes.ok) {
      const longData = await longTokenRes.json();
      longLivedToken = longData.access_token || shortLivedToken;
    }

    // Passo 3: Buscar páginas do Facebook vinculadas
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
    );

    let pageId = "";
    let pageToken = longLivedToken;

    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      const pages = pagesData.data || [];
      if (pages.length > 0) {
        pageId = pages[0].id;
        pageToken = pages[0].access_token || longLivedToken;
      }
    }

    // Passo 4: Buscar informações da conta Instagram vinculada à página
    let instagramAccountId = "";
    let instagramUsername = "";

    if (pageId) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
      );

      if (igRes.ok) {
        const igData = await igRes.json();
        if (igData.instagram_business_account) {
          instagramAccountId = igData.instagram_business_account.id;

          // Buscar username
          const igInfoRes = await fetch(
            `https://graph.facebook.com/v19.0/${instagramAccountId}?fields=username&access_token=${pageToken}`
          );
          if (igInfoRes.ok) {
            const igInfo = await igInfoRes.json();
            instagramUsername = igInfo.username || "";
          }
        }
      }
    }

    // Passo 5: Calcular expiração (60 dias para long-lived)
    const expiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000;

    // Passo 6: Redirecionar com dados na URL (via state/params)
    // O frontend vai pegar esses parâmetros e salvar no Convex
    const params = new URLSearchParams({
      instagram_connected: "true",
      token: longLivedToken,
      page_id: pageId,
      page_token: pageToken,
      ig_account_id: instagramAccountId,
      ig_username: instagramUsername,
      expires_at: expiresAt.toString(),
    });

    return NextResponse.redirect(
      new URL(`/dashboard/connections?${params.toString()}`, baseUrl)
    );
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/connections?instagram_error=${encodeURIComponent("Erro interno: " + String(err))}`,
        baseUrl
      )
    );
  }
}
