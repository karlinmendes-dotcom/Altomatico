// ═══════════════════════════════════════════════════════════════
// Manga Client-Side Renderer — Gera vídeo .webm no navegador
// Modos:
//   1. Simple: slideshow com tempo fixo por página
//   2. Narrated: narração sincronizada com legendas e timing dinâmico
// ═══════════════════════════════════════════════════════════════

export interface MangaPage {
  imageUrl: string
  dialogue?: string
  sceneDescription?: string
}

export interface NarratedSegment {
  imageIndex: number
  narration: string
  duration: number
  subtitle: string
  emotion: 'hook' | 'buildup' | 'climax' | 'resolution' | 'cta'
}

export interface RenderConfig {
  pages: MangaPage[]
  durationPerPage: number
  transitionDuration: number
  canvasWidth: number
  canvasHeight: number
  bgMusicUrl?: string
  bgMusicVolume: number
  narrationText?: string
  /** Modo narrado: segmentos com timing dinâmico */
  segments?: NarratedSegment[]
  /** Ativar narração TTS pelo navegador */
  enableTTS?: boolean
  /** Velocidade da fala TTS (0.5 - 2.0) */
  ttsRate?: number
  /** Voz TTS */
  ttsVoice?: string
}

export interface RenderProgress {
  phase: 'loading' | 'rendering' | 'encoding' | 'complete' | 'error'
  currentPage: number
  totalPages: number
  percent: number
  message: string
  videoBlob?: Blob
  error?: string
}

type ProgressCallback = (progress: RenderProgress) => void

// ═══════════════════════════════════════════════════════════════
// YouTube Shorts Limits
// ═══════════════════════════════════════════════════════════════
export const YOUTUBE_SHORTS_MAX_SECONDS = 55 // Shorts: máx 60s, usamos 55s de margem

export interface MangaPart {
  partNumber: number
  totalParts: number
  pages: MangaPage[]
  startPage: number
  endPage: number
  estimatedDuration: number
}

/**
 * Divide capítulo em partes para YouTube Shorts (máx 55s cada)
 */
export function splitChapterIntoParts(
  allPages: MangaPage[],
  durationPerPage: number,
  transitionDuration: number = 0.6
): MangaPart[] {
  const effectiveDurationPerPage = durationPerPage + transitionDuration
  const maxPagesPerPart = Math.floor(YOUTUBE_SHORTS_MAX_SECONDS / effectiveDurationPerPage)

  if (allPages.length <= maxPagesPerPart) {
    return [{
      partNumber: 1,
      totalParts: 1,
      pages: allPages,
      startPage: 1,
      endPage: allPages.length,
      estimatedDuration: allPages.length * effectiveDurationPerPage,
    }]
  }

  const parts: MangaPart[] = []
  const totalParts = Math.ceil(allPages.length / maxPagesPerPart)

  for (let i = 0; i < totalParts; i++) {
    const start = i * maxPagesPerPart
    const end = Math.min(start + maxPagesPerPart, allPages.length)
    const partPages = allPages.slice(start, end)
    parts.push({
      partNumber: i + 1,
      totalParts,
      pages: partPages,
      startPage: start + 1,
      endPage: end,
      estimatedDuration: partPages.length * effectiveDurationPerPage,
    })
  }

  return parts
}

/**
 * Carrega imagem para HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`))
    img.src = url
  })
}

/**
 * Desenha página de mangá no canvas com blur background + imagem centralizada
 */
function drawMangaPage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
): { drawX: number; drawY: number; drawW: number; drawH: number } {
  // 1. Fundo desfocado
  ctx.save()
  ctx.filter = 'blur(20px) brightness(0.3)'
  const bgScale = Math.max(width / img.width, height / img.height) * 1.2
  const bgW = img.width * bgScale
  const bgH = img.height * bgScale
  ctx.drawImage(img, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH)
  ctx.restore()

  // 2. Imagem principal centralizada
  ctx.save()
  const scale = Math.min(width / img.width, height / img.height) * 0.88
  const drawW = img.width * scale
  const drawH = img.height * scale
  const drawX = (width - drawW) / 2
  const drawY = (height - drawH) / 2

  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 5

  const radius = 12
  ctx.beginPath()
  ctx.roundRect(drawX, drawY, drawW, drawH, radius)
  ctx.clip()
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()

  // 3. Borda branca estilo revistinha
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(drawX - 1, drawY - 1, drawW + 2, drawH + 2, radius)
  ctx.stroke()
  ctx.restore()

  return { drawX, drawY, drawW, drawH }
}

/**
 * Desenha legenda narrada (centralizada, estilo shorts)
 */
function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  emotion: string
) {
  if (!text) return

  ctx.save()

  const maxWidth = width * 0.85
  const fontSize = Math.floor(width * 0.042)
  ctx.font = `bold ${fontSize}px "Arial Black", "Segoe UI", Arial, sans-serif`

  // Medir e quebrar texto
  const lines: string[] = []
  const words = text.split(' ')
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fontSize * 1.5
  const padding = 14
  const totalTextH = lines.length * lineHeight
  const bubbleH = totalTextH + padding * 2
  const bubbleW = Math.min(
    maxWidth + padding * 2,
    Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2
  )

  const bubbleX = (width - bubbleW) / 2
  const bubbleY = height - bubbleH - 80 // Posição inferior

  // Fundo do subtítulo com cor baseada na emoção
  const emotionColors: Record<string, string> = {
    hook: 'rgba(239, 68, 68, 0.9)',    // Vermelho
    buildup: 'rgba(59, 130, 246, 0.9)', // Azul
    climax: 'rgba(168, 85, 247, 0.9)',  // Roxo
    resolution: 'rgba(34, 197, 94, 0.9)', // Verde
    cta: 'rgba(245, 158, 11, 0.9)',     // Laranja
  }

  // Sombra
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 3

  // Fundo com bordas arredondadas
  ctx.fillStyle = emotionColors[emotion] || 'rgba(0,0,0,0.8)'
  ctx.beginPath()
  ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 12)
  ctx.fill()

  // Texto branco com contorno preto
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Contorno/preenchimento duplo para legibilidade
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  lines.forEach((line, i) => {
    ctx.strokeText(line, width / 2, bubbleY + padding + i * lineHeight)
  })
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, bubbleY + padding + i * lineHeight)
  })

  ctx.restore()
}

/**
 * Desenha balão de diálogo (para modo simples)
 */
function drawDialogueBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  pageBounds: { drawX: number; drawY: number; drawW: number; drawH: number }
) {
  if (!text) return

  ctx.save()

  const maxWidth = pageBounds.drawW * 0.85
  const fontSize = Math.floor(width * 0.038)
  ctx.font = `bold ${fontSize}px "Comic Sans MS", "Segoe UI", Arial, sans-serif`

  const lines: string[] = []
  const words = text.split(' ')
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fontSize * 1.4
  const padding = 16
  const bubbleH = lines.length * lineHeight + padding * 2
  const bubbleW = Math.min(
    maxWidth + padding * 2,
    Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2
  )

  const bubbleX = (width - bubbleW) / 2
  const bubbleY = pageBounds.drawY + pageBounds.drawH - bubbleH - 20

  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 3

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.beginPath()
  ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 16)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#1a1a2e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, bubbleY + padding + i * lineHeight)
  })

  ctx.restore()
}

/**
 * Desenha barra de progresso inferior
 */
function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  current: number,
  total: number,
  percent: number
) {
  const barHeight = 6
  const barY = height - 30

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(40, barY, width - 80, barHeight)

  ctx.fillStyle = '#a855f7'
  ctx.beginPath()
  ctx.roundRect(40, barY, (width - 80) * percent, barHeight, 3)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `${Math.floor(width * 0.025)}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText(`${current} / ${total}`, width - 40, barY - 8)

  ctx.restore()
}

/**
 * Desenha efeito visual baseado na emoção do segmento
 */
function drawEmotionOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emotion: string,
  progress: number // 0-1
) {
  if (emotion === 'hook' || emotion === 'climax') {
    // Flash sutil no início
    if (progress < 0.15) {
      const alpha = (1 - progress / 0.15) * 0.3
      ctx.save()
      ctx.fillStyle = emotion === 'hook'
        ? `rgba(239, 68, 68, ${alpha})`
        : `rgba(168, 85, 247, ${alpha})`
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }
  }
}

/**
 * Função principal: renderiza slideshow narrado ou simples
 */
export async function renderMangaSlideshow(
  config: RenderConfig,
  onProgress: ProgressCallback
): Promise<Blob> {
  const {
    pages,
    durationPerPage = 3,
    transitionDuration = 0.6,
    canvasWidth = 1080,
    canvasHeight = 1920,
    bgMusicVolume = 0.15,
    segments,
    enableTTS = false,
    ttsRate = 1.0,
  } = config

  if (pages.length === 0) {
    throw new Error('Nenhuma página para renderizar')
  }

  // Determinar se é modo narrado ou simples
  const isNarrated = segments && segments.length > 0

  // ═══ FASE 1: Carregar imagens ═══
  onProgress({
    phase: 'loading',
    currentPage: 0,
    totalPages: isNarrated ? segments.length : pages.length,
    percent: 0,
    message: 'Carregando imagens do capítulo...',
  })

  // No modo narrado, carregar apenas as imagens selecionadas
  const imagesToLoad = isNarrated
    ? segments.map(s => pages[s.imageIndex]).filter(Boolean)
    : pages

  const loadedImages: HTMLImageElement[] = []
  const totalToLoad = imagesToLoad.length

  for (let i = 0; i < totalToLoad; i++) {
    try {
      const img = await loadImage(imagesToLoad[i].imageUrl)
      loadedImages.push(img)
      onProgress({
        phase: 'loading',
        currentPage: i + 1,
        totalPages: totalToLoad,
        percent: ((i + 1) / totalToLoad) * 25,
        message: `Carregando página ${i + 1}/${totalToLoad}...`,
      })
    } catch (err) {
      console.warn(`[manga-renderer] Falha ao carregar página ${i + 1}:`, err)
    }
  }

  if (loadedImages.length === 0) {
    throw new Error('Nenhuma imagem pôde ser carregada')
  }

  // ═══ FASE 2: Preparar Canvas + MediaRecorder ═══
  onProgress({
    phase: 'rendering',
    currentPage: 0,
    totalPages: loadedImages.length,
    percent: 25,
    message: isNarrated ? 'Preparando renderer narrado...' : 'Preparando renderer...',
  })

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')!

  const fps = 30
  const stream = canvas.captureStream(fps)

  // ═══ ÁUDIO DE FUNDO ═══
  let audioContext: AudioContext | null = null
  let bgMusicElement: HTMLAudioElement | null = null

  if (bgMusicVolume > 0) {
    try {
      audioContext = new AudioContext()

      // Buscar música no Pixabay
      const pixabayRes = await fetch(
        `/api/manga-render?getMusic=1&mood=ambient`
      ).catch(() => null)

      let musicUrl = ''
      if (pixabayRes?.ok) {
        const musicData = await pixabayRes.json()
        musicUrl = musicData.bgMusicUrl || ''
      }

      if (musicUrl) {
        bgMusicElement = new Audio(musicUrl)
        bgMusicElement.crossOrigin = 'anonymous'
        bgMusicElement.loop = true
        bgMusicElement.volume = bgMusicVolume

        const bgSource = audioContext.createMediaElementSource(bgMusicElement)
        const audioDest = audioContext.createMediaStreamDestination()
        bgSource.connect(audioDest)
        bgSource.connect(audioContext.destination) // Also play through speakers for preview
        stream.addTrack(audioDest.stream.getAudioTracks()[0])

        bgMusicElement.play()
      }
    } catch (err) {
      console.warn('[manga-renderer] Falha ao configurar áudio:', err)
    }
  }

  // ═══ TTS (Text-to-Speech) ═══
  let ttsUtterance: SpeechSynthesisUtterance | null = null
  let ttsVoiceSelected: SpeechSynthesisVoice | null = null

  if (enableTTS && isNarrated && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices()
    // Priorizar vozes em português
    ttsVoiceSelected = voices.find(v => v.lang.startsWith('pt-BR'))
      || voices.find(v => v.lang.startsWith('pt'))
      || voices.find(v => v.lang.startsWith('es'))
      || voices[0]
  }

  // ═══ MediaRecorder ═══
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 6_000_000,
  })

  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  return new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      bgMusicElement?.pause()
      audioContext?.close()
      window.speechSynthesis?.cancel()
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    mediaRecorder.onerror = () => {
      bgMusicElement?.pause()
      audioContext?.close()
      window.speechSynthesis?.cancel()
      reject(new Error('Erro no MediaRecorder'))
    }

    mediaRecorder.start()

    // ═══ FASE 3: Renderizar frames ═══
    let currentSegmentIdx = 0
    let frameCount = 0
    let segmentFrameCount = 0

    function getSegmentDuration(segIdx: number): number {
      if (isNarrated && segments[segIdx]) {
        return segments[segIdx].duration
      }
      return durationPerPage
    }

    function getFramesForSegment(segIdx: number): number {
      return getSegmentDuration(segIdx) * fps
    }

    function getTotalFrames(): number {
      if (isNarrated) {
        return segments.reduce((sum, s) => sum + s.duration * fps, 0)
      }
      return loadedImages.length * durationPerPage * fps
    }

    const totalFrames = getTotalFrames()

    function renderFrame() {
      if (currentSegmentIdx >= loadedImages.length) {
        onProgress({
          phase: 'encoding',
          currentPage: loadedImages.length,
          totalPages: loadedImages.length,
          percent: 95,
          message: 'Finalizando vídeo...',
        })
        mediaRecorder.stop()
        return
      }

      const img = loadedImages[currentSegmentIdx]
      const framesForThisSegment = getFramesForSegment(currentSegmentIdx)
      const progress = segmentFrameCount / framesForThisSegment // 0-1 within segment
      const emotion = isNarrated ? segments[currentSegmentIdx]?.emotion || 'buildup' : 'buildup'
      const subtitle = isNarrated ? segments[currentSegmentIdx]?.subtitle || '' : ''
      const dialogue = isNarrated ? '' : (pages[currentSegmentIdx] || pages[currentSegmentIdx * Math.floor(pages.length / loadedImages.length)])?.dialogue || ''

      // Limpar canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // Efeito de slide entre segmentos
      let slideOffset = 0
      const framesTransition = transitionDuration * fps
      if (segmentFrameCount < framesTransition && currentSegmentIdx > 0) {
        const t = segmentFrameCount / framesTransition
        slideOffset = -canvasWidth * easeInOutCubic(t)
      }

      ctx.save()
      if (slideOffset !== 0) {
        ctx.translate(slideOffset, 0)
      }

      // Desenhar página
      const bounds = drawMangaPage(ctx, img, canvasWidth, canvasHeight)

      // Desenhar subtítulo narrado OU balão de diálogo
      if (isNarrated && subtitle) {
        drawSubtitle(ctx, subtitle, canvasWidth, canvasHeight, emotion)
      } else if (dialogue) {
        drawDialogueBubble(ctx, dialogue, canvasWidth, canvasHeight, bounds)
      }

      // Overlay de emoção
      drawEmotionOverlay(ctx, canvasWidth, canvasHeight, emotion, progress)

      ctx.restore()

      // Barra de progresso
      const overallProgress = frameCount / totalFrames
      drawProgressBar(ctx, canvasWidth, canvasHeight, currentSegmentIdx + 1, loadedImages.length, overallProgress)

      // Controle de progresso
      frameCount++
      segmentFrameCount++

      if (segmentFrameCount >= framesForThisSegment) {
        currentSegmentIdx++
        segmentFrameCount = 0
      }

      const percent = 25 + (frameCount / totalFrames) * 70
      onProgress({
        phase: 'rendering',
        currentPage: currentSegmentIdx + 1,
        totalPages: loadedImages.length,
        percent: Math.min(percent, 95),
        message: isNarrated
          ? `Narrando segmento ${currentSegmentIdx + 1}/${loadedImages.length}...`
          : `Renderizando página ${currentSegmentIdx + 1}/${loadedImages.length}...`,
      })

      // Próximo frame
      setTimeout(renderFrame, 1000 / fps / 2)
    }

    // Iniciar narração TTS se modo narrado
    if (enableTTS && isNarrated && ttsVoiceSelected && 'speechSynthesis' in window) {
      let ttsDelay = 0
      for (const seg of segments) {
        const utterance = new SpeechSynthesisUtterance(seg.narration)
        utterance.voice = ttsVoiceSelected
        utterance.rate = ttsRate
        utterance.pitch = 1.0
        utterance.volume = 1.0
        utterance.lang = 'pt-BR'

        window.speechSynthesis.speak(utterance)
      }
    }

    renderFrame()
  })
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function downloadVideoBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
