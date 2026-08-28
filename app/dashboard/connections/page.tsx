'use client'
import React, { useState, useEffect } from 'react'
import { Youtube, Instagram, Music, CheckCircle, AlertCircle, RefreshCw, Link2, Unlink, Zap, Shield, Key, Eye, EyeOff, Search, Settings, Save, Clock, Wand2, Link, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSearchParams } from 'next/navigation'

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

// Channel config stored per platform in localStorage
interface ChannelConfig {
  niche: string
  systemPrompt: string
  mode: 'AUTO_GENERATED' | 'URL_CLIPS'
  targetUrl: string
  postFrequency: number
  autoPublish: boolean
}

function getChannelConfigs(): Record<string, ChannelConfig> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('altomatico_channel_configs') || '{}')
  } catch { return {} }
}

function saveChannelConfig(platform: string, config: ChannelConfig) {
  const all = getChannelConfigs()
  all[platform] = config
  localStorage.setItem('altomatico_channel_configs', JSON.stringify(all))
}

// Token expiry detection
function getTokenExpiryStatus(conn: Record<string, unknown>): { expired: boolean; expiringSoon: boolean; daysLeft: number } {
  const now = Date.now()
  // Check Instagram token
  const igExpiry = conn.tokenExpiry || conn.expiresAt
  if (igExpiry && typeof igExpiry === 'number') {
    const daysLeft = Math.ceil((igExpiry - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return { expired: true, expiringSoon: false, daysLeft: 0 }
    if (daysLeft <= 7) return { expired: false, expiringSoon: true, daysLeft }
  }
  // Check TikTok token
  const ttExpiry = conn.expiresAt
  if (ttExpiry && typeof ttExpiry === 'number' && conn.openId) {
    const daysLeft = Math.ceil((ttExpiry - now) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return { expired: true, expiringSoon: false, daysLeft: 0 }
    if (daysLeft <= 7) return { expired: false, expiringSoon: true, daysLeft }
  }
  return { expired: false, expiringSoon: false, daysLeft: 0 }
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

  // Channel config state
  const [channelConfigs, setChannelConfigs] = useState<Record<string, ChannelConfig>>({})
  const [editingConfig, setEditingConfig] = useState<string | null>(null) // 'youtube' | 'instagram' | 'tiktok'
  const [configNiche, setConfigNiche] = useState('')
  const [configPrompt, setConfigPrompt] = useState('')
  const [configMode, setConfigMode] = useState<'AUTO_GENERATED' | 'URL_CLIPS'>('AUTO_GENERATED')
  const [configTargetUrl, setConfigTargetUrl] = useState('')
  const [configFrequency, setConfigFrequency] = useState(1)
  const [configAutoPublish, setConfigAutoPublish] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  // Generate now state
  const [generating, setGenerating] = useState<string | null>(null) // platform being generated
  const [generatedContent, setGeneratedContent] = useState<Record<string, unknown> | null>(null)
  const [showResult, setShowResult] = useState(false)

  const searchParams = useSearchParams()

  // Handle OAuth callback parameters from URL
  useEffect(() => {
    const ttConnected = searchParams.get('tiktok_connected')
    const ttToken = searchParams.get('token')
    const ttRefresh = searchParams.get('refresh_token')
    const ttOpenId = searchParams.get('open_id')
    const ttName = searchParams.get('display_name')
    const ttExpires = searchParams.get('expires_at')
    const ttRefreshExpires = searchParams.get('refresh_expires_at')
    const ttError = searchParams.get('tiktok_error')

    if (ttConnected === 'true' && ttToken) {
      saveConnection('tiktok', {
        token: ttToken,
        refreshToken: ttRefresh || '',
        openId: ttOpenId || '',
        displayName: ttName || 'TikTok User',
        expiresAt: parseInt(ttExpires || '0'),
        refreshExpiresAt: parseInt(ttRefreshExpires || '0'),
      })
      setConnections(getConnections())
      setMessage('✅ TikTok conectado via OAuth!')
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/connections')
    }

    if (ttError) {
      setMessage(`❌ TikTok: ${ttError}`)
      window.history.replaceState({}, '', '/dashboard/connections')
    }
  }, [searchParams])

  // Load connections and channel configs on mount
  useEffect(() => {
    setConnections(getConnections())
    setChannelConfigs(getChannelConfigs())
  }, [])

  // Auto-refresh TikTok token when expiring (runs on mount + every hour)
  useEffect(() => {
    const refreshTikTokToken = async () => {
      const allConns = getConnections()
      const tt = allConns.tiktok as Record<string, unknown> | undefined
      if (!tt?.refreshToken || !tt?.expiresAt) return

      const now = Date.now()
      const expiresAt = tt.expiresAt as number
      const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60)

      // Refresh if less than 6 hours until expiry
      if (hoursUntilExpiry > 6) return

      try {
        const res = await fetch('/api/tiktok/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tt.refreshToken }),
        })
        const data = await res.json()
        if (data.success) {
          // Update stored tokens
          const updatedConns = getConnections()
          updatedConns.tiktok = {
            ...updatedConns.tiktok,
            token: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
            refreshExpiresAt: data.refreshExpiresAt,
          }
          localStorage.setItem('altomatico_connections', JSON.stringify(updatedConns))
          setConnections(getConnections())
          console.log('TikTok token refreshed automatically')
        }
      } catch (err) {
        console.error('Auto-refresh TikTok failed:', err)
      }
    }

    refreshTikTokToken() // Run on mount
    const interval = setInterval(refreshTikTokToken, 60 * 60 * 1000) // Every hour
    return () => clearInterval(interval)
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

  // ═══════════════════════════════════════════════════════════
  // CHANNEL CONFIG — Editar config de nicho/prompt/modo
  // ═══════════════════════════════════════════════════════════
  const openConfig = (platform: string) => {
    const existing = channelConfigs[platform]
    setEditingConfig(platform)
    setConfigNiche(existing?.niche || '')
    setConfigPrompt(existing?.systemPrompt || '')
    setConfigMode(existing?.mode || 'AUTO_GENERATED')
    setConfigTargetUrl(existing?.targetUrl || '')
    setConfigFrequency(existing?.postFrequency || 1)
    setConfigAutoPublish(existing?.autoPublish || false)
    setConfigSaved(false)
  }

  const handleSaveConfig = () => {
    if (!editingConfig) return
    saveChannelConfig(editingConfig, {
      niche: configNiche,
      systemPrompt: configPrompt,
      mode: configMode,
      targetUrl: configTargetUrl,
      postFrequency: configFrequency,
      autoPublish: configAutoPublish,
    })
    setChannelConfigs(getChannelConfigs())
    setConfigSaved(true)
    showMsg(`✅ Configuração do ${editingConfig} salva!`)
    setTimeout(() => setConfigSaved(false), 3000)
  }

  // ═══════════════════════════════════════════════════════════
  // GENERATE NOW — Gera conteúdo via Gemini AI
  // ═══════════════════════════════════════════════════════════
  const handleGenerateNow = async (platform: string) => {
    const config = channelConfigs[platform]
    if (!config?.niche) {
      showMsg(`❌ Configure o nicho do ${platform} primeiro!`, true)
      return
    }
    setGenerating(platform)
    showMsg(`🧠 Gerando conteúdo para ${platform} via Gemini AI...`)
    try {
      const res = await fetch('/api/generate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: platform === 'youtube' ? (connections.youtube as Record<string, string>)?.channelName || 'Canal' :
                       platform === 'instagram' ? `@${(connections.instagram as Record<string, unknown>)?.username || 'instagram'}` :
                       'TikTok User',
          niche: config.niche,
          systemPrompt: config.systemPrompt,
          mode: config.mode || 'AUTO_GENERATED',
          targetUrl: config.targetUrl || undefined,
          platform: platform as 'youtube' | 'instagram' | 'tiktok',
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      // Save to localStorage queue
      const queue = JSON.parse(localStorage.getItem('altomatico_queue') || '[]')
      const newItem = {
        id: `gen_${Date.now()}`,
        title: data.content.title,
        description: data.content.caption,
        platform,
        contentType: platform === 'youtube' ? 'short' : platform === 'instagram' ? 'reel' : 'short',
        source: 'ai_generated',
        aiScript: data.content.script,
        aiHashtags: data.content.hashtags,
        aiNarration: data.content.caption,
        aiPrompt: config.systemPrompt,
        status: 'draft',
        videoUrl: '',
        thumbnailUrl: '',
        imageUrl: '',
        mediaUrl: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      queue.unshift(newItem)
      localStorage.setItem('altomatico_queue', JSON.stringify(queue))

      setGeneratedContent(data.content)
      setShowResult(true)
      showMsg(`✅ Conteúdo gerado para ${platform}! Verifique a fila de rascunhos.`)
    } catch (err) {
      showMsg(`❌ Erro ao gerar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, true)
    } finally {
      setGenerating(null)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showMsg('📋 Copiado para a área de transferência!')
    }).catch(() => {
      showMsg('❌ Erro ao copiar', true)
    })
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
            {(() => {
              const ytExpiry = getTokenExpiryStatus(yt as Record<string, unknown>)
              if (ytExpiry.expired) {
                return (
                  <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-red-500' />
                      <span className='text-xs font-medium text-red-700'>⚠️ Token Expirado — Reconecte sua conta</span>
                    </div>
                    <Button onClick={() => { removeConnection('youtube'); refresh(); }} size='sm' className='bg-red-500 hover:bg-red-600 text-white text-[10px]'>
                      <RefreshCw className='w-3 h-3 mr-1' /> Reconectar
                    </Button>
                  </div>
                )
              }
              if (ytExpiry.expiringSoon) {
                return (
                  <div className='bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-amber-500' />
                      <span className='text-xs font-medium text-amber-700'>⚠️ Expira em {ytExpiry.daysLeft} dia(s) — Renovação necessária</span>
                    </div>
                    <Button onClick={() => { removeConnection('youtube'); refresh(); }} size='sm' className='bg-amber-500 hover:bg-amber-600 text-white text-[10px]'>
                      <RefreshCw className='w-3 h-3 mr-1' /> Reconectar
                    </Button>
                  </div>
                )
              }
              return null
            })()}
            <Button onClick={() => openConfig('youtube')} variant='outline' className='w-full mb-2 border-blue-200 text-blue-600 hover:bg-blue-50'>
              <Settings className='w-4 h-4 mr-2' /> Configurar Canal
            </Button>
            <Button 
              onClick={() => handleGenerateNow('youtube')} 
              disabled={generating === 'youtube' || !channelConfigs.youtube?.niche}
              className='w-full mb-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50'
            >
              {generating === 'youtube' ? (
                <><RefreshCw className='w-4 h-4 mr-2 animate-spin' /> Gerando...</>
              ) : (
                <><Wand2 className='w-4 h-4 mr-2' /> Gerar Agora</>
              )}
            </Button>
            {!channelConfigs.youtube?.niche && (
              <p className='text-[10px] text-amber-600 text-center'>⚠️ Configure o nicho primeiro</p>
            )}
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
            {(() => {
              const igExpiry = getTokenExpiryStatus(ig as Record<string, unknown>)
              if (igExpiry.expired) {
                return (
                  <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-red-500' />
                      <span className='text-xs font-medium text-red-700'>⚠️ Token Expirado — Reconecte sua conta</span>
                    </div>
                    <Button onClick={() => { removeConnection('instagram'); refresh(); }} size='sm' className='bg-red-500 hover:bg-red-600 text-white text-[10px]'>
                      <RefreshCw className='w-3 h-3 mr-1' /> Reconectar
                    </Button>
                  </div>
                )
              }
              if (igExpiry.expiringSoon) {
                return (
                  <div className='bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-amber-500' />
                      <span className='text-xs font-medium text-amber-700'>⚠️ Expira em {igExpiry.daysLeft} dia(s) — Renovação necessária</span>
                    </div>
                    <Button onClick={() => { removeConnection('instagram'); refresh(); }} size='sm' className='bg-amber-500 hover:bg-amber-600 text-white text-[10px]'>
                      <RefreshCw className='w-3 h-3 mr-1' /> Reconectar
                    </Button>
                  </div>
                )
              }
              return null
            })()}
            <Button onClick={() => openConfig('instagram')} variant='outline' className='w-full mb-2 border-blue-200 text-blue-600 hover:bg-blue-50'>
              <Settings className='w-4 h-4 mr-2' /> Configurar Canal
            </Button>
            <Button 
              onClick={() => handleGenerateNow('instagram')} 
              disabled={generating === 'instagram' || !channelConfigs.instagram?.niche}
              className='w-full mb-2 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white disabled:opacity-50'
            >
              {generating === 'instagram' ? (
                <><RefreshCw className='w-4 h-4 mr-2 animate-spin' /> Gerando...</>
              ) : (
                <><Wand2 className='w-4 h-4 mr-2' /> Gerar Agora</>
              )}
            </Button>
            {!channelConfigs.instagram?.niche && (
              <p className='text-[10px] text-amber-600 text-center'>⚠️ Configure o nicho primeiro</p>
            )}
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
              <p className='text-sm text-green-700'>🎵 <strong>{(tt.displayName as string) || 'TikTok User'}</strong></p>
              {tt.openId && <p className='text-[10px] text-green-600'>ID: {tt.openId as string}</p>}
            </div>
            {(() => {
              const ttExpiry = getTokenExpiryStatus(tt as Record<string, unknown>)
              if (ttExpiry.expired) {
                return (
                  <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-red-500' />
                      <span className='text-xs font-medium text-red-700'>⚠️ Token Expirado — Reconecte sua conta</span>
                    </div>
                    <Button onClick={() => { removeConnection('tiktok'); refresh(); }} size='sm' className='bg-red-500 hover:bg-red-600 text-white text-[10px]'>
                      <RefreshCw className='w-3 h-3 mr-1' /> Reconectar
                    </Button>
                  </div>
                )
              }
              if (ttExpiry.expiringSoon) {
                return (
                  <div className='bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-amber-500' />
                      <span className='text-xs font-medium text-amber-700'>⚠️ Expira em {ttExpiry.daysLeft} dia(s) — Renovação automática ativa</span>
                    </div>
                    <Button 
                      onClick={async () => {
                        const allConns = getConnections()
                        const ttData = allConns.tiktok as Record<string, unknown>
                        if (ttData?.refreshToken) {
                          showMsg('🔄 Renovando token TikTok...')
                          try {
                            const res = await fetch('/api/tiktok/refresh', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ refreshToken: ttData.refreshToken }),
                            })
                            const data = await res.json()
                            if (data.success) {
                              allConns.tiktok = { ...allConns.tiktok, token: data.accessToken, refreshToken: data.refreshToken, expiresAt: data.expiresAt, refreshExpiresAt: data.refreshExpiresAt }
                              localStorage.setItem('altomatico_connections', JSON.stringify(allConns))
                              refresh()
                              showMsg('✅ Token TikTok renovado!')
                            } else {
                              showMsg('❌ Não foi possível renovar. Reconecte manualmente.', true)
                            }
                          } catch { showMsg('❌ Erro ao renovar token', true) }
                        } else {
                          removeConnection('tiktok')
                          refresh()
                        }
                      }} 
                      size='sm' 
                      className='bg-green-500 hover:bg-green-600 text-white text-[10px]'
                    >
                      <RefreshCw className='w-3 h-3 mr-1' /> Renovar Token
                    </Button>
                  </div>
                )
              }
              return null
            })()}
            <Button onClick={() => openConfig('tiktok')} variant='outline' className='w-full mb-2 border-blue-200 text-blue-600 hover:bg-blue-50'>
              <Settings className='w-4 h-4 mr-2' /> Configurar Canal
            </Button>
            <Button 
              onClick={() => handleGenerateNow('tiktok')} 
              disabled={generating === 'tiktok' || !channelConfigs.tiktok?.niche}
              className='w-full mb-2 bg-gradient-to-r from-cyan-600 to-black hover:from-cyan-700 hover:to-gray-900 text-white disabled:opacity-50'
            >
              {generating === 'tiktok' ? (
                <><RefreshCw className='w-4 h-4 mr-2 animate-spin' /> Gerando...</>
              ) : (
                <><Wand2 className='w-4 h-4 mr-2' /> Gerar Agora</>
              )}
            </Button>
            {!channelConfigs.tiktok?.niche && (
              <p className='text-[10px] text-amber-600 text-center'>⚠️ Configure o nicho primeiro</p>
            )}
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

      {/* ═══════════════════════════════════════════════════════════════════════════════
       * GENERATED CONTENT RESULT — Exibe o conteúdo gerado pela IA
       * ═══════════════════════════════════════════════════════════════════════════════ */}
      {showResult && generatedContent && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center'>
                    <Wand2 className='w-5 h-5 text-green-600' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900'>Conteúdo Gerado!</h3>
                    <p className='text-xs text-gray-500'>Gemini AI • Rascunho salvo na fila</p>
                  </div>
                </div>
                <button onClick={() => { setShowResult(false); setGeneratedContent(null); }} className='text-gray-400 hover:text-gray-600 text-xl'>✕</button>
              </div>

              <div className='space-y-4'>
                {/* Title */}
                <div className='bg-blue-50 rounded-xl p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-xs font-bold text-blue-700'>📝 TÍTULO</span>
                    <button onClick={() => copyToClipboard(generatedContent.title as string)} className='text-xs text-blue-500 hover:text-blue-700'>📋 Copiar</button>
                  </div>
                  <p className='text-sm font-bold text-gray-900'>{generatedContent.title as string}</p>
                </div>

                {/* Hook */}
                <div className='bg-amber-50 rounded-xl p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-xs font-bold text-amber-700'>🎣 GANCHO (Hook)</span>
                    <button onClick={() => copyToClipboard(generatedContent.hook as string)} className='text-xs text-amber-500 hover:text-amber-700'>📋 Copiar</button>
                  </div>
                  <p className='text-sm text-gray-900'>{generatedContent.hook as string}</p>
                </div>

                {/* Script */}
                <div className='bg-purple-50 rounded-xl p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-xs font-bold text-purple-700'>🎬 ROTEIRO</span>
                    <button onClick={() => copyToClipboard(generatedContent.script as string)} className='text-xs text-purple-500 hover:text-purple-700'>📋 Copiar</button>
                  </div>
                  <p className='text-sm text-gray-900 whitespace-pre-wrap'>{generatedContent.script as string}</p>
                </div>

                {/* Caption */}
                <div className='bg-pink-50 rounded-xl p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-xs font-bold text-pink-700'>💬 LEGENDA</span>
                    <button onClick={() => copyToClipboard(generatedContent.caption as string)} className='text-xs text-pink-500 hover:text-pink-700'>📋 Copiar</button>
                  </div>
                  <p className='text-sm text-gray-900 whitespace-pre-wrap'>{generatedContent.caption as string}</p>
                </div>

                {/* Hashtags */}
                <div className='bg-green-50 rounded-xl p-4'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-xs font-bold text-green-700'>🏷️ HASHTAGS</span>
                    <button onClick={() => copyToClipboard((generatedContent.hashtags as string[])?.join(' '))} className='text-xs text-green-500 hover:text-green-700'>📋 Copiar</button>
                  </div>
                  <div className='flex flex-wrap gap-1'>
                    {(generatedContent.hashtags as string[])?.map((tag: string, i: number) => (
                      <span key={i} className='bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full'>{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Meta info */}
                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-gray-50 rounded-xl p-3'>
                    <p className='text-[10px] text-gray-500'>⏱️ Duração</p>
                    <p className='text-sm font-bold text-gray-900'>{generatedContent.duration as string}</p>
                  </div>
                  <div className='bg-gray-50 rounded-xl p-3'>
                    <p className='text-[10px] text-gray-500'>🕐 Melhor Horário</p>
                    <p className='text-sm font-bold text-gray-900'>{generatedContent.bestTime as string}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex gap-3 pt-2'>
                  <Button
                    onClick={() => { setShowResult(false); setGeneratedContent(null); }}
                    variant='outline'
                    className='flex-1'
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      copyToClipboard(
                        `TÍTULO: ${generatedContent.title}\n\nGANCHO: ${generatedContent.hook}\n\nROTEIRO:\n${generatedContent.script}\n\nLEGENDA:\n${generatedContent.caption}\n\nHASHTAGS:\n${(generatedContent.hashtags as string[])?.join(' ')}`
                      )
                    }}
                    className='flex-1 bg-green-600 hover:bg-green-700 text-white'
                  >
                    📋 Copiar Tudo
                  </Button>
                </div>

                <p className='text-[10px] text-gray-400 text-center'>O rascunho foi salvo na fila. Acesse /dashboard/queue para editar e enviar.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
       * CONFIG PANEL — Configuração de Canal (nicho, prompt, modo, frequência)
       * Aparece quando o usuário clica em "Configurar Canal"
       * ═══════════════════════════════════════════════════════════════════════════════ */}
      {editingConfig && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center'>
                    <Settings className='w-5 h-5 text-blue-600' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900'>Configurar Canal</h3>
                    <p className='text-xs text-gray-500 capitalize'>{editingConfig}</p>
                  </div>
                </div>
                <button onClick={() => setEditingConfig(null)} className='text-gray-400 hover:text-gray-600 text-xl'>✕</button>
              </div>

              {configSaved && (
                <div className='bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-600' />
                  <span className='text-sm text-green-700 font-medium'>Configuração salva com sucesso!</span>
                </div>
              )}

              <div className='space-y-4'>
                {/* Nicho */}
                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-1'>🏷️ Nicho do Canal</label>
                  <Input
                    placeholder='Ex: Música, Fitness, Culinária, Tecnologia...'
                    value={configNiche}
                    onChange={e => setConfigNiche(e.target.value)}
                    className='text-sm'
                  />
                  <p className='text-[10px] text-gray-400 mt-1'>Define o nicho para geração de conteúdo mais preciso</p>
                </div>

                {/* Prompt de sistema */}
                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-1'>📝 Instruções do Conteúdo</label>
                  <textarea
                    placeholder='Ex: Crie vídeos curtos sobre dicas de música brasileira. Tom: informal e divertido. Use emojis. Sempre inclua chamada para ação no final.'
                    value={configPrompt}
                    onChange={e => setConfigPrompt(e.target.value)}
                    className='w-full text-sm border border-gray-200 rounded-lg p-3 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none'
                  />
                  <p className='text-[10px] text-gray-400 mt-1'>Instruções personalizadas que a IA segue ao criar conteúdo</p>
                </div>

                {/* Modo de geração */}
                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>🎯 Modo de Geração</label>
                  <div className='grid grid-cols-2 gap-3'>
                    <button
                      onClick={() => setConfigMode('AUTO_GENERATED')}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        configMode === 'AUTO_GENERATED'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-center gap-2 mb-1'>
                        <Wand2 className='w-4 h-4 text-blue-600' />
                        <span className='text-sm font-bold text-gray-900'>Gerar por IA</span>
                      </div>
                      <p className='text-[10px] text-gray-500'>A IA cria o conteúdo do zero usando o prompt e nicho definidos</p>
                    </button>
                    <button
                      onClick={() => setConfigMode('URL_CLIPS')}
                      className={`p-4 rounded-xl border-2 transition text-left ${
                        configMode === 'URL_CLIPS'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-center gap-2 mb-1'>
                        <Link className='w-4 h-4 text-purple-600' />
                        <span className='text-sm font-bold text-gray-900'>Recortar URL</span>
                      </div>
                      <p className='text-[10px] text-gray-500'>Corta trechos de um vídeo existente para criar conteúdo</p>
                    </button>
                  </div>
                </div>

                {/* URL-alvo (só aparece no modo URL_CLIPS) */}
                {configMode === 'URL_CLIPS' && (
                  <div>
                    <label className='block text-xs font-medium text-gray-700 mb-1'>🔗 URL do Vídeo</label>
                    <Input
                      placeholder='https://youtube.com/watch?v=...'
                      value={configTargetUrl}
                      onChange={e => setConfigTargetUrl(e.target.value)}
                      className='text-sm'
                    />
                    <p className='text-[10px] text-gray-400 mt-1'>URL do vídeo para extrair trechos</p>
                  </div>
                )}

                {/* Frequência */}
                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-1'>⏰ Frequência de Postagem</label>
                  <div className='flex items-center gap-3'>
                    <Input
                      type='number'
                      min={1}
                      max={10}
                      value={configFrequency}
                      onChange={e => setConfigFrequency(parseInt(e.target.value) || 1)}
                      className='text-sm w-20'
                    />
                    <span className='text-sm text-gray-600'>x por dia</span>
                  </div>
                  <p className='text-[10px] text-gray-400 mt-1'>Quantos conteúdos gerar por dia neste canal</p>
                </div>

                {/* Auto-publish */}
                <div className='flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200'>
                  <div>
                    <p className='text-sm font-bold text-gray-900'>🔒 Modo Seguro (Recomendado)</p>
                    <p className='text-[10px] text-gray-500'>Cria como RASCUNHO/PRIVATE/UNLISTED — você publica manualmente</p>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={!configAutoPublish}
                      onChange={e => setConfigAutoPublish(!e.target.checked)}
                      className='sr-only peer'
                    />
                    <div className='w-11 h-6 bg-green-500 rounded-full peer peer-checked:bg-amber-400 transition'></div>
                    <div className='absolute left-1 top-1 bg-white w-4 h-4 rounded-full peer-checked:translate-x-5 transition'></div>
                  </label>
                </div>

                {/* Botões */}
                <div className='flex gap-3 pt-2'>
                  <Button
                    onClick={() => setEditingConfig(null)}
                    variant='outline'
                    className='flex-1'
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveConfig}
                    className='flex-1 bg-blue-600 hover:bg-blue-700 text-white'
                  >
                    <Save className='w-4 h-4 mr-2' /> Salvar Configuração
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
