'use client'
import React from 'react'
import Link from 'next/link'
import { Instagram, Youtube, ArrowRight, Zap, Image, Video } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Olá, Karlyn! 👋</h1>
        <p className='text-gray-500 mt-1'>Escolha uma plataforma para começar a gerar conteúdo</p>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center'>
              <Zap className='w-5 h-5 text-purple-600' />
            </div>
            <div>
              <p className='text-2xl font-bold text-gray-900'>0</p>
              <p className='text-xs text-gray-500'>Posts Gerados</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center'>
              <Image className='w-5 h-5 text-pink-600' />
            </div>
            <div>
              <p className='text-2xl font-bold text-gray-900'>0</p>
              <p className='text-xs text-gray-500'>Instagram</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center'>
              <Video className='w-5 h-5 text-red-600' />
            </div>
            <div>
              <p className='text-2xl font-bold text-gray-900'>0</p>
              <p className='text-xs text-gray-500'>Vídeos YouTube</p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-xl p-4 border border-gray-100 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center'>
              <svg className='w-5 h-5 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' /></svg>
            </div>
            <div>
              <p className='text-2xl font-bold text-gray-900'>0</p>
              <p className='text-xs text-gray-500'>Publicados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className='grid md:grid-cols-2 gap-6 mb-8'>
        {/* Instagram Card */}
        <Link href='/dashboard/instagram'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group'>
            <div className='flex items-start justify-between mb-6'>
              <div className='w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Instagram className='w-8 h-8 text-white' />
              </div>
              <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-pink-500 transition group-hover:translate-x-1' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>Instagram</h2>
            <p className='text-gray-500 mb-6'>Gere posts, legendas e hashtags automaticamente com IA</p>
            <div className='flex flex-wrap gap-2'>
              <span className='bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium'>Posts</span>
              <span className='bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium'>Legendas</span>
              <span className='bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium'>Hashtags</span>
              <span className='bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium'>Agendamento</span>
            </div>
          </div>
        </Link>

        {/* YouTube Card */}
        <Link href='/dashboard/youtube'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group'>
            <div className='flex items-start justify-between mb-6'>
              <div className='w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition'>
                <Youtube className='w-8 h-8 text-white' />
              </div>
              <ArrowRight className='w-5 h-5 text-gray-300 group-hover:text-red-500 transition group-hover:translate-x-1' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>YouTube</h2>
            <p className='text-gray-500 mb-6'>Gere roteiros, corte vídeos e publique automaticamente</p>
            <div className='flex flex-wrap gap-2'>
              <span className='bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium'>Roteiros</span>
              <span className='bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium'>Narração</span>
              <span className='bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium'>Legendas</span>
              <span className='bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium'>Publicação</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
        <h3 className='text-lg font-bold text-gray-900 mb-4'>Atividade Recente</h3>
        <div className='text-center py-12 text-gray-400'>
          <Zap className='w-12 h-12 mx-auto mb-3 opacity-50' />
          <p>Nenhuma atividade ainda</p>
          <p className='text-sm mt-1'>Comece gerando conteúdo para ver aqui</p>
        </div>
      </div>
    </div>
  )
}
