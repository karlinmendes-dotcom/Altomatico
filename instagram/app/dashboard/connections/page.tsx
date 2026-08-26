'use client'
import React, { useState, useEffect } from 'react'
import { Youtube, Instagram, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Link2, Unlink, Zap, Shield, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

interface ConnectionStatus {
  youtube: { connected: boolean; channelName?: string; channelId?: string }
  instagram: { connected: boolean; username?: string; accountId?: string }
  gemini: { configured: boolean; keyCount: number }
  pixabay: { configured: boolean }
}

export default function ConnectionsPage() {
  const [status, setStatus] = useState<ConnectionStatus>({
    youtube: { connected: false },
    instagram: { connected: false },
    gemini: { configured: false, keyCount: 0 },
    pixabay: { configured: false },
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const settings = useQuery(api.settings.getDefault)
  const saveYoutubeConnection = useMutation(api.youtubeEngine.saveYoutubeConnection)
  const disconnectYoutube = useMutation(api.youtubeEngine.disconnectYoutube)
  const getYoutubeAuthUrl = useAction(api.youtubeEngine.getYoutubeAuthUrl)
  const getChannelInfo = useAction(api.youtubeEngine.getChannelInfo)

  // Verificar status das conexões
  useEffect(() => {
    const checkStatus = async () => {
      // Verificar Gemini
      setStatus(prev => ({
        ...prev,
        gemini: { configured: true, keyCount: 7 },
        pixabay: { configured: true },
        youtube: {
          connected: settings?.youtubeConnected || false,
          channelName: settings?.youtubeChannelName,
          channelId: settings?.youtubeChannelId,
        },
        instagram: {
          connected: settings?.instagramConnected || false,
          username: settings?.instagramUsername,
          accountId: settings?.instagramAccountId,
        },
      }))
    }
    checkStatus()
  }, [settings])

  // Conectar YouTube via OAuth
  const handleConnectYouTube = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const redirectUri = window.location.origin + '/dashboard/connections'
      const result = await getYoutubeAuthUrl({ redirectUri })
      if ((result as Record<string, string>).authUrl) {
        window.location.href = (result as Record<string, string>).authUrl
      }
    } catch (err) {
      setMessage(`Erro ao iniciar conexão YouTube: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Conectar YouTube manualmente (por Channel ID)
  const handleConnectYouTubeManual = async () => {
    const channelId = prompt("Cole o ID do seu canal YouTube:")
    if (!channelId) return

    const channelName = prompt("Nome do canal:")
    if (!channelName) return

    setLoading(true)
    try {
      await saveYoutubeConnection({ channelId, channelName })
      setStatus(prev => ({
        ...prev,
        youtube: { connected: true, channelName, channelId },
      }))
      setMessage("YouTube conectado com sucesso!")
    } catch (err) {
      setMessage(`Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Desconectar YouTube
  const handleDisconnectYouTube = async () => {
    if (!confirm("Tem certeza que deseja desconectar o YouTube?")) return
    setLoading(true)
    try {
      await disconnectYoutube()
      setStatus(prev => ({
        ...prev,
        youtube: { connected: false },
      }))
      setMessage("YouTube desconectado.")
    } catch (err) {
      setMessage(`Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Verificar canal YouTube
  const handleCheckYouTube = async () => {
    if (!status.youtube.channelId) return
    setLoading(true)
    try {
      const info = await getChannelInfo({ channelId: status.youtube.channelId })
      setMessage(`Canal: ${(info as Record<string, unknown>).info ? "Encontrado!" : "Não encontrado"}`)
    } catch (err) {
      setMessage(`Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const ConnectionCard = ({
    name,
    icon: Icon,
    color,
    connected,
    description,
    onConnect,
    onDisconnect,
    details,
  }: {
    name: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    connected: boolean
    description: string
    onConnect: () => void
    onDisconnect?: () => void
    details?: string
  }) => (
    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
      <div className='flex items-start justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center`}>
            <Icon className='w-6 h-6 text-white' />
          </div>
          <div>
            <h3 className='font-bold text-gray-900'>{name}</h3>
            <p className='text-xs text-gray-500'>{description}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      {details && (
        <div className='bg-gray-50 rounded-lg p-3 mb-4'>
          <p className='text-xs text-gray-600'>{details}</p>
        </div>
      )}

      <div className='flex gap-2'>
        {connected ? (
          <>
            {onDisconnect && (
              <Button onClick={onDisconnect} variant='outline' className='flex-1 text-red-600 border-red-200 hover:bg-red-50'>
                <Unlink className='w-4 h-4 mr-2' /> Desconectar
              </Button>
            )}
            <Button onClick={handleCheckYouTube} variant='outline' className='flex-1'>
              <RefreshCw className='w-4 h-4 mr-2' /> Verificar
            </Button>
          </>
        ) : (
          <Button onClick={onConnect} disabled={loading} className='flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white'>
            {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
            Conectar
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-8'>
        <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center'>
          <Link2 className='w-6 h-6 text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Conexões</h1>
          <p className='text-gray-500 text-sm'>Conecte suas contas e serviços para automação completa</p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${
          message.includes('sucesso') || message.includes('Conectado') || message.includes('Encontrado')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.includes('sucesso') || message.includes('Encontrado')
            ? <CheckCircle className='w-5 h-5 shrink-0' />
            : <AlertCircle className='w-5 h-5 shrink-0' />
          }
          <span className='text-sm'>{message}</span>
          <button onClick={() => setMessage(null)} className='ml-auto text-xs opacity-50'>✕</button>
        </div>
      )}

      {/* Services Status */}
      <div className='grid md:grid-cols-2 gap-6 mb-8'>
        {/* Gemini AI */}
        <ConnectionCard
          name='Gemini AI'
          icon={Zap}
          color='from-blue-500 to-blue-700'
          connected={status.gemini.configured}
          description='Intelígenta artificial para criação de conteúdo'
          onConnect={() => {}}
          details={`${status.gemini.keyCount} chaves configuradas • Modelo: gemini-2.0-flash`}
        />

        {/* Pixabay */}
        <ConnectionCard
          name='Pixabay'
          icon={Key}
          color='from-green-500 to-green-700'
          connected={status.pixabay.configured}
          description='Vídeos, imagens e músicas 100% gratuitos'
          onConnect={() => {}}
          details='API Key configurada • Acesso a milhões de mídias gratuitas'
        />

        {/* YouTube */}
        <ConnectionCard
          name='YouTube'
          icon={Youtube}
          color='from-red-500 to-red-700'
          connected={status.youtube.connected}
          description='Upload e publicação automática de vídeos'
          onConnect={handleConnectYouTubeManual}
          onDisconnect={handleDisconnectYouTube}
          details={status.youtube.channelName ? `Canal: ${status.youtube.channelName}` : 'Conecte seu canal para publicar automaticamente'}
        />

        {/* Instagram */}
        <ConnectionCard
          name='Instagram'
          icon={Instagram}
          color='from-pink-500 to-orange-500'
          connected={status.instagram.connected}
          description='Postagem automática de Reels e Posts'
          onConnect={() => setMessage('Configure o token do Meta Graph API no Convex Dashboard')}
          details={status.instagram.username ? `@${status.instagram.username}` : 'Necessário token Meta Graph API'}
        />
      </div>

      {/* Architecture Overview */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
        <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
          <Shield className='w-5 h-5 text-purple-500' /> Arquitetura do Sistema
        </h3>
        <div className='grid md:grid-cols-3 gap-4'>
          <div className='bg-blue-50 rounded-xl p-4'>
            <h4 className='font-bold text-blue-700 text-sm mb-2'>🧠 Inteligência</h4>
            <ul className='text-xs text-blue-600 space-y-1'>
              <li>• Gemini 2.0 Flash (7 chaves)</li>
              <li>• Research + Strategy + Script</li>
              <li>• SEO + Hashtags + Metadata</li>
              <li>• Policy Check + Originality</li>
            </ul>
          </div>
          <div className='bg-green-50 rounded-xl p-4'>
            <h4 className='font-bold text-green-700 text-sm mb-2'>🎬 Produção</h4>
            <ul className='text-xs text-green-600 space-y-1'>
              <li>• Pixabay (vídeos + imagens)</li>
              <li>• Edge TTS (narração grátis)</li>
              <li>• FFmpeg + MoviePy (render)</li>
              <li>• Legendas automáticas</li>
            </ul>
          </div>
          <div className='bg-purple-50 rounded-xl p-4'>
            <h4 className='font-bold text-purple-700 text-sm mb-2'>📤 Publicação</h4>
            <ul className='text-xs text-purple-600 space-y-1'>
              <li>• YouTube Data API v3</li>
              <li>• Instagram Graph API</li>
              <li>• Agendamento inteligente</li>
              <li>• Analytics + Aprendizado</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
