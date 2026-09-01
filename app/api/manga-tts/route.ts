import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga TTS — Gera áudio de narração server-side
// Usa Google Translate TTS (grátis) para gerar segmentos de voz
// que podem ser capturados pelo MediaRecorder no cliente
// ═══════════════════════════════════════════════════════════════

interface TTSRequest {
  /** Texto completo da narração */
  text: string
  /** Idioma (padrão: pt-BR) */
  lang?: string
  /** Velocidade: lento=-0.2, normal=0, rápido=0.2 */
  speed?: number
}

interface TTSSegment {
  /** Texto deste segmento */
  text: string
  /** Índice do segmento */
  index: number
  /** Duração estimada em segundos */
  estimatedDuration: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, lang = 'pt-BR', speed = 0 } = body as TTSRequest

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })
    }

    console.log(`[manga-tts] Gerando áudio para: "${text.substring(0, 80)}..."`)

    // Dividir texto em frases (segmentos curtos para melhor qualidade TTS)
    const sentences = splitIntoSentences(text)
    console.log(`[manga-tts] ${sentences.length} segmentos de fala gerados`)

    // Gerar áudio para cada segmento usando Google Translate TTS
    const audioSegments: { base64: string; duration: number; text: string; index: number }[] = []

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      if (!sentence) continue

      try {
        const audioBuffer = await generateTTSAudio(sentence, lang, speed)
        const base64 = bufferToBase64(audioBuffer)
        const estimatedDuration = estimateDuration(sentence)

        audioSegments.push({
          base64,
          duration: estimatedDuration,
          text: sentence,
          index: i,
        })

        console.log(`[manga-tts] Segmento ${i + 1}/${sentences.length} OK (${estimatedDuration.toFixed(1)}s)`)
      } catch (err) {
        console.error(`[manga-tts] Erro no segmento ${i + 1}:`, err)
        // Continuar com os outros segmentos
      }
    }

    if (audioSegments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum áudio pôde ser gerado',
        segments: [],
      })
    }

    const totalDuration = audioSegments.reduce((sum, s) => sum + s.duration, 0)

    console.log(`[manga-tts] ✅ ${audioSegments.length} segmentos, ${totalDuration.toFixed(1)}s total`)

    return NextResponse.json({
      success: true,
      segments: audioSegments,
      totalDuration: Math.round(totalDuration * 10) / 10,
      lang,
    })
  } catch (error) {
    console.error('[manga-tts] Erro:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * Divide texto em frases para TTS de melhor qualidade
 */
function splitIntoSentences(text: string): string[] {
  // Dividir por pontuação e quebras de linha
  const raw = text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // Se alguma frase for muito longa, dividir por vírgula
  const result: string[] = []
  for (const sentence of raw) {
    if (sentence.length > 150) {
      const parts = sentence.split(/,\s*/)
      let buffer = ''
      for (const part of parts) {
        if (buffer.length + part.length > 120) {
          if (buffer) result.push(buffer.trim())
          buffer = part
        } else {
          buffer = buffer ? `${buffer}, ${part}` : part
        }
      }
      if (buffer) result.push(buffer.trim())
    } else {
      result.push(sentence)
    }
  }

  return result
}

/**
 * Gera áudio TTS usando Google Translate TTS
 */
async function generateTTSAudio(text: string, lang: string, speed: number): Promise<ArrayBuffer> {
  const langCode = lang.replace('-', '-')
  const speedParam = speed !== 0 ? `&ttsspeed=${speed > 0 ? 1.2 : 0.8}` : ''

  // URL do Google Translate TTS
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}${speedParam}`

  const response = await fetch(ttsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    },
  })

  if (!response.ok) {
    throw new Error(`Google TTS retornou HTTP ${response.status}`)
  }

  return await response.arrayBuffer()
}

/**
 * Converte ArrayBuffer para base64
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Estima duração de um texto em português (baseado em palavras por minuto)
 */
function estimateDuration(text: string): number {
  // Português: ~150 palavras por minuto
  const wordsPerMinute = 150
  const words = text.split(/\s+/).length
  return Math.max(2, (words / wordsPerMinute) * 60)
}
