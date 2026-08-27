'use client'
import React, { useState, useEffect } from 'react'
import { Youtube, Instagram, Music, CheckCircle, AlertCircle, RefreshCw, Link2, Unlink, Zap, Shield, Key, Eye, EyeOff, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface ConnectionStatus {
  youtube: { connected: boolean; channelName?: string; channelId?: string }
  instagram: { connected: boolean; username?: string; accountId?: string }
  tiktok: { connected: boolean; displayName?: string; openId?: string }
}

export default function ConnectionsPage() {
  const [status, setStatus] = useState<ConnectionStatus>({
    youtube: { connected: false },
    instagram: { connected: false },
    tiktok: { connected: false },
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // YouTube state
  const [ytChannelId, setYtChannelId] = useState('')
  const [ytChannelName, setYtChannelName] = useState('')
  const [showYtId, setShowYtId] = useState(false)

  // Instagram state
  const [igToken, setIgToken] = useState('')
  const [showIgToken, setShowIgToken] = useState(false)

  // TikTok state
  const [ttToken, setTtToken] = useState('')
  const [showTtToken, setShowTtToken] = useState(false)

  const settings = useQuery(api.settings.getDefault)
  const saveYoutubeConnection = useMutation(api.youtubeEngine.saveYoutubeConnection)
  const disconnectYoutube = useMutation(api.youtubeEngine.disconnectYoutube)
  const saveInstagramTokens = useMutation(api.connections.saveInstagramTokens)
  const disconnectInstagram = useMutation(api.connections.disconnect)
  const testInstagramToken = useAction(api.instagramConnection.testInstagramToken)
  const saveIgConnection = useAction(api.instagramConnection.saveInstagramConnection)
  const testTiktokToken = useAction(api.tiktokConnection.testTiktokToken)
  const saveTiktokConnection = useAction(api.tiktokConnection.saveTiktokConnection)
  const disconnectTiktok = useMutation(api.connections.disconnect)
  const createOrUpdate = useMutation(api.settings.createOrUpdate)
  const getChannelInfo = useAction(api.youtubeEngine.getChannelInfo)

  // Load saved connections
  useEffect(() => {
    if (settings) {
      setStatus({
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
        tiktok: { connected: false },
      })
    }
  }, [settings])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 8000)
  }

  // ═══════════════════════════════════════════════════════════
  // YOUTUBE — Conectar com Channel ID + Buscar automático
  // ═══════════════════════════════════════════════════════════
  const handleSearchYouTube = async () => {
    if (!ytChannelId.trim()) {
      showMessage('❌ Digite algo para buscar (nome do canal ou URL)')
      return
    }
    setLoading(true)
    try {
      let channelId = ytChannelId.trim()
      // Se colou URL do YouTube, extrair o ID
      if (channelId.includes('youtube.com/') || channelId.includes('youtu.be/')) {
        const match = channelId.match(/channel\/(UC[\w-]+)/) || channelId.match(/@(\w+)/)
        if (match) channelId = match[1]
      }
      // Se colocou @username, buscar pelo YouTube Data API
      if (channelId.startsWith('@')) {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelId)}&type=channel&maxResults=1&key=AIzaSyBSRF3ybNlllWKDAT1RC9tt5gEUXWiyqyc`
        const res = await fetch(searchUrl)
        const data = await res.json()
        const item = data.items?.[0]
        if (item) {
          channelId = item.id.channelId
          setYtChannelName(item.snippet.title)
        } else {
          showMessage('❌ Canal não encontrado. Tente copiar o URL completo do canal.')
          setLoading(false)
          return
        }
      }
      // Buscar info do canal
      const info = await getChannelInfo({ channelId }) as Record<string, unknown>
      const infoData = info.info as Record<string, unknown> | undefined
      if (infoData) {
        const name = infoData.title as string || channelId
        setYtChannelName(name)
        setYtChannelId(channelId)
        showMessage(`📺 Canal encontrado: ${name}`)
      } else {
        showMessage('❌ Canal não encontrado. Verifique o ID/URL.')
      }
    } catch (err) {
      showMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectYouTube = async () => {
    if (!ytChannelId || !ytChannelName) {
      showMessage('❌ Busque e selecione um canal primeiro')
      return
    }
    setLoading(true)
    try {
      await saveYoutubeConnection({ channelId: ytChannelId, channelName: ytChannelName })
      await createOrUpdate({ userId: 'default', youtubeConnected: true, youtubeChannelId: ytChannelId, youtubeChannelName: ytChannelName })
      setStatus(prev => ({ ...prev, youtube: { connected: true, channelName: ytChannelName, channelId: ytChannelId } }))
      showMessage(`✅ YouTube conectado! Canal: ${ytChannelName}`)
    } catch (err) {
      showMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectYouTube = async () => {
    if (!confirm("Desconectar YouTube?")) return
    setLoading(true)
    try {
      await disconnectYoutube()
      await createOrUpdate({ userId: 'default', youtubeConnected: false, youtubeChannelId: undefined, youtubeChannelName: undefined })
      setStatus(prev => ({ ...prev, youtube: { connected: false } }))
      setYtChannelId('')
      setYtChannelName('')
      showMessage("YouTube desconectado.")
    } catch (err) {
      showMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INSTAGRAM — Conectar com Access Token
  // ═══════════════════════════════════════════════════════════
  const handleConnectInstagram = async () => {
    if (!igToken.trim()) {
      showMessage('❌ Cole o Access Token do Facebook')
      return
    }
    setLoading(true)
    try {
      const testResult = await testInstagramToken({ accessToken: igToken.trim() }) as Record<string, unknown>
      const igAccounts = testResult.instagramAccounts as Array<{ pageId: string; pageName: string; igAccountId: string; igUsername: string }> || []
      if (!igAccounts || igAccounts.length === 0) {
        showMessage(`❌ ${testResult.message || 'Nenhuma conta Instagram Business encontrada.'}`)
        setLoading(false)
        return
      }
      const first = igAccounts[0]
      const saveResult = await saveIgConnection({
        accessToken: igToken.trim(),
        instagramAccountId: first.igAccountId,
        instagramUsername: first.igUsername,
        facebookPageId: first.pageId,
      }) as Record<string, unknown>
      await createOrUpdate({
        userId: 'default',
        instagramConnected: true,
        instagramAccountId: first.igAccountId,
        instagramUsername: first.igUsername,
      })
      setStatus(prev => ({ ...prev, instagram: { connected: true, username: first.igUsername, accountId: first.igAccountId } }))
      showMessage(`✅ Instagram conectado! @${first.igUsername}`)
      setIgToken('')
    } catch (err) {
      showMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectInstagram = async () => {
    if (!confirm("Desconectar Instagram?")) return
    setLoading(true)
    try {
      await disconnectInstagram({ platform: 'instagram' })
      await createOrUpdate({ userId: 'default', instagramConnected: false, instagramAccountId: undefined, instagramUsername: undefined })
      setStatus(prev => ({ ...prev, instagram: { connected: false } }))
      showMessage("Instagram desconectado.")
    } catch (err) {
      showMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TIKTOK — Conectar com Access Token
  // ═══════════════════════════════════════════════════════════
  const handleConnectTiktok = async () => {
    if (!ttToken.trim()) {
      showMessage('❌ Cole o Access Token do TikTok')
      return
    }
    setLoading(true)
    try {
      const testResult = await testTiktokToken({ accessToken: ttToken.trim() }) as Record<string, unknown>
      await saveTiktokConnection({
        accessToken: ttToken.trim(),
        openId: testResult.openId as string,
        displayName: testResult.displayName as string,
        expiresAt: Date.now() + 86400 * 1000,
        refreshExpiresAt: Date.now() + 86400 * 30 * 1000,
      })
      setStatus(prev => ({ ...prev, tiktok: { connected: true, displayName: testResult.displayName as string, openId: testResult.openId as string } }))
      showMessage(`✅ TikTok conectado! @${testResult.displayName}`)
      setTtToken('')
    } catch (err) {
      showMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectTiktok = async () => {
    if (!confirm("Desconectar TikTok?")) return
    setLoading(true)
    try {
      await disconnectTiktok({ platform: 'tiktok' })
      setStatus(prev => ({ ...prev, tiktok: { connected: false } }))
      showMessage("TikTok desconectado.")
    } catch (err) {
      showMessage(`❌ Erro: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-8'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center'>
          <Link2 className='w-5 h-5 text-white' />
        </div>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>Conexões</h1>
          <p className='text-gray-500 text-xs'>Conecte suas contas para automação</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
          message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.includes('✅') ? <CheckCircle className='w-4 h-4 shrink-0' /> : <AlertCircle className='w-4 h-4 shrink-0' />}
          <span className='text-sm'>{message}</span>
        </div>
      )}

      {/* Services already configured */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
        {[
          { name: 'Gemini AI', icon: '🧠', ok: true, detail: 'gemini-2.0-flash' },
          { name: 'Pixabay', icon: '🖼️', ok: true, detail: 'vídeos + imagens' },
          { name: 'Unsplash', icon: '📷', ok: true, detail: 'fotos HD' },
          { name: 'Freesound', icon: '🔊', ok: true, detail: 'sons/efeitos' },
          { name: 'Coverr', icon: '🎬', ok: true, detail: 'vídeos stock' },
        ].map(s => (
          <div key={s.name} className='bg-white rounded-xl border border-gray-100 p-3 text-center'>
            <div className='text-2xl mb-1'>{s.icon}</div>
            <p className='text-xs font-bold text-gray-900'>{s.name}</p>
            <p className='text-[10px] text-green-600'>✅ {s.detail}</p>
          </div>
        ))}
      </div>

      {/* ═══ YOUTUBE ═══ */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center'>
              <Youtube className='w-5 h-5 text-white' />
            </div>
            <div>
              <h3 className='font-bold text-gray-900'>YouTube</h3>
              <p className='text-xs text-gray-500'>Upload e publicação de vídeos</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            status.youtube.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {status.youtube.connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
            {status.youtube.connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {status.youtube.connected ? (
          <div>
            <div className='bg-green-50 rounded-lg p-3 mb-3'>
              <p className='text-sm text-green-700'>📺 <strong>{status.youtube.channelName}</strong></p>
              <p className='text-[10px] text-green-600 mt-1'>ID: {status.youtube.channelId}</p>
            </div>
            <Button onClick={handleDisconnectYouTube} variant='outline' className='w-full text-red-600 border-red-200 hover:bg-red-50'>
              <Unlink className='w-4 h-4 mr-2' /> Desconectar
            </Button>
          </div>
        ) : (
          <div className='space-y-3'>
            <div>
              <label className='block text-xs font-medium text-gray-600 mb-1'>URL ou @username do canal</label>
              <div className='flex gap-2'>
                <Input
                  placeholder='Ex: @projetocyt ou https://youtube.com/@canal'
                  value={ytChannelId}
                  onChange={e => setYtChannelId(e.target.value)}
                  className='text-sm'
                />
                <Button onClick={handleSearchYouTube} disabled={loading} variant='outline' className='shrink-0'>
                  <Search className='w-4 h-4' />
                </Button>
              </div>
            </div>
            {ytChannelName && (
              <div className='bg-blue-50 rounded-lg p-3'>
                <p className='text-sm text-blue-700'>📺 Canal encontrado: <strong>{ytChannelName}</strong></p>
              </div>
            )}
            <Button onClick={handleConnectYouTube} disabled={loading || !ytChannelName} className='w-full bg-red-600 hover:bg-red-700 text-white'>
              {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
              {loading ? 'Buscando...' : 'Conectar YouTube'}
            </Button>
          </div>
        )}
      </div>

      {/* ═══ INSTAGRAM ═══ */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center'>
              <Instagram className='w-5 h-5 text-white' />
            </div>
            <div>
              <h3 className='font-bold text-gray-900'>Instagram</h3>
              <p className='text-xs text-gray-500'>Postagem de Reels e Posts</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            status.instagram.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {status.instagram.connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
            {status.instagram.connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {status.instagram.connected ? (
          <div>
            <div className='bg-green-50 rounded-lg p-3 mb-3'>
              <p className='text-sm text-green-700'>📸 <strong>@{status.instagram.username}</strong></p>
              <p className='text-[10px] text-green-600 mt-1'>ID: {status.instagram.accountId}</p>
            </div>
            <Button onClick={handleDisconnectInstagram} variant='outline' className='w-full text-red-600 border-red-200 hover:bg-red-50'>
              <Unlink className='w-4 h-4 mr-2' /> Desconectar
            </Button>
          </div>
        ) : (
          <div className='space-y-3'>
            <div>
              <label className='block text-xs font-medium text-gray-600 mb-1'>Facebook Access Token</label>
              <div className='relative'>
                <Input
                  type={showIgToken ? 'text' : 'password'}
                  placeholder='Cole o Long-lived Access Token'
                  value={igToken}
                  onChange={e => setIgToken(e.target.value)}
                  className='text-sm pr-8'
                />
                <button type='button' onClick={() => setShowIgToken(!showIgToken)}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400'>
                  {showIgToken ? <EyeOff className='w-3.5 h-3.5' /> : <Eye className='w-3.5 h-3.5' />}
                </button>
              </div>
              <p className='text-[10px] text-gray-400 mt-1'>Detecta sua conta @agend_ai_serv automaticamente</p>
            </div>
            <Button onClick={handleConnectInstagram} disabled={loading || !igToken} className='w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white'>
              {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
              {loading ? 'Detectando conta...' : 'Conectar Instagram'}
            </Button>
          </div>
        )}
      </div>

      {/* ═══ TIKTOK ═══ */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-cyan-500 to-black rounded-xl flex items-center justify-center'>
              <Music className='w-5 h-5 text-white' />
            </div>
            <div>
              <h3 className='font-bold text-gray-900'>TikTok</h3>
              <p className='text-xs text-gray-500'>Vídeos curtos automáticos</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            status.tiktok.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {status.tiktok.connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
            {status.tiktok.connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {status.tiktok.connected ? (
          <div>
            <div className='bg-green-50 rounded-lg p-3 mb-3'>
              <p className='text-sm text-green-700'>🎵 <strong>@{status.tiktok.displayName}</strong></p>
            </div>
            <Button onClick={handleDisconnectTiktok} variant='outline' className='w-full text-red-600 border-red-200 hover:bg-red-50'>
              <Unlink className='w-4 h-4 mr-2' /> Desconectar
            </Button>
          </div>
        ) : (
          <div className='space-y-3'>
            <div>
              <label className='block text-xs font-medium text-gray-600 mb-1'>TikTok Access Token</label>
              <div className='relative'>
                <Input
                  type={showTtToken ? 'text' : 'password'}
                  placeholder='Cole o Access Token do TikTok'
                  value={ttToken}
                  onChange={e => setTtToken(e.target.value)}
                  className='text-sm pr-8'
                />
                <button type='button' onClick={() => setShowTtToken(!showTtToken)}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400'>
                  {showTtToken ? <EyeOff className='w-3.5 h-3.5' /> : <Eye className='w-3.5 h-3.5' />}
                </button>
              </div>
              <p className='text-[10px] text-gray-400 mt-1'>Obtenha em developers.tiktok.com</p>
            </div>
            <Button onClick={handleConnectTiktok} disabled={loading || !ttToken} className='w-full bg-gradient-to-r from-cyan-500 to-black hover:from-cyan-600 hover:to-gray-900 text-white'>
              {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
              {loading ? 'Conectando...' : 'Conectar TikTok'}
            </Button>
          </div>
        )}
      </div>

      {/* Architecture */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
        <h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
          <Shield className='w-4 h-4 text-purple-500' /> Arquitetura
        </h3>
        <div className='grid md:grid-cols-3 gap-3'>
          <div className='bg-blue-50 rounded-xl p-3'>
            <h4 className='font-bold text-blue-700 text-xs mb-1'>🧠 IA</h4>
            <ul className='text-[11px] text-blue-600 space-y-0.5'>
              <li>• Gemini 2.0 Flash</li>
              <li>• Roteiro + SEO + Hashtags</li>
            </ul>
          </div>
          <div className='bg-green-50 rounded-xl p-3'>
            <h4 className='font-bold text-green-700 text-xs mb-1'>🎬 Mídias</h4>
            <ul className='text-[11px] text-green-600 space-y-0.5'>
              <li>• Pixabay + Unsplash + Coverr</li>
              <li>• Freesound + Edge TTS</li>
            </ul>
          </div>
          <div className='bg-purple-50 rounded-xl p-3'>
            <h4 className='font-bold text-purple-700 text-xs mb-1'>📤 Publicação</h4>
            <ul className='text-[11px] text-purple-600 space-y-0.5'>
              <li>• YouTube + Instagram + TikTok</li>
              <li>• Agendamento inteligente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
