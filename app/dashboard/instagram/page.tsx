'use client'
import React, { useState, useRef } from 'react'
import { Instagram, Loader2, Sparkles, Send, Copy, CheckCircle, AlertCircle, Search, Target, ChevronRight, Users, Zap, FileText, Image, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const niches = [
  'Moda', 'Fitness', 'Culinária', 'Viagem', 'Tecnologia',
  'Marketing', 'Educação', 'Humor', 'Negócios', 'Lifestyle',
  'Beleza', 'Saúde', 'Pets', 'Fotografia', 'Música'
]

type AgentStep = 'idle' | 'agent1' | 'agent2' | 'agent3' | 'image' | 'done'

interface CalendarItem {
  type: string
  title: string
  hook: string
  script: string
  visualConcept: string
  duration: string
  bestTime: string
  objective: string
  creativeAngle: string
}

interface CaptionResult {
  caption: string
  firstLine: string
  cta: string
  hashtags: string[]
  altText: string
  bestPostingTime: string
}

interface PublishResult {
  validation: { captionValid: boolean; captionLength: number; hashtagsCount: number; withinLimits: boolean; warnings: string[] }
  payload: Record<string, unknown>
  ready: boolean
  message: string
}

export default function InstagramPage() {
  const [niche, setNiche] = useState('')
  const [topic, setTopic] = useState('')
  const [brandName, setBrandName] = useState('')
  const [brandTone, setBrandTone] = useState('profissional')
  const [targetAudience, setTargetAudience] = useState('')
  const [brandColors, setBrandColors] = useState('')
  const [currentStep, setCurrentStep] = useState<AgentStep>('idle')
  const [calendar, setCalendar] = useState<CalendarItem[]>([])
  const [selectedClip, setSelectedClip] = useState<number>(0)
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null)
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agentLogs, setAgentLogs] = useState<string[]>([])
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageStyle, setImageStyle] = useState<'modern' | 'professional' | 'tech' | 'elegant' | 'bold'>('modern')
  const [imagePrompt, setImagePrompt] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [postStatus, setPostStatus] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const agent1 = useAction(api.instagramEngine.agent1_estrategista)
  const agent2 = useAction(api.instagramEngine.agent2_copywriter)
  const agent3 = useAction(api.instagramEngine.agent3_publicador)

  const addLog = (msg: string) => setAgentLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`])

  const handleGenerateImage = async () => {
    if (!imagePrompt && !topic) return
    setGeneratingImage(true)
    setGeneratedImage(null)
    addLog('🎨 Gerando imagem com Gemini...')

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt || topic,
          brandName: brandName || undefined,
          niche,
          style: imageStyle,
          aspectRatio: '1:1',
        }),
      })

      const data = await res.json()
      if (data.success && data.image) {
        setGeneratedImage(`data:${data.mimeType};base64,${data.image}`)
        addLog(`✅ Imagem gerada! Modelo: ${data.model}`)
      } else {
        addLog(`❌ Erro: ${data.error}`)
      }
    } catch (err) {
      addLog(`❌ Erro ao gerar imagem: ${err}`)
    } finally {
      setGeneratingImage(false)
    }
  }

  const handlePostToInstagram = async () => {
    if (!captionResult || !generatedImage) {
      addLog('❌ Gere a imagem e a legenda primeiro')
      return
    }
    setPostStatus('posting')
    addLog('📤 Preparando post para Instagram...')

    try {
      // Enviar para a API de publicação
      const res = await fetch('/api/queue/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          caption: captionResult.caption + '\n\n' + (captionResult.hashtags || []).join(' '),
          imageUrl: generatedImage,
          brandName,
          niche,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setPostStatus('success')
        addLog('✅ Post enviado para o Instagram!')
      } else {
        setPostStatus('error')
        addLog(`❌ Erro ao postar: ${data.error}`)
      }
    } catch (err) {
      setPostStatus('error')
      addLog(`❌ Erro: ${err}`)
    }
  }

  const handleFullPipeline = async () => {
    if (!niche || !topic) return
    setLoading(true)
    setError(null)
    setCalendar([])
    setCaptionResult(null)
    setPublishResult(null)
    setAgentLogs([])
    setCurrentStep('idle')

    try {
      // ═══ AGENTE 1: ESTRATEGISTA ═══
      setCurrentStep('agent1')
      addLog('🤖 AGENTE 1 — Estrategista de Conteúdo iniciado...')
      addLog(`Nicho: ${niche} | Tema: ${topic}`)

      const calResult = await agent1({
        niche,
        targetAudience: targetAudience || 'Público geral',
        brandName: brandName || undefined,
        brandTone,
        brandColors: brandColors || undefined,
        weekCount: 1,
        contentCount: 3,
      })

      const calItems = (calResult as Record<string, unknown>).calendar as CalendarItem[]
      setCalendar(calItems || [])
      addLog(`✅ Agente 1 concluído! ${calItems?.length || 0} ideias geradas`)
      setSelectedClip(0)

      // ═══ AGENTE 2: COPYWRITER ═══
      setCurrentStep('agent2')
      addLog('✍️ AGENTE 2 — Copywriter & SEO Social iniciado...')

      const firstItem = calItems?.[0]
      if (firstItem) {
        addLog(`Gerando legenda para: "${firstItem.title}"`)

        const capResult = await agent2({
          contentIdea: JSON.stringify(firstItem),
          brandTone,
          brandName: brandName || undefined,
          niche,
          platform: firstItem.type,
        })

        setCaptionResult(capResult as CaptionResult)
        addLog(`✅ Agente 2 concluído! Legenda: ${(capResult as CaptionResult).caption?.length || 0} caracteres`)
      }

      // ═══ AGENTE 3: PUBLICADOR ═══
      setCurrentStep('agent3')
      addLog('📤 AGENTE 3 — Publicador & Automação iniciado...')

      let caption = captionResult?.caption || ''
      let hashtags = captionResult?.hashtags || []

      if (!caption && firstItem) {
        const fallback = (await agent2({
          contentIdea: JSON.stringify(firstItem),
          brandTone,
          brandName: brandName || undefined,
          niche,
        })) as CaptionResult
        caption = fallback.caption || ''
        hashtags = fallback.hashtags || []
      }

      const pubResult = await agent3({
        caption: caption || '',
        hashtags: hashtags.length > 0 ? hashtags : ['#conteudo', '#marketing'],
        contentType: firstItem?.type || 'post',
        brandName: brandName || undefined,
        altText: 'Conteúdo gerado por IA para ' + (brandName || 'marca'),
      })

      setPublishResult(pubResult as PublishResult)
      addLog(`✅ Agente 3 concluído! Payload pronto: ${(pubResult as PublishResult).ready ? 'SIM' : 'NÃO'}`)
      addLog('🎉 PIPELINE COMPLETO! Conteúdo pronto para publicação.')

      setCurrentStep('done')
    } catch (err) {
      addLog(`❌ Erro: ${err}`)
      setError(`Erro no pipeline: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-8'>
        <div className='w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center'>
          <Instagram className='w-6 h-6 text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Instagram Automation</h1>
          <p className='text-gray-500 text-sm'>3 Agentes Gemini: Estrategista → Copywriter → Publicador</p>
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
        <div className='flex items-center gap-3 overflow-x-auto pb-2'>
          {[
            { step: 'agent1', label: 'Estrategista', icon: <Search className='w-4 h-4' />, color: 'blue' },
            { step: 'agent2', label: 'Copywriter', icon: <FileText className='w-4 h-4' />, color: 'purple' },
            { step: 'agent3', label: 'Publicador', icon: <Send className='w-4 h-4' />, color: 'green' },
          ].map((s, i) => {
            const stepOrder = ['agent1', 'agent2', 'agent3', 'done']
            const currentIdx = stepOrder.indexOf(currentStep)
            const isActive = currentStep === s.step
            const isDone = currentIdx > i
            return (
              <React.Fragment key={s.step}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? `bg-${s.color}-100 text-${s.color}-700 ring-2 ring-${s.color}-300` :
                  isDone ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                    isActive ? `bg-${s.color}-500 text-white animate-pulse` :
                    isDone ? 'bg-green-500 text-white' :
                    'bg-gray-300 text-white'
                  }`}>
                    {isDone ? '✓' : s.icon}
                  </div>
                  {s.label}
                </div>
                {i < 2 && <ChevronRight className='w-4 h-4 text-gray-300 shrink-0' />}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div className='grid lg:grid-cols-3 gap-6'>
        {/* Config + Logs */}
        <div className='space-y-6'>
          {/* Configuração da Marca */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
              <Users className='w-5 h-5 text-pink-500' /> Identidade da Marca
            </h3>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Nome da Marca</label>
                <Input placeholder='Ex: Minha Empresa' value={brandName} onChange={e => setBrandName(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Tema / Assunto</label>
                <Input placeholder='Ex: 5 dicas de produtividade' value={topic} onChange={e => setTopic(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Nicho</label>
                <div className='flex flex-wrap gap-1.5'>
                  {niches.map(n => (
                    <button key={n} onClick={() => setNiche(n)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${niche === n ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Público-alvo</label>
                <Input placeholder='Ex: Empreendedores 25-40 anos' value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Tom de Voz</label>
                <div className='flex flex-wrap gap-1.5'>
                  {['profissional', 'casual', 'engajante', 'inspirador', 'humorístico'].map(t => (
                    <button key={t} onClick={() => setBrandTone(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${brandTone === t ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className='bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-red-500 shrink-0' />
                  <span className='text-xs text-red-700'>{error}</span>
                </div>
              )}

              <Button onClick={handleFullPipeline} disabled={!niche || !topic || loading} className='w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-5'>
                {loading ? (<><Loader2 className='w-5 h-5 animate-spin mr-2' /> Executando pipeline...</>) : (<><Zap className='w-5 h-5 mr-2' /> Executar 3 Agentes Gemini</>)}
              </Button>
            </div>
          </div>

          {/* Geração de Imagem */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
              <Image className='w-5 h-5 text-purple-500' /> Gerar Imagem com IA
            </h3>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Prompt da Imagem</label>
                <Input
                  placeholder='Ex: Smartphone showing CRM dashboard with neon blue accents'
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Estilo Visual</label>
                <div className='grid grid-cols-3 gap-2'>
                  {([
                    { id: 'modern' as const, label: '🎨 Moderno', desc: 'Gradientes vibrantes' },
                    { id: 'tech' as const, label: '⚡ Tech', desc: 'Futurista neon' },
                    { id: 'professional' as const, label: '💼 Corporativo', desc: 'Clean & formal' },
                    { id: 'elegant' as const, label: '✨ Elegante', desc: 'Minimalista luxo' },
                    { id: 'bold' as const, label: '🔥 Bold', desc: 'Alto contraste' },
                  ]).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setImageStyle(s.id)}
                      className={`p-2 rounded-lg border-2 text-left text-[10px] transition ${
                        imageStyle === s.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='font-bold text-gray-900'>{s.label}</div>
                      <div className='text-gray-500'>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleGenerateImage}
                disabled={generatingImage || (!imagePrompt && !topic)}
                className='w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
              >
                {generatingImage ? (<><Loader2 className='w-4 h-4 animate-spin mr-2' /> Gerando...</>) : (<><Image className='w-4 h-4 mr-2' /> Gerar Imagem</>)}
              </Button>
            </div>
          </div>

          {/* Agent Logs */}
          {agentLogs.length > 0 && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <h3 className='font-bold text-gray-900 mb-3 text-sm'>📋 Logs dos Agentes</h3>
              <div className='bg-gray-900 rounded-xl p-4 max-h-60 overflow-y-auto'>
                {agentLogs.map((log, i) => (
                  <p key={i} className='text-xs text-green-400 font-mono mb-1'>{log}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Calendar from Agent 1 */}
          {calendar.length > 0 && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'><Search className='w-4 h-4 text-blue-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 1 — Calendário Editorial</h3>
                  <p className='text-xs text-gray-500'>{calendar.length} conteúdos gerados</p>
                </div>
              </div>
              <div className='space-y-3'>
                {calendar.map((item, i) => (
                  <div key={i} className={`p-4 rounded-xl border-2 transition cursor-pointer ${selectedClip === i ? 'border-pink-500 bg-pink-50' : 'border-gray-100 hover:border-gray-200'}`} onClick={() => setSelectedClip(i)}>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='px-2 py-0.5 bg-gray-100 rounded text-xs font-medium uppercase'>{item.type}</span>
                      <span className='text-xs text-gray-500'>Objetivo: {item.objective}</span>
                    </div>
                    <p className='font-semibold text-sm mb-1'>{item.title}</p>
                    <p className='text-xs text-gray-600 mb-1'><span className='font-medium'>Gancho:</span> {item.hook}</p>
                    <p className='text-xs text-gray-500'>{item.visualConcept}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Caption from Agent 2 */}
          {captionResult && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center'><FileText className='w-4 h-4 text-purple-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 2 — Legenda & Copywriting</h3>
                  <p className='text-xs text-gray-500'>{captionResult.caption?.length || 0} caracteres</p>
                </div>
              </div>

              {/* Instagram Mock */}
              <div className='border rounded-xl overflow-hidden mb-4'>
                <div className='flex items-center gap-3 p-3 border-b'>
                  <div className='w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full' />
                  <div>
                    <span className='font-semibold text-sm'>{brandName || 'seu.perfil'}</span>
                    {captionResult.bestPostingTime && <span className='text-xs text-gray-400 ml-2'>• {captionResult.bestPostingTime}</span>}
                  </div>
                </div>
                <div className='aspect-square bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center'>
                  <Instagram className='w-12 h-12 text-pink-300' />
                </div>
                <div className='p-3'>
                  <p className='text-xs font-medium text-gray-700 mb-2'>PRIMEIRA LINHA: <span className='text-pink-600'>{captionResult.firstLine}</span></p>
                  <p className='text-sm text-gray-700 whitespace-pre-line mb-3'>{captionResult.caption}</p>
                  <div className='flex flex-wrap gap-1 mb-2'>
                    {captionResult.hashtags?.map((h, i) => (<span key={i} className='text-blue-600 text-xs'>{h}</span>))}
                  </div>
                  {captionResult.cta && <p className='text-xs text-gray-500 font-medium'>CTA: {captionResult.cta}</p>}
                </div>
              </div>

              <Button onClick={() => navigator.clipboard.writeText(captionResult.caption + '\n\n' + (captionResult.hashtags || []).join(' '))} variant='outline' className='w-full mb-2'>
                <Copy className='w-4 h-4 mr-2' /> Copiar Legenda + Hashtags
              </Button>
            </div>
          )}

          {/* Publish from Agent 3 */}
          {publishResult && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'><Send className='w-4 h-4 text-green-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 3 — Publicador & Automação</h3>
                  <p className='text-xs text-gray-500'>{publishResult.ready ? 'Pronto para publicar!' : 'Revisar antes de publicar'}</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl mb-4 ${publishResult.ready ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm font-medium ${publishResult.ready ? 'text-green-700' : 'text-yellow-700'}`}>{publishResult.message}</p>
                {publishResult.validation?.warnings?.map((w, i) => (<p key={i} className='text-xs text-yellow-600 mt-1'>⚠️ {w}</p>))}
              </div>

              <div className='bg-gray-50 rounded-xl p-4 mb-4'>
                <p className='text-xs font-medium text-gray-500 mb-2'>PAYLOAD INSTAGRAM GRAPH API</p>
                <pre className='text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto'>{JSON.stringify(publishResult.payload, null, 2)}</pre>
              </div>

              <Button className='w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white'>
                <Send className='w-4 h-4 mr-2' /> Publicar no Instagram
              </Button>
            </div>
          )}

          {/* Generated Image Preview */}
          {generatedImage && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center'><Image className='w-4 h-4 text-purple-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Imagem Gerada</h3>
                  <p className='text-xs text-gray-500'>Pronta para publicar</p>
                </div>
              </div>
              <div className='rounded-xl overflow-hidden mb-4 border'>
                <img src={generatedImage} alt='Imagem gerada' className='w-full aspect-square object-cover' />
              </div>
              <div className='flex gap-2'>
                <a href={generatedImage} download={`post-${Date.now()}.png`} className='flex-1'>
                  <Button variant='outline' className='w-full'><Download className='w-4 h-4 mr-2' /> Baixar</Button>
                </a>
                {captionResult && (
                  <Button
                    onClick={handlePostToInstagram}
                    disabled={postStatus === 'posting'}
                    className='flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                  >
                    {postStatus === 'posting' ? (<><Loader2 className='w-4 h-4 animate-spin mr-2' /> Postando...</>) :
                     postStatus === 'success' ? (<><CheckCircle className='w-4 h-4 mr-2' /> Postado!</>) :
                     (<><Send className='w-4 h-4 mr-2' /> Postar no Instagram</>)}
                  </Button>
                )}
              </div>
              {postStatus === 'success' && (
                <div className='mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2'>
                  <CheckCircle className='w-4 h-4 text-green-600' />
                  <span className='text-sm text-green-700'>Post enviado com sucesso para o Instagram!</span>
                </div>
              )}
              {postStatus === 'error' && (
                <div className='mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-red-600' />
                  <span className='text-sm text-red-700'>Erro ao postar. Verifique as credenciais do Instagram.</span>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {currentStep === 'idle' && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center'>
              <Zap className='w-16 h-16 mx-auto mb-4 text-pink-300' />
              <h3 className='text-lg font-bold text-gray-900 mb-2'>Pipeline de 3 Agentes</h3>
              <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
                Configure a identidade da marca e clique em Executar. Os 3 agentes Gemini vão trabalhar em sequência:
              </p>
              <div className='grid grid-cols-4 gap-4 max-w-xl mx-auto'>
                <div className='p-3 bg-blue-50 rounded-xl'>
                  <p className='text-2xl mb-1'>🎯</p>
                  <p className='text-xs font-bold text-blue-700'>Estrategista</p>
                  <p className='text-[10px] text-blue-500'>Calendário + ideias</p>
                </div>
                <div className='p-3 bg-purple-50 rounded-xl'>
                  <p className='text-2xl mb-1'>✍️</p>
                  <p className='text-xs font-bold text-purple-700'>Copywriter</p>
                  <p className='text-[10px] text-purple-500'>Legenda + hashtags</p>
                </div>
                <div className='p-3 bg-pink-50 rounded-xl'>
                  <p className='text-2xl mb-1'>🎨</p>
                  <p className='text-xs font-bold text-pink-700'>Imagem IA</p>
                  <p className='text-[10px] text-pink-500'>Gemini gera a arte</p>
                </div>
                <div className='p-3 bg-green-50 rounded-xl'>
                  <p className='text-2xl mb-1'>📤</p>
                  <p className='text-xs font-bold text-green-700'>Publicador</p>
                  <p className='text-[10px] text-green-500'>API + publicação</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
