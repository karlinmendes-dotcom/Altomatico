'use client'
import React, { useState, useEffect } from 'react'
import { Youtube, Instagram, CheckCircle, AlertCircle, Link2, Unlink, Zap, Key, ExternalLink, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export default function ConnectionsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const settings = useQuery(api.settings.getDefault)
  const getYoutubeAuthUrl = useAction(api.youtubeEngine.getYoutubeAuthUrl)
  const exchangeCode = useAction(api.youtubeEngine.exchangeCodeForTokens)
  const disconnectYoutube = useMutation(api.youtubeEngine.disconnectYoutube)
  const saveYoutubeManual = useMutation(api.youtubeEngine.saveYoutubeConnection)

  const youtubeConnected = settings?.youtubeConnected ?? false
  const youtubeChannelName = settings?.youtubeChannelName ?? ''
  const youtubeChannelId = settings?.youtubeChannelId ?? ''
  const instagramConnected = settings?.instagramConnected ?? false
  const instagramUsername = settings?.instagramUsername ?? ''

  // Verificar se voltou do OAuth (tem ?code= na URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const platform = params.get('platform')

    if (code && platform === 'youtube') {
      setLoading('youtube')
      const redirectUri = window.location.origin + '/dashboard/connections?platform=youtube'
      exchangeCode({ code, redirectUri })
        .then((result) => {
          setMessage({ type: 'success', text: `YouTube conectado! Canal: ${(result as unknown as Record<string, string>).channelName}` })
          // Limpar URL
          window.history.replaceState({}, '', '/dashboard/connections')
        })
        .catch((err) => {
          setMessage({ type: 'error', text: `Erro ao conectar YouTube: ${err}` })
        })
        .finally(() => setLoading(null))
    }
  }, [exchangeCode])

  // ─── YouTube ────────────────────────────────────────────────

  const handleConnectYouTube = async () => {
    setLoading('youtube')
    setMessage(null)
    try {
      const redirectUri = window.location.origin + '/dashboard/connections?platform=youtube'
      const result = await getYoutubeAuthUrl({ redirectUri })
      window.location.href = (result as Record<string, string>).authUrl
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err}` })
      setLoading(null)
    }
  }

  const handleConnectYouTubeManual = async () => {
    const channelId = prompt('Cole o ID do seu canal YouTube:\n(Encontre em https://youtube.com/account_advanced)')
    if (!channelId) return
    const channelName = prompt('Nome do canal:')
    if (!channelName) return

    setLoading('youtube')
    try {
      await saveYoutubeManual({ channelId, channelName })
      setMessage({ type: 'success', text: `YouTube conectado: ${channelName}` })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err}` })
    } finally {
      setLoading(null)
    }
  }

  const handleDisconnectYouTube = async () => {
    if (!confirm('Desconectar YouTube?')) return
    setLoading('youtube')
    try {
      await disconnectYoutube()
      setMessage({ type: 'success', text: 'YouTube desconectado' })
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err}` })
    } finally {
      setLoading(null)
    }
  }

  // ─── Instagram ──────────────────────────────────────────────

  const handleConnectInstagram = () => {
    setMessage({
      type: 'success',
      text: 'Para conectar o Instagram, você precisa criar um App no Meta for Developers (developers.facebook.com) → Criar App → tipo "Business" → adicionar produto "Instagram Graph API" → gerar token de acesso. Depois me envie o token que eu configuro aqui.'
    })
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-gray-900'>Conexões</h1>
        <p className='text-gray-500 text-sm mt-1'>Conecte suas contas para publicação automática</p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className='w-5 h-5 shrink-0 mt-0.5' />
            : <AlertCircle className='w-5 h-5 shrink-0 mt-0.5' />
          }
          <span className='text-sm flex-1'>{message.text}</span>
          <button onClick={() => setMessage(null)} className='text-xs opacity-50 hover:opacity-100'>✕</button>
        </div>
      )}

      <div className='space-y-6 max-w-2xl'>
        {/* ═══ YOUTUBE ═══ */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center'>
              <Youtube className='w-7 h-7 text-white' />
            </div>
            <div className='flex-1'>
              <h2 className='text-lg font-bold text-gray-900'>YouTube</h2>
              <p className='text-sm text-gray-500'>Upload e publicação automática de vídeos</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              youtubeConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {youtubeConnected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
              {youtubeConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>

          {youtubeConnected ? (
            <div>
              <div className='bg-green-50 rounded-xl p-3 mb-4'>
                <p className='text-sm text-green-700 font-medium'>📡 {youtubeChannelName}</p>
                <p className='text-xs text-green-600 mt-1'>ID: {youtubeChannelId}</p>
              </div>
              <Button
                onClick={handleDisconnectYouTube}
                disabled={loading === 'youtube'}
                variant='outline'
                className='w-full text-red-600 border-red-200 hover:bg-red-50'
              >
                <Unlink className='w-4 h-4 mr-2' /> Desconectar YouTube
              </Button>
            </div>
          ) : (
            <div className='space-y-3'>
              <Button
                onClick={handleConnectYouTube}
                disabled={loading === 'youtube'}
                className='w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
              >
                {loading === 'youtube' ? (
                  <span className='animate-pulse'>Conectando...</span>
                ) : (
                  <>
                    <Link2 className='w-4 h-4 mr-2' />
                    Conectar com Google (OAuth)
                    <ExternalLink className='w-3 h-3 ml-2 opacity-50' />
                  </>
                )}
              </Button>
              <Button
                onClick={handleConnectYouTubeManual}
                disabled={loading === 'youtube'}
                variant='outline'
                className='w-full'
              >
                Conectar manualmente (por Channel ID)
              </Button>
              <p className='text-xs text-gray-400 text-center'>
                OAuth abre a tela de login do Google. Você autoriza e o canal é conectado automaticamente.
              </p>
            </div>
          )}
        </div>

        {/* ═══ INSTAGRAM ═══ */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='w-14 h-14 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center'>
              <Instagram className='w-7 h-7 text-white' />
            </div>
            <div className='flex-1'>
              <h2 className='text-lg font-bold text-gray-900'>Instagram</h2>
              <p className='text-sm text-gray-500'>Postagem automática de Reels e Posts</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              instagramConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {instagramConnected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
              {instagramConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>

          {instagramConnected ? (
            <div>
              <div className='bg-green-50 rounded-xl p-3 mb-4'>
                <p className='text-sm text-green-700 font-medium'>📸 @{instagramUsername}</p>
              </div>
              <Button
                onClick={() => setMessage({ type: 'success', text: 'Para desconectar, remova o token no Convex Dashboard.' })}
                variant='outline'
                className='w-full text-red-600 border-red-200 hover:bg-red-50'
              >
                <Unlink className='w-4 h-4 mr-2' /> Gerenciar Conexão
              </Button>
            </div>
          ) : (
            <div className='space-y-3'>
              <Button
                onClick={handleConnectInstagram}
                className='w-full bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white'
              >
                <Link2 className='w-4 h-4 mr-2' />
                Como conectar o Instagram
                <ArrowRight className='w-4 h-4 ml-2' />
              </Button>
              <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700'>
                <p className='font-medium mb-2'>📋 O que você precisa criar:</p>
                <ol className='list-decimal list-inside space-y-1 text-xs'>
                  <li>Acesse <a href='https://developers.facebook.com' target='_blank' className='underline'>developers.facebook.com</a></li>
                  <li>Clique em <strong>&quot;Criar um novo app&quot;</strong></li>
                  <li>Escolha tipo <strong>&quot;Business&quot;</strong></li>
                  <li>Adicione o produto <strong>&quot;Instagram Graph API&quot;</strong></li>
                  <li>Vá em Configurações Básicas → copie <strong>App ID</strong> e <strong>App Secret</strong></li>
                  <li>Gere um <strong>Token de Acesso</strong> (de teste primeiro)</li>
                  <li>Me envie: App ID, App Secret e Token</li>
                </ol>
                <p className='mt-3 text-xs'>Quando tiver as chaves, eu configuro tudo no Convex para você.</p>
              </div>
            </div>
          )}
        </div>

        {/* ═══ STATUS DOS SERVIÇOS ═══ */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <h3 className='font-bold text-gray-900 mb-4'>Serviços Configurados</h3>
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-blue-50 rounded-xl p-3'>
              <div className='flex items-center gap-2 mb-1'>
                <Zap className='w-4 h-4 text-blue-600' />
                <span className='text-sm font-medium text-blue-700'>Gemini AI</span>
              </div>
              <p className='text-xs text-blue-600'>7 chaves • 2 modelos</p>
              <p className='text-xs text-green-600 mt-1'>✅ Configurado no Convex</p>
            </div>
            <div className='bg-green-50 rounded-xl p-3'>
              <div className='flex items-center gap-2 mb-1'>
                <Key className='w-4 h-4 text-green-600' />
                <span className='text-sm font-medium text-green-700'>Pixabay</span>
              </div>
              <p className='text-xs text-green-600'>Vídeos + Imagens + Músicas</p>
              <p className='text-xs text-green-600 mt-1'>✅ Configurado no Convex</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
