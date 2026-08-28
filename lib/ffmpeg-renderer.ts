// ═══════════════════════════════════════════════════════════════
// Video Renderer — Renderiza vídeo no browser
// Para animation_2d: usa Stick Figure Renderer
// Para stock_video: usa footage de fundo + legendas
// ═══════════════════════════════════════════════════════════════

import {
  StickScene,
  StickCharacter,
  StickVideoProject,
  renderSceneToCanvas,
  CHARACTER_TEMPLATES,
  SCENE_TEMPLATES,
} from './stickFigureRenderer'

interface VideoScene {
  narration: string
  visualDescription: string
  duration: number
  musicMood: string
  facialExpression?: string
  subtitleText?: string
}

interface VideoScript {
  title: string
  hook: string
  scenes: VideoScene[]
  caption: string
  hashtags: string[]
  totalDuration: number
}

interface RenderConfig {
  script: VideoScript
  footageUrls: string[]
  musicUrl: string
  narrationText: string
  motorType?: 'animation_2d' | 'url_clips' | 'stock_video' | 'static_post'
  stickScenes?: StickScene[]  // For animation_2d mode
  outputWidth?: number
  outputHeight?: number
}

interface RenderProgress {
  stage: string
  percent: number
  message: string
}

type ProgressCallback = (progress: RenderProgress) => void

// ─── Generate TTS Audio using Web Speech API ─────────────────

async function speakText(text: string, lang: string = 'pt-BR'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve()
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to find a good PT-BR voice
    const voices = speechSynthesis.getVoices()
    const ptBrVoice = voices.find(v => v.lang.startsWith('pt') && v.name.includes('Brazil'))
      || voices.find(v => v.lang.startsWith('pt'))
    if (ptBrVoice) utterance.voice = ptBrVoice

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    speechSynthesis.speak(utterance)
  })
}

// ─── Generate stick figure scenes from script ────────────────

function generateStickScenes(script: VideoScript): StickScene[] {
  const scenes: StickScene[] = []

  for (let i = 0; i < script.scenes.length; i++) {
    const sceneData = script.scenes[i]
    const desc = sceneData.visualDescription.toLowerCase()

    // Parse the visual description to determine characters and background
    let characters: StickCharacter[] = []
    let background: StickScene['background'] = 'white'
    let backgroundProps: string[] = []

    // Detect background from description
    if (desc.includes('campo') || desc.includes('fazenda') || desc.includes('natureza') || desc.includes('árvore') || desc.includes('floresta')) {
      background = 'outdoor'
      backgroundProps = ['tree']
    } else if (desc.includes('casa') || desc.includes('dentro') || desc.includes('quarto') || desc.includes('sala') || desc.includes('cozinha')) {
      background = 'house'
    } else if (desc.includes('noite') || desc.includes('escuro') || desc.includes('estrela') || desc.includes('lua')) {
      background = 'night'
    } else if (desc.includes('cidade') || desc.includes('rua') || desc.includes('prédio')) {
      background = 'city'
    }

    // Detect characters from description
    if (desc.includes('avó') || desc.includes('avoa') || desc.includes('old woman') || desc.includes('idosa') || desc.includes('mulher velha')) {
      characters.push(CHARACTER_TEMPLATES.oldWomanWithBag(0.35, 0.6))
    }
    if (desc.includes('cachorro') || desc.includes('dog') || desc.includes('animal') || desc.includes('rex')) {
      characters.push(CHARACTER_TEMPLATES.dog(0.7, 0.72))
    }
    if (desc.includes('lobo') || desc.includes('wolf')) {
      characters.push(CHARACTER_TEMPLATES.wolf(0.65, 0.65))
    }
    if (desc.includes('homem') || desc.includes('man') || desc.includes('personagem') || desc.includes('boneco')) {
      const name = desc.match(/["']([^"']+)["']/)?.[1]
      characters.push(CHARACTER_TEMPLATES.man(0.4, 0.6, name))
    }
    if (desc.includes('criança') || desc.includes('menino') || desc.includes('menina') || desc.includes('child') || desc.includes('kid')) {
      characters.push(CHARACTER_TEMPLATES.child(0.6, 0.68))
    }
    if (desc.includes('vovô') || desc.includes('velho') || desc.includes('elder') || desc.includes('idoso')) {
      characters.push(CHARACTER_TEMPLATES.elder(0.4, 0.6))
    }
    if (desc.includes('mulher') || desc.includes('woman') || desc.includes('girl')) {
      characters.push(CHARACTER_TEMPLATES.man(0.55, 0.6))
    }

    // Default: at least one character
    if (characters.length === 0) {
      characters = [CHARACTER_TEMPLATES.man(0.45, 0.6)]
    }

    // Detect expression from description
    const expressionMatch = sceneData.facialExpression || 'neutral'
    characters.forEach(c => {
      if (desc.includes('surpres') || desc.includes('chocad') || desc.includes('shock')) c.expression = 'surprised'
      else if (desc.includes('triste') || desc.includes('chor') || desc.includes('sad')) c.expression = 'sad'
      else if (desc.includes('raiva') || desc.includes('bravo') || desc.includes('angry')) c.expression = 'angry'
      else if (desc.includes('rindo') || desc.includes('engraçad') || desc.includes('funny') || desc.includes('laugh')) c.expression = 'laughing'
      else if (desc.includes('feliz') || desc.includes('happy') || desc.includes('alegre')) c.expression = 'happy'
      else if (desc.includes('medo') || desc.includes('assustad') || desc.includes('scared')) c.expression = 'scared'
      else if (desc.includes('pensando') || desc.includes('thinking') || desc.includes('confus')) c.expression = 'thinking'
      else c.expression = expressionMatch as StickCharacter['expression']
    })

    // Detect gesture
    if (desc.includes('apontando') || desc.includes('pointing')) {
      characters[0].armGesture = 'point'
    } else if (desc.includes('correndo') || desc.includes('running')) {
      characters[0].armGesture = 'down'
      characters[0].walkFrame = 0.5
    } else if (desc.includes('braços') || desc.includes('celebr')) {
      characters[0].armGesture = 'hands_up'
    }

    scenes.push({
      id: `scene_${i}`,
      characters,
      background,
      backgroundProps,
      text: ('textOnScreen' in sceneData ? (sceneData as { textOnScreen?: string }).textOnScreen : undefined) || sceneData.subtitleText || sceneData.narration.slice(0, 80),
      textPosition: 'top',
      textStyle: desc.includes('grit') || desc.includes('scream') || desc.includes('exclama') ? 'screaming' : 'normal',
      duration: sceneData.duration || 5,
      transition: 'cut',
    })
  }

  return scenes
}

// ─── Main Render Function ────────────────────────────────────

export async function renderVideo(
  config: RenderConfig,
  onProgress?: ProgressCallback
): Promise<{ videoBlob: Blob; videoUrl: string; duration: number }> {
  const { script, motorType } = config
  const width = config.outputWidth || 1080
  const height = config.outputHeight || 1920

  // Determine if this is stick figure mode
  const isStickFigure = motorType === 'animation_2d'

  // Generate stick scenes if not provided
  let stickScenes = config.stickScenes
  if (isStickFigure && (!stickScenes || stickScenes.length === 0)) {
    stickScenes = generateStickScenes(script)
  }

  // ─── ETAPA 1: Criar canvas de renderização ──────────────
  onProgress?.({ stage: 'preparing', percent: 5, message: 'Preparando canvas...' })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível')

  // ─── ETAPA 2: Configurar MediaRecorder ──────────────────
  onProgress?.({ stage: 'setup', percent: 10, message: 'Configurando gravação...' })

  const fps = 30
  const stream = canvas.captureStream(fps)

  // Try to record as MP4, fall back to WebM
  let mimeType = 'video/webm;codecs=vp9'
  if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
    mimeType = 'video/webm;codecs=h264'
  }

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4000000,
  })

  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  // ─── ETAPA 3: Gerar narração TTS ────────────────────────
  onProgress?.({ stage: 'tts', percent: 15, message: 'Gerando narração com voz...' })

  // Start TTS in background while we set up rendering
  const narrationPromise = (async () => {
    try {
      // Split narration into scene chunks for synced audio
      const sceneNarrations = script.scenes.map(s => s.narration)
      for (const narration of sceneNarrations) {
        await speakText(narration)
      }
    } catch (err) {
      console.warn('TTS error (non-fatal):', err)
    }
  })()

  // ─── ETAPA 4: Gravar vídeo cena por cena ────────────────
  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const totalDuration = script.scenes.reduce((acc, s) => acc + (s.duration || 5), 0)
      const videoBlob = new Blob(chunks, { type: mimeType })
      const videoUrl = URL.createObjectURL(videoBlob)
      resolve({ videoBlob, videoUrl, duration: totalDuration })
    }

    mediaRecorder.onerror = (e) => reject(e)

    mediaRecorder.start(100) // Collect data every 100ms

    let currentSceneIndex = 0
    let sceneStartTime = performance.now()
    let animationFrame = 0
    const totalScenes = script.scenes.length

    const renderNextFrame = () => {
      if (currentSceneIndex >= totalScenes) {
        // All scenes done
        onProgress?.({ stage: 'done', percent: 100, message: 'Vídeo renderizado!' })
        speechSynthesis.cancel()  // Stop any ongoing TTS
        mediaRecorder.stop()
        return
      }

      const scene = script.scenes[currentSceneIndex]
      const sceneDuration = (scene.duration || 5) * 1000
      const elapsed = performance.now() - sceneStartTime
      const frameProgress = Math.min(elapsed / sceneDuration, 1)

      // Calculate total progress
      const scenesDone = currentSceneIndex
      const currentProgress = frameProgress / totalScenes
      const totalPercent = 20 + (scenesDone + currentProgress) * 75

      onProgress?.({
        stage: 'rendering',
        percent: Math.min(totalPercent, 95),
        message: `Renderizando cena ${currentSceneIndex + 1}/${totalScenes}...`,
      })

      if (isStickFigure && stickScenes) {
        // ─── STICK FIGURE MODE ─────────────────────────
        renderSceneToCanvas(canvas, stickScenes[currentSceneIndex], frameProgress)
      } else {
        // ─── STOCK VIDEO MODE ──────────────────────────
        renderStockScene(ctx, scene, width, height, frameProgress, currentSceneIndex)
      }

      // Advance to next scene if duration exceeded
      if (elapsed >= sceneDuration) {
        currentSceneIndex++
        sceneStartTime = performance.now()
        animationFrame = 0
      } else {
        animationFrame++
      }

      requestAnimationFrame(renderNextFrame)
    }

    // Start rendering
    renderNextFrame()
  })
}

// ─── Render stock video scene (background + subtitle) ────────

function renderStockScene(
  ctx: CanvasRenderingContext2D,
  scene: VideoScene,
  width: number,
  height: number,
  frameProgress: number,
  sceneIndex: number
) {
  // Animated gradient background per scene
  const hue = (sceneIndex * 47) % 360
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, `hsl(${hue}, 60%, 25%)`)
  grad.addColorStop(0.5, `hsl(${(hue + 30) % 360}, 50%, 35%)`)
  grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 20%)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // Animated pattern
  const patternOffset = frameProgress * 50
  ctx.strokeStyle = `hsla(${hue}, 40%, 60%, 0.1)`
  ctx.lineWidth = 2
  for (let i = -5; i < 25; i++) {
    const x = i * 80 + patternOffset
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x - height * 0.3, height)
    ctx.stroke()
  }

  // Draw subtitle text
  const narration = scene.narration || ''
  const fontSize = Math.floor(width * 0.06)
  ctx.font = `bold ${fontSize}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Word wrap
  const words = narration.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > width * 0.85) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fontSize * 1.4
  const totalH = lines.length * lineHeight
  const startY = height - 350 - totalH / 2

  // Background box for text
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  const boxPad = 24
  const boxLeft = width * 0.05
  const boxRight = width * 0.95
  const boxTop = startY - lineHeight / 2 - boxPad
  const boxBottom = startY + totalH + boxPad

  ctx.beginPath()
  ctx.roundRect(boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop, 16)
  ctx.fill()

  // Text lines
  for (let i = 0; i < lines.length && i < 4; i++) {
    const y = startY + i * lineHeight

    // Text outline
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeText(lines[i], width / 2, y)

    // White text
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(lines[i], width / 2, y)
  }
}

// ─── Save video locally ──────────────────────────────────────

export function saveVideoLocally(videoBlob: Blob, filename: string): void {
  const url = URL.createObjectURL(videoBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
