// ═══════════════════════════════════════════════════════════════
// Manga Renderer — Renderiza slideshow de mangá com FFmpeg
// Imagens + Transições xfade + Áudio (música/narração/silêncio)
// ═══════════════════════════════════════════════════════════════

import {
  type MangaAudioConfig,
  type MangaAudioResult,
  type MangaScene,
  prepareMangaAudio,
  calculateTotalDuration,
  buildMangaAudioFilter,
  buildFinalFFmpegAudioCommand,
  DEFAULT_MANGA_AUDIO_CONFIG,
} from './manga-audio'

// ─── Interfaces ──────────────────────────────────────────────

export interface MangaRenderConfig {
  /** Lista de URLs das imagens baixadas do mangá */
  imageUrls: string[]
  /** Cenas com descrições e durações */
  scenes: MangaScene[]
  /** Configuração de áudio */
  audio?: Partial<MangaAudioConfig>
  /** Resolução de saída */
  outputWidth?: number
  outputHeight?: number
  /** FPS do vídeo */
  fps?: number
  /** Duração da transição xfade entre imagens (segundos) */
  transitionDuration?: number
  /** Tipo de transição xfade */
  transitionType?: 'slideleft' | 'pushleft' | 'fade' | 'dissolve' | 'wipeleft'
  /** Se true, aplica blur background para imagens que não cabem no canvas */
  useBlurBackground?: boolean
  /** Pixabay key para buscar música */
  pixabayKey?: string
}

export interface MangaRenderResult {
  success: boolean
  /** Comando FFmpeg completo para renderização */
  ffmpegCommand: string
  /** Duração total do vídeo em segundos */
  totalDuration: number
  /** Número de imagens no slideshow */
  imageCount: number
  /** Configuração de áudio aplicada */
  audioResult: MangaAudioResult
  /** Filtros FFmpeg para transições */
  xfadeFilter: string
  /** Filtros FFmpeg para redimensionamento */
  scaleFilter: string
  /** Descrição do que será renderizado */
  description: string
  error?: string
}

// ─── Construir filtro de escala/pad para canvas vertical ──────
// Centraliza cada imagem em canvas 1080x1920 com fundo preto

function buildScaleFilter(
  width: number,
  height: number,
  useBlurBackground: boolean
): string {
  if (useBlurBackground) {
    // Fundo desfocado baseado na própria imagem
    return [
      `split[bg][fg]`,
      `[bg]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=20:5[blurred]`,
      `[fg]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black[sharp]`,
      `[blurred][sharp]overlay=0:0`,
    ].join(';')
  }
  // Fundo preto simples
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`
}

// ─── Construir filtros xfade para transições ─────────────────
// Cada par de imagens adjacentes recebe uma transição slideleft

function buildXFadeFilter(
  imageCount: number,
  sceneDurations: number[],
  transitionDuration: number,
  transitionType: string
): string {
  if (imageCount <= 1) return ''

  const filters: string[] = []
  let currentOffset = 0

  for (let i = 0; i < imageCount - 1; i++) {
    const duration = sceneDurations[i] || 4
    currentOffset += duration - transitionDuration

    const inputLabel = i === 0 ? '[0:v]' : `[v${i}]`
    const outputLabel = i === imageCount - 2 ? '[outv]' : `[v${i + 1}]`

    filters.push(
      `${inputLabel}[${i + 1}:v]xfade=transition=${transitionType}:duration=${transitionDuration}:offset=${Math.max(0, currentOffset).toFixed(2)}${outputLabel}`
    )
  }

  return filters.join(';')
}

// ─── Função principal: renderMangaSlideshowVideo ──────────────
// Monta o comando FFmpeg completo com imagens, transições e áudio

export async function renderMangaSlideshowVideo(
  config: MangaRenderConfig
): Promise<MangaRenderResult> {
  const {
    imageUrls,
    scenes,
    outputWidth = 1080,
    outputHeight = 1920,
    fps = 30,
    transitionDuration = 0.6,
    transitionType = 'slideleft',
    useBlurBackground = true,
    pixabayKey,
  } = config

  if (!imageUrls || imageUrls.length === 0) {
    return {
      success: false,
      ffmpegCommand: '',
      totalDuration: 0,
      imageCount: 0,
      audioResult: {
        bgMusicUrl: '',
        narrationText: '',
        ttsVoice: '',
        totalDuration: 0,
        useSilentFallback: true,
        ffmpegAudioFilter: '',
        ffmpegAudioParams: [],
      },
      xfadeFilter: '',
      scaleFilter: '',
      description: '',
      error: 'Nenhuma imagem fornecida para o slideshow',
    }
  }

  // ─── 1. Preparar áudio ──────────────────────────────────
  const audioResult = await prepareMangaAudio(
    pixabayKey,
    scenes,
    config.audio
  )

  // ─── 2. Calcular durações ───────────────────────────────
  const sceneDurations = scenes.map(s => s.duration || 4)
  const totalSceneDuration = sceneDurations.reduce((a, b) => a + b, 0)
  // Ajustar para considersar o tempo perdido nas transições
  const totalTransitionTime = Math.max(0, imageUrls.length - 1) * transitionDuration
  const totalVideoDuration = Math.max(totalSceneDuration, audioResult.totalDuration)

  // ─── 3. Construir filtro de escala ──────────────────────
  const scaleFilter = buildScaleFilter(outputWidth, outputHeight, useBlurBackground)

  // ─── 4. Construir filtros xfade ─────────────────────────
  // Ajustar durações das cenas para preencher a duração total do áudio
  const adjustedDurations = sceneDurations.map(d => {
    const ratio = totalVideoDuration / totalSceneDuration
    return d * ratio
  })

  const xfadeFilter = buildXFadeFilter(
    imageUrls.length,
    adjustedDurations,
    transitionDuration,
    transitionType
  )

  // ─── 5. Montar comando FFmpeg completo ──────────────────
  const inputArgs: string[] = []
  const filterParts: string[] = []

  // Inputs de vídeo (cada imagem como loop)
  for (let i = 0; i < imageUrls.length; i++) {
    const duration = adjustedDurations[i] || 4
    inputArgs.push(
      '-loop', '1',
      '-i', imageUrls[i],
      '-t', String(duration + transitionDuration), // +1 frame para overlap
    )
  }

  // Aplicar escala em cada input
  if (imageUrls.length === 1) {
    // Slideshow com uma única imagem
    filterParts.push(`[0:v]${scaleFilter},setsar=1[outv]`)
  } else {
    // Aplicar escala em cada input antes do xfade
    for (let i = 0; i < imageUrls.length; i++) {
      filterParts.push(`[${i}:v]${scaleFilter},setsar=1[scaled${i}]`)
    }

    // Adicionar xfade entre as imagens escaladas
    let currentOffset = 0
    for (let i = 0; i < imageUrls.length - 1; i++) {
      const duration = adjustedDurations[i] || 4
      currentOffset += duration - transitionDuration

      const inputLabel = `[scaled${i}]`
      const nextLabel = `[scaled${i + 1}]`
      const outputLabel = i === imageUrls.length - 2 ? '[outv]' : `[xf${i}]`

      filterParts.push(
        `${inputLabel}${nextLabel}xfade=transition=${transitionType}:duration=${transitionDuration}:offset=${Math.max(0, currentOffset).toFixed(2)}${outputLabel}`
      )
    }
  }

  // ─── 6. Montar comando final ────────────────────────────
  const ffmpegParts: string[] = []

  // Inputs de vídeo
  ffmpegParts.push(...inputArgs)

  // Inputs de áudio (se houver)
  if (!audioResult.useSilentFallback) {
    if (audioResult.bgMusicUrl) {
      ffmpegParts.push('-stream_loop', '-1', '-i', audioResult.bgMusicUrl)
    }
  } else {
    // Fallback silencioso
    ffmpegParts.push(
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'
    )
  }

  // Filter complex
  const allFilters = [...filterParts]

  // Adicionar filtro de áudio
  if (!audioResult.useSilentFallback && audioResult.bgMusicUrl) {
    const musicInputIndex = imageUrls.length // Index do input de música
    const fadeDuration = config.audio?.fadeOutDuration ?? 1.5
    const fadeStart = Math.max(0, totalVideoDuration - fadeDuration)
    const bgVolume = config.audio?.bgMusicVolume ?? 0.15

    allFilters.push(
      `[${musicInputIndex}:a]stream_loop=-1,volume=${bgVolume},afade=t=out:st=${fadeStart.toFixed(2)}:d=${fadeDuration}[aout]`
    )
  } else {
    // Silêncio — o anullsrc já está no input
    const silenceIndex = imageUrls.length
    allFilters.push(
      `[${silenceIndex}:a]atrim=duration=${totalVideoDuration},asetpts=PTS-STARTPTS[aout]`
    )
  }

  ffmpegParts.push('-filter_complex', allFilters.join(';'))

  // Map outputs
  ffmpegParts.push('-map', '[outv]', '-map', '[aout]')

  // Output settings
  ffmpegParts.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-r', String(fps),
    '-t', String(totalVideoDuration),
    '-movflags', '+faststart',
  )

  const ffmpegCommand = `ffmpeg ${ffmpegParts.join(' ')} output.mp4`

  // ─── 7. Montar descrição ────────────────────────────────
  const audioDescription = audioResult.useSilentFallback
    ? '🔇 Silêncio (fallback)'
    : `🎵 Música: ${audioResult.bgMusicUrl ? 'Sim' : 'Não'} (vol: ${config.audio?.bgMusicVolume || 0.15})`

  const description = [
    `📖 Manga Slideshow — ${imageUrls.length} imagens`,
    `⏱️ Duração: ${totalVideoDuration.toFixed(1)}s`,
    `🔄 Transição: ${transitionType} (${transitionDuration}s)`,
    `📐 Resolução: ${outputWidth}x${outputHeight}`,
    `🎬 FPS: ${fps}`,
    audioDescription,
    audioResult.useSilentFallback
      ? '⚠️ Fallback silencioso ativado (sem música nem narração)'
      : `🔊 Fade-out: ${config.audio?.fadeOutDuration || 1.5}s no final`,
  ].join('\n')

  return {
    success: true,
    ffmpegCommand,
    totalDuration: totalVideoDuration,
    imageCount: imageUrls.length,
    audioResult,
    xfadeFilter,
    scaleFilter,
    description,
  }
}

// ─── Helper: gerar argumentos para client-side rendering ──────
// Usado quando a renderização acontece no browser com ffmpeg.wasm

export function buildClientSideRenderArgs(
  config: MangaRenderConfig,
  audioResult: MangaAudioResult
): {
  images: Array<{ url: string; duration: number }>
  transition: { type: string; duration: number }
  audio: {
    bgMusicUrl: string
    bgMusicVolume: number
    fadeOutDuration: number
    totalDuration: number
    useSilentFallback: boolean
  }
  output: { width: number; height: number; fps: number }
} {
  const sceneDurations = config.scenes.map(s => s.duration || 4)
  const totalSceneDuration = sceneDurations.reduce((a, b) => a + b, 0)
  const totalDuration = Math.max(totalSceneDuration, audioResult.totalDuration)
  const ratio = totalDuration / totalSceneDuration

  return {
    images: config.imageUrls.map((url, i) => ({
      url,
      duration: (sceneDurations[i] || 4) * ratio,
    })),
    transition: {
      type: config.transitionType || 'slideleft',
      duration: config.transitionDuration || 0.6,
    },
    audio: {
      bgMusicUrl: audioResult.bgMusicUrl,
      bgMusicVolume: config.audio?.bgMusicVolume || 0.15,
      fadeOutDuration: config.audio?.fadeOutDuration || 1.5,
      totalDuration,
      useSilentFallback: audioResult.useSilentFallback,
    },
    output: {
      width: config.outputWidth || 1080,
      height: config.outputHeight || 1920,
      fps: config.fps || 30,
    },
  }
}
