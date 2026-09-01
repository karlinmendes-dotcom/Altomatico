import { NextRequest, NextResponse } from "next/server";

/**
 * YouTube OAuth — Inicia o fluxo de autorização
 * Redireciona para o Google Consent Screen com escopos de upload
 */
export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const clientId = process.env.YOUTUBE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/connections?youtube_error=YOUTUBE_CLIENT_ID não configurado. Adicione nas variáveis de ambiente.",
        baseUrl
      )
    );
  }

  const redirectUri = `${baseUrl}/api/youtube/callback`;

  // Escopos necessários para upload de vídeos
  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", "youtube_upload");

  return NextResponse.redirect(authUrl.toString());
}
