import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga Scraper — Extrai imagens de capítulos de mangá/manhwa
// Backend isolado: usa Cheerio (HTML parsing) + fetch para download
// ═══════════════════════════════════════════════════════════════

interface ScrapeResult {
  success: boolean
  images: string[]
  title: string
  source: string
  totalPages: number
  error?: string
}

/**
 * Padrões conhecidos de seletores CSS para sites populares de mangá/manhwa.
 * Cada site pode ter uma estrutura diferente para o contêiner de imagens do capítulo.
 */
const SITE_SELECTORS: Record<string, { imageSelector: string; titleSelector?: string }> = {
  // Mangá/Absolutenotto / Leitores genéricos
  default: {
    imageSelector: '.page-chapter img, .chapter-content img, .reader-area img, #viewer img, .reading-content img, .text-left img',
    titleSelector: '.chapter-title, .breadcrumb a:last-child, h1, .title',
  },
  // Sites específicos (português)
  'mangalivre': {
    imageSelector: '.page-chapter img',
    titleSelector: '.chapter-title',
  },
  'mangabrsp': {
    imageSelector: '.viewer-cnt img, #chapter-content img',
  },
  'lermanga': {
    imageSelector: '.page-chapter img',
    titleSelector: '.chapter-title',
  },
  // Sites em inglês
  'mangadex': {
    imageSelector: '.page-chapter img, .reading-content img',
  },
  'mangakakalot': {
    imageSelector: '.chapter-content img, .container-chapter-reader img',
  },
  'manganato': {
    imageSelector: '.chapter-content img, .container-chapter-reader img',
  },
  'webtoons': {
    imageSelector: '_imageList img, .viewer_img img',
  },
  // Genérico: qualquer img dentro de um container de leitura
  generic: {
    imageSelector: 'img[src*="manga"], img[src*="chapter"], img[data-src], img[loading="lazy"]',
  },
}

function detectSite(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase()
  if (hostname.includes('mangalivre')) return 'mangalivre'
  if (hostname.includes('mangabrsp')) return 'mangabrsp'
  if (hostname.includes('lermanga')) return 'lermanga'
  if (hostname.includes('mangadex')) return 'mangadex'
  if (hostname.includes('mangakakalot') || hostname.includes('chapmanganato')) return 'mangakakalot'
  if (hostname.includes('manganato')) return 'manganato'
  if (hostname.includes('webtoons')) return 'webtoons'
  return 'default'
}

function extractImageUrl(img: { attribs?: Record<string, string> }): string | null {
  if (!img.attribs) return null
  // Priorizar src, depois data-src (lazy loading), depois data-lazy-src
  const src = img.attribs.src || img.attribs['data-src'] || img.attribs['data-lazy-src'] || img.attribs['data-original'] || ''
  if (!src) return null
  // Filtrar ícones, logos e imagens pequenas (provavelmente não são páginas do mangá)
  if (src.includes('logo') || src.includes('icon') || src.includes('avatar') || src.includes('banner')) return null
  // Garantir URL absoluta
  try {
    if (src.startsWith('//')) return 'https:' + src
    if (src.startsWith('http')) return src
    return '' // relative URL sem base
  } catch {
    return null
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * MangaDex API Integration — Suporte nativo a URLs do MangaDex
 * URLs aceitas:
 *   - https://mangadex.org/title/[id]/[slug]
 *   - https://mangadex.org/chapter/[id]
 *   - URL direta de capítulo com chapterId
 * ═══════════════════════════════════════════════════════════════
 */
async function scrapeMangadex(url: string, customTitle?: string): Promise<ScrapeResult> {
  const parsedUrl = new URL(url)
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean)

  // Detectar se é URL de capítulo ou de título
  let mangaId: string | null = null
  let chapterId: string | null = null

  if (pathParts[0] === 'chapter' && pathParts[1]) {
    chapterId = pathParts[1]
  } else if (pathParts[0] === 'title' && pathParts[1]) {
    mangaId = pathParts[1]
  } else {
    // Tentar extrair UUID do path
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    const match = url.match(uuidPattern)
    if (match) {
      // Determinar se é manga ou capítulo pela posição
      if (pathParts.includes('chapter')) {
        chapterId = match[0]
      } else {
        mangaId = match[0]
      }
    }
  }

  const headers = { 'User-Agent': 'Altomatico/1.0 (manga-video-module)' }

  // Se temos chapterId, buscar página diretamente
  if (chapterId) {
    const chapterRes = await fetch(`https://api.mangadex.org/chapter/${chapterId}?includes[]=manga`, { headers })
    if (chapterRes.ok) {
      const chapterData = await chapterRes.json()
      const mangaRel = chapterData.data?.relationships?.find((r: { type: string }) => r.type === 'manga')
      mangaId = mangaRel?.id || null
    }
  }

  // Se não temos capítulo, pegar o primeiro capítulo disponível do manga
  if (!chapterId && mangaId) {
    const feedRes = await fetch(
      `https://api.mangadex.org/manga/${mangaId}/feed?limit=1&order[chapter]=asc&translatedLanguage[]=en&translatedLanguage[]=pt-br`,
      { headers }
    )
    if (feedRes.ok) {
      const feedData = await feedRes.json()
      if (feedData.data?.length > 0) {
        chapterId = feedData.data[0].id
      }
    }
  }

  if (!chapterId) {
    return { success: false, images: [], title: customTitle || 'Manga', source: 'mangadex', totalPages: 0, error: 'Não foi possível encontrar um capítulo. Verifique a URL.' }
  }

  // Buscar imagens do capítulo via at-home server
  const atHomeRes = await fetch(`https://api.mangadex.org/at-home/server/${chapterId}`, { headers })
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

  // Montar URLs completas
  const images = pages.map((p: string) => `${baseUrl}/data/${hash}/${p}`)

  // Buscar título do mangá
  let title = customTitle || ''
  if (!title && mangaId) {
    const mangaRes = await fetch(`https://api.mangadex.org/manga/${mangaId}?includes[]=cover_art`, { headers })
    if (mangaRes.ok) {
      const mangaData = await mangaRes.json()
      const t = mangaData.data?.attributes?.title
      title = t?.en || t?.['pt-br'] || t?.ja || t?.['ja-ro'] || Object.values(t || {})[0] as string || 'Manga'
    }
  }

  console.log(`[manga-scrape] MangaDex: ${images.length} páginas de "${title}"`)

  return { success: true, images, title: title || 'Manga', source: 'mangadex', totalPages: images.length }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, title: customTitle } = body as { url?: string; title?: string }

    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 })
    }

    // Validar URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    console.log(`[manga-scrape] Iniciando scraping de: ${url}`)

    // ═══ MangaDex API (suporte nativo) ═══
    if (parsedUrl.hostname.includes('mangadex')) {
      const result = await scrapeMangadex(url, customTitle)
      return NextResponse.json(result)
    }

    // ═══ Sites genéricos (HTML scraping) ═══
    const siteKey = detectSite(url)

    // Buscar HTML da página
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Falha ao acessar o site: HTTP ${response.status}` },
        { status: 502 }
      )
    }

    const html = await response.text()
    const images: string[] = []
    const baseUrl = parsedUrl.origin

    // Extrair imagens via regex
    const imgRegex = /<img[^>]+(?:class|id|data-src|loading)[^>]*>/gi
    const allImgs = html.match(imgRegex) || []
    const fallbackImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null

    for (const imgTag of allImgs) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i) ||
                       imgTag.match(/data-src=["']([^"']+)["']/i) ||
                       imgTag.match(/data-lazy-src=["']([^"']+)["']/i)
      if (srcMatch) {
        let imgUrl = srcMatch[1]
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        else if (!imgUrl.startsWith('http')) imgUrl = baseUrl + (imgUrl.startsWith('/') ? '' : '/') + imgUrl
        if (isMangaPageImage(imgUrl)) images.push(imgUrl)
      }
    }

    if (images.length === 0) {
      while ((match = fallbackImgRegex.exec(html)) !== null) {
        let imgUrl = match[1]
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        else if (!imgUrl.startsWith('http')) imgUrl = baseUrl + (imgUrl.startsWith('/') ? '' : '/') + imgUrl
        if (isMangaPageImage(imgUrl)) images.push(imgUrl)
      }
    }

    let title = customTitle || ''
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      title = titleMatch ? titleMatch[1].trim() : parsedUrl.pathname.split('/').filter(Boolean).pop() || 'Manga Chapter'
    }

    const uniqueImages = [...new Set(images)]
    console.log(`[manga-scrape] Encontradas ${uniqueImages.length} imagens (HTML)`)

    if (uniqueImages.length === 0) {
      return NextResponse.json({
        success: false,
        images: [],
        title,
        source: parsedUrl.hostname,
        totalPages: 0,
        error: 'Nenhuma imagem encontrada. Para sites que usam JavaScript, tente uma URL do MangaDex (mangadex.org/title/... ou mangadex.org/chapter/...).',
      })
    }

    return NextResponse.json({
      success: true,
      images: uniqueImages,
      title,
      source: parsedUrl.hostname,
      totalPages: uniqueImages.length,
    })
  } catch (error) {
    console.error('[manga-scrape] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno no scraping' },
      { status: 500 }
    )
  }
}

/**
 * Determina se uma URL de imagem parece ser uma página de mangá (não um ícone/logo).
 */
function isMangaPageImage(url: string): boolean {
  const lower = url.toLowerCase()

  // Excluir imagens que claramente não são páginas
  if (lower.includes('logo') || lower.includes('icon') || lower.includes('avatar')) return false
  if (lower.includes('banner') || lower.includes('ad') || lower.includes('sponsor')) return false
  if (lower.includes('button') || lower.includes('arrow') || lower.includes('social')) return false
  if (lower.endsWith('.svg')) return false

  // Incluir imagens que parecem páginas de mangá
  // (geralmente têm nomes numéricos ou estão em pastas de capítulo)
  if (lower.includes('chapter') || lower.includes('page')) return true
  if (lower.includes('/manga/') || lower.includes('/chapter/')) return true
  if (/\d+\.\w+$/.test(lower)) return true // termina em número.extensão

  // Para sites que usam URLs genéricas, aceitar imagens grandes
  // (verificação de tamanho não é possível sem download, mas filtramos por extensão)
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp']
  if (imageExts.some(ext => lower.endsWith(ext))) return true

  return true // Aceitar por padrão — o renderer vai processar depois
}
