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

  // Whitelist de domínios permitidos (MangaDex + ManhwaWeb + CDNs genéricos)
  const allowedDomains = [
    // MangaDex CDNs
    'mangadex.network',
    'mangadex.org',
    'uploads.mangadex.org',
    // ManhwaWeb / manhwaweb
    'manhwaweb',
    'manhwawebbackend',
    'railway.app',
    // CDNs de imagens de mangá/manhwa
    'img1mw.xyz',
    'img PictureBox',
    'imagizer.imageshack.com',
    'picsum.photos',
    'cloudfront.net',
    'imgbox.com',
    'flickr.com',
    'staticflickr.com',
    'cdn.discordapp.com',
    'wordpress.com',
    'wp.com',
    'blogspot.com',
    'blogger.com',
    // CDNs genéricos de imagens
    'imgur.com',
    'i.imgur.com',
    'postimages.org',
    'ibb.co',
    'thumbs2.imgbox.com',
    'direct',
    // MangaDex CDN prefix patterns
    'ax.',
    'mg.',
  ]

  const isAllowed = allowedDomains.some(domain => parsedUrl.hostname.includes(domain)) ||
    parsedUrl.hostname.endsWith('.mangadex.network') ||
    parsedUrl.hostname.endsWith('.mangadex.org') ||
    parsedUrl.hostname.endsWith('.mangadex.com') ||
    parsedUrl.hostname.endsWith('.railway.app')
  if (!isAllowed) {
    console.error(`[manga-proxy] Domain blocked: ${parsedUrl.hostname}`)
    return NextResponse.json({ error: `Domain not allowed: ${parsedUrl.hostname}` }, { status: 403 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

    // Determinar o Referer correto baseado no domínio da imagem
    const hostname = parsedUrl.hostname.toLowerCase()
    let referer = parsedUrl.origin + '/'
    if (hostname.includes('img1mw') || hostname.includes('manhwaweb')) {
      referer = 'https://manhwaweb.com/'
    } else if (hostname.includes('mangadex')) {
      referer = 'https://mangadex.org/'
    }

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })
    clearTimeout(timeout)

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
