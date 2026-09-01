import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga Render Orchestrator — Conecta scraping → Gemini → render → queue
// Pipeline isolado: não altera rotas/motores existentes
// Usa GEMINI_MANGA_API_KEY (CHEFE) dedicada exclusivamente a este módulo
// ═══════════════════════════════════════════════════════════════

interface RenderRequest {
  url: string
  title?: string
  durationPerPage?: number
  youtubeChannel?: string
  enableAudio?: boolean
  bgMusicVolume?: number
  transitionType?: string
  transitionDuration?: number
}

interface MangaScene {
  narration: string
  visualDescription: string
  duration: number
  musicMood?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      url,
      title: customTitle,
      durationPerPage = 3,
      youtubeChannel = '',
      enableAudio = true,
      bgMusicVolume = 0.15,
      transitionType = 'slideleft',
      transitionDuration = 0.6,
    } = body as RenderRequest

    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 })
    }

    console.log(`[manga-render] Iniciando pipeline para: ${url}`)

    // ═══ FASE 1: Scrape das imagens ═══
    console.log('[manga-render] Fase 1: Scraping de imagens...')
    const scrapeRes = await fetch(`${request.nextUrl.origin}/api/manga-scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title: customTitle }),
    })

    if (!scrapeRes.ok) {
      const err = await scrapeRes.json()
      return NextResponse.json(
        { error: `Scraping falhou: ${err.error}` },
        { status: 502 }
      )
    }

    const scrapeData = await scrapeRes.json()

    if (!scrapeData.success || !scrapeData.images || scrapeData.images.length === 0) {
      return NextResponse.json({
        success: false,
        error: scrapeData.error || 'Nenhuma imagem encontrada',
        images: [],
        title: scrapeData.title || '',
      })
    }

    console.log(`[manga-render] Fase 1 OK: ${scrapeData.images.length} imagens de ${scrapeData.source}`)

    // ═══ FASE 2: Gerar roteiro com Gemini (CHEFE key dedicada) ═══
    console.log('[manga-render] Fase 2: Gerando roteiro com Gemini (CHEFE)...')
    const mangaGeminiKey = process.env.GEMINI_MANGA_API_KEY || process.env.GEMINI_API_KEY_CHEFE || process.env.GEMINI_API_KEY
    let scenes: MangaScene[] = []
    let generatedTitle = customTitle || scrapeData.title || ''
    let generatedCaption = ''
    let generatedHashtags: string[] = ['#manga', '#manhwa', '#anime', '#shorts']

    if (mangaGeminiKey) {
      try {
        const scriptPrompt = `Você é um roteirista de VÍDEOS do tipo slideshow de mangá/manhwa para YouTube Shorts.

Título do capítulo: ${scrapeData.title || 'Sem título'}
Número de páginas: ${scrapeData.images.length}
Duração por página: ${durationPerPage} segundos
Fonte: ${scrapeData.source}

Gere um roteiro COMPLETO para um vídeo slideshow com narração envolvente em português brasileiro.
Cada "cena" deve corresponder a uma página do mangá.
Total estimado: ${scrapeData.images.length * durationPerPage} segundos.
Tom: empolgado, curioso, como se estivesse contando uma história incrível.

Responda EXATAMENTE neste formato JSON (sem markdown, sem crases):
{
  "title": "título chamativo para YouTube (máx 60 chars) com emojis",
  "narrationScript": "texto completo da narração unificado",
  "scenes": [
    {
      "page": 1,
      "narration": "texto que o narrador fala nesta página",
      "duration": ${durationPerPage}
    }
  ],
  "caption": "legenda completa do post com emojis e perguntas para engajamento",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"]
}

IMPORTANTE: Gere narração para TODAS as ${scrapeData.images.length} páginas. Cada página deve ter uma narração única e interessante.`

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${mangaGeminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: scriptPrompt }] }],
              generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 4096 },
            }),
          }
        )

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
          const cleaned = geminiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const parsed = JSON.parse(cleaned)

          generatedTitle = parsed.title || generatedTitle
          generatedCaption = parsed.caption || ''
          generatedHashtags = parsed.hashtags || generatedHashtags

          // Mapear cenas do Gemini para o formato interno
          if (parsed.scenes && Array.isArray(parsed.scenes)) {
            scenes = parsed.scenes.map((s: { narration?: string; page?: number; duration?: number }, i: number) => ({
              narration: s.narration || `Página ${i + 1}`,
              visualDescription: `Manga page ${i + 1}`,
              duration: s.duration || durationPerPage,
              musicMood: 'epic',
            }))
          }

          console.log(`[manga-render] Gemini gerou ${scenes.length} cenas com narração`)        } else {
          console.error('[manga-render] Gemini erro:', await geminiRes.text())
        }
      } catch (err) {
        console.error('[manga-render] Gemini parse error:', err)
      }
    }

    // Fallback: se Gemini não gerou cenas, criar cenas genéricas
    if (scenes.length === 0) {
      scenes = scrapeData.images.map((_: string, i: number) => ({
        narration: `Página ${i + 1}`,
        visualDescription: `Manga page ${i + 1}`,
        duration: durationPerPage,
        musicMood: 'epic',
      }))
    }

    const totalDuration = scenes.reduce((sum: number, s: MangaScene) => sum + s.duration, 0)
    const videoDuration = totalDuration

    // ═══ FASE 3: Configurar áudio ═══
    console.log('[manga-render] Fase 3: Configurando áudio...')
    const pixabayKey = process.env.PIXABAY_API_KEY
    let bgMusicUrl = ''

    if (enableAudio && pixabayKey) {
      try {
        const musicRes = await fetch(
          `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent('epic lofi ambient')}&per_page=1`
        )
        const musicData = await musicRes.json()
        if (musicData.hits?.[0]) {
          bgMusicUrl = musicData.hits[0].videos?.tiny?.url || musicData.hits[0].videos?.small?.url || ''
        }
      } catch (err) {
        console.error('[manga-render] Erro ao buscar música:', err)
      }
    }

    // ═══ FASE 4: Montar FFmpeg command ═══
    console.log('[manga-render] Fase 4: Montando comando FFmpeg...')
    const ffmpegCommand = buildFFmpegCommand({
      imageUrls: scrapeData.images,
      scenes,
      durationPerPage,
      transitionType,
      transitionDuration,
      enableAudio,
      bgMusicUrl,
      bgMusicVolume,
      totalDuration: videoDuration,
    })

    // ═══ FASE 5: Salvar na fila ═══
    console.log('[manga-render] Fase 5: Salvando na fila de conteúdo...')
    const queueItem = {
      id: `manga_${Date.now()}`,
      title: generatedTitle || scrapeData.title || customTitle || 'Manga Video',
      description: generatedCaption || `Vídeo gerado a partir de: ${url}`,
      platform: 'youtube' as const,
      contentType: 'short' as const,
      source: 'ai_generated' as const,
      motorType: 'manga_video' as const,
      aiScript: scenes.map((s, i) => `[Página ${i + 1}] ${s.narration}`).join('\n'),
      aiHashtags: generatedHashtags,
      aiNarration: scenes.map(s => s.narration).join('\n'),
      aiPrompt: `Manga slideshow from ${url} — Gemini CHEFE key`,
      status: 'draft' as const,
      mediaUrl: scrapeData.images[0] || '',
      thumbnailUrl: scrapeData.images[0] || '',
      mangaData: {
        url,
        source: scrapeData.source,
        totalPages: scrapeData.totalPages,
        images: scrapeData.images,
        durationPerPage,
        transitionType,
        transitionDuration,
        enableAudio,
        bgMusicUrl,
        bgMusicVolume,
      },
      ffmpegCommand,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Salvar no localStorage (via response — o front-end vai salvar)
    return NextResponse.json({
      success: true,
      queueItem,
      scrapeResult: {
        title: scrapeData.title,
        source: scrapeData.source,
        totalPages: scrapeData.totalPages,
        images: scrapeData.images,
      },
      renderConfig: {
        totalDuration: videoDuration,
        transitionType,
        transitionDuration,
        enableAudio,
        bgMusicUrl: bgMusicUrl ? '✅ Encontrada' : '⏳ Sem música',
        ffmpegCommandPreview: ffmpegCommand.slice(0, 200) + '...',
      },
      message: `Pipeline completa! ${scrapeData.images.length} páginas, ${videoDuration}s de vídeo.`,
    })
  } catch (error) {
    console.error('[manga-render] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno na renderização' },
      { status: 500 }
    )
  }
}

// ─── Montar comando FFmpeg ──────────────────────────────────

function buildFFmpegCommand(config: {
  imageUrls: string[]
  scenes: MangaScene[]
  durationPerPage: number
  transitionType: string
  transitionDuration: number
  enableAudio: boolean
  bgMusicUrl: string
  bgMusicVolume: number
  totalDuration: number
}): string {
  const {
    imageUrls,
    durationPerPage,
    transitionType,
    transitionDuration,
    enableAudio,
    bgMusicUrl,
    bgMusicVolume,
    totalDuration,
  } = config

  const parts: string[] = []

  // Inputs de vídeo (cada imagem como loop)
  for (let i = 0; i < imageUrls.length; i++) {
    parts.push('-loop', '1', '-t', String(durationPerPage + transitionDuration), '-i', imageUrls[i])
  }

  // Input de áudio
  if (enableAudio && bgMusicUrl) {
    parts.push('-stream_loop', '-1', '-i', bgMusicUrl)
  } else {
    parts.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100')
  }

  // Filter complex
  const filters: string[] = []

  // Escalar cada imagem para 1080x1920
  for (let i = 0; i < imageUrls.length; i++) {
    filters.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[scaled${i}]`)
  }

  // XFade entre imagens
  if (imageUrls.length === 1) {
    filters.push('[scaled0]copy[outv]')
  } else {
    let currentOffset = 0
    for (let i = 0; i < imageUrls.length - 1; i++) {
      currentOffset += durationPerPage - transitionDuration
      const inputA = i === 0 ? '[scaled0]' : `[xf${i - 1}]`
      const outputLabel = i === imageUrls.length - 2 ? '[outv]' : `[xf${i}]`
      filters.push(`${inputA}[scaled${i + 1}]xfade=transition=${transitionType}:duration=${transitionDuration}:offset=${Math.max(0, currentOffset).toFixed(2)}${outputLabel}`)
    }
  }

  // Filtro de áudio
  const audioIndex = imageUrls.length
  if (enableAudio && bgMusicUrl) {
    const fadeStart = Math.max(0, totalDuration - 1.5)
    filters.push(`[${audioIndex}:a]volume=${bgMusicVolume},afade=t=out:st=${fadeStart.toFixed(2)}:d=1.5[aout]`)
  } else {
    filters.push(`[${audioIndex}:a]atrim=duration=${totalDuration},asetpts=PTS-STARTPTS[aout]`)
  }

  parts.push('-filter_complex', filters.join(';'))
  parts.push('-map', '[outv]', '-map', '[aout]')

  // Output
  parts.push(
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-r', '30',
    '-t', String(totalDuration),
    '-movflags', '+faststart',
    'output.mp4'
  )

  return `ffmpeg ${parts.join(' ')}`
}
