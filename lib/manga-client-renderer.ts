// ═══════════════════════════════════════════════════════════════
// Manga Client-Side Renderer — Gera vídeo .webm no navegador
// Pipeline de áudio completo:
//   - TTS server-side (Google Translate TTS) → AudioBuffer
//   - Música de fundo (Pixabay) → AudioBuffer
//   - SFX (Web Audio API oscilators) → AudioBuffer
//   - Mix via AudioContext → MediaStreamDestination → MediaRecorder
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
  bgMusicVolume: number
  narrationText?: string
  segments?: NarratedSegment[]
  /** Áudio TTS pré-gerado server-side (base64 segments) */
  ttsAudioSegments?: { base64: string; duration: number; text: string; index: number }[]
  /** URL da música de fundo */
  bgMusicUrl?: string
  /** Ativar SFX */
  enableSfx?: boolean
}

export interface RenderProgress {
  phase: 'loading' | 'audio' | 'rendering' | 'encoding' | 'complete' | 'error'
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
export const YOUTUBE_SHORTS_MAX_SECONDS = 55

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

// ═══════════════════════════════════════════════════════════════
// ÁUDIO: Decodificar base64 para AudioBuffer
// ═══════════════════════════════════════════════════════════════

async function decodeBase64Audio(audioContext: AudioContext, base64: string): Promise<AudioBuffer> {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return await audioContext.decodeAudioData(bytes.buffer)
}

// ═══════════════════════════════════════════════════════════════
// SFX: Gerar efeitos sonoros com Web Audio API
// ═══════════════════════════════════════════════════════════════

function generateSfx(
  audioContext: AudioContext,
  type: 'punch' | 'boom' | 'reveal' | 'whoosh',
  duration: number = 0.3
): AudioBuffer {
  const sampleRate = audioContext.sampleRate
  const length = Math.floor(sampleRate * duration)
  const buffer = audioContext.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-t * (type === 'boom' ? 8 : 15))

    switch (type) {
      case 'punch': {
        // impacto grave + ruído
        const freq = 80 * Math.exp(-t * 20)
        data[i] = envelope * (
          0.6 * Math.sin(2 * Math.PI * freq * t) +
          0.3 * (Math.random() * 2 - 1) * Math.exp(-t * 25)
        )
        break
      }
      case 'boom': {
        // explosão grave
        const f = 60 * Math.exp(-t * 5)
        data[i] = envelope * (
          0.7 * Math.sin(2 * Math.PI * f * t) +
          0.4 * (Math.random() * 2 - 1) * Math.exp(-t * 10)
        )
        break
      }
      case 'reveal': {
        // brilho agudo ascendente
        const sweep = 800 + 2000 * t / duration
        data[i] = envelope * 0.4 * Math.sin(2 * Math.PI * sweep * t)
        break
      }
      case 'whoosh': {
        // varredura de frequência
        const sweepFreq = 200 + 1500 * (1 - t / duration)
        data[i] = envelope * (
          0.3 * Math.sin(2 * Math.PI * sweepFreq * t) +
          0.2 * (Math.random() * 2 - 1) * envelope
        )
        break
      }
    }
  }

  return buffer
}

// ═══════════════════════════════════════════════════════════════
// Mapear emoção → SFX
// ═══════════════════════════════════════════════════════════════

function emotionToSfx(emotion: string): 'punch' | 'boom' | 'reveal' | 'whoosh' | null {
  switch (emotion) {
    case 'hook': return 'whoosh'
    case 'climax': return 'boom'
    case 'resolution': return 'reveal'
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════════
// Imagem: carregar e desenhar
// ═══════════════════════════════════════════════════════════════

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // NÃO usar crossOrigin aqui — o proxy same-origin já retorna CORS headers.
    // crossOrigin='anonymous' faz o browser bloquear imagens que retornam
    // header CORS diferente ou atrasado. Sem ele, as imagens carregam normalmente
    // e canvas.captureStream() funciona em todos os browsers modernos.
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`))
    img.src = url
  })
}

function drawMangaPage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
): { drawX: number; drawY: number; drawW: number; drawH: number } {
  // 1. Fundo escuro (limpo)
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, width, height)

  // 2. Fundo desfocado preenchendo todo o canvas
  ctx.save()
  ctx.filter = 'blur(30px) brightness(0.4)'
  const bgScale = Math.max(width / img.width, height / img.height) * 1.3
  const bgW = img.width * bgScale
  const bgH = img.height * bgScale
  ctx.drawImage(img, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH)
  ctx.restore()

  // 3. Imagem principal — PREENCHE o canvas (cover mode)
  //    Usa Math.max para garantir que a imagem cobre todo o canvas 1080x1920
  //    A imagem pode ter partes cortadas nas laterais (correto para mangá vertical)
  ctx.save()
  const scale = Math.max(width / img.width, height / img.height)
  const drawW = img.width * scale
  const drawH = img.height * scale
  const drawX = (width - drawW) / 2
  const drawY = (height - drawH) / 2

  // Desenhar imagem preenchendo o canvas inteiro
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()

  // 4. Borda sutil estilo revistinha (apenas nas laterais)
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 4
  ctx.strokeRect(0, 0, width, height)
  ctx.restore()

  return { drawX, drawY, drawW, drawH }
}

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
  const bubbleY = height - bubbleH - 80

  const emotionColors: Record<string, string> = {
    hook: 'rgba(239, 68, 68, 0.9)',
    buildup: 'rgba(59, 130, 246, 0.9)',
    climax: 'rgba(168, 85, 247, 0.9)',
    resolution: 'rgba(34, 197, 94, 0.9)',
    cta: 'rgba(245, 158, 11, 0.9)',
  }

  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 3

  ctx.fillStyle = emotionColors[emotion] || 'rgba(0,0,0,0.8)'
  ctx.beginPath()
  ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 12)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

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

function drawEmotionOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emotion: string,
  progress: number
) {
  if (emotion === 'hook' || emotion === 'climax') {
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

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ═══════════════════════════════════════════════════════════════
// Função principal: renderiza vídeo com áudio completo
// ═══════════════════════════════════════════════════════════════

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
    ttsAudioSegments,
    bgMusicUrl,
    enableSfx = true,
  } = config

  if (pages.length === 0) {
    throw new Error('Nenhuma página para renderizar')
  }

  const isNarrated = segments && segments.length > 0

  // ═══ FASE 1: Carregar imagens ═══
  onProgress({
    phase: 'loading',
    currentPage: 0,
    totalPages: isNarrated ? segments.length : pages.length,
    percent: 0,
    message: 'Carregando imagens do capítulo...',
  })

  const imagesToLoad = isNarrated
    ? segments.map(s => pages[s.imageIndex]).filter(Boolean)
    : pages

  const loadedImages: HTMLImageElement[] = []
  for (let i = 0; i < imagesToLoad.length; i++) {
    try {
      const img = await loadImage(imagesToLoad[i].imageUrl)
      loadedImages.push(img)
      onProgress({
        phase: 'loading',
        currentPage: i + 1,
        totalPages: imagesToLoad.length,
        percent: ((i + 1) / imagesToLoad.length) * 20,
        message: `Carregando página ${i + 1}/${imagesToLoad.length}...`,
      })
    } catch (err) {
      console.warn(`[manga-renderer] Falha ao carregar página ${i + 1}:`, err)
    }
  }

  if (loadedImages.length === 0) {
    throw new Error('Nenhuma imagem pôde ser carregada')
  }

  // ═══ FASE 2: Preparar Canvas + AudioContext ═══
  onProgress({
    phase: 'audio',
    currentPage: 0,
    totalPages: loadedImages.length,
    percent: 20,
    message: 'Preparando áudio...',
  })

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')!

  const fps = 30

  // ═══ ÁUDIO: AudioContext centralizado ═══
  const audioCtx = new AudioContext()
  const audioDestination = audioCtx.createMediaStreamDestination()

  // Mixmaster: tudo passa por este gain
  const masterGain = audioCtx.createGain()
  masterGain.gain.value = 1.0
  masterGain.connect(audioDestination)

  // ═══ MÚSICA DE FUNDO ═══
  let bgMusicDuration = 0
  if (bgMusicUrl && bgMusicVolume > 0) {
    try {
      onProgress({
        phase: 'audio',
        currentPage: 0,
        totalPages: loadedImages.length,
        percent: 22,
        message: 'Carregando música de fundo...',
      })

      const musicResponse = await fetch(bgMusicUrl)
      if (musicResponse.ok) {
        const musicArrayBuffer = await musicResponse.arrayBuffer()
        const musicBuffer = await audioCtx.decodeAudioData(musicArrayBuffer)

        bgMusicDuration = musicBuffer.duration

        // Criar source de música em loop
        const musicSource = audioCtx.createBufferSource()
        musicSource.buffer = musicBuffer
        musicSource.loop = true

        const musicGain = audioCtx.createGain()
        musicGain.gain.value = bgMusicVolume

        musicSource.connect(musicGain)
        musicGain.connect(masterGain)
        musicSource.start()

        console.log(`[manga-renderer] ✅ Música de fundo carregada (${musicBuffer.duration.toFixed(1)}s)`)
      }
    } catch (err) {
      console.warn('[manga-renderer] Falha ao carregar música:', err)
    }
  }

  // ═══ FALLBACK: Gerar música ambiente via Web Audio API ═══
  // Se não há música do Pixabay, gera um loop suave de tons ambiente
  // para garantir que o vídeo SEMPRE tenha áudio (YouTube não rejeita)
  if (bgMusicVolume > 0 && bgMusicDuration === 0) {
    onProgress({
      phase: 'audio',
      currentPage: 0,
      totalPages: loadedImages.length,
      percent: 23,
      message: 'Gerando música ambiente (fallback)...',
    })

    const totalDuration = isNarrated
      ? segments.reduce((s, seg) => s + seg.duration, 0)
      : loadedImages.length * durationPerPage
    const sampleRate = audioCtx.sampleRate
    const ambientLength = Math.ceil(sampleRate * Math.max(totalDuration + 2, 60))
    const ambientBuffer = audioCtx.createBuffer(2, ambientLength, sampleRate)

    // Gerar loop suave de acordes ambiente
    const chordFreqs = [261.63, 329.63, 392.0, 523.25] // C4, E4, G4, C5
    for (let ch = 0; ch < 2; ch++) {
      const data = ambientBuffer.getChannelData(ch)
      for (let i = 0; i < ambientLength; i++) {
        const t = i / sampleRate
        let sample = 0
        for (let f = 0; f < chordFreqs.length; f++) {
          const freq = chordFreqs[f] * (ch === 0 ? 1 : 1.002) // slight detune for richness
          sample += Math.sin(2 * Math.PI * freq * t) * 0.08
        }
        // Slow amplitude modulation for movement
        sample *= 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.15 * t)
        // Soft fade in/out
        const fadeIn = Math.min(1, t / 2)
        const fadeOut = Math.min(1, (ambientLength / sampleRate - t) / 2)
        sample *= fadeIn * fadeOut
        data[i] = sample * 0.3
      }
    }

    const ambientSource = audioCtx.createBufferSource()
    ambientSource.buffer = ambientBuffer
    ambientSource.loop = true

    const ambientGain = audioCtx.createGain()
    ambientGain.gain.value = bgMusicVolume * 0.8 // slightly quieter than Pixabay music

    ambientSource.connect(ambientGain)
    ambientGain.connect(masterGain)
    ambientSource.start()

    console.log(`[manga-renderer] ✅ Música ambiente gerada (${totalDuration.toFixed(1)}s)`)  
  }

  // ═══ TTS: Narração via áudio pré-gerado ═══
  const ttsBuffers: { buffer: AudioBuffer; startTime: number; duration: number }[] = []

  if (isNarrated && ttsAudioSegments && ttsAudioSegments.length > 0) {
    onProgress({
      phase: 'audio',
      currentPage: 0,
      totalPages: loadedImages.length,
      percent: 25,
      message: 'Decodificando narração...',
    })

    let currentTime = 0
    for (const seg of ttsAudioSegments) {
      try {
        const audioBuffer = await decodeBase64Audio(audioCtx, seg.base64)
        ttsBuffers.push({
          buffer: audioBuffer,
          startTime: currentTime,
          duration: seg.duration,
        })
        currentTime += seg.duration
      } catch (err) {
        console.warn(`[manga-renderer] Falha ao decodificar TTS segmento ${seg.index}:`, err)
      }
    }

    console.log(`[manga-renderer] ✅ ${ttsBuffers.length} segmentos TTS decodificados`)
  }

  // ═══ SFX: Pré-gerar efeitos sonoros ═══
  const sfxBuffers: Map<string, AudioBuffer> = new Map()
  if (enableSfx && isNarrated) {
    const sfxTypes = ['punch', 'boom', 'reveal', 'whoosh'] as const
    for (const type of sfxTypes) {
      sfxBuffers.set(type, generateSfx(audioCtx, type, 0.4))
    }
  }

  // ═══ MONTAR TIMELINE DE ÁUDIO ═══
  // Calcular quando cada segmento TTS deve tocar (alinhado com as imagens)
  const segmentTimings: { ttsIdx: number; imageIdx: number; startFrame: number; endFrame: number }[] = []
  if (isNarrated && ttsBuffers.length > 0) {
    let frameAccum = 0
    for (let i = 0; i < segments.length && i < ttsBuffers.length; i++) {
      const segDuration = segments[i].duration
      const segFrames = segDuration * fps
      segmentTimings.push({
        ttsIdx: i,
        imageIdx: i,
        startFrame: frameAccum,
        endFrame: frameAccum + segFrames,
      })
      frameAccum += segFrames
    }
  }

  // ═══ MONTAR MediaRecorder ═══
  const stream = canvas.captureStream(fps)
  // Adicionar a faixa de áudio do AudioContext ao stream
  stream.addTrack(audioDestination.stream.getAudioTracks()[0])

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 6_000_000,
  })

  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  return new Promise<Blob>((resolve, reject) => {
    let ttsStarted = false

    mediaRecorder.onstop = () => {
      audioCtx.close()
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    mediaRecorder.onerror = () => {
      audioCtx.close()
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
      const progress = segmentFrameCount / framesForThisSegment
      const emotion = isNarrated ? segments[currentSegmentIdx]?.emotion || 'buildup' : 'buildup'
      const subtitle = isNarrated ? segments[currentSegmentIdx]?.subtitle || '' : ''

      // ═══ TOSCAR TTS: Iniciar narração sincronizada ═══
      if (!ttsStarted && isNarrated && ttsBuffers.length > 0) {
        ttsStarted = true
        // Tocar cada segmento TTS no momento correto
        for (const timing of segmentTimings) {
          if (timing.ttsIdx < ttsBuffers.length) {
            const ttsBuf = ttsBuffers[timing.ttsIdx]
            const startTimeSec = timing.startFrame / fps

            const ttsSource = audioCtx.createBufferSource()
            ttsSource.buffer = ttsBuf.buffer

            // Volume da narração mais alto que a música
            const ttsGain = audioCtx.createGain()
            ttsGain.gain.value = 1.0

            ttsSource.connect(ttsGain)
            ttsGain.connect(masterGain)

            // Agendar início
            const delay = Math.max(0, startTimeSec - audioCtx.currentTime)
            ttsSource.start(audioCtx.currentTime + delay)
          }
        }

        // ═══ SFX: Tocar efeitos no momento certo ═══
        if (enableSfx) {
          for (const timing of segmentTimings) {
            const seg = segments[timing.ttsIdx]
            if (seg) {
              const sfxType = emotionToSfx(seg.emotion)
              if (sfxType && sfxBuffers.has(sfxType)) {
                const sfxBuf = sfxBuffers.get(sfxType)!
                const sfxSource = audioCtx.createBufferSource()
                sfxSource.buffer = sfxBuf

                const sfxGain = audioCtx.createGain()
                sfxGain.gain.value = 0.3 // Volume sutil

                sfxSource.connect(sfxGain)
                sfxGain.connect(masterGain)

                const sfxTime = timing.startFrame / fps
                const delay = Math.max(0, sfxTime - audioCtx.currentTime)
                sfxSource.start(audioCtx.currentTime + delay)
              }
            }
          }
        }
      }

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
      drawMangaPage(ctx, img, canvasWidth, canvasHeight)

      // Desenhar subtítulo narrado
      if (isNarrated && subtitle) {
        drawSubtitle(ctx, subtitle, canvasWidth, canvasHeight, emotion)
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

      const percent = 30 + (frameCount / totalFrames) * 65
      onProgress({
        phase: 'rendering',
        currentPage: Math.min(currentSegmentIdx + 1, loadedImages.length),
        totalPages: loadedImages.length,
        percent: Math.min(percent, 95),
        message: isNarrated
          ? `Renderizando segmento ${Math.min(currentSegmentIdx + 1, loadedImages.length)}/${loadedImages.length}...`
          : `Renderizando página ${Math.min(currentSegmentIdx + 1, loadedImages.length)}/${loadedImages.length}...`,
      })

      // Próximo frame
      setTimeout(renderFrame, 1000 / fps / 2)
    }

    renderFrame()
  })
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
