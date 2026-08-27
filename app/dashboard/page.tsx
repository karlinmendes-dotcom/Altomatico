'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Instagram, Youtube, Music, ArrowRight, Zap, Image, Video, Calendar, Settings, Link2, CheckCircle, AlertCircle, Clock, FileText, AlertTriangle } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// Dashboard — Métricas em tempo real + Status de conexões
// ═══════════════════════════════════════════════════════════════

function getConnections() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('altomatico_connections') || '{}') }
  catch { return {} }
}

function getQueue() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('altomatico_queue') || '[]') }
  catch { return [] }
}

interface ConnectionData {
  connectedAt?: number
  expiresAt?: number
  [key: string]: unknown
}

function isTokenHealthy(conn: ConnectionData): { status: 'ok' | 'warning' | 'expired'; label: string } {
  if (!conn) return { status: 'expired', label: 'Desconectado' }
  const now = Date.now()
  if (conn.expiresAt && typeof conn.expiresAt === 'number') {
    const daysLeft = Math.ceil((conn.expiresAt - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return { status: 'expired', label: 'Token Expirado' }
    if (daysLeft <= 7) return { status: 'warning', label: `Expira em ${daysLeft}d` }
  }
  return { status: 'ok', label: 'Operacional' }
}

export default function Dashboard() {
  const [connections, setConnections] = useState<Record<string, ConnectionData>>({})
  const [queue, setQueue] = useState<Array<{ status: string; platform: string }>>([])

  useEffect(() => {
    setConnections(getConnections())
    setQueue(getQueue())
  }, [])

  const igConn = connections.instagram
  const ytConn = connections.youtube
  const ttConn = connections.tiktok

  const igHealth = isTokenHealthy(igConn as ConnectionData)
  const ytHealth = isTokenHealthy(ytConn as ConnectionData)
  const ttHealth = isTokenHealthy(ttConn as ConnectionData)

  const connectedCount = [igConn, ytConn, ttConn].filter(Boolean).length
  const healthyCount = [igHealth, ytHealth, ttHealth].filter(h => h.status === 'ok').length
  const warningCount = [igHealth, ytHealth, ttHealth].filter(h => h.status === 'warning').length
  const expiredCount = [igHealth, ytHealth, ttHealth].filter(h => h.status === 'expired').length

  const draftCount = queue.filter(q => q.status === 'draft').length
  const scheduledCount = queue.filter(q => q.status === 'scheduled').length
  const publishedCount = queue.filter(q => q.status === 'published').length

  const healthColor = expiredCount > 0 ? 'text-red-600' : warningCount > 0 ? 'text-amber-600' : 'text-green-600'
  const healthBg = expiredCount > 0 ? 'bg-red-50 border-red-200' : warningCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
  const healthLabel = expiredCount > 0 ? 'Requer Atenção' : warningCount > 0 ? 'Atenção Necessária' : 'Operacional'

  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    idea: { label: 'Ideia', color: 'bg-yellow-100 text-yellow-700', icon: '💡' },
    draft: { label: 'Rascunho', color: 'bg-amber-100 text-amber-700', icon: '📝' },
    scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: '⏰' },
    published: { label: 'Publicado', color: 'bg-green-100 text-green-700', icon: '🚀' },
    failed: { label: 'Falhou', color: 'bg-red-100 text-red-700', icon: '❌' },
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-8 lg:p-10'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-2xl md:text-3xl font-bold text-gray-900'>Olá, Karlyn! 👋</h1>
        <p className='text-gray-500 mt-1 text-sm md:text-base'>Escolha uma plataforma para começar a gerar conteúdo</p>
      </div>

      {/* ═══ HEALTH STATUS BAR ═══ */}
      <div className={`${healthBg} border rounded-2xl p-4 mb-6 flex items-center justify-between`}>
        <div className='flex items-center gap-3'>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            expiredCount > 0 ? 'bg-red-100' : warningCount > 0 ? 'bg-amber-100' : 'bg-green-100'
          }`}>
            {expiredCount > 0 ? <AlertTriangle className={`w-5 h-5 ${healthColor}`} /> :
             warningCount > 0 ? <AlertTriangle className={`w-5 h-5 ${healthColor}`} /> :
             <CheckCircle className='w-5 h-5 text-green-600' />}
          </div>
          <div>
            <p className={`font-bold text-sm ${healthColor}`}>Status: {healthLabel}</p>
            <p className='text-xs text-gray-500'>
              {healthyCount} operacional(is) • {warningCount} atenção • {expiredCount} expirado(s)
            </p>
          </div>
        </div>
        <Link href='/dashboard/connections' className='text-xs font-medium text-gray-600 hover:text-gray-900 underline'>
          Ver Conexões →
        </Link>
      </div>

      {/* ═══ METRICS CARDS ═══ */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8'>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0'>
              <Link2 className='w-5 h-5 text-purple-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{connectedCount}</p>
              <p className='text-xs text-gray-500'>Conectados</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0'>
              <FileText className='w-5 h-5 text-amber-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{draftCount}</p>
              <p className='text-xs text-gray-500'>Rascunhos</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0'>
              <Clock className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{scheduledCount}</p>
              <p className='text-xs text-gray-500'>Agendados</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0'>
              <Zap className='w-5 h-5 text-green-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{publishedCount}</p>
              <p className='text-xs text-gray-500'>Publicados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className='grid md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        <Link href='/dashboard/instagram'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group h-full'>
            <div className='flex items-start justify-between mb-4 md:mb-6'>
              <div className='w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Instagram className='w-7 h-7 md:w-8 md:h-8 text-white' />
              </div>
              <div className='flex items-center gap-2'>
                {igConn && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    igHealth.status === 'ok' ? 'bg-green-100 text-green-700' :
                    igHealth.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {igHealth.label}
                  </span>
                )}
                <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-pink-500 transition group-hover:translate-x-1' />
              </div>
            </div>
            <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-2'>Instagram</h2>
            <p className='text-gray-500 mb-4 md:mb-6 text-sm'>Gere posts, legendas e hashtags automaticamente com IA</p>
            <div className='flex flex-wrap gap-2'>
              <span className='bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium'>Posts</span>
              <span className='bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium'>Legendas</span>
              <span className='bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium'>Hashtags</span>
            </div>
          </div>
        </Link>

        <Link href='/dashboard/youtube'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group h-full'>
            <div className='flex items-start justify-between mb-4 md:mb-6'>
              <div className='w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Youtube className='w-7 h-7 md:w-8 md:h-8 text-white' />
              </div>
              <div className='flex items-center gap-2'>
                {ytConn && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ytHealth.status === 'ok' ? 'bg-green-100 text-green-700' :
                    ytHealth.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {ytHealth.label}
                  </span>
                )}
                <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-red-500 transition group-hover:translate-x-1' />
              </div>
            </div>
            <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-2'>YouTube</h2>
            <p className='text-gray-500 mb-4 md:mb-6 text-sm'>Gere roteiros, corte vídeos e publique automaticamente</p>
            <div className='flex flex-wrap gap-2'>
              <span className='bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium'>Roteiros</span>
              <span className='bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium'>Narração</span>
              <span className='bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium'>SEO</span>
            </div>
          </div>
        </Link>

        <Link href='/dashboard/tiktok'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group h-full'>
            <div className='flex items-start justify-between mb-4 md:mb-6'>
              <div className='w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-cyan-500 to-black rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Music className='w-7 h-7 md:w-8 md:h-8 text-white' />
              </div>
              <div className='flex items-center gap-2'>
                {ttConn && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ttHealth.status === 'ok' ? 'bg-green-100 text-green-700' :
                    ttHealth.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {ttHealth.label}
                  </span>
                )}
                <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-cyan-500 transition group-hover:translate-x-1' />
              </div>
            </div>
            <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-2'>TikTok</h2>
            <p className='text-gray-500 mb-4 md:mb-6 text-sm'>Crie vídeos curtos virais com IA e publique automático</p>
            <div className='flex flex-wrap gap-2'>
              <span className='bg-cyan-50 text-cyan-600 text-xs px-3 py-1 rounded-full font-medium'>Vídeos</span>
              <span className='bg-cyan-50 text-cyan-600 text-xs px-3 py-1 rounded-full font-medium'>Roteiros</span>
              <span className='bg-cyan-50 text-cyan-600 text-xs px-3 py-1 rounded-full font-medium'>Trends</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-8'>
        <Link href='/dashboard/connections' className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition group'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition'>
              <Link2 className='w-5 h-5 text-green-600' />
            </div>
            <div>
              <p className='font-medium text-sm text-gray-900'>Conexões</p>
              <p className='text-xs text-gray-500'>YouTube • IG • TikTok</p>
            </div>
          </div>
        </Link>
        <Link href='/dashboard/queue' className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition group'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition'>
              <FileText className='w-5 h-5 text-amber-600' />
            </div>
            <div>
              <p className='font-medium text-sm text-gray-900'>Rascunhos</p>
              <p className='text-xs text-gray-500'>{draftCount} na fila</p>
            </div>
          </div>
        </Link>
        <Link href='/dashboard/calendar' className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition group'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition'>
              <Calendar className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <p className='font-medium text-sm text-gray-900'>Calendário</p>
              <p className='text-xs text-gray-500'>Agendar posts</p>
            </div>
          </div>
        </Link>
        <Link href='/dashboard/settings' className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition group'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition'>
              <Settings className='w-5 h-5 text-gray-600' />
            </div>
            <div>
              <p className='font-medium text-sm text-gray-900'>Configurações</p>
              <p className='text-xs text-gray-500'>Marca e IA</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Connection Status Detail */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8'>
        <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
          <Link2 className='w-5 h-5 text-purple-500' /> Status das Conexões
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {[
            { name: 'Instagram', icon: Instagram, conn: igConn, health: igHealth, bg: 'from-pink-500 to-orange-500', api: 'Graph API v19' },
            { name: 'YouTube', icon: Youtube, conn: ytConn, health: ytHealth, bg: 'from-red-500 to-red-700', api: 'Data API v3' },
            { name: 'TikTok', icon: Music, conn: ttConn, health: ttHealth, bg: 'from-cyan-500 to-black', api: 'Content Posting API' },
          ].map(({ name, icon: Icon, conn, health, bg, api }) => (
            <div key={name} className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
              <div className={`w-10 h-10 bg-gradient-to-br ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className='w-5 h-5 text-white' />
              </div>
              <div className='flex-1'>
                <p className='font-medium text-sm text-gray-900'>{name}</p>
                <p className='text-xs text-gray-500'>{api}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                health.status === 'ok' ? 'bg-green-100 text-green-700' :
                health.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                conn ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {health.status === 'ok' && <CheckCircle className='w-3 h-3 inline mr-1' />}
                {health.status === 'warning' && <AlertTriangle className='w-3 h-3 inline mr-1' />}
                {health.status === 'expired' && !conn && <AlertCircle className='w-3 h-3 inline mr-1' />}
                {health.label}
              </span>
            </div>
          ))}
        </div>
        <div className='mt-4 text-center'>
          <Link href='/dashboard/connections' className='text-purple-600 hover:text-purple-700 text-sm font-medium'>
            Configurar todas as conexões →
          </Link>
        </div>
      </div>

      {/* Features Overview */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8'>
        <h3 className='text-lg font-bold text-gray-900 mb-4'>✨ O Que Você Pode Fazer</h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100'>
            <div className='text-2xl mb-2'>🤖</div>
            <h4 className='font-bold text-purple-700 text-sm mb-1'>Geração com IA</h4>
            <p className='text-xs text-purple-600'>Gemini cria roteiros, legendas, hashtags e mais automaticamente</p>
          </div>
          <div className='bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100'>
            <div className='text-2xl mb-2'>🎬</div>
            <h4 className='font-bold text-blue-700 text-sm mb-1'>Produção Automática</h4>
            <p className='text-xs text-blue-600'>Corte de vídeos, narração TTS, legendas e thumbnails</p>
          </div>
          <div className='bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100'>
            <div className='text-2xl mb-2'>📤</div>
            <h4 className='font-bold text-green-700 text-sm mb-1'>Publicação Multiplataforma</h4>
            <p className='text-xs text-green-600'>YouTube, Instagram e TikTok com agendamento inteligente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
