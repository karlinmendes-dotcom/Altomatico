import { NextRequest, NextResponse } from 'next/server'

/**
 * TikTok Token Refresh
 * 
 * TikTok access tokens expire in 24h but refresh tokens last ~30 days.
 * This route refreshes the access token using the refresh_token.
 */
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token não fornecido' }, { status: 400 })
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET

    if (!clientKey || !clientSecret) {
      return NextResponse.json({ error: 'TikTok Client Key ou Secret não configurado' }, { status: 500 })
    }

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('TikTok refresh error:', errText)
      return NextResponse.json(
        { error: 'Falha ao renovar token. Reconecte manualmente.' },
        { status: 401 }
      )
    }

    const data = await tokenRes.json()

    return NextResponse.json({
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 86400,
      refreshExpiresIn: data.refresh_expires_in || 86400 * 30,
      expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
      refreshExpiresAt: Date.now() + (data.refresh_expires_in || 86400 * 30) * 1000,
    })
  } catch (err) {
    console.error('TikTok refresh error:', err)
    return NextResponse.json(
      { error: 'Erro interno ao renovar token' },
      { status: 500 }
    )
  }
}
