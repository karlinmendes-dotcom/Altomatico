import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga Image Proxy — Bypass CORS para imagens de mangá
// Busca imagens de CDNs externos e retorna com CORS headers
// Necessário porque Canvas API requer crossOrigin='anonymous'
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  // Validar que é uma URL de imagem permitida
  let parsedUrl: URL
  try {
    parsedUrl = new URL(imageUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Whitelist de domínios permitidos
  const allowedDomains = [
    'mangadex.network',
    'mangadex.org',
    'img1mw.xyz',
    'imagizer.imageshack.com',
    'picsum.photos',
  ]

  const isAllowed = allowedDomains.some(domain => parsedUrl.hostname.includes(domain))
  if (!isAllowed) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': parsedUrl.origin + '/',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.status}` }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    )
  }
}
