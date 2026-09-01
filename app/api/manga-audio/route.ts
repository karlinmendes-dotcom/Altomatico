import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga Audio — Busca música de fundo no Pixabay
// Retorna URL de áudio para uso no renderer client-side
// Se falhar, retorna fallback (sem URL — renderer gera silêncio)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mood = searchParams.get('mood') || 'ambient'
    const duration = searchParams.get('duration') || '60'

    const pixabayKey = process.env.PIXABAY_API_KEY

    if (!pixabayKey) {
      console.warn('[manga-audio] PIXABAY_API_KEY não configurada')
      return NextResponse.json({
        success: false,
        error: 'PIXABAY_API_KEY não configurada',
        bgMusicUrl: '',
      })
    }

    // Buscar músicas no Pixabay (endpoint de MÚSICAS)
    const query = mood === 'ambient'
      ? 'lofi ambient cinematic'
      : mood === 'epic'
      ? 'epic dramatic'
      : mood === 'calm'
      ? 'calm peaceful'
      : 'lofi ambient'

    const pixabayUrl = `https://pixabay.com/api/?key=${pixabayKey}&type=music&q=${encodeURIComponent(query)}&per_page=5&min_duration=20&max_duration=120&order=popular`

    console.log(`[manga-audio] Buscando música: "${query}"`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    let res: Response
    try {
      res = await fetch(pixabayUrl, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      console.warn(`[manga-audio] Pixabay retornou HTTP ${res.status}`)
      return NextResponse.json({
        success: false,
        error: `Pixabay HTTP ${res.status}`,
        bgMusicUrl: '',
      })
    }

    const data = await res.json()

    if (!data.hits || data.hits.length === 0) {
      console.warn('[manga-audio] Nenhuma música encontrada')
      return NextResponse.json({
        success: false,
        error: 'Nenhuma música encontrada',
        bgMusicUrl: '',
      })
    }

    // Pegar a primeira música com URL de áudio
    const hit = data.hits[0]
    const audioUrl = hit.audio || hit.audio_128 || hit.audio_64 || ''

    if (!audioUrl) {
      console.warn('[manga-audio] Música encontrada mas sem URL de áudio')
      return NextResponse.json({
        success: false,
        error: 'Música sem URL de áudio',
        bgMusicUrl: '',
      })
    }

    console.log(`[manga-audio] ✅ Música: "${hit.tags}" (${hit.duration}s)`)

    return NextResponse.json({
      success: true,
      bgMusicUrl: audioUrl,
      title: hit.tags || 'Música de fundo',
      duration: hit.duration || 0,
      user: hit.user || '',
    })
  } catch (error) {
    console.warn('[manga-audio] Erro:', error)
    return NextResponse.json({
      success: false,
      bgMusicUrl: '',
      error: error instanceof Error ? error.message : 'Erro interno',
    })
  }
}
