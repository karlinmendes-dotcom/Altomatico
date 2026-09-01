import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// Manga TTS — Gera áudio de narração server-side
// Google Translate TTS com fallback: se falhar, gera silêncio
// O vídeo SEMPRE terá áudio válido (nunca rejeitado pelo YouTube)
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, lang = 'pt-BR', speed = 0 } = body as {
      text: string
      lang?: string
      speed?: number
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Texto vazio',
        segments: [],
        totalDuration: 0,
      })
    }

    console.log(`[manga-tts] Iniciando TTS para: "${text.substring(0, 100)}..."`)

    // Dividir texto em frases
    const sentences = splitIntoSentences(text)
    console.log(`[manga-tts] ${sentences.length} segmentos criados`)

    const audioSegments: {
      base64: string
      duration: number
      text: string
      index: number
    }[] = []

    let totalDuration = 0
    let successCount = 0

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim()
      if (!sentence) continue

      const estimatedDuration = estimateDuration(sentence)
      let base64 = ''

      try {
        // Tentar Google Translate TTS
        const audioBuffer = await generateGoogleTTS(sentence, lang, speed)
        base64 = bufferToBase64(audioBuffer)
        successCount++
      } catch (err) {
        console.warn(`[manga-tts] Google TTS falhou no segmento ${i + 1}: ${err instanceof Error ? err.message : 'desconhecido'}`)
        // Gerar silêncio como fallback (WAV válido de 16kHz mono)
        base64 = generateSilentAudio(estimatedDuration)
      }

      audioSegments.push({
        base64,
        duration: estimatedDuration,
        text: sentence,
        index: i,
      })

      totalDuration += estimatedDuration
    }

    if (audioSegments.length === 0) {
      // Último recurso: gerar um segmento de silêncio de 3s
      const fallbackDuration = 3
      audioSegments.push({
        base64: generateSilentAudio(fallbackDuration),
        duration: fallbackDuration,
        text: '',
        index: 0,
      })
      totalDuration = fallbackDuration
    }

    console.log(`[manga-tts] ✅ Resultado: ${audioSegments.length} segmentos, ${totalDuration.toFixed(1)}s total, ${successCount}/${sentences.length} TTS OK`)

    return NextResponse.json({
      success: true,
      segments: audioSegments,
      totalDuration: Math.round(totalDuration * 10) / 10,
      ttsSuccessRate: `${successCount}/${sentences.length}`,
      lang,
    })
  } catch (error) {
    console.error('[manga-tts] Erro geral:', error)

    // Último recurso: retornar silêncio de 3s para não quebrar o pipeline
    const fallbackSegments = [{
      base64: generateSilentAudio(3),
      duration: 3,
      text: '',
      index: 0,
    }]

    return NextResponse.json({
      success: true,
      segments: fallbackSegments,
      totalDuration: 3,
      ttsSuccessRate: '0/0 (fallback silêncio)',
      lang: 'pt-BR',
      warning: 'TTS indisponível — vídeo terá apenas música de fundo',
    })
  }
}

/**
 * Divide texto em frases para TTS de melhor qualidade
 */
function splitIntoSentences(text: string): string[] {
  const raw = text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

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
async function generateGoogleTTS(text: string, lang: string, speed: number): Promise<ArrayBuffer> {
  const langCode = lang.replace('-', '-')
  const speedParam = speed !== 0 ? `&ttsspeed=${speed > 0 ? 1.2 : 0.8}` : ''

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}${speedParam}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const response = await fetch(ttsUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    })

    if (!response.ok) {
      throw new Error(`Google TTS retornou HTTP ${response.status}`)
    }

    return await response.arrayBuffer()
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Gera áudio WAV silêncio (formato válido para player/upload)
 * Retorna base64 de um WAV de 16kHz mono com dados zero
 */
function generateSilentAudio(durationSeconds: number): string {
  const sampleRate = 16000
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = numSamples * blockAlign

  // WAV header (44 bytes) + silent data
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // "RIFF" chunk
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // sub-chunk size
  view.setUint16(20, 1, true)  // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // "data" sub-chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  // Data is already zero-filled (silence)

  // Converter para base64
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
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
 * Estima duração de um texto em português (150 palavras/minuto)
 */
function estimateDuration(text: string): number {
  const wordsPerMinute = 150
  const words = text.split(/\s+/).length
  return Math.max(2, (words / wordsPerMinute) * 60)
}
