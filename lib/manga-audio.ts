// ═══════════════════════════════════════════════════════════════
// Manga Audio Module — Gerenciamento de áudio para slideshow
// Reutiliza Pixabay (música) + Edge TTS (narração) + FFmpeg
// ═══════════════════════════════════════════════════════════════

export interface MangaAudioConfig {
  /** Se true, mistura música de fundo no slideshow */
  enableBackgroundMusic: boolean
  /** Se true, inclui narração TTS */
  enableNarration: boolean
  /** Volume da música de fundo (0.0 a 1.0). Padrão: 0.15 */
  bgMusicVolume: number
  /** Volume da narração (0.0 a 1.0). Padrão: 1.0 */
  narrationVolume: number
  /** Duração do fade-out em segundos no final do vídeo */
  fadeOutDuration: number
  /** Query para buscar música de fundo no Pixabay */
  musicQuery?: string
  /** Voz TTS para narração */
  ttsVoice?: string
  /** Idioma da narração */
  ttsLanguage?: string
}

export interface MangaAudioResult {
  /** URL da música de fundo baixada do Pixabay */
  bgMusicUrl: string
  /** Texto da narração gerado pela IA */
  narrationText: string
  /** Voz TTS selecionada */
  ttsVoice: string
  /** Duração total estimada do áudio em segundos */
  totalDuration: number
  /** Se true, usa fallback silencioso (sem áudio) */
  useSilentFallback: boolean
  /** Filtros FFmpeg para mixagem de áudio */
  ffmpegAudioFilter: string
  /** Parâmetros extras para o comando FFmpeg */
  ffmpegAudioParams: string[]
}

export interface MangaScene {
  narration: string
  visualDescription: string
  duration: number
  musicMood?: string
  textOnScreen?: string
  sceneNumber?: number
  imageQuery?: string
}

export const DEFAULT_MANGA_AUDIO_CONFIG: MangaAudioConfig = {
  enableBackgroundMusic: true,
  enableNarration: false, // Narração é opcional — muitos slideshows de mangá são apenas com música
  bgMusicVolume: 0.15,
  narrationVolume: 1.0,
  fadeOutDuration: 1.5,
  musicQuery: 'epic lofi ambient',
  ttsVoice: 'pt-BR-AntonioNeural',
  ttsLanguage: 'pt-BR',
}

// ─── Buscar música de fundo no Pixabay ───────────────────────
// Reutiliza a mesma lógica do convex/mediaEngine.ts e mediaRouter.ts

export async function fetchMangaBackgroundMusic(
  pixabayKey: string,
  mood: string,
  query?: string
): Promise<string> {
  const searchQuery = query || `${mood} lofi background music ambient`
  try {
    const res = await fetch(
      `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(searchQuery)}&per_page=3`
    )
    const data = await res.json()

    if (data.hits && data.hits.length > 0) {
      // Priorizar vídeos curtos que servem como faixas de áudio
      for (const hit of data.hits) {
        const audioUrl = hit.videos?.tiny?.url || hit.videos?.small?.url || hit.videos?.medium?.url || ''
        if (audioUrl) return audioUrl
      }
    }
  } catch (err) {
    console.error('[manga-audio] Pixabay music search error:', err)
  }
  return ''
}

// ─── Gerar texto de narração a partir das cenas ──────────────

export function buildNarrationText(scenes: MangaScene[]): string {
  return scenes
    .filter(s => s.narration && s.narration.trim())
    .map(s => s.narration.trim())
    .join('\n\n')
}

// ─── Calcular duração total do slideshow ──────────────────────

export function calculateTotalDuration(scenes: MangaScene[]): number {
  return scenes.reduce((total, scene) => total + (scene.duration || 4), 0)
}

// ─── Construir filtros FFmpeg para áudio ─────────────────────
// Monta o filter_complex para mixar música de fundo com volume,
// loop se necessário, e fade-out no final

export function buildMangaAudioFilter(
  config: MangaAudioConfig,
  totalDuration: number,
  hasBgMusic: boolean,
  hasNarration: boolean
): { audioFilter: string; audioParams: string[] } {
  const params: string[] = []
  const filters: string[] = []

  if (!hasBgMusic && !hasNarration) {
    // Fallback silencioso — gera pista de áudio muda
    return {
      audioFilter: '',
      audioParams: [
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-t', String(totalDuration),
      ],
    }
  }

  if (hasBgMusic && hasNarration) {
    // Mixagem: música de fundo (com loop + volume baixo) + narração
    // Input 0 = música, Input 1 = narração
    filters.push(
      // Loop da música se for mais curta que o vídeo
      `[0:a]stream_loop=-1,volume=${config.bgMusicVolume},afade=t=out:st=${Math.max(0, totalDuration - config.fadeOutDuration)}:d=${config.fadeOutDuration}[bgm]`,
      // Narração com volume ajustado
      `[1:a]volume=${config.narrationVolume}[voice]`,
      // Misturar ambas as faixas
      `[bgm][voice]amix=inputs=2:duration=first:dropout_transition=2[out]`
    )
    params.push(
      '-filter_complex', filters.join(';'),
      '-map', '[out]',
      '-t', String(totalDuration),
    )
  } else if (hasBgMusic) {
    // Apenas música de fundo com loop + volume + fade
    filters.push(
      `[0:a]stream_loop=-1,volume=${config.bgMusicVolume},afade=t=out:st=${Math.max(0, totalDuration - config.fadeOutDuration)}:d=${config.fadeOutDuration}[out]`
    )
    params.push(
      '-filter_complex', filters.join(';'),
      '-map', '[out]',
      '-t', String(totalDuration),
    )
  } else {
    // Apenas narração (sem música)
    params.push(
      '-filter_complex', `[0:a]volume=${config.narrationVolume},afade=t=out:st=${Math.max(0, totalDuration - config.fadeOutDuration)}:d=${config.fadeOutDuration}[out]`,
      '-map', '[out]',
      '-t', String(totalDuration),
    )
  }

  return { audioFilter: filters.join(';'), audioParams: params }
}

// ─── Construir parâmetros FFmpeg completos para áudio ────────
// Retorna os argumentos FFmpeg para incluir no comando de renderização

export function buildMangaFFmpegAudioArgs(
  config: MangaAudioConfig,
  bgMusicUrl: string,
  narrationText: string,
  totalDuration: number
): {
  inputArgs: string[]
  filterArgs: string[]
  outputArgs: string[]
  description: string
} {
  const hasBgMusic = config.enableBackgroundMusic && !!bgMusicUrl
  const hasNarration = config.enableNarration && !!narrationText.trim()

  const inputArgs: string[] = []
  const outputArgs: string[] = []

  // Adicionar inputs de áudio
  if (hasBgMusic) {
    inputArgs.push('-i', bgMusicUrl)
  }
  if (hasNarration) {
    // Em produção, aqui seria o path do arquivo TTS gerado
    // Por agora, usamos a URL do Edge TTS ou um placeholder
    inputArgs.push('-i', narrationText) // Será substituído pelo path do arquivo TTS
  }

  const { audioParams } = buildMangaAudioFilter(config, totalDuration, hasBgMusic, hasNarration)
  outputArgs.push(...audioParams)

  // Se não há áudio, gerar silêncio
  if (!hasBgMusic && !hasNarration) {
    return {
      inputArgs: [],
      filterArgs: [],
      outputArgs: [
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-t', String(totalDuration),
        '-c:a', 'aac', '-b:a', '128k',
      ],
      description: 'Fallback silencioso — vídeo sem áudio (requisito YouTube)',
    }
  }

  let description = 'Áudio: '
  if (hasBgMusic) description += `música de fundo (vol: ${config.bgMusicVolume})`
  if (hasBgMusic && hasNarration) description += ' + '
  if (hasNarration) description += `narração TTS (vol: ${config.narrationVolume})`
  description += ` | Fade-out: ${config.fadeOutDuration}s`

  return {
    inputArgs,
    filterArgs: audioParams.filter((_, i) => i % 2 === 0 && audioParams[i] === '-filter_complex'),
    outputArgs,
    description,
  }
}

// ─── Gerar URL de narração via Edge TTS (client-side) ────────
// Edge TTS é gratuito e roda no browser via WebSocket

export function getEdgeTTSUrl(text: string, voice: string = 'pt-BR-AntonioNeural'): string {
  // Edge TTS usa WebSocket — a geração real acontece no browser
  // Esta função retorna os parâmetros para o client-side
  const params = new URLSearchParams({
    text,
    voice,
    output: 'audio-24khz-96kbitrate-mono-mp3',
  })
  return `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&${params}`
}

// ─── Montar configuração de áudio completa ────────────────────
// Função principal que orquestra todo o pipeline de áudio

export async function prepareMangaAudio(
  pixabayKey: string | undefined,
  scenes: MangaScene[],
  userConfig?: Partial<MangaAudioConfig>
): Promise<MangaAudioResult> {
  const config = { ...DEFAULT_MANGA_AUDIO_CONFIG, ...userConfig }
  const totalDuration = calculateTotalDuration(scenes)
  const narrationText = buildNarrationText(scenes)

  // 1. Buscar música de fundo
  let bgMusicUrl = ''
  if (config.enableBackgroundMusic && pixabayKey) {
    const mood = scenes[0]?.musicMood || 'epic'
    bgMusicUrl = await fetchMangaBackgroundMusic(
      pixabayKey,
      mood,
      config.musicQuery
    )
  }

  // 2. Determinar se precisa de fallback silencioso
  const hasBgMusic = config.enableBackgroundMusic && !!bgMusicUrl
  const hasNarration = config.enableNarration && !!narrationText.trim()
  const useSilentFallback = !hasBgMusic && !hasNarration

  // 3. Construir filtros FFmpeg
  const { audioFilter, audioParams } = buildMangaAudioFilter(
    config,
    totalDuration,
    hasBgMusic,
    hasNarration
  )

  return {
    bgMusicUrl,
    narrationText,
    ttsVoice: config.ttsVoice || 'pt-BR-AntonioNeural',
    totalDuration,
    useSilentFallback,
    ffmpegAudioFilter: audioFilter,
    ffmpegAudioParams: audioParams,
  }
}

// ─── Gerar argumentos FFmpeg para o comando final ─────────────
// Usado pelo renderer para montar o comando completo

export function buildFinalFFmpegAudioCommand(
  audioResult: MangaAudioResult,
  config: MangaAudioConfig
): string {
  if (audioResult.useSilentFallback) {
    return `-f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t ${audioResult.totalDuration} -c:a aac -b:a 128k`
  }

  const parts: string[] = []

  // Inputs de áudio
  if (config.enableBackgroundMusic && audioResult.bgMusicUrl) {
    parts.push(`-i "${audioResult.bgMusicUrl}"`)
  }
  if (config.enableNarration && audioResult.narrationText.trim()) {
    parts.push('-i narration.mp3') // Placeholder — path do arquivo TTS
  }

  // Filtros
  if (audioResult.ffmpegAudioParams.length > 0) {
    parts.push(...audioResult.ffmpegAudioParams.map(p => String(p)))
  }

  // Codec
  parts.push('-c:a aac -b:a 128k')

  return parts.join(' ')
}
