import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga Scraper Multi-Site — Extrai imagens de mangá/manhwa
// Suporta: MangaDex API, ManhwaWeb API, ZonaTMO API, HTML genérico
// ═══════════════════════════════════════════════════════════════

interface ScrapeResult {
  success: boolean
  images: string[]
  title: string
  source: string
  totalPages: number
  error?: string
  dialogues?: string[] // Textos traduzidos por página (opcional)
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
}

// ═══════════════════════════════════════════════════════════════
// SITE 1: MangaDex API (público, sem autenticação)
// URLs: mangadex.org/title/[id]/[slug] ou mangadex.org/chapter/[id]
// ═══════════════════════════════════════════════════════════════
async function scrapeMangadex(url: string, customTitle?: string): Promise<ScrapeResult> {
  const parsedUrl = new URL(url)
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean)

  let mangaId: string | null = null
  let chapterId: string | null = null

  if (pathParts[0] === 'chapter' && pathParts[1]) {
    chapterId = pathParts[1]
  } else if (pathParts[0] === 'title' && pathParts[1]) {
    mangaId = pathParts[1]
  } else {
    const uuidMatch = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuidMatch) {
      chapterId = pathParts.includes('chapter') ? uuidMatch[0] : null
      mangaId = pathParts.includes('title') ? uuidMatch[0] : null
    }
  }

  const apiHeaders = { 'User-Agent': 'Altomatico/1.0' }

  if (chapterId) {
    const chRes = await fetch(`https://api.mangadex.org/chapter/${chapterId}?includes[]=manga`, { headers: apiHeaders })
    if (chRes.ok) {
      const chData = await chRes.json()
      const mangaRel = chData.data?.relationships?.find((r: { type: string }) => r.type === 'manga')
      mangaId = mangaRel?.id || null
    }
  }

  if (!chapterId && mangaId) {
    const feedRes = await fetch(
      `https://api.mangadex.org/manga/${mangaId}/feed?limit=1&order[chapter]=asc&translatedLanguage[]=en&translatedLanguage[]=pt-br`,
      { headers: apiHeaders }
    )
    if (feedRes.ok) {
      const feedData = await feedRes.json()
      if (feedData.data?.length > 0) chapterId = feedData.data[0].id
    }
  }

  if (!chapterId) {
    return { success: false, images: [], title: customTitle || 'Manga', source: 'mangadex', totalPages: 0, error: 'Não foi possível encontrar um capítulo no MangaDex.' }
  }

  const atHomeRes = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, { headers: apiHeaders })
  if (!atHomeRes.ok) {
    return { success: false, images: [], title: customTitle || 'Manga', source: 'mangadex', totalPages: 0, error: 'Falha ao buscar imagens do capítulo.' }
  }

  const atHomeData = await atHomeRes.json()
  const baseUrl = atHomeData.baseUrl || ''
  const hash = atHomeData.chapter?.hash || ''
  const pages: string[] = atHomeData.chapter?.data || []

  if (pages.length === 0) {
    return { success: false, images: [], title: customTitle || 'Manga', source: 'mangadex', totalPages: 0, error: 'Capítulo sem imagens.' }
  }

  const images = pages.map((p: string) => `${baseUrl}/data/${hash}/${p}`)

  let title = customTitle || ''
  if (!title && mangaId) {
    const mangaRes = await fetch(`https://api.mangadex.org/manga/${mangaId}?includes[]=cover_art`, { headers: apiHeaders })
    if (mangaRes.ok) {
      const mangaData = await mangaRes.json()
      const t = mangaData.data?.attributes?.title
      title = t?.en || t?.['pt-br'] || t?.ja || t?.['ja-ro'] || Object.values(t || {})[0] as string || 'Manga'
    }
  }

  return { success: true, images, title: title || 'Manga', source: 'mangadex', totalPages: images.length }
}

// ═══════════════════════════════════════════════════════════════
// SITE 2: ManhwaWeb API (backend próprio)
// URLs: manhwaweb.com/leer/[manhwaId]-[chapterNumber]
// API: manhwawebbackend-production.up.railway.app/chapters/see/[slug]
// ═══════════════════════════════════════════════════════════════
const MANHAWEB_API = 'https://manhwawebbackend-production.up.railway.app'

async function scrapeManhaweb(url: string, customTitle?: string): Promise<ScrapeResult> {
  const parsedUrl = new URL(url)
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean)

  // Formato da URL: /leer/[manhwaId]-[chapterNumber]
  // Ex: /leer/realmente-me-estas-diciendo-que-lo-haga_1696088564822-1_01
  let chapterSlug = ''

  if (pathParts[0] === 'leer' && pathParts[1]) {
    chapterSlug = pathParts[1]
  } else {
    // Tentar extrair o slug do path
    const slugMatch = url.match(/leer\/([^?#]+)/)
    if (slugMatch) chapterSlug = slugMatch[1]
  }

  if (!chapterSlug) {
    return { success: false, images: [], title: customTitle || 'Manhwa', source: 'manhwaweb', totalPages: 0, error: 'URL inválida. Formato esperado: manhwaweb.com/leer/[manhwaId]-[cap]' }
  }

  try {
    const res = await fetch(`${MANHAWEB_API}/chapters/see/${chapterSlug}`, { headers: HEADERS })
    if (!res.ok) {
      return { success: false, images: [], title: customTitle || 'Manhwa', source: 'manhwaweb', totalPages: 0, error: `API retornou HTTP ${res.status}` }
    }

    const data = await res.json()
    const images: string[] = data.chapter?.img || []
    const title = customTitle || data.name || 'Manhwa'

    if (images.length === 0) {
      return { success: false, images: [], title, source: 'manhwaweb', totalPages: 0, error: 'Capítulo encontrado mas sem imagens. Tente outro capítulo.' }
    }

    console.log(`[manga-scrape] ManhwaWeb: ${images.length} imagens de "${title}"`)
    return { success: true, images, title, source: 'manhwaweb', totalPages: images.length }
  } catch (err) {
    return { success: false, images: [], title: customTitle || 'Manhwa', source: 'manhwaweb', totalPages: 0, error: `Erro ao acessar API ManhwaWeb: ${err instanceof Error ? err.message : 'desconhecido'}` }
  }
}

// ═══════════════════════════════════════════════════════════════
// SITE 3: ZonaTMO API (parcial — Cloudflare protege páginas)
// API: zonatmo.org/api/v1/chapters (lista funciona)
// Nota: imagens de capítulos são protegidas por Cloudflare
// ═══════════════════════════════════════════════════════════════
async function scrapeZonatmo(url: string, customTitle?: string): Promise<ScrapeResult> {
  const parsedUrl = new URL(url)
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean)

  // Tentar extrair chapter ID da URL
  // Formato: /view_uploads/[id] ou /library/manhwa/[id]/[slug]
  let chapterId: number | null = null

  if (pathParts[0] === 'view_uploads' && pathParts[1]) {
    chapterId = parseInt(pathParts[1])
  } else {
    // Tentar extrair de qualquer path numérico
    for (const part of pathParts) {
      const num = parseInt(part)
      if (!isNaN(num) && num > 1000) {
        chapterId = num
        break
      }
    }
  }

  // Se não encontrou chapter ID, tentar buscar na API de capítulos
  if (!chapterId) {
    try {
      const listRes = await fetch('https://zonatmo.org/api/v1/chapters', { headers: HEADERS })
      if (listRes.ok) {
        const listData = await listRes.json()
        const chapters = listData.data || []
        // Usar o último capítulo disponível
        if (chapters.length > 0) {
          chapterId = chapters[chapters.length - 1].id
        }
      }
    } catch {}
  }

  if (!chapterId) {
    return {
      success: false, images: [], title: customTitle || 'Manhwa', source: 'zonatmo', totalPages: 0,
      error: 'ZonaTMO usa Cloudflare que bloqueia extração automática. Tente usar MangaDex ou ManhwaWeb, ou cole a URL de uma imagem do capítulo diretamente.'
    }
  }

  // O ZonaTMO protege as páginas individuais com Cloudflare
  // Retornamos erro informativo
  return {
    success: false, images: [], title: customTitle || 'Manhwa', source: 'zonatmo', totalPages: 0,
    error: `ZonaTMO (cap. ${chapterId}) está protegido por Cloudflare. Não é possível extrair imagens automaticamente. Use MangaDex ou ManhwaWeb como alternativa.`
  }
}

// ═══════════════════════════════════════════════════════════════
// SITE 4: HTML Genérico (fallback para qualquer site)
// ═══════════════════════════════════════════════════════════════
async function scrapeGeneric(url: string, customTitle?: string): Promise<ScrapeResult> {
  const parsedUrl = new URL(url)

  const response = await fetch(url, { headers: HEADERS })
  if (!response.ok) {
    return { success: false, images: [], title: customTitle || 'Manga', source: parsedUrl.hostname, totalPages: 0, error: `Falha ao acessar: HTTP ${response.status}` }
  }

  const html = await response.text()
  const images: string[] = []
  const baseUrl = parsedUrl.origin

  // Extrair imagens via regex
  const fallbackImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = fallbackImgRegex.exec(html)) !== null) {
    let imgUrl = match[1]
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
    else if (!imgUrl.startsWith('http')) imgUrl = baseUrl + (imgUrl.startsWith('/') ? '' : '/') + imgUrl
    if (isMangaPageImage(imgUrl)) images.push(imgUrl)
  }

  let title = customTitle || ''
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname
  }

  const uniqueImages = [...new Set(images)]

  if (uniqueImages.length === 0) {
    return { success: false, images: [], title, source: parsedUrl.hostname, totalPages: 0, error: 'Nenhuma imagem encontrada. O site pode usar JavaScript. Tente MangaDex ou ManhwaWeb.' }
  }

  return { success: true, images: uniqueImages, title, source: parsedUrl.hostname, totalPages: uniqueImages.length }
}

function isMangaPageImage(url: string): boolean {
  const lower = url.toLowerCase()
  if (lower.includes('logo') || lower.includes('icon') || lower.includes('avatar')) return false
  if (lower.includes('banner') || lower.includes('ad') || lower.includes('sponsor')) return false
  if (lower.includes('button') || lower.includes('arrow') || lower.includes('social')) return false
  if (lower.endsWith('.svg')) return false
  if (lower.includes('chapter') || lower.includes('page')) return true
  if (/\d+\.\w+$/.test(lower)) return true
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp']
  if (imageExts.some(ext => lower.endsWith(ext))) return true
  return true
}

// ═══════════════════════════════════════════════════════════════
// ROTEADOR PRINCIPAL — Detecta o site e usa o scraper correto
// ═══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, title: customTitle } = body as { url?: string; title?: string }

    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    const hostname = parsedUrl.hostname.toLowerCase()
    console.log(`[manga-scrape] Detectando site: ${hostname}`)

    let result: ScrapeResult

    // ═══ Roteamento por domínio ═══
    if (hostname.includes('mangadex')) {
      console.log('[manga-scrape] → MangaDex API')
      result = await scrapeMangadex(url, customTitle)
    } else if (hostname.includes('manhwaweb')) {
      console.log('[manga-scrape] → ManhwaWeb API')
      result = await scrapeManhaweb(url, customTitle)
    } else if (hostname.includes('zonatmo')) {
      console.log('[manga-scrape] → ZonaTMO (Cloudflare)')
      result = await scrapeZonatmo(url, customTitle)
    } else {
      console.log('[manga-scrape] → HTML Genérico')
      result = await scrapeGeneric(url, customTitle)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[manga-scrape] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno no scraping' },
      { status: 500 }
    )
  }
}
