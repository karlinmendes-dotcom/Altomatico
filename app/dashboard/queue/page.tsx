'use client'
import React, { useState, useEffect } from 'react'
import { FileText, Edit3, Trash2, Send, Eye, Copy, CheckCircle, AlertCircle, Clock, Instagram, Youtube, Music, RefreshCw, ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Film, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ═══════════════════════════════════════════════════════════════
// Queue Page — Fila de Rascunhos com Pré-visualização de Mídia
// Visualiza, edita e envia conteúdos para redes sociais
// ═══════════════════════════════════════════════════════════════

interface QueueItem {
  id: string
  title: string
  description: string
  platform: 'youtube' | 'instagram' | 'tiktok'
  contentType: string
  source: string
  aiScript: string
  aiHashtags: string[]
  aiNarration: string
  aiPrompt: string
  status: string
  videoUrl: string
  thumbnailUrl: string
  imageUrl: string
  mediaUrl: string
  createdAt: number
  updatedAt: number
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  hint?: string
}

function getQueue(): QueueItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('altomatico_queue') || '[]')
  } catch { return [] }
}

function saveQueue(queue: QueueItem[]) {
  localStorage.setItem('altomatico_queue', JSON.stringify(queue))
}

function getConnections() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('altomatico_connections') || '{}')
  } catch { return {} }
}

// ═══════════════════════════════════════════════════════════════
// Toast Component — Notificações visuais
// ═══════════════════════════════════════════════════════════════

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className='fixed top-4 right-4 z-50 space-y-2 max-w-sm'>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 animate-in slide-in-from-right ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className='shrink-0 mt-0.5'>
            {toast.type === 'success' && <CheckCircle className='w-5 h-5 text-green-500' />}
            {toast.type === 'error' && <AlertCircle className='w-5 h-5 text-red-500' />}
            {toast.type === 'warning' && <AlertCircle className='w-5 h-5 text-amber-500' />}
            {toast.type === 'info' && <CheckCircle className='w-5 h-5 text-blue-500' />}
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium'>{toast.message}</p>
            {toast.hint && <p className='text-xs mt-1 opacity-80'>{toast.hint}</p>}
          </div>
          <button onClick={() => onDismiss(toast.id)} className='shrink-0 text-gray-400 hover:text-gray-600'>
            <X className='w-4 h-4' />
          </button>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Media Preview — Player de vídeo/áudio responsivo 9:16
// ═══════════════════════════════════════════════════════════════

function MediaPreview({ item }: { item: QueueItem }) {
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  const mediaUrl = item.mediaUrl || item.videoUrl || item.imageUrl

  // Se não tem mídia, mostrar indicador de processamento
  if (!mediaUrl) {
    return (
      <div className='bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6 text-center'>
        <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3'>
          {item.aiScript ? (
            <FileText className='w-7 h-7 text-gray-400' />
          ) : (
            <Loader2 className='w-7 h-7 text-gray-400 animate-spin' />
          )}
        </div>
        <p className='text-sm font-medium text-gray-600'>
          {item.aiScript ? '✅ Script pronto — Mídia não gerada ainda' : '⏳ Mídia em processamento...'}
        </p>
        <p className='text-xs text-gray-400 mt-1'>
          {item.aiScript
            ? 'O roteiro está pronto. A mídia será gerada pelo mediaEngine.'
            : 'Aguarde a geração de conteúdo pela IA.'}
        </p>
      </div>
    )
  }

  // Determinar tipo de mídia
  const isVideo = mediaUrl.match(/\.(mp4|webm|ogg|mov)/i) || mediaUrl.includes('video') || mediaUrl.includes('pixabay.com/api/videos') || item.contentType === 'short' || item.contentType === 'reel' || item.contentType === 'long_video'
  const isAudio = mediaUrl.match(/\.(mp3|wav|ogg|m4a)/i) || mediaUrl.includes('audio')
  const isImage = mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) || mediaUrl.includes('image') || item.contentType === 'post' || item.contentType === 'carousel'

  // Player de vídeo — Formato vertical 9:16
  if (isVideo) {
    return (
      <div className='relative rounded-xl overflow-hidden bg-black' style={{ aspectRatio: '9/16', maxHeight: '400px' }}>
        <video
          ref={videoRef}
          src={mediaUrl}
          className='w-full h-full object-cover'
          muted={muted}
          loop
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={(e) => {
            // Fallback: mostrar erro amigável
            const target = e.target as HTMLVideoElement
            target.style.display = 'none'
          }}
        />
        {/* Controles overlay */}
        <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (videoRef.current) {
                    playing ? videoRef.current.pause() : videoRef.current.play()
                  }
                }}
                className='w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition'
              >
                {playing ? <Pause className='w-4 h-4' /> : <Play className='w-4 h-4' />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMuted(!muted)
                }}
                className='w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition'
              >
                {muted ? <VolumeX className='w-4 h-4' /> : <Volume2 className='w-4 h-4' />}
              </button>
            </div>
            <span className='text-white text-xs bg-black/50 px-2 py-0.5 rounded'>9:16</span>
          </div>
        </div>
        {/* Badge de formato */}
        <div className='absolute top-2 right-2'>
          <span className='bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1'>
            <Film className='w-3 h-3' /> Vídeo
          </span>
        </div>
      </div>
    )
  }

  // Player de áudio
  if (isAudio) {
    return (
      <div className='bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-4'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center'>
            <Music className='w-6 h-6 text-purple-500' />
          </div>
          <div>
            <p className='text-sm font-bold text-gray-900'>Áudio de fundo</p>
            <p className='text-xs text-gray-500'>Música/narração gerada</p>
          </div>
        </div>
        <audio
          src={mediaUrl}
          className='w-full'
          controls
          onError={() => {/* ignore */}}
        />
      </div>
    )
  }

  // Imagem — Formato vertical 9:16
  if (isImage) {
    return (
      <div className='relative rounded-xl overflow-hidden bg-gray-100' style={{ aspectRatio: '9/16', maxHeight: '400px' }}>
        <img
          src={mediaUrl}
          alt={item.title}
          className='w-full h-full object-cover'
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
        <div className='absolute top-2 right-2'>
          <span className='bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1'>
            <ImageIcon className='w-3 h-3' /> Imagem
          </span>
        </div>
      </div>
    )
  }

  // Fallback: link externo
  return (
    <div className='bg-gray-50 rounded-xl border border-gray-200 p-4'>
      <p className='text-xs text-gray-500 mb-2'>Mídia externa:</p>
      <a
        href={mediaUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='text-sm text-blue-600 underline break-all'
      >
        {mediaUrl}
      </a>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Queue Page
// ═══════════════════════════════════════════════════════════════

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [connections, setConnections] = useState<Record<string, Record<string, unknown>>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editScript, setEditScript] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'youtube' | 'instagram' | 'tiktok'>('all')
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    setQueue(getQueue())
    setConnections(getConnections())
  }, [])

  // ─── Toast helpers ────────────────────────────────────────
  const addToast = (type: Toast['type'], message: string, hint?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message, hint }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 6000)
  }

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // ─── Edit handlers ────────────────────────────────────────
  const handleEdit = (item: QueueItem) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditScript(item.aiScript)
    setEditCaption(item.description)
    setEditHashtags(item.aiHashtags.join(' '))
    setExpandedId(item.id)
  }

  const handleSaveEdit = (id: string) => {
    const updated = queue.map(item =>
      item.id === id ? {
        ...item,
        title: editTitle,
        aiScript: editScript,
        description: editCaption,
        aiHashtags: editHashtags.split(/\s+/).filter(h => h.startsWith('#')),
        updatedAt: Date.now(),
      } : item
    )
    saveQueue(updated)
    setQueue(updated)
    setEditingId(null)
    addToast('success', 'Rascunho salvo com sucesso!')
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este rascunho?')) return
    const updated = queue.filter(item => item.id !== id)
    saveQueue(updated)
    setQueue(updated)
    addToast('info', 'Rascunho excluído')
  }

  // ─── Send to platform (real Convex action) ────────────────
  const handleSendToPlatform = async (item: QueueItem) => {
    const conn = connections[item.platform]
    if (!conn) {
      addToast('error', `${item.platform} não conectado`, 'Vá em Conexões e conecte sua conta primeiro.')
      return
    }

    setSending(item.id)
    try {
      // Chamar a action Convex via API route ou fetch
      // Em produção, isso seria ctx.runAction — aqui chamamos via endpoint
      const res = await fetch('/api/queue/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: item.id,
          platform: item.platform,
          title: item.title,
          script: item.aiScript,
          caption: item.description,
          hashtags: item.aiHashtags,
          videoUrl: item.videoUrl || item.mediaUrl || undefined,
          imageUrl: item.imageUrl || undefined,
        }),
      })

      const result = await res.json()

      if (result.success) {
        // Atualizar status local
        const updated = queue.map(q =>
          q.id === item.id ? { ...q, status: 'scheduled', updatedAt: Date.now() } : q
        )
        saveQueue(updated)
        setQueue(updated)

        addToast(
          'success',
          result.message || `Rascunho enviado para ${item.platform} como NÃO LISTADO/PRIVADO`,
          result.note
        )
      } else {
        addToast(
          'error',
          result.error || `Falha ao enviar para ${item.platform}`,
          result.hint
        )
      }
    } catch (err) {
      addToast(
        'error',
        `Erro de conexão ao enviar: ${err instanceof Error ? err.message : err}`,
        'Verifique sua conexão e tente novamente.'
      )
    } finally {
      setSending(null)
    }
  }

  const handleCopy = (item: QueueItem) => {
    const text = `${item.title}\n\n${item.aiScript}\n\n${item.description}\n\n${item.aiHashtags.join(' ')}`
    navigator.clipboard.writeText(text)
    addToast('success', 'Copiado para a área de transferência!')
  }

  const filteredQueue = filter === 'all' ? queue : queue.filter(item => item.platform === filter)
  const draftCount = queue.filter(item => item.status === 'draft').length
  const scheduledCount = queue.filter(item => item.status === 'scheduled').length
  const failedCount = queue.filter(item => item.status === 'failed').length

  const platformIcon = (p: string) => {
    if (p === 'youtube') return <Youtube className='w-4 h-4 text-red-500' />
    if (p === 'instagram') return <Instagram className='w-4 h-4 text-pink-500' />
    return <Music className='w-4 h-4 text-cyan-500' />
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-8'>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center'>
          <FileText className='w-5 h-5 text-white' />
        </div>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>Fila de Rascunhos</h1>
          <p className='text-gray-500 text-xs'>Revise, edite e envie seus conteúdos</p>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-4 gap-3 mb-6'>
        <div className='bg-white rounded-xl border border-gray-100 p-4 text-center'>
          <p className='text-2xl font-bold text-amber-600'>{draftCount}</p>
          <p className='text-xs text-gray-500'>Rascunhos</p>
        </div>
        <div className='bg-white rounded-xl border border-gray-100 p-4 text-center'>
          <p className='text-2xl font-bold text-blue-600'>{scheduledCount}</p>
          <p className='text-xs text-gray-500'>Agendados</p>
        </div>
        <div className='bg-white rounded-xl border border-gray-100 p-4 text-center'>
          <p className='text-2xl font-bold text-red-600'>{failedCount}</p>
          <p className='text-xs text-gray-500'>Falhas</p>
        </div>
        <div className='bg-white rounded-xl border border-gray-100 p-4 text-center'>
          <p className='text-2xl font-bold text-gray-900'>{queue.length}</p>
          <p className='text-xs text-gray-500'>Total</p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex gap-2 mb-4 overflow-x-auto pb-2'>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'youtube', label: 'YouTube', icon: <Youtube className='w-3.5 h-3.5' /> },
          { key: 'instagram', label: 'Instagram', icon: <Instagram className='w-3.5 h-3.5' /> },
          { key: 'tiktok', label: 'TikTok', icon: <Music className='w-3.5 h-3.5' /> },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              filter === f.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Queue Items */}
      {filteredQueue.length === 0 ? (
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center'>
          <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <FileText className='w-8 h-8 text-gray-400' />
          </div>
          <h3 className='font-bold text-gray-900 mb-2'>Nenhum rascunho na fila</h3>
          <p className='text-sm text-gray-500 mb-4'>
            Configure seus canais em <a href='/dashboard/connections' className='text-blue-600 underline'>Conexões</a> e ative o cron diário para gerar conteúdo automaticamente.
          </p>
          <p className='text-xs text-gray-400'>
            Os conteúdos gerados aparecerão aqui como rascunhos para você revisar antes de enviar.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {filteredQueue.map(item => {
            const isExpanded = expandedId === item.id
            const isEditing = editingId === item.id
            const isConnected = !!connections[item.platform]
            const hasMedia = !!(item.mediaUrl || item.videoUrl || item.imageUrl)
            const hasFailed = item.status === 'failed'

            return (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                hasFailed ? 'border-red-200' : 'border-gray-100'
              }`}>
                {/* Header */}
                <div
                  className='p-4 cursor-pointer hover:bg-gray-50 transition'
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className='flex items-start justify-between'>
                    <div className='flex items-start gap-3 flex-1 min-w-0'>
                      <div className='w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100'>
                        {platformIcon(item.platform)}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                            item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.status === 'draft' ? 'Rascunho' :
                             item.status === 'scheduled' ? 'Agendado' :
                             item.status === 'failed' ? 'Falhou' : 'Enviado'}
                          </span>
                          <span className='text-[10px] text-gray-400'>
                            {item.source === 'ai_generated' ? '🤖 IA' : '🔗 Clip'}
                          </span>
                          {hasMedia && (
                            <span className='text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded'>
                              📎 Mídia
                            </span>
                          )}
                        </div>
                        <h3 className='font-bold text-gray-900 text-sm truncate'>{item.title}</h3>
                        <p className='text-xs text-gray-500 truncate mt-0.5'>
                          {item.aiScript?.slice(0, 100)}...
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 shrink-0 ml-2'>
                      {isExpanded ? <ChevronUp className='w-4 h-4 text-gray-400' /> : <ChevronDown className='w-4 h-4 text-gray-400' />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className='border-t border-gray-100 p-4 space-y-4'>
                    {/* ═══ MÍDIA PREVIEW ═══ */}
                    <div>
                      <p className='text-xs font-bold text-gray-500 mb-2'>🎬 Pré-visualização</p>
                      <MediaPreview item={item} />
                    </div>

                    {/* Hashtags */}
                    {item.aiHashtags.length > 0 && (
                      <div>
                        <p className='text-xs font-bold text-gray-500 mb-1'>Hashtags</p>
                        <div className='flex flex-wrap gap-1'>
                          {item.aiHashtags.map((h, i) => (
                            <span key={i} className='px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium'>
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Script / Caption */}
                    {isEditing ? (
                      <div className='space-y-3'>
                        <div>
                          <label className='block text-xs font-medium text-gray-600 mb-1'>Título</label>
                          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className='text-sm' />
                        </div>
                        <div>
                          <label className='block text-xs font-medium text-gray-600 mb-1'>Roteiro</label>
                          <textarea
                            value={editScript}
                            onChange={e => setEditScript(e.target.value)}
                            className='w-full text-sm border border-gray-200 rounded-lg p-3 min-h-[120px] resize-none'
                          />
                        </div>
                        <div>
                          <label className='block text-xs font-medium text-gray-600 mb-1'>Legenda</label>
                          <textarea
                            value={editCaption}
                            onChange={e => setEditCaption(e.target.value)}
                            className='w-full text-sm border border-gray-200 rounded-lg p-3 min-h-[80px] resize-none'
                          />
                        </div>
                        <div>
                          <label className='block text-xs font-medium text-gray-600 mb-1'>Hashtags (separadas por espaço)</label>
                          <Input value={editHashtags} onChange={e => setEditHashtags(e.target.value)} className='text-sm' />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className='text-xs font-bold text-gray-500 mb-1'>📜 Roteiro</p>
                          <div className='bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto font-mono'>
                            {item.aiScript || item.description || '(Sem roteiro)'}
                          </div>
                        </div>
                        {item.description && item.description !== item.aiScript && (
                          <div>
                            <p className='text-xs font-bold text-gray-500 mb-1'>📝 Legenda</p>
                            <div className='bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line max-h-32 overflow-y-auto'>
                              {item.description}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Failed error message */}
                    {hasFailed && (item as QueueItem & { errorMessage?: string }).errorMessage && (
                      <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
                        <p className='text-xs font-bold text-red-700 mb-1'>❌ Erro no envio</p>
                        <p className='text-xs text-red-600'>{(item as QueueItem & { errorMessage?: string }).errorMessage}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className='flex flex-wrap gap-2 pt-2'>
                      {isEditing ? (
                        <>
                          <Button onClick={() => handleSaveEdit(item.id)} className='bg-green-600 hover:bg-green-700 text-white text-xs'>
                            <CheckCircle className='w-3.5 h-3.5 mr-1' /> Salvar
                          </Button>
                          <Button onClick={() => setEditingId(null)} variant='outline' className='text-xs'>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => handleEdit(item)} variant='outline' className='text-xs border-blue-200 text-blue-600 hover:bg-blue-50'>
                            <Edit3 className='w-3.5 h-3.5 mr-1' /> Editar
                          </Button>
                          <Button onClick={() => handleCopy(item)} variant='outline' className='text-xs border-gray-200 text-gray-600 hover:bg-gray-50'>
                            <Copy className='w-3.5 h-3.5 mr-1' /> Copiar
                          </Button>
                          <Button
                            onClick={() => handleSendToPlatform(item)}
                            disabled={!isConnected || sending === item.id}
                            className={`text-xs ${
                              isConnected
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {sending === item.id ? (
                              <><RefreshCw className='w-3.5 h-3.5 mr-1 animate-spin' /> Enviando...</>
                            ) : isConnected ? (
                              <><Send className='w-3.5 h-3.5 mr-1' /> Enviar Rascunho</>
                            ) : (
                              <><AlertCircle className='w-3.5 h-3.5 mr-1' /> Não Conectado</>
                            )}
                          </Button>
                          <Button onClick={() => handleDelete(item.id)} variant='outline' className='text-xs border-red-200 text-red-500 hover:bg-red-50'>
                            <Trash2 className='w-3.5 h-3.5 mr-1' /> Excluir
                          </Button>
                        </>
                      )}
                    </div>

                    {!isConnected && (
                      <p className='text-xs text-amber-600 bg-amber-50 p-2 rounded-lg'>
                        ⚠️ Conecte seu {item.platform} em{' '}
                        <a href='/dashboard/connections' className='underline font-medium'>Conexões</a>{' '}
                        para poder enviar rascunhos.
                      </p>
                    )}

                    {/* Meta info */}
                    <div className='flex flex-wrap items-center gap-3 text-[10px] text-gray-400 pt-1'>
                      <span className='flex items-center gap-1'><Clock className='w-3 h-3' /> {new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                      <span className='capitalize'>{item.platform}</span>
                      <span className='capitalize'>{item.contentType}</span>
                      {hasMedia && <span className='text-green-600'>✓ Mídia pronta</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
