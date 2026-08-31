'use client'
import React, { useState, useEffect } from 'react'
import {
  BookOpen, Link2, Clock, Youtube, Music, Wand2, Loader2,
  CheckCircle, AlertCircle, Play, Image, Settings, ArrowLeft,
  Volume2, VolumeX, ChevronRight, RefreshCw, Download, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

export default function MangaVideoPage() {
  // ─── Estado do formulário ───────────────────────────────
  const [mangaUrl, setMangaUrl] = useState('')
  const [mangaTitle, setMangaTitle] = useState('')
  const [durationPerPage, setDurationPerPage] = useState(3)
  const [enableAudio, setEnableAudio] = useState(true)
  const [bgMusicVolume, setBgMusicVolume] = useState(15)

  // ─── Estado do YouTube ──────────────────────────────────
  const [ytChannels, setYtChannels] = useState<YouTubeChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState('')

  // ─── Estado do pipeline ─────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'scraping' | 'rendering' | 'saving' | 'done' | 'error'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<QueueItem | null>(null)
  const [scrapedImages, setScrapedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // ─── Carregar canais YouTube do localStorage ────────────
  useEffect(() => {
    try {
      const connections = JSON.parse(localStorage.getItem('altomatico_connections') || '{}')
      if (connections.youtube) {
        setYtChannels([{
          channelId: connections.youtube.channelId || '',
          channelName: connections.youtube.channelName || 'YouTube Canal',
        }])
        setSelectedChannel(connections.youtube.channelId || '')
      }
    } catch {}
  }, [])

  // ─── Adicionar log ──────────────────────────────────────
  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
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

      // ═══ FASE 2: Render ═══
      setPhase('rendering')
      addLog('🎬 Montando vídeo com FFmpeg...')

      const renderRes = await fetch('/api/manga-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: mangaUrl,
          title: mangaTitle || scrapeData.title,
          durationPerPage,
          youtubeChannel: selectedChannel,
          enableAudio,
          bgMusicVolume: bgMusicVolume / 100,
          transitionType: 'slideleft',
          transitionDuration: 0.6,
        }),
      })

      const renderData = await renderRes.json()

      if (!renderData.success) {
        throw new Error(renderData.error || 'Falha na renderização')
      }

      addLog(`✅ Vídeo pronto! ${renderData.renderConfig.totalDuration}s de duração`)
      addLog(`🎵 Áudio: ${renderData.renderConfig.bgMusicUrl}`)

      // ═══ FASE 3: Salvar na fila ═══
      setPhase('saving')
      addLog('💾 Salvando na fila de conteúdo...')

      const queue = JSON.parse(localStorage.getItem('altomatico_queue') || '[]')
      const newItem: QueueItem = {
        ...renderData.queueItem,
        images: scrapeData.images,
        totalPages: scrapeData.totalPages,
        durationPerPage,
      }
      queue.unshift(newItem)
      localStorage.setItem('altomatico_queue', JSON.stringify(queue))

      addLog(`✅ Salvo! ID: ${newItem.id}`)
      setResult(newItem)
      setPhase('done')
      addLog('🎉 Pipeline completa! Vídeo pronto para revisão.')
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errMsg)
      addLog(`❌ Erro: ${errMsg}`)
      setPhase('error')
    } finally {
      setLoading(false)
    }
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
            <p className='text-[10px] text-gray-400'>Cole a URL de qualquer site de leitura de mangá/manhwa</p>
          </div>

          {/* Configurações */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
            <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
              <Settings className='w-4 h-4 text-amber-500' /> Configurações
            </h3>

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
                <div className='p-3 bg-green-50 rounded-lg border border-green-200'>
                  <div className='flex items-center gap-2'>
                    <Youtube className='w-4 h-4 text-red-600' />
                    <span className='text-sm font-medium text-gray-900'>
                      {ytChannels[0].channelName}
                    </span>
                    <CheckCircle className='w-3.5 h-3.5 text-green-500 ml-auto' />
                  </div>
                  <p className='text-[10px] text-green-600 mt-1'>ID: {ytChannels[0].channelId}</p>
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
          </div>

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

        {/* ═══ COLUNA 2: Preview das Imagens ═══ */}
        <div className='space-y-4'>
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
                {scrapedImages.map((img, i) => (
                  <div key={i} className='relative group'>
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
                  </div>
                ))}
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
                    'text-amber-300'
                  }`}>{log}</p>
                ))}
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
              <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
                <Play className='w-4 h-4 text-green-500' /> Vídeo Pronto!
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
                    <span className='font-bold text-gray-900 ml-1'>📖 Manga</span>
                  </div>
                </div>
              </div>

              {/* Hashtags */}
              <div className='flex flex-wrap gap-1 mb-3'>
                {(result as QueueItem & { aiHashtags?: string[] }).aiHashtags?.map((tag: string, i: number) => (
                  <span key={i} className='bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full'>{tag}</span>
                ))}
              </div>

              <div className='flex gap-2'>
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
                  <p className='text-xs text-gray-600'><strong>Configura</strong> tempo por página, áudio e canal</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5'>
                    <span className='text-xs font-bold text-amber-600'>3</span>
                  </div>
                  <p className='text-xs text-gray-600'><strong>Gera o vídeo</strong> com transições e música de fundo</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5'>
                    <span className='text-xs font-bold text-amber-600'>4</span>
                  </div>
                  <p className='text-xs text-gray-600'><strong>Revisa</strong> na fila e publica no YouTube</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
