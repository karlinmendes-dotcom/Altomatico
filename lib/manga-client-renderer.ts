// ═══════════════════════════════════════════════════════════════
// Manga Client-Side Renderer — Gera vídeo .mp4 no navegador
// Usa Canvas API + MediaRecorder para criar slideshow "revistinha"
// Sem necessidade de FFmpeg no servidor (funciona no Vercel)
// ═══════════════════════════════════════════════════════════════

export interface MangaPage {
  imageUrl: string
  dialogue?: string // Texto traduzido para sobrepor na página
  sceneDescription?: string
}

export interface RenderConfig {
  pages: MangaPage[]
  durationPerPage: number // segundos por página
  transitionDuration: number // duração da transição em segundos
  canvasWidth: number // largura do canvas (padrão 1080)
  canvasHeight: number // altura do canvas (padrão 1920)
  bgMusicUrl?: string // URL da música de fundo
  bgMusicVolume: number // 0-1
  narrationText?: string // Texto da narração (para legendas)
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

/**
 * Carrega uma imagem de URL para um elemento HTMLImageElement
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
 * Desenha uma página de mangá no canvas com fundo desfocado + imagem centralizada
 */
function drawMangaPage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  progress: number // 0-1 para efeito de slide
) {
  // 1. Fundo: imagem desfocada (blur background)
  ctx.save()
  ctx.filter = 'blur(20px) brightness(0.3)'
  const bgScale = Math.max(width / img.width, height / img.height) * 1.2
  const bgW = img.width * bgScale
  const bgH = img.height * bgScale
  ctx.drawImage(img, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH)
  ctx.restore()

  // 2. Imagem principal: centralizada, sem distorcer
  ctx.save()
  const scale = Math.min(width / img.width, height / img.height) * 0.9
  const drawW = img.width * scale
  const drawH = img.height * scale
  const drawX = (width - drawW) / 2
  const drawY = (height - drawH) / 2

  // Sombra sutil
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 5

  // Bordas arredondadas (simulando página de revista)
  const radius = 12
  ctx.beginPath()
  ctx.roundRect(drawX, drawY, drawW, drawH, radius)
  ctx.clip()
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()

  // 3. Efeito de borda branca (estilo revistinha)
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
 * Desenha balão de diálogo sobre a página
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

  // Medir texto
  const lines: string[] = []
  const words = text.split(' ')
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
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

  // Posição: parte inferior da página
  const bubbleX = (width - bubbleW) / 2
  const bubbleY = pageBounds.drawY + pageBounds.drawH - bubbleH - 20

  // Balão com sombra
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 3

  // Fundo do balão
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.beginPath()
  ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 16)
  ctx.fill()

  // Borda do balão
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Texto
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
  total: number
) {
  const barHeight = 6
  const barY = height - 30
  const progress = current / total

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(40, barY, width - 80, barHeight)

  ctx.fillStyle = '#a855f7'
  ctx.beginPath()
  ctx.roundRect(40, barY, (width - 80) * progress, barHeight, 3)
  ctx.fill()

  // Número da página
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `${Math.floor(width * 0.025)}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText(`${current} / ${total}`, width - 40, barY - 8)

  ctx.restore()
}

/**
 * Função principal: renderiza slideshow de mangá como vídeo no navegador
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
    bgMusicUrl,
    bgMusicVolume = 0.15,
  } = config

  if (pages.length === 0) {
    throw new Error('Nenhuma página para renderizar')
  }

  // Fase 1: Carregar todas as imagens
  onProgress({
    phase: 'loading',
    currentPage: 0,
    totalPages: pages.length,
    percent: 0,
    message: 'Carregando imagens do capítulo...',
  })

  const images: HTMLImageElement[] = []
  for (let i = 0; i < pages.length; i++) {
    try {
      const img = await loadImage(pages[i].imageUrl)
      images.push(img)
      onProgress({
        phase: 'loading',
        currentPage: i + 1,
        totalPages: pages.length,
        percent: ((i + 1) / pages.length) * 30,
        message: `Carregando página ${i + 1}/${pages.length}...`,
      })
    } catch (err) {
      console.warn(`[manga-renderer] Falha ao carregar página ${i + 1}:`, err)
    }
  }

  if (images.length === 0) {
    throw new Error('Nenhuma imagem pôde ser carregada')
  }

  // Fase 2: Configurar Canvas + MediaRecorder
  onProgress({
    phase: 'rendering',
    currentPage: 0,
    totalPages: images.length,
    percent: 30,
    message: 'Preparando renderer...',
  })

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')!

  // Configurar MediaRecorder
  const fps = 30
  const stream = canvas.captureStream(fps)

  // Adicionar áudio de fundo se fornecido
  let audioContext: AudioContext | null = null
  let bgMusicSource: MediaElementAudioSourceNode | null = null
  let bgMusicElement: HTMLAudioElement | null = null

  if (bgMusicUrl) {
    try {
      audioContext = new AudioContext()
      bgMusicElement = new Audio(bgMusicUrl)
      bgMusicElement.crossOrigin = 'anonymous'
      bgMusicElement.loop = true
      bgMusicElement.volume = bgMusicVolume

      bgMusicSource = audioContext.createMediaElementSource(bgMusicElement)
      bgMusicSource.connect(audioContext.destination)

      // Conectar áudio ao stream do MediaRecorder
      const audioDest = audioContext.createMediaStreamDestination()
      bgMusicSource.connect(audioDest)
      stream.addTrack(audioDest.stream.getAudioTracks()[0])

      bgMusicElement.play()
    } catch (err) {
      console.warn('[manga-renderer] Falha ao configurar áudio:', err)
    }
  }

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5_000_000,
  })

  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  return new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      bgMusicElement?.pause()
      audioContext?.close()
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    mediaRecorder.onerror = (e) => {
      bgMusicElement?.pause()
      audioContext?.close()
      reject(new Error('Erro no MediaRecorder'))
    }

    mediaRecorder.start()

    // Fase 3: Renderizar frame a frame
    let currentPageIdx = 0
    let frameCount = 0
    const framesPerPage = durationPerPage * fps
    const framesTransition = transitionDuration * fps
    const totalFrames = images.length * framesPerPage

    function renderFrame() {
      if (currentPageIdx >= images.length) {
        // Fase 4: Encoding completo
        onProgress({
          phase: 'encoding',
          currentPage: images.length,
          totalPages: images.length,
          percent: 95,
          message: 'Finalizando vídeo...',
        })
        mediaRecorder.stop()
        return
      }

      const localFrame = frameCount % framesPerPage
      const img = images[currentPageIdx]
      const dialogue = pages[currentPageIdx]?.dialogue || ''

      // Limpar canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // Efeito de slide (transição entre páginas)
      let slideOffset = 0
      if (localFrame < framesTransition && currentPageIdx > 0) {
        // Slide left: página anterior saindo pela esquerda
        const t = localFrame / framesTransition
        slideOffset = -canvasWidth * easeInOutCubic(t)
      }

      ctx.save()
      if (slideOffset !== 0) {
        ctx.translate(slideOffset, 0)
      }

      // Desenhar página
      const bounds = drawMangaPage(ctx, img, canvasWidth, canvasHeight, 1)

      // Desenhar diálogo
      if (dialogue) {
        drawDialogueBubble(ctx, dialogue, canvasWidth, canvasHeight, bounds)
      }

      ctx.restore()

      // Barra de progresso
      drawProgressBar(ctx, canvasWidth, canvasHeight, currentPageIdx + 1, images.length)

      // Controle de progresso
      frameCount++
      if (localFrame === framesPerPage - 1) {
        currentPageIdx++
      }

      const percent = 30 + (frameCount / totalFrames) * 65
      onProgress({
        phase: 'rendering',
        currentPage: currentPageIdx + 1,
        totalPages: images.length,
        percent: Math.min(percent, 95),
        message: `Renderizando página ${currentPageIdx + 1}/${images.length}...`,
      })

      // Próximo frame (setTimeout para não bloquear a UI)
      setTimeout(renderFrame, 1000 / fps / 2) // renderizar mais rápido que o FPS real
    }

    renderFrame()
  })
}

/**
 * Função utilitária: easeInOutCubic para transições suaves
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Função utilitária: converte Blob WebM para download
 */
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
