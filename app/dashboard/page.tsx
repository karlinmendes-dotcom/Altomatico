'use client'
import React from 'react'
import Link from 'next/link'
import { Instagram, Youtube, Music, ArrowRight, Zap, Image, Video, Calendar, Settings, Link2, CheckCircle, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  // Fallback data - funciona mesmo sem Convex
  const stats = {
    totalContents: 0,
    instagram: 0,
    youtube: 0,
    tiktok: 0,
    published: 0,
    scheduled: 0,
    inProgress: 0,
  }

  const recentActivities: Array<{
    id: string
    platform: string
    title: string
    status: string
    date: string
  }> = []

  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    idea: { label: 'Ideia', color: 'bg-yellow-100 text-yellow-700', icon: '💡' },
    research: { label: 'Pesquisa', color: 'bg-blue-100 text-blue-700', icon: '🔍' },
    strategy: { label: 'Estratégia', color: 'bg-purple-100 text-purple-700', icon: '📋' },
    script: { label: 'Roteiro', color: 'bg-indigo-100 text-indigo-700', icon: '📝' },
    production: { label: 'Produção', color: 'bg-orange-100 text-orange-700', icon: '🎬' },
    review: { label: 'Revisão', color: 'bg-yellow-100 text-yellow-700', icon: '👁️' },
    approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: '✅' },
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

      {/* Quick Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8'>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0'>
              <Zap className='w-5 h-5 text-purple-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{stats.totalContents}</p>
              <p className='text-xs text-gray-500'>Total</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center shrink-0'>
              <Image className='w-5 h-5 text-pink-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{stats.instagram}</p>
              <p className='text-xs text-gray-500'>Instagram</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0'>
              <Video className='w-5 h-5 text-red-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{stats.youtube}</p>
              <p className='text-xs text-gray-500'>YouTube</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0'>
              <Music className='w-5 h-5 text-cyan-600' />
            </div>
            <div>
              <p className='text-xl md:text-2xl font-bold text-gray-900'>{stats.tiktok}</p>
              <p className='text-xs text-gray-500'>TikTok</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className='grid md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        {/* Instagram Card */}
        <Link href='/dashboard/instagram'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group h-full'>
            <div className='flex items-start justify-between mb-4 md:mb-6'>
              <div className='w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Instagram className='w-7 h-7 md:w-8 md:h-8 text-white' />
              </div>
              <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-pink-500 transition group-hover:translate-x-1' />
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

        {/* YouTube Card */}
        <Link href='/dashboard/youtube'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group h-full'>
            <div className='flex items-start justify-between mb-4 md:mb-6'>
              <div className='w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Youtube className='w-7 h-7 md:w-8 md:h-8 text-white' />
              </div>
              <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-red-500 transition group-hover:translate-x-1' />
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

        {/* TikTok Card */}
        <Link href='/dashboard/tiktok'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group h-full'>
            <div className='flex items-start justify-between mb-4 md:mb-6'>
              <div className='w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-cyan-500 to-black rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Music className='w-7 h-7 md:w-8 md:h-8 text-white' />
              </div>
              <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-cyan-500 transition group-hover:translate-x-1' />
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
        <Link href='/dashboard/history' className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition group'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition'>
              <svg className='w-5 h-5 text-purple-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
            </div>
            <div>
              <p className='font-medium text-sm text-gray-900'>Histórico</p>
              <p className='text-xs text-gray-500'>Conteúdos anteriores</p>
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

      {/* Connection Status */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8'>
        <h3 className='text-lg font-bold text-gray-900 mb-4 flex items-center gap-2'>
          <Link2 className='w-5 h-5 text-purple-500' /> Status das Conexões
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
            <div className='w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center'>
              <Instagram className='w-5 h-5 text-white' />
            </div>
            <div className='flex-1'>
              <p className='font-medium text-sm text-gray-900'>Instagram</p>
              <p className='text-xs text-gray-500'>Graph API v19</p>
            </div>
            <span className='px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500'>
              Configurar
            </span>
          </div>
          <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
            <div className='w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center'>
              <Youtube className='w-5 h-5 text-white' />
            </div>
            <div className='flex-1'>
              <p className='font-medium text-sm text-gray-900'>YouTube</p>
              <p className='text-xs text-gray-500'>Data API v3</p>
            </div>
            <span className='px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500'>
              Configurar
            </span>
          </div>
          <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
            <div className='w-10 h-10 bg-gradient-to-br from-cyan-500 to-black rounded-xl flex items-center justify-center'>
              <Music className='w-5 h-5 text-white' />
            </div>
            <div className='flex-1'>
              <p className='font-medium text-sm text-gray-900'>TikTok</p>
              <p className='text-xs text-gray-500'>Content Posting API</p>
            </div>
            <span className='px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500'>
              Configurar
            </span>
          </div>
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

      {/* Recent Activity */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
        <h3 className='text-lg font-bold text-gray-900 mb-4'>Atividade Recente</h3>
        {recentActivities.length === 0 ? (
          <div className='text-center py-12 text-gray-400'>
            <Zap className='w-12 h-12 mx-auto mb-3 opacity-50' />
            <p className='font-medium'>Nenhuma atividade ainda</p>
            <p className='text-sm mt-1'>Comece gerando conteúdo para ver aqui</p>
            <div className='mt-4 flex gap-3 justify-center'>
              <Link href='/dashboard/instagram' className='bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition'>
                📸 Criar para Instagram
              </Link>
              <Link href='/dashboard/youtube' className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition'>
                🎬 Criar para YouTube
              </Link>
              <Link href='/dashboard/tiktok' className='bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition'>
                🎵 Criar para TikTok
              </Link>
            </div>
          </div>
        ) : (
          <div className='space-y-3'>
            {recentActivities.map((item) => (
              <div key={item.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <span className='text-lg'>
                    {item.platform === 'youtube' ? '🎬' : item.platform === 'tiktok' ? '🎵' : '📸'}
                  </span>
                  <div>
                    <p className='font-medium text-sm text-gray-900'>{item.title}</p>
                    <p className='text-xs text-gray-500'>{item.date}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[item.status]?.color ?? 'bg-gray-100 text-gray-700'}`}>
                  {statusLabels[item.status]?.icon} {statusLabels[item.status]?.label ?? item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
