'use client'
import React, { useState, useEffect, useRef } from 'react'
import {
  BookOpen, Link2, Clock, Youtube, Music, Wand2, Loader2,
  CheckCircle, AlertCircle, Play, Image, Settings, ArrowLeft,
  Volume2, VolumeX, ChevronRight, RefreshCw, Download, Eye,
  Mic, Sparkles, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  renderMangaSlideshow, downloadVideoBlob, splitChapterIntoParts,
  YOUTUBE_SHORTS_MAX_SECONDS,
  type RenderProgress, type MangaPart, type NarratedSegment,
  type RenderConfig
} from '@/lib/manga-client-renderer'

// ═══════════════════════════════════════════════════════════════
// MangaUrlVideo — Página dedicada: Mangá/Manhwa → Vídeo
// Módulo isolado: não altera pipelines existentes
// ═══════════════════════════════════════════════════════════════

interface QueueItem {
  id: string
  title: string
  description: string
  platform: string
  motorType: string
  status: string
  mediaUrl: string
  thumbnailUrl: string
  images?: string[]
  totalPages?: number
  durationPerPage?: number
  createdAt: number
}

interface YouTubeChannel {
  channelId: string
  channelName: string
  thumbnail?: string
}

interface NarrateData {
  title: string
  caption: string
  hashtags: string[]
  fullNarration: string
  segments: NarratedSegment[]
  totalDuration: number
  selectedImageIndices: number[]
}

export default function MangaVideoPage() {
  // ─── Estado do formulário ───────────────────────────────
  const [mangaUrl, setMangaUrl] = useState('')
  const [mangaTitle, setMangaTitle] = useState('')
  const [durationPerPage, setDurationPerPage] = useState(3)
  const [enableAudio, setEnableAudio] = useState(true)
  const [bgMusicVolume, setBgMusicVolume] = useState(15)
  const [narrationMode, setNarrationMode] = useState<'simple' | 'narrated'>('narrated')
  const [enableTTS, setEnableTTS] = useState(true)

  // ─── Estado do YouTube ──────────────────────────────────
  const [ytChannels, setYtChannels] = useState<YouTubeChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState('')

  // ─── Estado do pipeline ─────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'scraping' | 'narrating' | 'rendering' | 'saving' | 'done' | 'error'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<QueueItem | null>(null)
  const [scrapedImages, setScrapedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null)
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [chapterParts, setChapterParts] = useState<MangaPart[]>([])
  const [selectedPart, setSelectedPart] = useState(0)
  const [narrateData, setNarrateData] = useState<NarrateData | null>(null)
  const [narrateLoading, setNarrateLoading] = useState(false)
  const [ttsAudioData, setTtsAudioData] = useState<{ base64: string; duration: number; text: string; index: number }[] | null>(null)
  const [bgMusicUrl, setBgMusicUrl] = useState<string | null>(null)

  // ─── Carregar canais YouTube do localStorage ────────────
  useEffect(() => {
    try {
      const connections = JSON.parse(localStorage.getItem('altomatico_connections') || '{}')
      const channels: YouTubeChannel[] = []
      if (connections.youtube) {
        if (Array.isArray(connections.youtube)) {
          channels.push(...connections.youtube)
        } else {
          channels.push({
            channelId: connections.youtube.channelId || '',
            channelName: connections.youtube.channelName || 'YouTube Canal',
          })
        }
      }
      for (let i = 1; i <= 10; i++) {
        const extra = connections[`youtube_${i}`]
        if (extra) {
          channels.push({
            channelId: extra.channelId || '',
            channelName: extra.channelName || `YouTube Canal ${i + 1}`,
          })
        }
      }
      setYtChannels(channels)
      if (channels.length > 0) setSelectedChannel(channels[0].channelId)
    } catch {}
  }, [])

  // ─── Adicionar log ──────────────────────────────────────
  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // ═══ NARRATED MODE: Chamar /api/manga-narrate ═══════════
  const handleNarrate = async (images: string[], title: string) => {
    setNarrateLoading(true)
    addLog('🤖 Chamando Gemini para gerar roteiro narrado...')

    try {
      const res = await fetch('/api/manga-narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          mangaTitle: title,
          sourceUrl: mangaUrl,
          maxDuration: 55,
          targetSegments: 10,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Falha ao gerar roteiro')
      }

      const narrateResult: NarrateData = {
        title: data.title || title,
        caption: data.caption || '',
        hashtags: data.hashtags || [],
        fullNarration: data.fullNarration || '',
        segments: data.segments || [],
        totalDuration: data.totalDuration || 0,
        selectedImageIndices: data.selectedImageIndices || [],
      }

      setNarrateData(narrateResult)
      addLog(`✅ Roteiro pronto: ${narrateResult.segments.length} segmentos, ~${Math.round(narrateResult.totalDuration)}s`)
      addLog(`📝 Título: ${narrateResult.title}`)

      return narrateResult
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao gerar roteiro'
      addLog(`⚠️ Gemini falhou: ${errMsg} — usando modo simples`)
      return null
    } finally {
      setNarrateLoading(false)
    }
  }

  // ─── Pipeline principal ─────────────────────────────────
  const handleGenerate = async () => {
    if (!mangaUrl.trim()) {
      setError('Cole a URL do capítulo de mangá/manhwa')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setScrapedImages([])
    setLogs([])
    setNarrateData(null)
    setPhase('scraping')
    addLog('📖 Iniciando scraping do capítulo...')

    try {
      // ═══ FASE 1: Scrape ═══
      const scrapeRes = await fetch('/api/manga-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mangaUrl, title: mangaTitle }),
      })

      const scrapeData = await scrapeRes.json()

      if (!scrapeData.success) {
        throw new Error(scrapeData.error || 'Falha no scraping')
      }

      addLog(`✅ ${scrapeData.totalPages} páginas encontradas de ${scrapeData.source}`)
      setScrapedImages(scrapeData.images)

      if (scrapeData.images.length === 0) {
        throw new Error('Nenhuma imagem encontrada no site')
      }

      // ═══ FASE 1.5: Narrated Mode — Gerar roteiro com Gemini ═══
      let segments: NarratedSegment[] | undefined
      let generatedTitle = mangaTitle || scrapeData.title || 'Mangá Video'
      let generatedCaption = ''
      let generatedHashtags: string[] = []

      if (narrationMode === 'narrated') {
        setPhase('narrating')
        const narrateResult = await handleNarrate(scrapeData.images, generatedTitle)

        if (narrateResult && narrateResult.segments.length > 0) {
          segments = narrateResult.segments
          generatedTitle = narrateResult.title
          generatedCaption = narrateResult.caption
          generatedHashtags = narrateResult.hashtags

          // Atualizar páginas com apenas as imagens selecionadas pelo Gemini
          const selectedPages = narrateResult.selectedImageIndices.map((idx: number) => ({
            imageUrl: scrapeData.images[idx] || scrapeData.images[0],
            dialogue: '',
          }))

          addLog(`🎯 Gemini selecionou ${segments.length} imagens-chave de ${scrapeData.totalPages} total`)
          addLog(`⏱️ Duração estimada: ~${Math.round(narrateResult.totalDuration)}s`)

          // Recalcular partes com imagens selecionadas
          const parts = splitChapterIntoParts(selectedPages, durationPerPage)
          setChapterParts(parts)

          // ═══ FASE 2: Gerar áudio (TTS + música) ═══
          let ttsAudio: { base64: string; duration: number; text: string; index: number }[] | undefined
          let musicUrl: string | undefined

          // Gerar TTS server-side
          if (enableTTS) {
            setPhase('narrating')
            addLog('🗣️ Gerando áudio de narração (TTS server-side)...')
            try {
              const ttsRes = await fetch('/api/manga-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: segments.map(s => s.narration).join(' '),
                  lang: 'pt-BR',
                }),
              })
              const ttsData = await ttsRes.json()
              if (ttsData.success && ttsData.segments?.length > 0) {
                ttsAudio = ttsData.segments
                addLog(`✅ TTS pronto: ${ttsData.segments.length} segmentos, ~${ttsData.totalDuration}s`)
              } else {
                addLog('⚠️ TTS falhou — vídeo será sem narração de voz')
              }
            } catch (err) {
              addLog(`⚠️ Erro no TTS: ${err instanceof Error ? err.message : 'desconhecido'}`)
            }
          }

          // Buscar música de fundo
          if (enableAudio) {
            addLog('🎵 Buscando música de fundo no Pixabay...')
            try {
              const musicRes = await fetch('/api/manga-audio?mood=ambient&duration=60')
              const musicData = await musicRes.json()
              if (musicData.success && musicData.bgMusicUrl) {
                musicUrl = musicData.bgMusicUrl
                addLog(`✅ Música encontrada: ${musicData.title || 'lofi ambient'}`)
              } else {
                addLog('⚠️ Música não encontrada — vídeo sem trilha sonora')
              }
            } catch (err) {
              addLog(`⚠️ Erro ao buscar música: ${err instanceof Error ? err.message : 'desconhecido'}`)
            }
          }

          // ═══ FASE 3: Renderizar vídeo ═══
          setPhase('rendering')
          addLog('🎬 Renderizando vídeo narrado...')
          addLog(`📺 Formato: 1080x1920 (vertical/Shorts)`)
          addLog(`🔄 Transições: slideleft entre páginas`)
          addLog(`🗣️ Narração: ${ttsAudio ? 'Ativada (TTS server-side)' : 'Desativada'}`)
          addLog(`🎵 Música: ${musicUrl ? 'Carregada' : 'Sem trilha'}`)
          addLog(`💥 SFX: Ativados (whoosh, boom, reveal)`)

          const blob = await renderMangaSlideshow({
            pages: selectedPages,
            durationPerPage,
            transitionDuration: 0.6,
            canvasWidth: 1080,
            canvasHeight: 1920,
            bgMusicVolume: enableAudio ? bgMusicVolume / 100 : 0,
            segments,
            ttsAudioSegments: ttsAudio,
            bgMusicUrl: musicUrl,
            enableSfx: true,
          } satisfies RenderConfig, (progress: RenderProgress) => {
            setRenderProgress(progress)
            if (progress.phase === 'rendering') {
              addLog(`🖌️ ${progress.message}`)
            }
          })

          setVideoBlob(blob)
          const blobUrl = URL.createObjectURL(blob)
          setVideoBlobUrl(blobUrl)

          addLog(`✅ Vídeo pronto! ${(blob.size / 1024 / 1024).toFixed(1)} MB`)
          addLog(`📐 Resolução: 1080x1920 | FPS: 30`)

          // ═══ FASE 3: Salvar na fila ═══
          setPhase('saving')
          addLog('💾 Salvando na fila de conteúdo...')

          const newItem: QueueItem = {
            id: `manga_${Date.now()}`,
            title: generatedTitle,
            description: generatedCaption || `Vídeo narrado — ${segments.length} imagens-chave`,
            platform: 'youtube',
            motorType: 'manga_video',
            status: 'draft',
            mediaUrl: blobUrl,
            thumbnailUrl: scrapeData.images[segments[0]?.imageIndex || 0] || scrapeData.images[0],
            images: scrapeData.images,
            totalPages: scrapeData.totalPages,
            durationPerPage,
            createdAt: Date.now(),
          }

          // Adicionar hashtags ao item
          const queueItem = { ...newItem, aiHashtags: generatedHashtags } as QueueItem & { aiHashtags?: string[] }
          const queue = JSON.parse(localStorage.getItem('altomatico_queue') || '[]')
          queue.unshift(queueItem)
          localStorage.setItem('altomatico_queue', JSON.stringify(queue))

          addLog(`✅ Salvo! ID: ${newItem.id}`)
          setResult(queueItem)
          setPhase('done')
          addLog('🎉 Pipeline completa! Vídeo narrado pronto para revisão.')

        } else {
          // Fallback: Gemini falhou, usar modo simples
          addLog('⚠️ Fallback para modo simples (sem narração)')
          await renderSimpleMode(scrapeData, generatedTitle)
        }

      } else {
        // ═══ Modo simples (sem narração) ═══
        await renderSimpleMode(scrapeData, generatedTitle)
      }

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errMsg)
      addLog(`❌ Erro: ${errMsg}`)
      setPhase('error')
    } finally {
      setLoading(false)
    }
  }

  // ─── Renderizar no modo simples (sem narração) ──────────
  const renderSimpleMode = async (scrapeData: { images: string[]; title: string; source: string; totalPages: number }, title: string) => {
    const allPages = scrapeData.images.map((img: string, i: number) => ({
      imageUrl: img,
      dialogue: '',
    }))

    const parts = splitChapterIntoParts(allPages, durationPerPage)
    setChapterParts(parts)

    if (parts.length > 1) {
      addLog(`📐 Capítulo dividido em ${parts.length} vídeos (máx ${YOUTUBE_SHORTS_MAX_SECONDS}s cada)`)
      parts.forEach((p) => {
        addLog(`  → Parte ${p.partNumber}/${p.totalParts}: páginas ${p.startPage}-${p.endPage} (~${Math.round(p.estimatedDuration)}s)`)
      })
    }

    setPhase('rendering')
    addLog('🎬 Renderizando vídeo simples...')
    addLog('📺 Formato: 1080x1920 (vertical/Shorts)')
    addLog('🔄 Transições: slideleft entre páginas')
    addLog(`⏱️ Máximo: ${YOUTUBE_SHORTS_MAX_SECONDS}s por vídeo (YouTube Shorts)`)

    const currentPart = parts[selectedPart] || parts[0]
    addLog(`📖 Renderizando Parte ${currentPart.partNumber}/${currentPart.totalParts} (${currentPart.pages.length} páginas)`)

    // Buscar música de fundo para modo simples também
    let musicUrl: string | undefined
    if (enableAudio) {
      addLog('🎵 Buscando música de fundo...')
      try {
        const musicRes = await fetch('/api/manga-audio?mood=ambient&duration=60')
        const musicData = await musicRes.json()
        if (musicData.success && musicData.bgMusicUrl) {
          musicUrl = musicData.bgMusicUrl
          addLog(`✅ Música: ${musicData.title || 'lofi ambient'}`)
        }
      } catch {}
    }

    const blob = await renderMangaSlideshow({
      pages: currentPart.pages,
      durationPerPage,
      transitionDuration: 0.6,
      canvasWidth: 1080,
      canvasHeight: 1920,
      bgMusicVolume: enableAudio ? bgMusicVolume / 100 : 0,
      bgMusicUrl: musicUrl,
      enableSfx: false,
    } satisfies RenderConfig, (progress: RenderProgress) => {
      setRenderProgress(progress)
      if (progress.phase === 'rendering') {
        addLog(`🖌️ ${progress.message}`)
      }
    })

    setVideoBlob(blob)
    const blobUrl = URL.createObjectURL(blob)
    setVideoBlobUrl(blobUrl)

    addLog(`✅ Vídeo pronto! ${(blob.size / 1024 / 1024).toFixed(1)} MB`)
    addLog(`📐 Resolução: 1080x1920 | FPS: 30`)

    setPhase('saving')
    addLog('💾 Salvando na fila de conteúdo...')

    const newItem: QueueItem = {
      id: `manga_${Date.now()}`,
      title: title || scrapeData.title || 'Mangá Video',
      description: parts.length > 1
        ? `Parte ${currentPart.partNumber}/${currentPart.totalParts} — Páginas ${currentPart.startPage}-${currentPart.endPage} de ${scrapeData.totalPages}`
        : `Capítulo de ${scrapeData.totalPages} páginas`,
      platform: 'youtube',
      motorType: 'manga_video',
      status: 'draft',
      mediaUrl: blobUrl,
      thumbnailUrl: scrapeData.images[0] || '',
      images: scrapeData.images,
      totalPages: scrapeData.totalPages,
      durationPerPage,
      createdAt: Date.now(),
    }

    const queue = JSON.parse(localStorage.getItem('altomatico_queue') || '[]')
    queue.unshift(newItem)
    localStorage.setItem('altomatico_queue', JSON.stringify(queue))

    addLog(`✅ Salvo! ID: ${newItem.id}`)
    setResult(newItem)
    setPhase('done')
    addLog('🎉 Pipeline completa! Vídeo pronto para revisão.')
  }

  // ─── Reset ──────────────────────────────────────────────
  const handleReset = () => {
    setMangaUrl('')
    setMangaTitle('')
    setScrapedImages([])
    setResult(null)
    setError(null)
    setLogs([])
    setPhase('idle')
    setRenderProgress(null)
    setVideoBlobUrl(null)
    setVideoBlob(null)
    setNarrateData(null)
  }

  // ─── Download do vídeo ──────────────────────────────────
  const handleDownload = () => {
    if (videoBlob) {
      downloadVideoBlob(videoBlob, `${mangaTitle || 'manga'}.webm`)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-8'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center'>
          <BookOpen className='w-5 h-5 text-white' />
        </div>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>Mangá → Vídeo</h1>
          <p className='text-gray-500 text-xs'>Converta capítulos de mangá/manhwa em vídeos para YouTube</p>
        </div>
        <div className='ml-auto'>
          <Button onClick={() => window.location.href = '/dashboard/connections'} variant='outline' size='sm'>
            <ArrowLeft className='w-4 h-4 mr-1' /> Voltar
          </Button>
        </div>
      </div>

      <div className='grid lg:grid-cols-3 gap-6'>
        {/* ═══ COLUNA 1: Configuração ═══ */}
        <div className='space-y-4'>
          {/* URL do Capítulo */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
            <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
              <Link2 className='w-4 h-4 text-amber-500' /> URL do Capítulo
            </h3>
            <Input
              placeholder='https://site.com/manga/capitulo-1'
              value={mangaUrl}
              onChange={e => setMangaUrl(e.target.value)}
              className='text-sm mb-2'
            />
            <Input
              placeholder='Título do capítulo (opcional)'
              value={mangaTitle}
              onChange={e => setMangaTitle(e.target.value)}
              className='text-sm mb-2'
            />
            <p className='text-[10px] text-gray-400 mb-2'>Cole a URL de qualquer site de leitura de mangá/manhwa</p>

            <div className='bg-amber-50 border border-amber-200 rounded-lg p-2'>
              <p className='text-[10px] font-bold text-amber-700 mb-1'>📋 URLs de teste (clique para usar):</p>
              <div className='space-y-1'>
                <button
                  onClick={() => setMangaUrl('https://manhwaweb.com/leer/realmente-me-estas-diciendo-que-lo-haga_1696088564822-1_01')}
                  className='block w-full text-left text-[10px] text-blue-600 hover:text-blue-800 hover:underline truncate'
                >
                  🔗 ManhwaWeb: Realmente me estás diciendo... (Cap 1)
                </button>
                <button
                  onClick={() => setMangaUrl('https://manhwaweb.com/leer/It_will_never_break_1760360601083-1_01')}
                  className='block w-full text-left text-[10px] text-blue-600 hover:text-blue-800 hover:underline truncate'
                >
                  🔗 ManhwaWeb: You Won't Break Me (Cap 1)
                </button>
                <button
                  onClick={() => setMangaUrl('https://mangadex.org/chapter/d1536047-2594-4d8e-98f5-91ae3580bdf6')}
                  className='block w-full text-left text-[10px] text-purple-600 hover:text-purple-800 hover:underline truncate'
                >
                  📖 MangaDex: Yomi no Tsugai (Cap 1)
                </button>
              </div>
              <p className='text-[9px] text-amber-600 mt-1'>⚠️ ZonaTMO tem proteção Cloudflare — use as alternativas acima</p>
            </div>
          </div>

          {/* Configurações */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
            <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
              <Settings className='w-4 h-4 text-amber-500' /> Configurações
            </h3>

            {/* Modo de Geração */}
            <div className='mb-4'>
              <label className='text-xs font-medium text-gray-600 block mb-2'>🎬 Modo de Geração</label>
              <div className='grid grid-cols-2 gap-2'>
                <button
                  onClick={() => setNarrationMode('narrated')}
                  className={`p-3 rounded-xl border-2 transition text-left ${
                    narrationMode === 'narrated'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className='flex items-center gap-1.5 mb-1'>
                    <Sparkles className='w-3.5 h-3.5 text-amber-500' />
                    <span className='text-xs font-bold text-gray-900'>Narrado (IA)</span>
                  </div>
                  <p className='text-[10px] text-gray-500'>Gemini seleciona imagens e cria roteiro</p>
                </button>
                <button
                  onClick={() => setNarrationMode('simple')}
                  className={`p-3 rounded-xl border-2 transition text-left ${
                    narrationMode === 'simple'
                      ? 'border-gray-500 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className='flex items-center gap-1.5 mb-1'>
                    <Image className='w-3.5 h-3.5 text-gray-500' />
                    <span className='text-xs font-bold text-gray-900'>Simples</span>
                  </div>
                  <p className='text-[10px] text-gray-500'>Slideshow com todas as páginas</p>
                </button>
              </div>
            </div>

            {/* Tempo por página */}
            <div className='mb-4'>
              <div className='flex items-center justify-between mb-1'>
                <label className='text-xs font-medium text-gray-600'>⏱️ Tempo por Página</label>
                <span className='text-xs font-bold text-amber-600'>{durationPerPage}s</span>
              </div>
              <input
                type='range'
                min={1}
                max={10}
                value={durationPerPage}
                onChange={e => setDurationPerPage(parseInt(e.target.value))}
                className='w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500'
              />
              <p className='text-[10px] text-gray-400 mt-0.5'>Recomendado: 3-5 segundos por página</p>
            </div>

            {/* Canal YouTube */}
            <div className='mb-4'>
              <label className='text-xs font-medium text-gray-600 block mb-1'>📺 Canal YouTube Destino</label>
              {ytChannels.length > 0 ? (
                <div className='space-y-2'>
                  {ytChannels.map((ch) => (
                    <button
                      key={ch.channelId}
                      onClick={() => setSelectedChannel(ch.channelId)}
                      className={`w-full p-3 rounded-lg border-2 transition text-left ${
                        selectedChannel === ch.channelId
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className='flex items-center gap-2'>
                        <Youtube className='w-4 h-4 text-red-600' />
                        <span className='text-sm font-medium text-gray-900'>{ch.channelName}</span>
                        {selectedChannel === ch.channelId && (
                          <CheckCircle className='w-3.5 h-3.5 text-green-500 ml-auto' />
                        )}
                      </div>
                      <p className='text-[10px] text-gray-500 mt-0.5'>ID: {ch.channelId}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => window.location.href = '/dashboard/connections'}
                    className='w-full p-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-amber-400 hover:text-amber-600 transition'
                  >
                    + Adicionar outro canal YouTube
                  </button>
                </div>
              ) : (
                <div className='p-3 bg-amber-50 rounded-lg border border-amber-200'>
                  <p className='text-xs text-amber-700'>⚠️ Nenhum canal YouTube conectado</p>
                  <Button
                    onClick={() => window.location.href = '/dashboard/connections'}
                    size='sm'
                    variant='outline'
                    className='mt-2 text-xs'
                  >
                    Conectar YouTube
                  </Button>
                </div>
              )}
            </div>

            {/* Áudio */}
            <div className='p-3 bg-purple-50 rounded-lg border border-purple-200'>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-xs font-bold text-purple-700'>🎵 Áudio de Fundo</label>
                <label className='relative inline-flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={enableAudio}
                    onChange={e => setEnableAudio(e.target.checked)}
                    className='sr-only peer'
                  />
                  <div className='w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-purple-500 transition'></div>
                  <div className='absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full peer-checked:translate-x-4 transition'></div>
                </label>
              </div>
              {enableAudio && (
                <div>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-[11px] text-gray-600'>Volume</span>
                    <span className='text-[11px] font-bold text-purple-600'>{bgMusicVolume}%</span>
                  </div>
                  <input
                    type='range'
                    min={0}
                    max={50}
                    value={bgMusicVolume}
                    onChange={e => setBgMusicVolume(parseInt(e.target.value))}
                    className='w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-500'
                  />
                  <p className='text-[10px] text-purple-500 mt-1'>Música buscada no Pixabay (grátis). Loop + fade-out automático.</p>
                </div>
              )}
            </div>

            {/* TTS (narração por voz) */}
            {narrationMode === 'narrated' && (
              <div className='p-3 mt-3 bg-blue-50 rounded-lg border border-blue-200'>
                <div className='flex items-center justify-between mb-1'>
                  <label className='text-xs font-bold text-blue-700 flex items-center gap-1'>
                    <Mic className='w-3 h-3' /> Narração por Voz (TTS)
                  </label>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={enableTTS}
                      onChange={e => setEnableTTS(e.target.checked)}
                      className='sr-only peer'
                    />
                    <div className='w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 transition'></div>
                    <div className='absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full peer-checked:translate-x-4 transition'></div>
                  </label>
                </div>
                <p className='text-[10px] text-blue-500'>Voz automática narrando o roteiro gerado pelo Gemini (PT-BR)</p>
              </div>
            )}
          </div>

          {/* Seletor de Partes (quando capítulo é dividido) */}
          {chapterParts.length > 1 && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
              <h3 className='font-bold text-gray-900 mb-2 flex items-center gap-2'>
                📐 Partes do Vídeo (máx {YOUTUBE_SHORTS_MAX_SECONDS}s cada)
              </h3>
              <p className='text-[10px] text-gray-500 mb-3'>Capítulo dividido automaticamente para YouTube Shorts</p>
              <div className='space-y-2'>
                {chapterParts.map((part) => (
                  <button
                    key={part.partNumber}
                    onClick={() => setSelectedPart(part.partNumber - 1)}
                    className={`w-full p-3 rounded-xl border-2 transition text-left ${
                      selectedPart === part.partNumber - 1
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <span className='text-sm font-bold text-gray-900'>Parte {part.partNumber}/{part.totalParts}</span>
                        <span className='text-xs text-gray-500 ml-2'>Páginas {part.startPage}-{part.endPage}</span>
                      </div>
                      <span className='text-xs font-bold text-amber-600'>~{Math.round(part.estimatedDuration)}s</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botão Gerar */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !mangaUrl.trim()}
            className='w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-6 text-sm font-bold disabled:opacity-50'
          >
            {loading ? (
              <><Loader2 className='w-5 h-5 mr-2 animate-spin' /> Processando...</>
            ) : (
              <><Wand2 className='w-5 h-5 mr-2' /> Gerar e Agendar Vídeo</>
            )}
          </Button>

          {error && (
            <div className='bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2'>
              <AlertCircle className='w-4 h-4 text-red-500 shrink-0' />
              <span className='text-xs text-red-700'>{error}</span>
            </div>
          )}
        </div>

        {/* ═══ COLUNA 2: Preview das Imagens + Roteiro ═══ */}
        <div className='space-y-4'>
          {/* Roteiro Narrado (quando disponível) */}
          {narrateData && (
            <div className='bg-white rounded-2xl border border-amber-200 shadow-sm p-5'>
              <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
                <FileText className='w-4 h-4 text-amber-500' /> Roteiro Gerado
                <span className='ml-auto bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold'>Gemini</span>
              </h3>

              {/* Título */}
              <div className='mb-3 p-2 bg-amber-50 rounded-lg'>
                <p className='text-[10px] text-gray-500 mb-0.5'>Título:</p>
                <p className='text-sm font-bold text-gray-900'>{narrateData.title}</p>
              </div>

              {/* Duração e segmentos */}
              <div className='flex items-center gap-3 mb-3'>
                <div className='bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold'>
                  ⏱️ ~{Math.round(narrateData.totalDuration)}s
                </div>
                <div className='bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold'>
                  🖼️ {narrateData.segments.length} imagens
                </div>
              </div>

              {/* Segmentos */}
              <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                {narrateData.segments.map((seg, i) => (
                  <div key={i} className={`p-2 rounded-lg border text-xs ${
                    seg.emotion === 'hook' ? 'border-red-200 bg-red-50' :
                    seg.emotion === 'climax' ? 'border-purple-200 bg-purple-50' :
                    seg.emotion === 'cta' ? 'border-amber-200 bg-amber-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='font-bold text-gray-900'>#{i + 1} — {seg.duration}s</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        seg.emotion === 'hook' ? 'bg-red-200 text-red-700' :
                        seg.emotion === 'climax' ? 'bg-purple-200 text-purple-700' :
                        seg.emotion === 'cta' ? 'bg-amber-200 text-amber-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>{seg.emotion}</span>
                    </div>
                    <p className='text-gray-700 mb-1'>{seg.narration}</p>
                    {seg.subtitle && (
                      <p className='text-[10px] text-blue-600 font-medium'>📺 {seg.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Hashtags */}
              {narrateData.hashtags.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-3'>
                  {narrateData.hashtags.map((tag, i) => (
                    <span key={i} className='bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full'>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Páginas Encontradas */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
            <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
              <Image className='w-4 h-4 text-amber-500' /> Páginas Encontradas
              {scrapedImages.length > 0 && (
                <span className='ml-auto bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold'>
                  {scrapedImages.length}
                </span>
              )}
            </h3>

            {scrapedImages.length > 0 ? (
              <div className='grid grid-cols-3 gap-2 max-h-[500px] overflow-y-auto'>
                {scrapedImages.map((img, i) => {
                  const isSelected = narrateData?.selectedImageIndices?.includes(i)
                  return (
                    <div key={i} className={`relative group ${isSelected ? 'ring-2 ring-amber-400 rounded-lg' : ''}`}>
                      <div className='aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden'>
                        <img
                          src={img}
                          alt={`Página ${i + 1}`}
                          className='w-full h-full object-cover'
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                      <div className='absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded'>
                        {i + 1}
                      </div>
                      {isSelected && (
                        <div className='absolute top-1 right-1 bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded font-bold'>
                          ★
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='text-center py-12 text-gray-400'>
                <BookOpen className='w-12 h-12 mx-auto mb-3 text-gray-200' />
                <p className='text-sm'>Cole uma URL e clique em Gerar</p>
                <p className='text-[10px] mt-1'>As imagens aparecerão aqui</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ COLUNA 3: Logs e Resultado ═══ */}
        <div className='space-y-4'>
          {/* Logs */}
          {logs.length > 0 && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
              <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
                <RefreshCw className={`w-4 h-4 text-amber-500 ${loading ? 'animate-spin' : ''}`} /> Pipeline
                {phase === 'done' && <CheckCircle className='w-4 h-4 text-green-500 ml-auto' />}
              </h3>
              <div className='bg-gray-900 rounded-xl p-3 max-h-60 overflow-y-auto'>
                {logs.map((log, i) => (
                  <p key={i} className={`text-xs font-mono mb-1 ${
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('✅') || log.includes('🎉') ? 'text-green-400' :
                    log.includes('⚠️') ? 'text-yellow-400' :
                    'text-amber-300'
                  }`}>{log}</p>
                ))}
              </div>
            </div>
          )}

          {/* Player do Vídeo */}
          {(videoBlobUrl || (renderProgress && renderProgress.phase === 'rendering')) && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
              <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
                {videoBlobUrl ? (
                  <><Play className='w-4 h-4 text-green-500' /> Preview do Vídeo</>
                ) : (
                  <><Loader2 className='w-4 h-4 text-amber-500 animate-spin' /> Renderizando...</>
                )}
              </h3>

              {renderProgress && (
                <div className='mb-3'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-xs text-gray-500'>{renderProgress.message}</span>
                    <span className='text-xs font-bold text-amber-600'>{Math.round(renderProgress.percent)}%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div
                      className='bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300'
                      style={{ width: `${renderProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {videoBlobUrl && (
                <div className='rounded-xl overflow-hidden bg-black mb-3'>
                  <video
                    ref={videoRef}
                    src={videoBlobUrl}
                    controls
                    className='w-full max-h-[500px]'
                    poster={scrapedImages[0] || undefined}
                  />
                </div>
              )}

              {videoBlobUrl && (
                <div className='flex gap-2'>
                  <Button onClick={handleDownload} variant='outline' className='flex-1 text-xs'>
                    <Download className='w-3 h-3 mr-1' /> Baixar .webm
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
              <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
                <CheckCircle className='w-4 h-4 text-green-500' /> Vídeo Pronto!
              </h3>

              <div className='bg-green-50 rounded-xl p-4 mb-3 border border-green-200'>
                <p className='text-sm font-bold text-gray-900 mb-1'>{result.title}</p>
                <p className='text-xs text-gray-600 mb-2'>{result.description}</p>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  <div>
                    <span className='text-gray-500'>Páginas:</span>
                    <span className='font-bold text-gray-900 ml-1'>{result.totalPages}</span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Duração/página:</span>
                    <span className='font-bold text-gray-900 ml-1'>{result.durationPerPage}s</span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Status:</span>
                    <span className='font-bold text-green-600 ml-1'>Rascunho</span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Motor:</span>
                    <span className='font-bold text-gray-900 ml-1'>📖 Manga{narrateData ? ' + 🤖 IA' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Hashtags */}
              {(result as QueueItem & { aiHashtags?: string[] }).aiHashtags?.map((tag: string, i: number) => (
                <span key={i} className='inline-block bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full mr-1 mb-1'>{tag}</span>
              ))}

              <div className='flex gap-2 mt-3'>
                <Button
                  onClick={handleReset}
                  variant='outline'
                  className='flex-1 text-xs'
                >
                  <ArrowLeft className='w-3 h-3 mr-1' /> Novo Vídeo
                </Button>
                <Button
                  onClick={() => window.location.href = '/dashboard/queue'}
                  className='flex-1 bg-green-600 hover:bg-green-700 text-white text-xs'
                >
                  <Eye className='w-3 h-3 mr-1' /> Ver na Fila
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {phase === 'idle' && logs.length === 0 && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center'>
              <BookOpen className='w-16 h-16 mx-auto mb-4 text-amber-200' />
              <h3 className='text-lg font-bold text-gray-900 mb-2'>Como funciona</h3>
              <div className='space-y-3 text-left max-w-sm mx-auto'>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5'>
                    <span className='text-xs font-bold text-amber-600'>1</span>
                  </div>
                  <p className='text-xs text-gray-600'><strong>Cola a URL</strong> do capítulo de mangá/manhwa</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5'>
                    <span className='text-xs font-bold text-amber-600'>2</span>
                  </div>
                  <p className='text-xs text-gray-600'><strong>Escolhe o modo:</strong> Narrado (Gemini + TTS) ou Simples</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5'>
                    <span className='text-xs font-bold text-amber-600'>3</span>
                  </div>
                  <p className='text-xs text-gray-600'><strong>Gemini seleciona</strong> as melhores imagens e cria o roteiro</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5'>
                    <span className='text-xs font-bold text-amber-600'>4</span>
                  </div>
                  <p className='text-xs text-gray-600'><strong>Gera o vídeo</strong> com narração, transições e música</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5'>
                    <span className='text-xs font-bold text-amber-600'>5</span>
                  </div>
                  <p className='text-xs text-gray-600'><strong>Revisa</strong> na fila e publica no YouTube (@anime_HQs)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
