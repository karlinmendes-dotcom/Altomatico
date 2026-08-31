// ═══════════════════════════════════════════════════════════════
// Manga Video Renderer — Renderiza slideshow de mangá/manhwa
// Efeito "revistinha" com transição slideleft (xfade)
// Imagens escaladas para 1080x1920 com blur background
// Encapsulado — não altera os scripts de renderização padrão
// ═══════════════════════════════════════════════════════════════

export interface MangaImage {
  url: string           // URL da imagem (manga page/panel)
  alt?: string          // Descrição alternativa
  duration?: number     // Duração em segundos (padrão: 3)
}

export interface MangaVideoConfig {
  images: MangaImage[]
  outputWidth?: number   // Padrão: 1080 (vertical 9:16)
  outputHeight?: number  // Padrão: 1920
  transitionDuration?: number  // Duração da transição em segundos (0.5-0.8)
  imageHoldDuration?: number   // Quanto tempo cada imagem fica na tela (2-5s)
  backgroundColor?: string     // Cor de fundo caso o blur não preencha
  narrationText?: string       // Texto da narração TTS opcional
  subtitleLines?: SubtitleLine[]  // Legendas sincronizadas
}

export interface SubtitleLine {
  text: string
  startSeconds: number
  endSeconds: number
  style?: 'normal' | 'screaming' | 'whisper' | 'narration'
}

export interface MangaRenderProgress {
  stage: string
  percent: number
  message: string
  currentImage?: number
  totalImages?: number
}

type ProgressCallback = (progress: MangaRenderProgress) => void

// ─── Configurações padrão ───────────────────────────────────

const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 1920
const DEFAULT_TRANSITION_DURATION = 0.7  // segundos (0.5-0.8)
const DEFAULT_IMAGE_HOLD = 3.0           // segundos por imagem
const FPS = 30

// ─── Carregamento de imagem ──────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`))
    img.src = url
  })
}

// ─── Desenhar imagem escalada com pad (sem distorção) ───────
// Centraliza a imagem no canvas 1080x1920, preenchendo com
// fundo desfocado (blur) baseado na própria imagem.

function drawImageWithBlurBackground(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
) {
  // 1. Desenhar versão desfocada como background (preenche tudo)
  const imgAspect = img.naturalWidth / img.naturalHeight
  const canvasAspect = canvasWidth / canvasHeight

  let bgDrawWidth: number, bgDrawHeight: number, bgOffsetX: number, bgOffsetY: number

  if (imgAspect > canvasAspect) {
    // Imagem mais larga que o canvas — esticar na largura, cropar vertical
    bgDrawHeight = canvasHeight * 1.2  // Sobra extra para preencher
    bgDrawWidth = bgDrawHeight * imgAspect
    bgOffsetX = (canvasWidth - bgDrawWidth) / 2
    bgOffsetY = (canvasHeight - bgDrawHeight) / 2
  } else {
    // Imagem mais alta — esticar na altura
    bgDrawWidth = canvasWidth * 1.2
    bgDrawHeight = bgDrawWidth / imgAspect
    bgOffsetX = (canvasWidth - bgDrawWidth) / 2
    bgOffsetY = (canvasHeight - bgDrawHeight) / 2
  }

  // Aplicar blur no background
  ctx.save()
  ctx.filter = 'blur(30px) brightness(0.5)'
  ctx.drawImage(img, bgOffsetX, bgOffsetY, bgDrawWidth, bgDrawHeight)
  ctx.restore()

  // Overlay escuro sutil
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 2. Desenhar imagem principal (centralizada, sem distorção)
  let mainDrawWidth: number, mainDrawHeight: number

  if (imgAspect > canvasAspect) {
    // Imagem mais larga — ajustar à largura do canvas com margem
    mainDrawWidth = canvasWidth * 0.92
    mainDrawHeight = mainDrawWidth / imgAspect
  } else {
    // Imagem mais alta — ajustar à altura com margem
    mainDrawHeight = canvasHeight * 0.85
    mainDrawWidth = mainDrawHeight * imgAspect
  }

  const mainOffsetX = (canvasWidth - mainDrawWidth) / 2
  const mainOffsetY = (canvasHeight - mainDrawHeight) / 2

  // Sombra leve atrás da imagem
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 4

  // Bordas arredondadas
  const borderRadius = 12
  ctx.save()
  roundRect(ctx, mainOffsetX, mainOffsetY, mainDrawWidth, mainDrawHeight, borderRadius)
  ctx.clip()
  ctx.drawImage(img, mainOffsetX, mainOffsetY, mainDrawWidth, mainDrawHeight)
  ctx.restore()

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Borda fina branca
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 2
  roundRect(ctx, mainOffsetX, mainOffsetY, mainDrawWidth, mainDrawHeight, borderRadius)
  ctx.stroke()
}

// ─── Helper: Rounded Rectangle ───────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── Transição slideleft (simula xfade do FFmpeg) ────────────
// Desloca a imagem atual para a esquerda enquanto a próxima
// entra pela direita — efeito "virar página de revistinha".

function drawSlideLeftTransition(
  ctx: CanvasRenderingContext2D,
  currentImg: HTMLImageElement,
  nextImg: HTMLImageElement,
  progress: number,       // 0 = imagem atual totalmente visível, 1 = próxima totalmente visível
  canvasWidth: number,
  canvasHeight: number
) {
  // Offset baseado no progresso (0→1)
  const offset = progress * canvasWidth

  // Desenhar imagem atual deslocando para a esquerda
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvasWidth - offset, canvasHeight)
  ctx.clip()
  drawImageWithBlurBackground(ctx, currentImg, canvasWidth, canvasHeight)
  ctx.restore()

  // Desenhar próxima imagem entrando pela direita
  ctx.save()
  ctx.beginPath()
  ctx.rect(canvasWidth - offset, 0, offset, canvasHeight)
  ctx.clip()

  // Traduzir o canvas para simular a entrada pela direita
  ctx.translate(offset, 0)
  drawImageWithBlurBackground(ctx, nextImg, canvasWidth, canvasHeight)
  ctx.restore()

  // Sombra na borda da transição
  const shadowWidth = 40
  const shadowGrad = ctx.createLinearGradient(
    canvasWidth - offset - shadowWidth / 2, 0,
    canvasWidth - offset + shadowWidth / 2, 0
  )
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
  shadowGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.15)')
  shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)')
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = shadowGrad
  ctx.fillRect(canvasWidth - offset - shadowWidth / 2, 0, shadowWidth, canvasHeight)
}

// ─── Desenhar legenda na parte inferior ──────────────────────

function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  line: SubtitleLine,
  canvasWidth: number,
  canvasHeight: number,
  alpha: number = 1
) {
  if (!line.text || alpha <= 0) return

  ctx.save()
  ctx.globalAlpha = alpha

  const fontSize = Math.floor(canvasWidth * 0.055)
  ctx.font = `bold ${fontSize}px 'Arial', 'Helvetica Neue', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  const maxWidth = canvasWidth * 0.88
  const words = line.text.split(' ')
  const lines: string[] = []
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
  const totalTextHeight = lines.length * lineHeight
  const startY = canvasHeight - 180 - totalTextHeight

  // Fundo da legenda
  const boxPad = 16
  const boxLeft = canvasWidth * 0.04
  const boxRight = canvasWidth * 0.96
  const boxTop = startY - lineHeight / 2 - boxPad
  const boxBottom = startY + totalTextHeight + boxPad

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.beginPath()
  roundRect(ctx, boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop, 12)
  ctx.fill()

  // Cor do texto baseada no estilo
  let textColor = '#FFFFFF'
  if (line.style === 'screaming') textColor = '#FF4444'
  if (line.style === 'whisper') textColor = '#BBBBBB'
  if (line.style === 'narration') textColor = '#FFD700'

  // Desenhar linhas de texto
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight

    // Outline/preto legível
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeText(lines[i], canvasWidth / 2, y)

    // Texto principal
    ctx.fillStyle = textColor
    ctx.fillText(lines[i], canvasWidth / 2, y)
  }

  ctx.restore()
}

// ─── TTS Narration ───────────────────────────────────────────

function speakNarration(text: string, lang: string = 'pt-BR'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve()
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = speechSynthesis.getVoices()
    const ptBrVoice = voices.find(v => v.lang.startsWith('pt') && v.name.includes('Brazil'))
      || voices.find(v => v.lang.startsWith('pt'))
    if (ptBrVoice) utterance.voice = ptBrVoice

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    speechSynthesis.speak(utterance)
  })
}

// ═══════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: renderMangaSlideshowVideo
// ═══════════════════════════════════════════════════════════════

export async function renderMangaSlideshowVideo(
  config: MangaVideoConfig,
  onProgress?: ProgressCallback
): Promise<{ videoBlob: Blob; videoUrl: string; duration: number }> {
  const {
    images,
    outputWidth = DEFAULT_WIDTH,
    outputHeight = DEFAULT_HEIGHT,
    transitionDuration = DEFAULT_TRANSITION_DURATION,
    imageHoldDuration = DEFAULT_IMAGE_HOLD,
    backgroundColor = '#000000',
    narrationText,
    subtitleLines = [],
  } = config

  if (images.length === 0) {
    throw new Error('Nenhuma imagem fornecida para renderizar')
  }

  // ─── ETAPA 1: Carregar todas as imagens ────────────────
  onProgress?.({ stage: 'loading', percent: 5, message: 'Carregando imagens do mangá...', totalImages: images.length })

  const loadedImages: HTMLImageElement[] = []
  for (let i = 0; i < images.length; i++) {
    onProgress?.({
      stage: 'loading',
      percent: 5 + (i / images.length) * 15,
      message: `Carregando imagem ${i + 1}/${images.length}...`,
      currentImage: i + 1,
      totalImages: images.length,
    })

    try {
      const img = await loadImage(images[i].url)
      loadedImages.push(img)
    } catch (err) {
      console.warn(`Falha ao carregar imagem ${i + 1}:`, err)
      // Criar placeholder caso a imagem não carregue
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight
      const pCtx = canvas.getContext('2d')
      if (pCtx) {
        pCtx.fillStyle = '#333333'
        pCtx.fillRect(0, 0, outputWidth, outputHeight)
        pCtx.fillStyle = '#FFFFFF'
        pCtx.font = 'bold 48px Arial'
        pCtx.textAlign = 'center'
        pCtx.fillText(`Página ${i + 1}`, outputWidth / 2, outputHeight / 2)
      }
      const placeholder = new Image()
      placeholder.src = canvas.toDataURL()
      await new Promise<void>(r => { placeholder.onload = () => r() })
      loadedImages.push(placeholder)
    }
  }

  // ─── ETAPA 2: Criar canvas e MediaRecorder ─────────────
  onProgress?.({ stage: 'setup', percent: 20, message: 'Configurando renderização...' })

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível')

  const stream = canvas.captureStream(FPS)

  let mimeType = 'video/webm;codecs=vp9'
  if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
    mimeType = 'video/webm;codecs=h264'
  }

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5000000,
  })

  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  // ─── ETAPA 3: Calcular timing ─────────────────────────
  // Para cada imagem: hold (exibição) + transition (para a próxima)
  const imageDurations = images.map(img => img.duration || imageHoldDuration)

  const segmentTimings: Array<{
    type: 'hold' | 'transition'
    durationFrames: number
    imageIndex: number
  }> = []

  for (let i = 0; i < loadedImages.length; i++) {
    const holdFrames = Math.ceil(imageDurations[i] * FPS)
    segmentTimings.push({ type: 'hold', durationFrames: holdFrames, imageIndex: i })

    if (i < loadedImages.length - 1) {
      const transitionFrames = Math.ceil(transitionDuration * FPS)
      segmentTimings.push({
        type: 'transition',
        durationFrames: transitionFrames,
        imageIndex: i,
      })
    }
  }

  const totalFrames = segmentTimings.reduce((acc, s) => acc + s.durationFrames, 0)
  const totalDuration = totalFrames / FPS

  // ─── ETAPA 4: Narrar TTS (se fornecido) ───────────────
  if (narrationText) {
    onProgress?.({ stage: 'tts', percent: 22, message: 'Iniciando narração TTS...' })
    // TTS roda em background paralelo à renderização
    speakNarration(narrationText).catch(() => {})
  }

  // ─── ETAPA 5: Renderizar frame a frame ────────────────
  onProgress?.({ stage: 'rendering', percent: 25, message: 'Renderizando slideshow...' })

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: mimeType })
      const videoUrl = URL.createObjectURL(videoBlob)
      resolve({ videoBlob, videoUrl, duration: totalDuration })
    }

    mediaRecorder.onerror = (e) => reject(e)

    mediaRecorder.start(100)

    let currentSegmentIndex = 0
    let frameInSegment = 0
    let globalFrame = 0

    const renderNextFrame = () => {
      if (currentSegmentIndex >= segmentTimings.length) {
        // Fim da renderização
        onProgress?.({ stage: 'done', percent: 100, message: 'Slideshow renderizado!' })
        speechSynthesis.cancel()
        mediaRecorder.stop()
        return
      }

      const segment = segmentTimings[currentSegmentIndex]
      const progressInSegment = frameInSegment / segment.durationFrames
      const globalProgress = globalFrame / totalFrames

      // Atualizar progresso
      onProgress?.({
        stage: 'rendering',
        percent: 25 + globalProgress * 70,
        message: segment.type === 'hold'
          ? `Exibindo página ${segment.imageIndex + 1}/${loadedImages.length}...`
          : `Transição página ${segment.imageIndex + 1} → ${segment.imageIndex + 2}...`,
        currentImage: segment.imageIndex + 1,
        totalImages: loadedImages.length,
      })

      // Limpar canvas
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, outputWidth, outputHeight)

      if (segment.type === 'hold') {
        // Mostrar imagem atual com blur background
        drawImageWithBlurBackground(ctx, loadedImages[segment.imageIndex], outputWidth, outputHeight)

      } else if (segment.type === 'transition') {
        // Transição slideleft entre imagem atual e próxima
        drawSlideLeftTransition(
          ctx,
          loadedImages[segment.imageIndex],
          loadedImages[segment.imageIndex + 1],
          progressInSegment,
          outputWidth,
          outputHeight
        )
      }

      // Desenhar legendas sincronizadas
      const currentTimeSeconds = globalFrame / FPS
      for (const sub of subtitleLines) {
        if (currentTimeSeconds >= sub.startSeconds && currentTimeSeconds <= sub.endSeconds) {
          // Fade in/out suave
          const fadeIn = Math.min((currentTimeSeconds - sub.startSeconds) / 0.3, 1)
          const fadeOut = Math.min((sub.endSeconds - currentTimeSeconds) / 0.3, 1)
          const alpha = Math.min(fadeIn, fadeOut)
          drawSubtitle(ctx, sub, outputWidth, outputHeight, alpha)
        }
      }

      // Avançar frame
      frameInSegment++
      globalFrame++

      if (frameInSegment >= segment.durationFrames) {
        currentSegmentIndex++
        frameInSegment = 0
      }

      requestAnimationFrame(renderNextFrame)
    }

    // Iniciar renderização
    renderNextFrame()
  })
}

// ═══════════════════════════════════════════════════════════════
// HELPERS PÚBLICOS
// ═══════════════════════════════════════════════════════════════

/**
 * Gerar legendas sincronizadas a partir do roteiro Gemini
 */
export function generateSubtitlesFromScenes(
  scenes: Array<{ narration: string; durationSeconds: number; textOnScreen?: string }>,
  offsetSeconds: number = 0
): SubtitleLine[] {
  const subtitles: SubtitleLine[] = []
  let currentTime = offsetSeconds

  for (const scene of scenes) {
    const text = scene.textOnScreen || scene.narration
    if (text) {
      subtitles.push({
        text,
        startSeconds: currentTime,
        endSeconds: currentTime + scene.durationSeconds,
        style: 'narration',
      })
    }
    currentTime += scene.durationSeconds
  }

  return subtitles
}

/**
 * Calcular duração total do slideshow
 */
export function calculateMangaDuration(
  imageCount: number,
  holdDuration: number = DEFAULT_IMAGE_HOLD,
  transitionDuration: number = DEFAULT_TRANSITION_DURATION
): number {
  const totalHold = imageCount * holdDuration
  const totalTransitions = (imageCount - 1) * transitionDuration
  return totalHold + totalTransitions
}

/**
 * Salvar vídeo localmente
 */
export function saveMangaVideoLocally(videoBlob: Blob, filename: string): void {
  const url = URL.createObjectURL(videoBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Converter imagens de URL para data URL (para preview offline)
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  const img = await loadImage(url)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return url
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}
