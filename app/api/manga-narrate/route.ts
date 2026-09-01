import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga Narrate — Gera roteiro narrado resumido (55s máximo)
// Usa Gemini CHEFE para selecionar 8-12 imagens-chave e criar
// narração sincronizada para YouTube Shorts/Reels/TikTok
// ═══════════════════════════════════════════════════════════════

export interface NarrateSegment {
  /** Índice da imagem no array original do scraper (0-based) */
  imageIndex: number
  /** Texto narrado para este segmento (2-3 frases) */
  narration: string
  /** Duração deste segmento em segundos (2-8s) */
  duration: number
  /** Legenda para sobrepor na tela */
  subtitle: string
  /** Tipo de emoção/energia do segmento */
  emotion: 'hook' | 'buildup' | 'climax' | 'resolution' | 'cta'
}

export interface NarrateResult {
  success: boolean
  /** Título otimizado para YouTube (máx 60 chars) */
  title: string
  /** Legenda completa do post */
  caption: string
  /** Hashtags para SEO */
  hashtags: string[]
  /** Script completo da narração (texto unificado) */
  fullNarration: string
  /** Segmentos sincronizados com imagens */
  segments: NarrateSegment[]
  /** Duração total estimada em segundos */
  totalDuration: number
  /** Índices das imagens selecionadas do capítulo original */
  selectedImageIndices: number[]
  /** URL do mangá analisado */
  sourceUrl: string
  /** Título do mangá */
  mangaTitle: string
  error?: string
}

interface GeminiSceneResponse {
  title?: string
  narrationScript?: string
  caption?: string
  hashtags?: string[]
  selectedImages?: number[]
  segments?: {
    imageIndex?: number
    narration?: string
    duration?: number
    subtitle?: string
    emotion?: string
  }[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      images = [],
      mangaTitle = '',
      sourceUrl = '',
      maxDuration = 55,
      targetSegments = 10,
    } = body as {
      images: string[]
      mangaTitle: string
      sourceUrl: string
      maxDuration: number
      targetSegments: number
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma imagem fornecida para narrar' },
        { status: 400 }
      )
    }

    console.log(`[manga-narrate] ════════════════════════════════════════`)
    console.log(`[manga-narrate] INICIANDO NARRATIVA`) 
    console.log(`[manga-narrate] Título: "${mangaTitle}"`)
    console.log(`[manga-narrate] Páginas disponíveis: ${images.length}`)
    console.log(`[manga-narrate] Duração máxima: ${maxDuration}s`)
    console.log(`[manga-narrate] Target segmentos: ${targetSegments}`)
    console.log(`[manga-narrate] ════════════════════════════════════════`)

    // Buscar chave Gemini dedicada ao módulo manga
    const geminiKey =
      process.env.GEMINI_MANGA_API_KEY ||
      process.env.GEMINI_API_KEY_CHEFE ||
      process.env.GEMINI_API_KEY

    if (!geminiKey) {
      console.error('[manga-narrate] ❌ Nenhuma chave Gemini configurada!')
      return NextResponse.json(
        { success: false, error: 'Chave Gemini não configurada. Adicione GEMINI_MANGA_API_KEY no Settings → Environment.' },
        { status: 500 }
      )
    }
    console.log(`[manga-narrate] ✅ Chave Gemini configurada (${geminiKey.substring(0, 8)}...)`)

    // ═══ GERAR ROTEIRO COM GEMINI ═══
    // Envia os índices das imagens disponíveis para a IA selecionar as melhores
    const imageIndexList = images.map((_, i) => i).join(', ')

    const scriptPrompt = `Você é um roteirista de VÍDEOS CURTOS para YouTube Shorts/Reels/TikTok especializado em resumos narrados de mangá/manhwa.

CAPÍTULO: "${mangaTitle}"
URL: ${sourceUrl}
TOTAL DE PÁGINAS DISPONÍVEIS: ${images.length}
ÍNDICES DAS PÁGINAS: [${imageIndexList}]
DURAÇÃO MÁXIMA DO VÍDEO: ${maxDuration} segundos (YouTube Shorts)
NÚMERO ALVO DE SEGMENTOS: ${targetSegments} imagens-chave

═══ TAREFA ═══
Selecione de 8 a 12 imagens-chave do capítulo que melhor resumem a história.
Crie uma narração envolvente em português brasileiro que sincronize com essas imagens.
O texto narrado total deve ter entre 110-130 palavras (≈45-50 segundos de fala).
O vídeo total deve ter NO MÁXIMO ${maxDuration} segundos.

═══ ESTRUTURA DO ROTEIRO ═══
1. GANCHO (0-5s): Primeira frase impactante/curiosa para prender atenção
2. DESENVOLVIMENTO (5-40s): Conflito principal do capítulo, com tensão crescente
3. ENCERRAMENTO (40-50s): Suspense + call-to-action (inscreva-se/comente)

═══ CADA SEGMENTO DEVE CONTER ═══
- imageIndex: índice EXATO da imagem no array (0-based)
- narration: 2-3 frases narradas por voz
- duration: segundos de exibição (mínimo 3, máximo 8)
- subtitle: texto curto para sobrepor na tela (máx 8 palavras)
- emotion: hook, buildup, climax, resolution ou cta

═══ REGRAS ═══
- Cada imagem pode ser usada UMA ÚNICA VEZ
- As imagens devem ser选择idas em ORDEM sequencial (imageIndex deve ser crescente)
- A soma das durations NÃO pode ultrapassar ${maxDuration} segundos
- O título deve ter no máximo 60 caracteres com emojis estratégicos
- Inclua 10 hashtags virais focadas em manga/anime/shorts

Responda EXATAMENTE neste formato JSON (sem markdown, sem crases):
{
  "title": "Título altamente clicável com emojis (máx 60 chars)",
  "narrationScript": "Texto completo unificado da narração",
  "caption": "Legenda completa do post com emojis e pergunta",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "selectedImages": [0, 3, 7, 12, 15, 20, 25, 30, 35, 40],
  "segments": [
    {
      "imageIndex": 0,
      "narration": "Primeira frase de gancho impactante",
      "duration": 4,
      "subtitle": "Texto na tela",
      "emotion": "hook"
    }
  ]
}`

    console.log('[manga-narrate] Enviando prompt para Gemini (CHEFE)...')

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: scriptPrompt }] }],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[manga-narrate] Gemini error:', errText)
      return NextResponse.json(
        { success: false, error: `Gemini retornou HTTP ${geminiRes.status}` },
        { status: 502 }
      )
    }

    const geminiData = await geminiRes.json()
    const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!geminiText) {
      return NextResponse.json(
        { success: false, error: 'Gemini não retornou conteúdo' },
        { status: 502 }
      )
    }

    // Limpar e parsear JSON
    const cleaned = geminiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed: GeminiSceneResponse = JSON.parse(cleaned)

    // Validar e construir resultado
    const segments: NarrateSegment[] = []
    let totalDuration = 0
    const usedIndices = new Set<number>()

    if (parsed.segments && Array.isArray(parsed.segments)) {
      for (const seg of parsed.segments) {
        const imgIdx = typeof seg.imageIndex === 'number' ? seg.imageIndex : 0
        let duration = Math.min(Math.max(seg.duration || 4, 3), 8) // clamp 3-8s

        // Validar índice
        if (imgIdx >= 0 && imgIdx < images.length && !usedIndices.has(imgIdx)) {
          usedIndices.add(imgIdx)

          // Truncar se exceder o limite
          if (totalDuration + duration > maxDuration) {
            duration = Math.max(3, maxDuration - totalDuration)
          }

          if (duration > 0) {
            segments.push({
              imageIndex: imgIdx,
              narration: seg.narration || `Página ${imgIdx + 1}`,
              duration,
              subtitle: seg.subtitle || '',
              emotion: (seg.emotion as NarrateSegment['emotion']) || 'buildup',
            })
            totalDuration += duration
          }
        }

        if (totalDuration >= maxDuration) break
      }
    }

    // Fallback: se Gemini não gerou segmentos válidos, usar primeiras N páginas
    if (segments.length === 0) {
      const fallbackCount = Math.min(targetSegments, images.length)
      const fallbackDuration = Math.floor(maxDuration / fallbackCount)
      for (let i = 0; i < fallbackCount; i++) {
        segments.push({
          imageIndex: i,
          narration: `Página ${i + 1} do capítulo`,
          duration: fallbackDuration,
          subtitle: `Página ${i + 1}`,
          emotion: i === 0 ? 'hook' : i === fallbackCount - 1 ? 'cta' : 'buildup',
        })
      }
      totalDuration = fallbackCount * fallbackDuration
    }

    // Garantir duração máxima
    if (totalDuration > maxDuration) {
      const ratio = maxDuration / totalDuration
      for (const seg of segments) {
        seg.duration = Math.round(seg.duration * ratio * 10) / 10
      }
      totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
    }

    const result: NarrateResult = {
      success: true,
      title: parsed.title || mangaTitle || 'Mangá Resumido 📖',
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || ['#manga', '#manhwa', '#anime', '#shorts', '#mangaedit'],
      fullNarration: parsed.narrationScript || segments.map(s => s.narration).join(' '),
      segments,
      totalDuration: Math.round(totalDuration * 10) / 10,
      selectedImageIndices: segments.map(s => s.imageIndex),
      sourceUrl,
      mangaTitle: parsed.title || mangaTitle,
    }

    console.log(`[manga-narrate] ════════════════════════════════════════`)
    console.log(`[manga-narrate] ✅ ROTEIRO PRONTO`)
    console.log(`[manga-narrate] Segmentos: ${segments.length}`)
    console.log(`[manga-narrate] Duração total: ${result.totalDuration}s (máx: ${maxDuration}s)`)
    console.log(`[manga-narrate] Imagens selecionadas: [${result.selectedImageIndices.join(', ')}]`)
    console.log(`[manga-narrate] Título: ${result.title}`)
    console.log(`[manga-narrate] Palavras no roteiro: ~${result.fullNarration.split(' ').length}`)
    console.log(`[manga-narrate] Hashtags: ${result.hashtags.length}`)
    console.log(`[manga-narrate] ════════════════════════════════════════`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[manga-narrate] Erro:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
