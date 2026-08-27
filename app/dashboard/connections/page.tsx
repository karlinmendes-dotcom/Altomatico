'use client'
import React, { useState, useEffect } from 'react'
import { Youtube, Instagram, Music, CheckCircle, AlertCircle, RefreshCw, Link2, Unlink, Zap, Shield, Key, Eye, EyeOff, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ═══════════════════════════════════════════════════════════
// All connections stored in localStorage (no Convex dependency)
// ═══════════════════════════════════════════════════════════

function getConnections() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('altomatico_connections') || '{}')
  } catch { return {} }
}

function saveConnection(platform: string, data: Record<string, unknown>) {
  const all = getConnections()
  all[platform] = { ...data, connectedAt: Date.now() }
  localStorage.setItem('altomatico_connections', JSON.stringify(all))
}

function removeConnection(platform: string) {
  const all = getConnections()
  delete all[platform]
  localStorage.setItem('altomatico_connections', JSON.stringify(all))
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Record<string, Record<string, unknown>>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // YouTube state
  const [ytInput, setYtInput] = useState('')
  const [ytChannelName, setYtChannelName] = useState('')
  const [ytChannelId, setYtChannelId] = useState('')

  // Instagram state
  const [igToken, setIgToken] = useState('')
  const [showIgToken, setShowIgToken] = useState(false)

  // TikTok state
  const [ttToken, setTtToken] = useState('')
  const [showTtToken, setShowTtToken] = useState(false)

  useEffect(() => {
    setConnections(getConnections())
  }, [])

  const showMsg = (msg: string, isError = false) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 8000)
  }

  const refresh = () => setConnections(getConnections())

  // ═══════════════════════════════════════════════════════════
  // YOUTUBE — Search via YouTube Data API (client-side)
  // ═══════════════════════════════════════════════════════════
  const handleSearchYouTube = async () => {
    if (!ytInput.trim()) { showMsg('❌ Digite o nome ou URL do canal'); return }
    setLoading(true)
    try {
      let channelId = ytInput.trim()
      // Extract from URL
      const chMatch = channelId.match(/channel\/(UC[\w-]+)/)
      const atMatch = channelId.match(/@([\w.-]+)/)
      if (chMatch) channelId = chMatch[1]
      else if (atMatch) channelId = atMatch[1]

      let channelIdFinal = channelId
      let channelName = ''

      if (channelId.startsWith('UC')) {
        // Direct channel ID
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=AIzaSyBSRF3ybNlllWKDAT1RC9tt5gEUXWiyqyc`)
        const data = await res.json()
        const ch = data.items?.[0]
        if (ch) channelName = ch.snippet.title
      } else {
        // Search by name/@username
        const query = channelId.startsWith('@') ? channelId : channelId
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=AIzaSyBSRF3ybNlllWKDAT1RC9tt5gEUXWiyqyc`)
        const data = await res.json()
        const ch = data.items?.[0]
        if (ch) {
          channelIdFinal = ch.id.channelId
          channelName = ch.snippet.title
        }
      }

      if (channelName) {
        setYtChannelId(channelIdFinal)
        setYtChannelName(channelName)
        showMsg(`📺 Canal encontrado: ${channelName}`)
      } else {
        showMsg('❌ Canal não encontrado. Tente copiar o link completo do YouTube.', true)
      }
    } catch (err) {
      showMsg(`❌ Erro: ${err}`, true)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectYouTube = () => {
    if (!ytChannelId || !ytChannelName) { showMsg('❌ Busque um canal primeiro', true); return }
    saveConnection('youtube', { channelId: ytChannelId, channelName: ytChannelName })
    refresh()
    showMsg(`✅ YouTube conectado! Canal: ${ytChannelName}`)
    setYtInput('')
  }

  const handleDisconnectYouTube = () => {
    if (!confirm('Desconectar YouTube?')) return
    removeConnection('youtube')
    refresh()
    setYtChannelId('')
    setYtChannelName('')
    showMsg('YouTube desconectado.')
  }

  // ═══════════════════════════════════════════════════════════
  // INSTAGRAM — Test token via Graph API (client-side)
  // ═══════════════════════════════════════════════════════════
  const handleConnectInstagram = async () => {
    if (!igToken.trim()) { showMsg('❌ Cole o Access Token', true); return }
    setLoading(true)
    try {
      // Step 1: Test token
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${igToken.trim()}`)
      const meData = await meRes.json()
      if (meData.error) {
        showMsg(`❌ Token inválido: ${meData.error.message}`, true)
        setLoading(false)
        return
      }

      // Step 2: Get pages
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=${igToken.trim()}`)
      const pagesData = await pagesRes.json()
      const pages = pagesData.data || []

      // Step 3: Find Instagram account
      let igAccount = null
      for (const page of pages) {
        if (page.instagram_business_account) {
          // Get Instagram details
          const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.instagram_business_account.id}?fields=username,name,followers_count,media_count&access_token=${igToken.trim()}`)
          const igData = await igRes.json()
          if (igData.username) {
            igAccount = {
              pageId: page.id,
              pageName: page.name,
              igAccountId: page.instagram_business_account.id,
              username: igData.username,
              name: igData.name,
              followers: igData.followers_count || 0,
              posts: igData.media_count || 0,
            }
            break
          }
        }
      }

      if (!igAccount) {
        showMsg('❌ Nenhuma conta Instagram Business encontrada. Verifique: 1) Sua conta é Business/Creator? 2) Está vinculada a uma Página do Facebook?', true)
        setLoading(false)
        return
      }

      saveConnection('instagram', {
        token: igToken.trim(),
        ...igAccount,
      })
      refresh()
      showMsg(`✅ Instagram conectado! @${igAccount.username} (${igAccount.followers} seguidores)`)
      setIgToken('')
    } catch (err) {
      showMsg(`❌ Erro: ${err}`, true)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectInstagram = () => {
    if (!confirm('Desconectar Instagram?')) return
    removeConnection('instagram')
    refresh()
    showMsg('Instagram desconectado.')
  }

  // ═══════════════════════════════════════════════════════════
  // TIKTOK — Store token directly
  // ═══════════════════════════════════════════════════════════
  const handleConnectTiktok = () => {
    if (!ttToken.trim()) { showMsg('❌ Cole o Access Token', true); return }
    saveConnection('tiktok', { token: ttToken.trim(), displayName: 'TikTok User' })
    refresh()
    showMsg('✅ TikTok conectado!')
    setTtToken('')
  }

  const handleDisconnectTiktok = () => {
    if (!confirm('Desconectar TikTok?')) return
    removeConnection('tiktok')
    refresh()
    showMsg('TikTok desconectado.')
  }

  const yt = connections.youtube as Record<string, string> | undefined
  const ig = connections.instagram as Record<string, unknown> | undefined
  const tt = connections.tiktok as Record<string, string> | undefined

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
      <div className='grid grid-cols-3 md:grid-cols-5 gap-3 mb-6'>
        {[
          { name: 'Gemini AI', icon: '🧠', ok: true },
          { name: 'Pixabay', icon: '🖼️', ok: true },
          { name: 'Unsplash', icon: '📷', ok: true },
          { name: 'Freesound', icon: '🔊', ok: true },
          { name: 'Coverr', icon: '🎬', ok: true },
        ].map(s => (
          <div key={s.name} className='bg-white rounded-xl border border-gray-100 p-3 text-center'>
            <div className='text-2xl mb-1'>{s.icon}</div>
            <p className='text-xs font-bold text-gray-900'>{s.name}</p>
            <p className='text-[10px] text-green-600'>✅ Pronto</p>
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
            yt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {yt ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
            {yt ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {yt ? (
          <div>
            <div className='bg-green-50 rounded-lg p-3 mb-3'>
              <p className='text-sm text-green-700'>📺 <strong>{yt.channelName}</strong></p>
              <p className='text-[10px] text-green-600 mt-1'>ID: {yt.channelId}</p>
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
                  placeholder='Ex: @projetocyt'
                  value={ytInput}
                  onChange={e => setYtInput(e.target.value)}
                  className='text-sm'
                  onKeyDown={e => e.key === 'Enter' && handleSearchYouTube()}
                />
                <Button onClick={handleSearchYouTube} disabled={loading} variant='outline' className='shrink-0'>
                  <Search className='w-4 h-4' />
                </Button>
              </div>
            </div>
            {ytChannelName && (
              <div className='bg-blue-50 rounded-lg p-3'>
                <p className='text-sm text-blue-700'>📺 <strong>{ytChannelName}</strong></p>
              </div>
            )}
            <Button onClick={handleConnectYouTube} disabled={loading || !ytChannelName} className='w-full bg-red-600 hover:bg-red-700 text-white'>
              {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
              Conectar YouTube
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
            ig ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {ig ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
            {ig ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {ig ? (
          <div>
            <div className='bg-green-50 rounded-lg p-3 mb-3'>
              <p className='text-sm text-green-700'>📸 <strong>@{ig.username as string}</strong></p>
              <p className='text-[11px] text-green-600'>{ig.name as string} • {ig.followers as number} seguidores • {ig.posts as number} posts</p>
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
              <p className='text-[10px] text-gray-400 mt-1'>Detecta sua conta Instagram Business automaticamente</p>
            </div>
            <Button onClick={handleConnectInstagram} disabled={loading || !igToken} className='w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white'>
              {loading ? <RefreshCw className='w-4 h-4 mr-2 animate-spin' /> : <Link2 className='w-4 h-4 mr-2' />}
              {loading ? 'Verificando token...' : 'Conectar Instagram'}
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
            tt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {tt ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
            {tt ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {tt ? (
          <div>
            <div className='bg-green-50 rounded-lg p-3 mb-3'>
              <p className='text-sm text-green-700'>🎵 <strong>{tt.displayName}</strong></p>
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
              <Link2 className='w-4 h-4 mr-2' /> Conectar TikTok
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
            <p className='text-[11px] text-blue-600'>Gemini 2.0 Flash • Roteiro + SEO</p>
          </div>
          <div className='bg-green-50 rounded-xl p-3'>
            <h4 className='font-bold text-green-700 text-xs mb-1'>🎬 Mídias</h4>
            <p className='text-[11px] text-green-600'>Pixabay • Unsplash • Coverr • Freesound</p>
          </div>
          <div className='bg-purple-50 rounded-xl p-3'>
            <h4 className='font-bold text-purple-700 text-xs mb-1'>📤 Publicação</h4>
            <p className='text-[11px] text-purple-600'>YouTube • Instagram • TikTok</p>
          </div>
        </div>
      </div>
    </div>
  )
}
