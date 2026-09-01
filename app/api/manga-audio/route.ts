import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga Audio — Busca música de fundo no Pixabay
// Retorna URL de áudio para uso no renderer client-side
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mood = searchParams.get('mood') || 'ambient'
    const duration = searchParams.get('duration') || '60'

    const pixabayKey = process.env.PIXABAY_API_KEY

    if (!pixabayKey) {
      return NextResponse.json({
        success: false,
        error: 'PIXABAY_API_KEY não configurada',
        bgMusicUrl: '',
      })
    }

    // Buscar músicas no Pixabay (endpoint de MÚSICAS, não vídeos)
    const query = mood === 'ambient'
      ? 'lofi ambient cinematic'
      : mood === 'epic'
      ? 'epic dramatic'
      : mood === 'calm'
      ? 'calm peaceful'
      : 'lofi ambient'

    const pixabayUrl = `https://pixabay.com/api/?key=${pixabayKey}&type=music&q=${encodeURIComponent(query)}&per_page=5&min_duration=20&max_duration=120&order=popular`

    console.log(`[manga-audio] Buscando música: "${query}" no Pixabay`)

    const res = await fetch(pixabayUrl)
    if (!res.ok) {
      console.error(`[manga-audio] Pixabay retornou HTTP ${res.status}`)
      return NextResponse.json({
        success: false,
        error: `Pixabay HTTP ${res.status}`,
        bgMusicUrl: '',
      })
    }

    const data = await res.json()

    if (!data.hits || data.hits.length === 0) {
      console.log('[manga-audio] Nenhuma música encontrada no Pixabay')
      return NextResponse.json({
        success: false,
        error: 'Nenhuma música encontrada',
        bgMusicUrl: '',
      })
    }

    // Pegar a primeira música com URL de áudio
    const hit = data.hits[0]
    const audioUrl = hit.audio || hit.audio_128 || hit.audio_64 || ''

    console.log(`[manga-audio] ✅ Música encontrada: "${hit.tags}" (${hit.duration}s)`)

    return NextResponse.json({
      success: true,
      bgMusicUrl: audioUrl,
      title: hit.tags || 'Música de fundo',
      duration: hit.duration || 0,
      user: hit.user || '',
    })
  } catch (error) {
    console.error('[manga-audio] Erro:', error)
    return NextResponse.json({
      success: false,
      bgMusicUrl: '',
      error: error instanceof Error ? error.message : 'Erro interno',
    })
  }
}
