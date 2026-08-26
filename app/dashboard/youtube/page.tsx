'use client'
import React, { useState } from 'react'
import { Youtube, Loader2, Sparkles, Scissors, FileText, Upload, AlertCircle, ChevronRight, Zap, Music, Mic, Play, Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

type AgentStep = 'idle' | 'agent1' | 'agent2' | 'agent3' | 'done'

interface ClipData {
  number: number
  title: string
  hook: string
  summary: string
  reason: string
  targetEmotion: string
  format: string
  viralPotential: number
  targetAudience: string
  suggestedMusic: string
  suggestedThumbnail: string
}

interface ScriptResult {
  narrationScript: string
  audioDirection: {
    musicStyle: string
    musicVolume: string
    voiceVolume: string
    soundEffects: string[]
    silenceMoments: string[]
  }
  visualDirection: Array<{ time: string; visual: string; transition: string; text: string }>
  subtitles: { enabled: boolean; style: string; srtContent: string }
  productionNotes: string
  estimatedFinalDuration: string
}

interface SeoResult {
  titles: { main: string; alternative1: string; alternative2: string }
  description: string
  tags: string[]
  hashtags: string[]
  chapters: Array<{ time: string; title: string }>
  settings: { category: string; language: string; visibility: string; bestTime: string }
  seoScore: number
  seoExplanation: string
}

export default function YouTubePage() {
  const [topic, setTopic] = useState('')
  const [channelName, setChannelName] = useState('')
  const [channelNiche, setChannelNiche] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [transcription, setTranscription] = useState('')
  const [clipCount, setClipCount] = useState(3)
  const [currentStep, setCurrentStep] = useState<AgentStep>('idle')
  const [clips, setClips] = useState<ClipData[]>([])
  const [selectedClip, setSelectedClip] = useState(0)
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null)
  const [seoResult, setSeoResult] = useState<SeoResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agentLogs, setAgentLogs] = useState<string[]>([])

  const agent1 = useAction(api.youtubeAutomation.agent1_decupador)
  const agent2 = useAction(api.youtubeAutomation.agent2_roteirista)
  const agent3 = useAction(api.youtubeAutomation.agent3_seoUploader)

  const addLog = (msg: string) => setAgentLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`])

  const handleFullPipeline = async () => {
    if (!topic) return
    setLoading(true)
    setError(null)
    setClips([])
    setScriptResult(null)
    setSeoResult(null)
    setAgentLogs([])
    setCurrentStep('idle')

    try {
      // ═══ AGENTE 1: DECUPADOR ═══
      setCurrentStep('agent1')
      addLog('✂️ AGENTE 1 — Analista de Cortes iniciado...')
      addLog(`Tema: ${topic} | Clips pedidos: ${clipCount}`)

      const clipResult = await agent1({
        topic,
        videoTranscription: transcription || undefined,
        channelNiche: channelNiche || undefined,
        channelName: channelName || undefined,
        targetAudience: targetAudience || undefined,
        numberOfClips: clipCount,
        clipDuration: '30-60 segundos',
      })

      const clipData = (clipResult as Record<string, unknown>).clips as ClipData[]
      setClips(clipData || [])
      addLog(`✅ Agente 1 concluído! ${clipData?.length || 0} clips identificados`)
      setSelectedClip(0)

      // ═══ AGENTE 2: ROTEIRISTA ═══
      setCurrentStep('agent2')
      addLog('🎬 AGENTE 2 — Roteirista & Diretor Sonoro iniciado...')

      const firstClip = clipData?.[0]
      if (firstClip) {
        addLog(`Criando roteiro para: "${firstClip.title}"`)

        const scriptRes = await agent2({
          clipData: JSON.stringify(firstClip),
          brandName: channelName || undefined,
          voiceStyle: 'masculina profissional',
          musicStyle: firstClip.suggestedMusic || 'Lo-fi inspirador',
          includeSubtitles: true,
        })

        setScriptResult(scriptRes as ScriptResult)
        addLog(`✅ Agente 2 concluído! Roteiro: ${(scriptRes as ScriptResult).narrationScript?.length || 0} caracteres`)
      }

      // ═══ AGENTE 3: SEO UPLOADER ═══
      setCurrentStep('agent3')
      addLog('📤 AGENTE 3 — Publicador SEO iniciado...')

      const scriptData = scriptResult || (await agent2({
        clipData: JSON.stringify(firstClip || { title: topic, hook: topic, summary: topic }),
        brandName: channelName || undefined,
      }) as ScriptResult)

      const seoRes = await agent3({
        title: firstClip?.title || topic,
        narrationScript: scriptData.narrationScript || topic,
        channelNiche: channelNiche || undefined,
        targetKeywords: [topic, channelNiche, 'shorts'].filter(Boolean),
      })

      setSeoResult(seoRes as SeoResult)
      addLog(`✅ Agente 3 concluído! SEO Score: ${(seoRes as SeoResult).seoScore || 0}`)
      addLog('🎉 PIPELINE COMPLETO! Vídeo pronto para publicação.')

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
        <div className='w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center'>
          <Youtube className='w-6 h-6 text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>YouTube Automation</h1>
          <p className='text-gray-500 text-sm'>3 Agentes Gemini: Decupagem → Roteiro → SEO/Publicação</p>
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
        <div className='flex items-center gap-3 overflow-x-auto pb-2'>
          {[
            { step: 'agent1', label: 'Decupagem', icon: <Scissors className='w-4 h-4' />, color: 'blue' },
            { step: 'agent2', label: 'Roteiro & Narração', icon: <Mic className='w-4 h-4' />, color: 'purple' },
            { step: 'agent3', label: 'SEO & Publicação', icon: <Upload className='w-4 h-4' />, color: 'green' },
          ].map((s, i) => {
            const stepOrder = ['agent1', 'agent2', 'agent3', 'done']
            const currentIdx = stepOrder.indexOf(currentStep)
            const isActive = currentStep === s.step
            const isDone = currentIdx > i
            return (
              <React.Fragment key={s.step}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? `bg-${s.color}-100 text-${s.color}-700 ring-2 ring-${s.color}-300` :
                  isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                    isActive ? `bg-${s.color}-500 text-white animate-pulse` :
                    isDone ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
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
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
              <Youtube className='w-5 h-5 text-red-500' /> Configuração
            </h3>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Tema / Assunto do Vídeo</label>
                <Input placeholder='Ex: 5 IA que vão mudar o mundo' value={topic} onChange={e => setTopic(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Nome do Canal</label>
                <Input placeholder='Ex: Tech Brasil' value={channelName} onChange={e => setChannelName(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Nicho</label>
                <Input placeholder='Ex: Tecnologia, Educação' value={channelNiche} onChange={e => setChannelNiche(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Público-alvo</label>
                <Input placeholder='Ex: Jovens 18-30 anos' value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Transcrição (opcional)</label>
                <Textarea placeholder='Cole a transcrição de um vídeo longo para o Agente 1 analisar e cortar...' value={transcription} onChange={e => setTranscription(e.target.value)} rows={3} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Quantidade de Clips</label>
                <div className='flex gap-2'>
                  {[2, 3, 5].map(n => (
                    <button key={n} onClick={() => setClipCount(n)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${clipCount === n ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {n} clips
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

              <Button onClick={handleFullPipeline} disabled={!topic || loading} className='w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-5'>
                {loading ? (<><Loader2 className='w-5 h-5 animate-spin mr-2' /> Executando pipeline...</>) : (<><Zap className='w-5 h-5 mr-2' /> Executar 3 Agentes Gemini</>)}
              </Button>
            </div>
          </div>

          {agentLogs.length > 0 && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <h3 className='font-bold text-gray-900 mb-3 text-sm'>📋 Logs dos Agentes</h3>
              <div className='bg-gray-900 rounded-xl p-4 max-h-60 overflow-y-auto'>
                {agentLogs.map((log, i) => (<p key={i} className='text-xs text-green-400 font-mono mb-1'>{log}</p>))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Clips from Agent 1 */}
          {clips.length > 0 && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'><Scissors className='w-4 h-4 text-blue-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 1 — Clips Identificados</h3>
                  <p className='text-xs text-gray-500'>{clips.length} oportunidades de viralização</p>
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                {clips.map((clip, i) => (
                  <div key={i} className={`p-4 rounded-xl border-2 transition cursor-pointer ${selectedClip === i ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-gray-200'}`} onClick={() => setSelectedClip(i)}>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-xs font-bold text-gray-400'>#{clip.number || i + 1}</span>
                      <span className={`text-xs font-bold ${clip.viralPotential >= 7 ? 'text-green-600' : clip.viralPotential >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {clip.viralPotential}/10
                      </span>
                    </div>
                    <p className='font-semibold text-sm mb-1 line-clamp-2'>{clip.title}</p>
                    <p className='text-xs text-gray-600 mb-2 line-clamp-2'>{clip.hook}</p>
                    <div className='flex items-center gap-2 text-[10px] text-gray-400'>
                      <span>🎵 {clip.suggestedMusic || 'Lo-fi'}</span>
                      <span>🎯 {clip.targetEmotion}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Script from Agent 2 */}
          {scriptResult && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center'><Mic className='w-4 h-4 text-purple-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 2 — Roteiro & Direção Sonora</h3>
                  <p className='text-xs text-gray-500'>Duração estimada: {scriptResult.estimatedFinalDuration}</p>
                </div>
              </div>

              {/* YouTube Mock */}
              <div className='border rounded-xl overflow-hidden mb-4'>
                <div className='aspect-video bg-gradient-to-br from-red-100 to-gray-100 flex items-center justify-center relative'>
                  <Play className='w-16 h-16 text-red-500 opacity-80' />
                  <div className='absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded'>{scriptResult.estimatedFinalDuration}</div>
                </div>
                <div className='p-3'>
                  <p className='font-semibold text-sm'>{clips[selectedClip]?.title || topic}</p>
                  <p className='text-xs text-gray-500 mt-1'>{channelName || 'Canal'} • {scriptResult.audioDirection?.musicStyle}</p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className='bg-blue-50 rounded-xl p-3'>
                  <p className='text-xs font-bold text-blue-700 mb-1'>🎵 Direção de Áudio</p>
                  <p className='text-xs text-blue-600'>Música: {scriptResult.audioDirection?.musicStyle}</p>
                  <p className='text-xs text-blue-600'>Volume: Voz {scriptResult.audioDirection?.voiceVolume} | Música {scriptResult.audioDirection?.musicVolume}</p>
                </div>
                <div className='bg-purple-50 rounded-xl p-3'>
                  <p className='text-xs font-bold text-purple-700 mb-1'>👁️ Direção Visual</p>
                  {scriptResult.visualDirection?.slice(0, 2).map((v, i) => (
                    <p key={i} className='text-xs text-purple-600'>{v.time}: {v.visual}</p>
                  ))}
                </div>
              </div>

              <div className='bg-gray-50 rounded-xl p-4 mb-4'>
                <p className='text-xs font-bold text-gray-500 mb-2'>NARRAÇÃO COMPLETA</p>
                <p className='text-sm text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto font-mono'>{scriptResult.narrationScript}</p>
              </div>
            </div>
          )}

          {/* SEO from Agent 3 */}
          {seoResult && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'><Upload className='w-4 h-4 text-green-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 3 — SEO & Metadados</h3>
                  <p className='text-xs text-gray-500'>SEO Score: {seoResult.seoScore}/100</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl mb-4 ${seoResult.seoScore >= 70 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className='flex items-center justify-between'>
                  <p className={`text-2xl font-bold ${seoResult.seoScore >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>{seoResult.seoScore}</p>
                  <p className='text-xs text-gray-600 max-w-xs'>{seoResult.seoExplanation}</p>
                </div>
              </div>

              <div className='space-y-3'>
                <div className='bg-gray-50 rounded-xl p-3'>
                  <p className='text-xs font-bold text-gray-500 mb-1'>TÍTULOS (Teste A/B)</p>
                  <p className='text-sm font-semibold text-gray-900'>Principal: {seoResult.titles?.main}</p>
                  <p className='text-xs text-gray-600'>Alt 1: {seoResult.titles?.alternative1}</p>
                  <p className='text-xs text-gray-600'>Alt 2: {seoResult.titles?.alternative2}</p>
                </div>

                <div className='bg-gray-50 rounded-xl p-3'>
                  <p className='text-xs font-bold text-gray-500 mb-1'>DESCRIÇÃO</p>
                  <p className='text-xs text-gray-700 whitespace-pre-line max-h-32 overflow-y-auto'>{seoResult.description}</p>
                </div>

                <div className='bg-gray-50 rounded-xl p-3'>
                  <p className='text-xs font-bold text-gray-500 mb-2'>TAGS ({seoResult.tags?.length || 0})</p>
                  <div className='flex flex-wrap gap-1'>
                    {seoResult.tags?.map((tag, i) => (<span key={i} className='px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px]'>{tag}</span>))}
                  </div>
                </div>

                {seoResult.chapters && seoResult.chapters.length > 0 && (
                  <div className='bg-gray-50 rounded-xl p-3'>
                    <p className='text-xs font-bold text-gray-500 mb-2'>CAPÍTULOS</p>
                    {seoResult.chapters.map((ch, i) => (
                      <p key={i} className='text-xs text-gray-700'><span className='font-mono text-red-500'>{ch.time}</span> {ch.title}</p>
                    ))}
                  </div>
                )}
              </div>

              <Button className='w-full bg-gradient-to-r from-red-500 to-red-700 text-white mt-4'>
                <Youtube className='w-4 h-4 mr-2' /> Publicar no YouTube
              </Button>
            </div>
          )}

          {/* Empty State */}
          {currentStep === 'idle' && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center'>
              <Zap className='w-16 h-16 mx-auto mb-4 text-red-300' />
              <h3 className='text-lg font-bold text-gray-900 mb-2'>Pipeline de 3 Agentes YouTube</h3>
              <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
                Configure o tema e clique em Executar. Os 3 agentes Gemini vão trabalhar em sequência:
              </p>
              <div className='grid grid-cols-3 gap-4 max-w-lg mx-auto'>
                <div className='p-3 bg-blue-50 rounded-xl'>
                  <p className='text-2xl mb-1'>✂️</p>
                  <p className='text-xs font-bold text-blue-700'>Decupador</p>
                  <p className='text-[10px] text-blue-500'>Corta e analisa</p>
                </div>
                <div className='p-3 bg-purple-50 rounded-xl'>
                  <p className='text-2xl mb-1'>🎬</p>
                  <p className='text-xs font-bold text-purple-700'>Roteirista</p>
                  <p className='text-[10px] text-purple-500'>Narração + som</p>
                </div>
                <div className='p-3 bg-green-50 rounded-xl'>
                  <p className='text-2xl mb-1'>📤</p>
                  <p className='text-xs font-bold text-green-700'>SEO & Upload</p>
                  <p className='text-[10px] text-green-500'>Metadados + API</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
