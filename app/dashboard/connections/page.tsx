'use client'
import React, { useState, useEffect } from 'react'
import { Youtube, Instagram, Music, CheckCircle, AlertCircle, RefreshCw, Link2, Unlink, Zap, Shield, Key, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useSearchParams } from 'next/navigation'

interface ConnectionStatus {
  youtube: { connected: boolean; channelName?: string; channelId?: string }
  instagram: { connected: boolean; username?: string; accountId?: string }
  tiktok: { connected: boolean; displayName?: string; openId?: string }
  gemini: { configured: boolean; keyCount: number }
  pixabay: { configured: boolean }
}

export default function ConnectionsPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<ConnectionStatus>({
    youtube: { connected: false },
    instagram: { connected: false },
    tiktok: { connected: false },
    gemini: { configured: false, keyCount: 0 },
    pixabay: { configured: false },
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showIgToken, setShowIgToken] = useState(false)
  const [igManualToken, setIgManualToken] = useState('')
  const [igManualPageId, setIgManualPageId] = useState('')
  const [igManualAccountId, setIgManualAccountId] = useState('')
  const [igManualUsername, setIgManualUsername] = useState('')

  const settings = useQuery(api.settings.getDefault)
  const saveYoutubeConnection = useMutation(api.youtubeEngine.saveYoutubeConnection)
  const disconnectYoutube = useMutation(api.youtubeEngine.disconnectYoutube)
  const saveInstagramTokens = useMutation(api.connections.saveInstagramTokens)
  const disconnectInstagram = useMutation(api.connections.disconnect)
  const getYoutubeAuthUrl = useAction(api.youtubeEngine.getYoutubeAuthUrl)
  const getInstagramAuthUrl = useAction(api.instagramEngine.getInstagramAuthUrl)
  const testInstagramToken = useAction(api.instagramConnection.testInstagramToken)
  const getTiktokAuthUrl = useAction(api.tiktokConnection.getTiktokAuthUrl)
  const testTiktokToken = useAction(api.tiktokConnection.testTiktokToken)
  const saveTiktokConnection = useAction(api.tiktokConnection.saveTiktokConnection)
  const disconnectTiktok = useMutation(api.connections.disconnect)
  const [tiktokToken, setTiktokToken] = useState('')
  const [showTtToken, setShowTtToken] = useState(false)
  const saveIgConnection = useAction(api.instagramConnection.saveInstagramConnection)
  const getChannelInfo = useAction(api.youtubeEngine.getChannelInfo)
  const createOrUpdate = useMutation(api.settings.createOrUpdate)

  // Processar OAuth callbacks via URL params
  useEffect(() => {
    // Instagram OAuth callback
    if (searchParams.get('instagram_connected') === 'true') {
      const token = searchParams.get('token') || ''
      const pageId = searchParams.get('page_id') || ''
      const pageToken = searchParams.get('page_token') || ''
      const igAccountId = searchParams.get('ig_account_id') || ''
      const igUsername = searchParams.get('ig_username') || ''
      const expiresAt = parseInt(searchParams.get('expires_at') || '0')

      if (token && igAccountId) {
        saveInstagramTokens({
          accessToken: token,
          expiresAt,
          facebookPageId: pageId,
          instagramAccountId: igAccountId,
          instagramUsername: igUsername,
        }).then(() => {
          createOrUpdate({
            userId: 'default',
            instagramConnected: true,
            instagramAccountId: igAccountId,
            instagramUsername: igUsername,
          })
          setStatus(prev => ({
            ...prev,
            instagram: { connected: true, username: igUsername, accountId: igAccountId },
          }))
          setMessage(`✅ Instagram conectado! @${igUsername}`)
        }).catch(err => {
          setMessage(`Erro ao salvar conexão Instagram: ${err}`)
        })
      }
      // Limpar params da URL
      window.history.replaceState({}, '', '/dashboard/connections')
    }

    // YouTube OAuth callback
    if (searchParams.get('youtube_connected') === 'true') {
      const token = searchParams.get('token') || ''
      const channelId = searchParams.get('channel_id') || ''
      const channelName = searchParams.get('channel_name') || ''
      const expiresAt = parseInt(searchParams.get('expires_at') || '0')

      if (token && channelId) {
        saveYoutubeConnection({
          channelId,
          channelName,
        }).then(() => {
          setStatus(prev => ({
            ...prev,
            youtube: { connected: true, channelName, channelId },
          }))
          setMessage(`✅ YouTube conectado! Canal: ${channelName}`)
        }).catch(err => {
          setMessage(`Erro ao salvar conexão YouTube: ${err}`)
        })
      }
      window.history.replaceState({}, '', '/dashboard/connections')
    }

    // Erros
    if (searchParams.get('instagram_error')) {
      setMessage(`❌ Instagram: ${searchParams.get('instagram_error')}`)
      window.history.replaceState({}, '', '/dashboard/connections')
    }
    // TikTok OAuth callback
    if (searchParams.get('tiktok_connected') === 'true') {
      const token = searchParams.get('token') || ''
      const refreshToken = searchParams.get('refresh_token') || ''
      const openId = searchParams.get('open_id') || ''
      const displayName = searchParams.get('display_name') || ''
      const expiresAt = parseInt(searchParams.get('expires_at') || '0')
      const refreshExpiresAt = parseInt(searchParams.get('refresh_expires_at') || '0')

      if (token && openId) {
        saveTiktokConnection({
          accessToken: token,
          refreshToken: refreshToken || undefined,
          openId,
          displayName,
          expiresAt,
          refreshExpiresAt,
        }).then(() => {
          setStatus(prev => ({
            ...prev,
            tiktok: { connected: true, displayName, openId },
          }))
          setMessage(`✅ TikTok conectado! @${displayName}`)
        }).catch((err: unknown) => {
          setMessage(`Erro ao salvar conexão TikTok: ${err}`)
        })
      }
      window.history.replaceState({}, '', '/dashboard/connections')
    }

    if (searchParams.get('youtube_error')) {
      setMessage(`❌ YouTube: ${searchParams.get('youtube_error')}`)
      window.history.replaceState({}, '', '/dashboard/connections')
    }
    if (searchParams.get('tiktok_error')) {
      setMessage(`❌ TikTok: ${searchParams.get('tiktok_error')}`)
      window.history.replaceState({}, '', '/dashboard/connections')
    }
  }, [searchParams, saveInstagramTokens, saveYoutubeConnection, saveTiktokConnection, createOrUpdate])

  // Verificar status das conexões
  useEffect(() => {
    if (settings) {
      setStatus(prev => ({
        ...prev,
        gemini: { configured: true, keyCount: 7 },
        pixabay: { configured: true },
        youtube: {
          connected: settings.youtubeConnected || false,
          channelName: settings.youtubeChannelName,
          channelId: settings.youtubeChannelId,
        },
        instagram: {
          connected: settings.instagramConnected || false,
          username: settings.instagramUsername,
          accountId: settings.instagramAccountId,
        },
        tiktok: {
          connected: false,
        },
      }))
    }
  }, [settings])

  // Conectar YouTube via OAuth
  const handleConnectYouTubeOAuth = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const redirectUri = window.location.origin + '/api/youtube/callback'
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

  // Conectar YouTube manualmente
  const handleConnectYouTubeManual = async () => {
    const channelId = prompt("Cole o ID do seu canal YouTube (ex: UC...):")
    if (!channelId) return
    const channelName = prompt("Nome do canal:")
    if (!channelName) return
    setLoading(true)
    try {
      await saveYoutubeConnection({ channelId, channelName })
      await createOrUpdate({ userId: 'default', youtubeConnected: true, youtubeChannelId: channelId, youtubeChannelName: channelName })
      setStatus(prev => ({ ...prev, youtube: { connected: true, channelName, channelId } }))
      setMessage("✅ YouTube conectado com sucesso!")
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
      await createOrUpdate({ userId: 'default', youtubeConnected: false, youtubeChannelId: undefined, youtubeChannelName: undefined })
      setStatus(prev => ({ ...prev, youtube: { connected: false } }))
      setMessage("YouTube desconectado.")
    } catch (err) {
      setMessage(`Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Conectar Instagram via OAuth
  const handleConnectInstagramOAuth = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const redirectUri = window.location.origin + '/api/instagram/callback'
      const result = await getInstagramAuthUrl({ redirectUri })
      if ((result as Record<string, string>).authUrl) {
        window.location.href = (result as Record<string, string>).authUrl
      }
    } catch (err) {
      setMessage(`Erro ao iniciar conexão Instagram: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Conectar Instagram com auto-detect
  const handleConnectInstagramAuto = async () => {
    if (!igManualToken) {
      setMessage('❌ Cole o Access Token do Facebook')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      // 1. Testar o token e detectar contas Instagram
      const testResult = await testInstagramToken({ accessToken: igManualToken }) as Record<string, unknown>
      const igAccounts = testResult.instagramAccounts as Array<{ pageId: string; pageName: string; igAccountId: string; igUsername: string }> || []

      if (!igAccounts || igAccounts.length === 0) {
        setMessage(`❌ ${testResult.message || 'Nenhuma conta Instagram Business encontrada. Verifique se sua conta é Business/Creator e está vinculada a uma Página do Facebook.'}`)
        setLoading(false)
        return
      }

      // 2. Usar a primeira conta encontrada
      const first = igAccounts[0]
      const saveResult = await saveIgConnection({
        accessToken: igManualToken,
        instagramAccountId: first.igAccountId,
        instagramUsername: first.igUsername,
        facebookPageId: first.pageId,
      }) as Record<string, unknown>

      setStatus(prev => ({
        ...prev,
        instagram: { connected: true, username: saveResult.username as string || first.igUsername, accountId: first.igAccountId },
      }))
      setMessage(`✅ Instagram conectado! @${saveResult.username || first.igUsername} (${saveResult.followers || 0} seguidores)`)
      setIgManualToken('')
    } catch (err) {
      setMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Desconectar Instagram
  const handleDisconnectInstagram = async () => {
    if (!confirm("Tem certeza que deseja desconectar o Instagram?")) return
    setLoading(true)
    try {
      await disconnectInstagram({ platform: 'instagram' })
      await createOrUpdate({ userId: 'default', instagramConnected: false, instagramAccountId: undefined, instagramUsername: undefined })
      setStatus(prev => ({ ...prev, instagram: { connected: false } }))
      setMessage("Instagram desconectado.")
    } catch (err) {
      setMessage(`Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Conectar TikTok via OAuth
  const handleConnectTiktokOAuth = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const redirectUri = window.location.origin + '/api/tiktok/callback'
      const result = await getTiktokAuthUrl({ redirectUri })
      if ((result as Record<string, string>).authUrl) {
        window.location.href = (result as Record<string, string>).authUrl
      }
    } catch (err) {
      setMessage(`Erro ao iniciar conexão TikTok: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Conectar TikTok com token manual
  const handleConnectTiktokManual = async () => {
    if (!tiktokToken) {
      setMessage('❌ Cole o Access Token do TikTok')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const testResult = await testTiktokToken({ accessToken: tiktokToken }) as Record<string, unknown>
      const expiresAt = Date.now() + 86400 * 1000 // 1 dia
      const refreshExpiresAt = Date.now() + 86400 * 30 * 1000 // 30 dias

      await saveTiktokConnection({
        accessToken: tiktokToken,
        openId: testResult.openId as string,
        displayName: testResult.displayName as string,
        avatarUrl: testResult.avatarUrl as string,
        followerCount: testResult.followerCount as number,
        expiresAt,
        refreshExpiresAt,
      })

      setStatus(prev => ({
        ...prev,
        tiktok: { connected: true, displayName: testResult.displayName as string, openId: testResult.openId as string },
      }))
      setMessage(`✅ TikTok conectado! @${testResult.displayName} (${testResult.followerCount || 0} seguidores)`)
      setTiktokToken('')
    } catch (err) {
      setMessage(`❌ Erro TikTok: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Desconectar TikTok
  const handleDisconnectTiktok = async () => {
    if (!confirm("Tem certeza que deseja desconectar o TikTok?")) return
    setLoading(true)
    try {
      await disconnectTiktok({ platform: 'tiktok' })
      setStatus(prev => ({ ...prev, tiktok: { connected: false } }))
      setMessage("TikTok desconectado.")
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
          message.includes('sucesso') || message.includes('Conectado') || message.includes('Encontrado') || message.includes('✅')
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.includes('sucesso') || message.includes('Encontrado') || message.includes('✅')
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
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center'>
                <Zap className='w-6 h-6 text-white' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900'>Gemini AI</h3>
                <p className='text-xs text-gray-500'>Inteligência artificial para criação de conteúdo</p>
              </div>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>
              <CheckCircle className='w-3.5 h-3.5' /> Configurado
            </div>
          </div>
          <div className='bg-gray-50 rounded-lg p-3'>
            <p className='text-xs text-gray-600'>Modelo: gemini-2.0-flash • API Key configurada ✅</p>
          </div>
        </div>

        {/* Pixabay */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center'>
                <Key className='w-6 h-6 text-white' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900'>Pixabay</h3>
                <p className='text-xs text-gray-500'>Vídeos, imagens e músicas 100% gratuitos</p>
              </div>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>
              <CheckCircle className='w-3.5 h-3.5' /> Configurado
            </div>
          </div>
          <div className='bg-gray-50 rounded-lg p-3'>
            <p className='text-xs text-gray-600'>API Key configurada • Acesso a milhões de mídias gratuitas ✅</p>
          </div>
        </div>

        {/* ═══ YOUTUBE ═══ */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center'>
                <Youtube className='w-6 h-6 text-white' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900'>YouTube</h3>
                <p className='text-xs text-gray-500'>Upload e publicação automática de vídeos</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              status.youtube.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {status.youtube.connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
              {status.youtube.connected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>

          {status.youtube.connected && status.youtube.channelName && (
            <div className='bg-gray-50 rounded-lg p-3 mb-4'>
              <p className='text-xs text-gray-600'>📺 Canal: <strong>{status.youtube.channelName}</strong></p>
              <p className='text-[10px] text-gray-400 mt-1'>ID: {status.youtube.channelId}</p>
            </div>
          )}

          <div className='flex gap-2'>
            {status.youtube.connected ? (
              <>
                <Button onClick={handleDisconnectYouTube} variant='outline' className='flex-1 text-red-600 border-red-200 hover:bg-red-50'>
                  <Unlink className='w-4 h-4 mr-2' /> Desconectar
                </Button>
                <Button onClick={handleCheckYouTube} variant='outline' className='flex-1'>
                  <RefreshCw className='w-4 h-4 mr-2' /> Verificar
                </Button>
              </>
            ) : (
              <div className='w-full space-y-2'>
                <Button onClick={handleConnectYouTubeOAuth} disabled={loading} className='w-full bg-red-600 hover:bg-red-700 text-white'>
                  <ExternalLink className='w-4 h-4 mr-2' /> Conectar via Google OAuth
                </Button>
                <Button onClick={handleConnectYouTubeManual} disabled={loading} variant='outline' className='w-full'>
                  <Link2 className='w-4 h-4 mr-2' /> Conectar manualmente (Channel ID)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ INSTAGRAM ═══ */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center'>
                <Instagram className='w-6 h-6 text-white' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900'>Instagram</h3>
                <p className='text-xs text-gray-500'>Postagem automática de Reels e Posts</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              status.instagram.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {status.instagram.connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
              {status.instagram.connected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>

          {status.instagram.connected && status.instagram.username && (
            <div className='bg-gray-50 rounded-lg p-3 mb-4'>
              <p className='text-xs text-gray-600'>📸 Perfil: <strong>@{status.instagram.username}</strong></p>
              <p className='text-[10px] text-gray-400 mt-1'>ID: {status.instagram.accountId}</p>
            </div>
          )}

          {status.instagram.connected ? (
            <div className='flex gap-2'>
              <Button onClick={handleDisconnectInstagram} variant='outline' className='flex-1 text-red-600 border-red-200 hover:bg-red-50'>
                <Unlink className='w-4 h-4 mr-2' /> Desconectar
              </Button>
            </div>
          ) : (
            <div className='space-y-3'>
              {/* OAuth */}
              <Button onClick={handleConnectInstagramOAuth} disabled={loading} className='w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white'>
                <ExternalLink className='w-4 h-4 mr-2' /> Conectar via Facebook OAuth
              </Button>

              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-200' />
                </div>
                <div className='relative flex justify-center text-xs'>
                  <span className='bg-white px-2 text-gray-400'>ou conecte manualmente</span>
                </div>
              </div>

              {/* Token input + auto-detect */}
              <div className='space-y-2'>
                <div>
                  <label className='block text-xs font-medium text-gray-600 mb-1'>Facebook Access Token *</label>
                  <div className='relative'>
                    <Input
                      type={showIgToken ? 'text' : 'password'}
                      placeholder='Cole o Long-lived Access Token'
                      value={igManualToken}
                      onChange={e => setIgManualToken(e.target.value)}
                      className='text-xs pr-8'
                    />
                    <button
                      type='button'
                      onClick={() => setShowIgToken(!showIgToken)}
                      className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                    >
                      {showIgToken ? <EyeOff className='w-3.5 h-3.5' /> : <Eye className='w-3.5 h-3.5' />}
                    </button>
                  </div>
                  <p className='text-[10px] text-gray-400 mt-1'>O sistema detecta automaticamente sua conta Instagram vinculada</p>
                </div>
                <Button onClick={handleConnectInstagramAuto} disabled={loading || !igManualToken} className='w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white'>
                  {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
                  {loading ? 'Detectando conta...' : 'Conectar Instagram'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ TIKTOK ═══ */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8'>
        <div className='flex items-start justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-gradient-to-br from-cyan-500 to-black rounded-xl flex items-center justify-center'>
              <Music className='w-6 h-6 text-white' />
            </div>
            <div>
              <h3 className='font-bold text-gray-900'>TikTok</h3>
              <p className='text-xs text-gray-500'>Postagem automática de vídeos curtos</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            status.tiktok.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {status.tiktok.connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
            {status.tiktok.connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {status.tiktok.connected && status.tiktok.displayName && (
          <div className='bg-gray-50 rounded-lg p-3 mb-4'>
            <p className='text-xs text-gray-600'>🎵 Perfil: <strong>@{status.tiktok.displayName}</strong></p>
          </div>
        )}

        {status.tiktok.connected ? (
          <div className='flex gap-2'>
            <Button onClick={handleDisconnectTiktok} variant='outline' className='flex-1 text-red-600 border-red-200 hover:bg-red-50'>
              <Unlink className='w-4 h-4 mr-2' /> Desconectar
            </Button>
          </div>
        ) : (
          <div className='space-y-3'>
            <Button onClick={handleConnectTiktokOAuth} disabled={loading} className='w-full bg-gradient-to-r from-cyan-500 to-black hover:from-cyan-600 hover:to-gray-900 text-white'>
              <ExternalLink className='w-4 h-4 mr-2' /> Conectar via TikTok OAuth
            </Button>

            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-200' />
              </div>
              <div className='relative flex justify-center text-xs'>
                <span className='bg-white px-2 text-gray-400'>ou conecte com token</span>
              </div>
            </div>

            <div className='space-y-2'>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>TikTok Access Token</label>
                <div className='relative'>
                  <Input
                    type={showTtToken ? 'text' : 'password'}
                    placeholder='Cole o Access Token do TikTok'
                    value={tiktokToken}
                    onChange={e => setTiktokToken(e.target.value)}
                    className='text-xs pr-8'
                  />
                  <button
                    type='button'
                    onClick={() => setShowTtToken(!showTtToken)}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showTtToken ? <EyeOff className='w-3.5 h-3.5' /> : <Eye className='w-3.5 h-3.5' />}
                  </button>
                </div>
              </div>
              <Button onClick={handleConnectTiktokManual} disabled={loading || !tiktokToken} className='w-full' variant='outline'>
                {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
                {loading ? 'Conectando...' : 'Conectar TikTok'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Arquitetura */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
        <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
          <Shield className='w-5 h-5 text-purple-500' /> Arquitetura do Sistema
        </h3>
        <div className='grid md:grid-cols-3 gap-4'>
          <div className='bg-blue-50 rounded-xl p-4'>
            <h4 className='font-bold text-blue-700 text-sm mb-2'>🧠 Inteligência</h4>
            <ul className='text-xs text-blue-600 space-y-1'>
              <li>• Gemini 2.0 Flash</li>
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
              <li>• Legendas automáticas</li>
              <li>• Pipeline automatizado</li>
            </ul>
          </div>
          <div className='bg-purple-50 rounded-xl p-4'>
            <h4 className='font-bold text-purple-700 text-sm mb-2'>📤 Publicação</h4>
            <ul className='text-xs text-purple-600 space-y-1'>
              <li>• YouTube Data API v3</li>
              <li>• Instagram Graph API v19</li>
              <li>• Agendamento inteligente</li>
              <li>• Analytics + Aprendizado</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
