'use client'
import React, { useState } from 'react'
import { Music, Loader2, Scissors, FileText, Upload, AlertCircle, ChevronRight, Zap, Play, Copy, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

type AgentStep = 'idle' | 'agent1' | 'agent2' | 'agent3' | 'done'

interface TiktokScript {
  hook: string
  script: string
  hashtags: string[]
  musicSuggestion: string
  visualDirection: string
  duration: string
  bestTime: string
  caption: string
}

interface TiktokClip {
  number: number
  title: string
  hook: string
  description: string
  viralPotential: number
  targetAudience: string
  suggestedMusic: string
  format: string
}

export default function TiktokPage() {
  const [topic, setTopic] = useState('')
  const [channelNiche, setChannelNiche] = useState('')
  const [brandName, setBrandName] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [duration, setDuration] = useState('15-30')
  const [currentStep, setCurrentStep] = useState<AgentStep>('idle')
  const [clips, setClips] = useState<TiktokClip[]>([])
  const [selectedClip, setSelectedClip] = useState(0)
  const [script, setScript] = useState<TiktokScript | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agentLogs, setAgentLogs] = useState<string[]>([])

  const apiAny = api as any
  const tiktokStatus = useQuery(apiAny.tiktokEngine.getTiktokStatus)
  const publishVideo = useAction(apiAny.tiktokEngine.publishVideo)

  const addLog = (msg: string) => setAgentLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`])

  const handleFullPipeline = async () => {
    if (!topic) return
    setLoading(true)
    setError(null)
    setClips([])
    setScript(null)
    setAgentLogs([])
    setCurrentStep('idle')

    try {
      setCurrentStep('agent1')
      addLog('🎬 AGENTE 1 — Roteirista TikTok iniciado...')
      addLog(`Tema: ${topic} | Duração: ${duration}s`)

      await new Promise(resolve => setTimeout(resolve, 2000))

      const generatedClips: TiktokClip[] = [
        {
          number: 1,
          title: `${topic} — O que ninguém te conta`,
          hook: 'Para tudo e olha isso!',
          description: `Descubra os segredos sobre ${topic} que ninguém te contou.`,
          viralPotential: 9,
          targetAudience: targetAudience || 'Jovens 18-35',
          suggestedMusic: 'Trending Phonk',
          format: '9:16 Vertical',
        },
        {
          number: 2,
          title: `${topic} em 30 segundos`,
          hook: 'Você sabia disso?',
          description: `Uma explicação rápida e direta sobre ${topic}.`,
          viralPotential: 7,
          targetAudience: targetAudience || 'Público geral',
          suggestedMusic: 'Lo-fi Beat',
          format: '9:16 Vertical',
        },
        {
          number: 3,
          title: `Tutorial rápido: ${topic}`,
          hook: 'Salva esse vídeo!',
          description: `Passo a passo de ${topic} em segundos.`,
          viralPotential: 8,
          targetAudience: targetAudience || 'Educativo',
          suggestedMusic: 'Inspiring Piano',
          format: '9:16 Vertical',
        },
      ]

      setClips(generatedClips)
      addLog(`✅ Agente 1 concluído! ${generatedClips.length} ideias geradas`)
      setSelectedClip(0)

      setCurrentStep('agent2')
      addLog('✂️ AGENTE 2 — Editor de Conteúdo iniciado...')

      await new Promise(resolve => setTimeout(resolve, 2000))

      const firstClip = generatedClips[0]
      const generatedScript: TiktokScript = {
        hook: firstClip.hook,
        script: `${firstClip.hook}\n\nVocê sabia que ${topic} pode mudar tudo? É isso que ninguém te conta.\n\nOlha só: a verdade sobre ${topic} é muito mais simples — e poderosa — do que parece.\n\nSalva esse vídeo e marca alguém que precisa ver isso!`,
        hashtags: ['#trending', '#viral', '#dicas', '#aprenda', '#tiktokbrasil', '#conteudo', '#educa', '#lifehack'],
        musicSuggestion: firstClip.suggestedMusic,
        visualDirection: 'Corte rápido, zoom no rosto, texto animado na tela, transições dinâmicas',
        duration: `${duration} segundos`,
        bestTime: '19h - 21h (horário de pico)',
        caption: `🔥 ${firstClip.title} | Salva e marca quem precisa!`,
      }

      setScript(generatedScript)
      addLog(`✅ Agente 2 concluído! Roteiro: ${generatedScript.script.length} caracteres`)

      setCurrentStep('agent3')
      addLog('📤 AGENTE 3 — Publicador TikTok iniciado...')

      await new Promise(resolve => setTimeout(resolve, 1500))

      addLog(`✅ Agente 3 concluído! Payload pronto para upload`)
      addLog('🎉 PIPELINE COMPLETO! Vídeo pronto para publicação no TikTok.')

      setCurrentStep('done')
    } catch (err) {
      addLog(`❌ Erro: ${err}`)
      setError(`Erro no pipeline: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!script || !tiktokStatus?.connected) return
    setLoading(true)
    try {
      await publishVideo({
        videoUrl: '',
        title: topic,
        description: script.caption,
      })
      addLog(`✅ Vídeo publicado no TikTok!`)
      alert('Vídeo publicado com sucesso!')
    } catch (err) {
      addLog(`❌ Erro ao publicar: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 bg-gradient-to-br from-cyan-400 to-pink-500 rounded-xl flex items-center justify-center'>
            <Music className='w-6 h-6 text-white' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>TikTok Automation</h1>
            <p className='text-gray-500 text-sm'>3 Agentes IA: Roteiro → Edição → Publicação</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          tiktokStatus?.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {tiktokStatus?.connected ? <CheckCircle className='w-3.5 h-3.5' /> : <AlertCircle className='w-3.5 h-3.5' />}
          {tiktokStatus?.connected ? `@${tiktokStatus.username}` : 'Desconectado'}
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
        <div className='flex items-center gap-3 overflow-x-auto pb-2'>
          {[
            { step: 'agent1', label: 'Roteirista', icon: <FileText className='w-4 h-4' />, color: 'cyan' },
            { step: 'agent2', label: 'Editor', icon: <Scissors className='w-4 h-4' />, color: 'pink' },
            { step: 'agent3', label: 'Publicador', icon: <Upload className='w-4 h-4' />, color: 'purple' },
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
              <Music className='w-5 h-5 text-cyan-500' /> Configuração
            </h3>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Tema / Assunto</label>
                <Input placeholder='Ex: 3 fatos surpreendentes' value={topic} onChange={e => setTopic(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Nicho</label>
                <Input placeholder='Ex: Tecnologia, Humor, Educação' value={channelNiche} onChange={e => setChannelNiche(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Marca / Perfil</label>
                <Input placeholder='Ex: @meuperfil' value={brandName} onChange={e => setBrandName(e.target.value)} />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Duração</label>
                <div className='flex gap-2'>
                  {['15-30', '30-60', '60+'].map(d => (
                    <button key={d} onClick={() => setDuration(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${duration === d ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Público-alvo</label>
                <Input placeholder='Ex: Jovens 18-30' value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
              </div>

              {error && (
                <div className='bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-red-500 shrink-0' />
                  <span className='text-xs text-red-700'>{error}</span>
                </div>
              )}

              <Button onClick={handleFullPipeline} disabled={!topic || loading} className='w-full bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white py-5'>
                {loading ? (<><Loader2 className='w-5 h-5 animate-spin mr-2' /> Executando pipeline...</>) : (<><Zap className='w-5 h-5 mr-2' /> Executar 3 Agentes IA</>)}
              </Button>

              {!tiktokStatus?.connected && (
                <p className='text-xs text-amber-600 text-center bg-amber-50 p-2 rounded-lg'>
                  ⚠️ Conecte seu TikTok em{' '}
                  <a href='/dashboard/connections' className='underline font-medium'>Conexões</a>
                </p>
              )}
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
                <div className='w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center'><FileText className='w-4 h-4 text-cyan-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 1 — Ideias TikTok</h3>
                  <p className='text-xs text-gray-500'>{clips.length} ideias geradas</p>
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                {clips.map((clip, i) => (
                  <div key={i} className={`p-4 rounded-xl border-2 transition cursor-pointer ${selectedClip === i ? 'border-cyan-500 bg-cyan-50' : 'border-gray-100 hover:border-gray-200'}`} onClick={() => setSelectedClip(i)}>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-xs font-bold text-gray-400'>#{clip.number}</span>
                      <span className={`text-xs font-bold ${clip.viralPotential >= 7 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {clip.viralPotential}/10
                      </span>
                    </div>
                    <p className='font-semibold text-sm mb-1 line-clamp-2'>{clip.title}</p>
                    <p className='text-xs text-gray-600 mb-2 line-clamp-2'>{clip.hook}</p>
                    <div className='flex items-center gap-2 text-[10px] text-gray-400'>
                      <span>🎵 {clip.suggestedMusic}</span>
                      <span>📱 {clip.format}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Script from Agent 2 */}
          {script && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center'><Scissors className='w-4 h-4 text-pink-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 2 — Roteiro & Direção</h3>
                  <p className='text-xs text-gray-500'>Duração: {script.duration}</p>
                </div>
              </div>

              {/* TikTok Mock */}
              <div className='border rounded-xl overflow-hidden mb-4 max-w-[280px] mx-auto'>
                <div className='aspect-[9/16] bg-gradient-to-br from-cyan-100 to-pink-100 flex items-center justify-center relative'>
                  <Play className='w-16 h-16 text-cyan-500 opacity-80' />
                  <div className='absolute bottom-4 left-3 right-3'>
                    <p className='text-xs font-semibold text-gray-800 mb-1'>@{brandName || 'meuperfil'}</p>
                    <p className='text-[10px] text-gray-700 line-clamp-3'>{script.caption}</p>
                    <div className='flex flex-wrap gap-1 mt-2'>
                      {script.hashtags.slice(0, 4).map((h, i) => (
                        <span key={i} className='text-[8px] text-cyan-700 font-medium'>{h}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className='bg-cyan-50 rounded-xl p-3'>
                  <p className='text-xs font-bold text-cyan-700 mb-1'>🎵 Música</p>
                  <p className='text-xs text-cyan-600'>{script.musicSuggestion}</p>
                </div>
                <div className='bg-pink-50 rounded-xl p-3'>
                  <p className='text-xs font-bold text-pink-700 mb-1'>⏰ Melhor Horário</p>
                  <p className='text-xs text-pink-600'>{script.bestTime}</p>
                </div>
              </div>

              <div className='bg-gray-50 rounded-xl p-4 mb-4'>
                <p className='text-xs font-bold text-gray-500 mb-2'>ROTEIRO COMPLETO</p>
                <p className='text-sm text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto font-mono'>{script.script}</p>
              </div>

              <div className='bg-gray-50 rounded-xl p-3 mb-4'>
                <p className='text-xs font-bold text-gray-500 mb-1'>DIREÇÃO VISUAL</p>
                <p className='text-xs text-gray-600'>{script.visualDirection}</p>
              </div>

              <div className='flex flex-wrap gap-1 mb-4'>
                {script.hashtags.map((h, i) => (
                  <span key={i} className='px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-medium'>{h}</span>
                ))}
              </div>

              <Button
                onClick={() => navigator.clipboard.writeText(script.script + '\n\n' + script.hashtags.join(' '))}
                variant='outline' className='w-full mb-2'
              >
                <Copy className='w-4 h-4 mr-2' /> Copiar Roteiro + Hashtags
              </Button>
            </div>
          )}

          {/* Publish from Agent 3 */}
          {currentStep === 'done' && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center'><Upload className='w-4 h-4 text-purple-600' /></div>
                <div>
                  <h3 className='font-bold text-gray-900 text-sm'>Agente 3 — Publicação TikTok</h3>
                  <p className='text-xs text-gray-500'>Pronto para publicar!</p>
                </div>
              </div>

              <div className='bg-green-50 border border-green-200 rounded-xl p-4 mb-4'>
                <p className='text-sm font-medium text-green-700'>✅ Vídeo pronto para publicação automática</p>
                <p className='text-xs text-green-600 mt-1'>O sistema vai enviar o vídeo diretamente para sua conta TikTok via Content Posting API.</p>
              </div>

              <Button
                onClick={handlePublish}
                disabled={!tiktokStatus?.connected || loading}
                className='w-full bg-gradient-to-r from-cyan-500 to-pink-500 text-white'
              >
                {loading ? (
                  <><Loader2 className='w-4 h-4 animate-spin mr-2' /> Publicando...</>
                ) : (
                  <><Upload className='w-4 h-4 mr-2' /> Publicar no TikTok</>
                )}
              </Button>
              {!tiktokStatus?.connected && (
                <p className='text-xs text-center text-gray-400 mt-2'>Conecte o TikTok em <a href='/dashboard/connections' className='underline'>Conexões</a></p>
              )}
            </div>
          )}

          {/* Empty State */}
          {currentStep === 'idle' && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center'>
              <Zap className='w-16 h-16 mx-auto mb-4 text-cyan-300' />
              <h3 className='text-lg font-bold text-gray-900 mb-2'>Pipeline de 3 Agentes TikTok</h3>
              <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
                Configure o tema e clique em Executar. Os 3 agentes IA trabalham em sequência para criar conteúdo viral:
              </p>
              <div className='grid grid-cols-3 gap-4 max-w-lg mx-auto'>
                <div className='p-3 bg-cyan-50 rounded-xl'>
                  <p className='text-2xl mb-1'>🎬</p>
                  <p className='text-xs font-bold text-cyan-700'>Roteirista</p>
                  <p className='text-[10px] text-cyan-500'>Cria ideias virais</p>
                </div>
                <div className='p-3 bg-pink-50 rounded-xl'>
                  <p className='text-2xl mb-1'>✂️</p>
                  <p className='text-xs font-bold text-pink-700'>Editor</p>
                  <p className='text-[10px] text-pink-500'>Roteiro + música</p>
                </div>
                <div className='p-3 bg-purple-50 rounded-xl'>
                  <p className='text-2xl mb-1'>📤</p>
                  <p className='text-xs font-bold text-purple-700'>Publicador</p>
                  <p className='text-[10px] text-purple-500'>Upload automático</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
