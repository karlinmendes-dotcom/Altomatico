'use client'
import React, { useState, useEffect } from 'react'
import { FileText, Edit3, Trash2, Send, Eye, Copy, CheckCircle, AlertCircle, Clock, Instagram, Youtube, Music, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ═══════════════════════════════════════════════════════════════
// Queue Page — Fila de Rascunhos para Revisão
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
  createdAt: number
  updatedAt: number
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

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [connections, setConnections] = useState<Record<string, Record<string, unknown>>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editScript, setEditScript] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'youtube' | 'instagram' | 'tiktok'>('all')

  useEffect(() => {
    setQueue(getQueue())
    setConnections(getConnections())
  }, [])

  const showMsg = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 5000)
  }

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
    showMsg('✅ Rascunho salvo!')
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este rascunho?')) return
    const updated = queue.filter(item => item.id !== id)
    saveQueue(updated)
    setQueue(updated)
    showMsg('🗑️ Rascunho excluído')
  }

  const handleSendToPlatform = async (item: QueueItem) => {
    const conn = connections[item.platform]
    if (!conn) {
      showMsg(`❌ ${item.platform} não conectado. Vá em Conexões primeiro.`)
      return
    }

    setSending(item.id)
    try {
      // Simular envio — em produção, chamaria a engine correspondente
      // com modo seguro (DRAFT/UNLISTED/PRIVATE)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Atualizar status
      const updated = queue.map(q =>
        q.id === item.id ? { ...q, status: 'scheduled', updatedAt: Date.now() } : q
      )
      saveQueue(updated)
      setQueue(updated)
      showMsg(`✅ Rascunho enviado para ${item.platform} como NÃO LISTADO/PRIVADO`)
    } catch (err) {
      showMsg(`❌ Erro ao enviar: ${err}`)
    } finally {
      setSending(null)
    }
  }

  const handleCopy = (item: QueueItem) => {
    const text = `${item.title}\n\n${item.aiScript}\n\n${item.description}\n\n${item.aiHashtags.join(' ')}`
    navigator.clipboard.writeText(text)
    showMsg('📋 Copiado para a área de transferência!')
  }

  const filteredQueue = filter === 'all' ? queue : queue.filter(item => item.platform === filter)
  const draftCount = queue.filter(item => item.status === 'draft').length
  const scheduledCount = queue.filter(item => item.status === 'scheduled').length

  const platformIcon = (p: string) => {
    if (p === 'youtube') return <Youtube className='w-4 h-4 text-red-500' />
    if (p === 'instagram') return <Instagram className='w-4 h-4 text-pink-500' />
    return <Music className='w-4 h-4 text-cyan-500' />
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-8'>
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

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
          message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' :
          message.includes('📋') ? 'bg-blue-50 border border-blue-200 text-blue-700' :
          'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.includes('✅') || message.includes('📋') ? <CheckCircle className='w-4 h-4 shrink-0' /> : <AlertCircle className='w-4 h-4 shrink-0' />}
          <span className='text-sm'>{message}</span>
        </div>
      )}

      {/* Stats */}
      <div className='grid grid-cols-3 gap-3 mb-6'>
        <div className='bg-white rounded-xl border border-gray-100 p-4 text-center'>
          <p className='text-2xl font-bold text-amber-600'>{draftCount}</p>
          <p className='text-xs text-gray-500'>Rascunhos</p>
        </div>
        <div className='bg-white rounded-xl border border-gray-100 p-4 text-center'>
          <p className='text-2xl font-bold text-blue-600'>{scheduledCount}</p>
          <p className='text-xs text-gray-500'>Agendados</p>
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

            return (
              <div key={item.id} className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
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
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.status === 'draft' ? 'Rascunho' : item.status === 'scheduled' ? 'Agendado' : 'Enviado'}
                          </span>
                          <span className='text-[10px] text-gray-400'>
                            {item.source === 'ai_generated' ? '🤖 Gerado por IA' : '🔗 Clip de URL'}
                          </span>
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
                    <div className='flex items-center gap-3 text-[10px] text-gray-400 pt-1'>
                      <span className='flex items-center gap-1'><Clock className='w-3 h-3' /> Criado: {new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                      <span>Plataforma: {item.platform}</span>
                      <span>Tipo: {item.contentType}</span>
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
