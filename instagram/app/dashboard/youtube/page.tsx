'use client'
import React, { useState } from 'react'
import { Youtube, Loader2, Sparkles, Play, Mic, Captions, Video, AlertCircle, CheckCircle, TrendingUp, Search, Target, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const videoStyles = [
  { id: 'shorts', label: 'Shorts', icon: '📱', desc: 'Vídeo vertical até 60s' },
  { id: 'normal', label: 'Normal', icon: '🎬', desc: 'Vídeo completo 16:9' },
  { id: 'tutorial', label: 'Tutorial', icon: '📚', desc: 'Passo a passo educativo' },
  { id: 'podcast', label: 'Podcast', icon: '🎙️', desc: 'Áudio com imagens' },
]

const voices = [
  { id: 'pt-female', label: 'Feminina PT', lang: 'Português' },
  { id: 'pt-male', label: 'Masculina PT', lang: 'Português' },
  { id: 'en-female', label: 'Feminina EN', lang: 'Inglês' },
  { id: 'en-male', label: 'Masculina EN', lang: 'Inglês' },
]

type PipelineStep = 'config' | 'research' | 'strategy' | 'script' | 'preview'

export default function YouTubePage() {
  const [selectedStyle, setSelectedStyle] = useState('shorts')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [voice, setVoice] = useState('pt-female')
  const [tone, setTone] = useState('educativo')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<PipelineStep>('config')
  const [script, setScript] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [aiSource, setAiSource] = useState<'gemini' | 'local' | null>(null)
  const [researchData, setResearchData] = useState<string>('')
  const [strategyData, setStrategyData] = useState<string>('')
  const [trendScore, setTrendScore] = useState<number | null>(null)
  const [pipelineSteps, setPipelineSteps] = useState<{ step: number; label: string; done: boolean }[]>([])

  const createContent = useMutation(api.contents.create)
  const updateScriptMutation = useMutation(api.contents.updateScript)
  const generateYouTube = useAction(api.generateContent.generateYouTubeScript)
  const runResearch = useAction(api.aiEngine.researchTopic)
  const runStrategy = useAction(api.aiEngine.createStrategy)
  const runScript = useAction(api.aiEngine.generateScript)
  const runTrendScore = useAction(api.aiEngine.calculateTrendScore)

  const handleGenerate = async () => {
    if (!topic) return
    setLoading(true)
    setError(null)
    setSaved(false)
    setAiSource(null)
    setResearchData('')
    setStrategyData('')
    setTrendScore(null)

    const steps = [
      { step: 1, label: 'Pesquisando tema e tendências...', done: false },
      { step: 2, label: 'Analisando oportunidades...', done: false },
      { step: 3, label: 'Criando estratégia de conteúdo...', done: false },
      { step: 4, label: 'Gerando roteiro otimizado...', done: false },
      { step: 5, label: 'Calculando score de oportunidade...', done: false },
      { step: 6, label: 'Salvando no banco de dados...', done: false },
    ]
    setPipelineSteps(steps)
    setCurrentStep('research')

    try {
      // 1. Criar conteúdo no Convex
      const contentId = await createContent({
        title: topic,
        topic,
        platform: 'youtube',
        contentType: selectedStyle,
        tone,
        voice,
        style: selectedStyle,
        description,
        createdBy: 'user',
      })

      // 2. Research Engine
      setPipelineSteps(s => s.map((st, i) => i === 0 ? { ...st, done: true } : st))
      let researchResult: Record<string, unknown> | null = null
      try {
        researchResult = await runResearch({
          topic,
          platform: 'youtube',
          niche: description || undefined,
        })
        setResearchData(JSON.stringify(researchResult, null, 2))
        setPipelineSteps(s => s.map((st, i) => i === 1 ? { ...st, done: true } : st))
      } catch {
        setPipelineSteps(s => s.map((st, i) => i === 1 ? { ...st, done: true } : st))
      }

      // 3. Strategy Engine
      setCurrentStep('strategy')
      setPipelineSteps(s => s.map((st, i) => i === 2 ? { ...st, done: true } : st))
      let strategyResult: Record<string, unknown> | null = null
      try {
        strategyResult = await runStrategy({
          topic,
          platform: 'youtube',
          researchData: researchResult ? JSON.stringify(researchResult) : undefined,
          brandTone: tone,
          objective: 'educar',
        })
        setStrategyData(JSON.stringify(strategyResult, null, 2))
      } catch {
        // Continuar sem estratégia
      }

      // 4. Script Engine
      setCurrentStep('script')
      setPipelineSteps(s => s.map((st, i) => i === 3 ? { ...st, done: true } : st))
      let generatedTitle = topic
      let generatedScript = ''

      try {
        const result = await runScript({
          topic,
          platform: 'youtube',
          strategy: strategyResult ? JSON.stringify(strategyResult) : undefined,
          style: tone,
          voice,
          duration: selectedStyle === 'shorts' ? '30s' : '3min',
        })
        generatedTitle = result.title
        generatedScript = result.script
        setAiSource('gemini')
      } catch {
        try {
          const result = await generateYouTube({
            topic,
            style: selectedStyle,
            voice,
          })
          generatedTitle = result.title
          generatedScript = result.script
          setAiSource('gemini')
        } catch {
          generatedScript = generateLocalScript(topic, description, selectedStyle)
          setAiSource('local')
          setError('Gemini indisponível. Roteiro gerado localmente.')
        }
      }

      setTitle(generatedTitle)
      setScript(generatedScript)

      // 5. Trend Score
      setPipelineSteps(s => s.map((st, i) => i === 4 ? { ...st, done: true } : st))
      try {
        const score = await runTrendScore({ topic, platform: 'youtube' })
        setTrendScore(score.totalScore)
      } catch {
        // Sem score não é crítico
      }

      // 6. Salvar no Convex
      setPipelineSteps(s => s.map((st, i) => i === 5 ? { ...st, done: true } : st))
      await updateScriptMutation({
        contentId,
        script: generatedScript,
        hook: `Olá! Hoje vou te mostrar ${topic}. Fica até o final porque tem dica boa!`,
        title: generatedTitle,
        description: `Neste vídeo, você vai aprender sobre ${topic}. ${description || ''}`,
      })

      setSaved(true)
      setCurrentStep('preview')
    } catch (err) {
      const generatedScript = generateLocalScript(topic, description, selectedStyle)
      setScript(generatedScript)
      setTitle(topic)
      setAiSource('local')
      setCurrentStep('preview')
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
          <h1 className='text-2xl font-bold text-gray-900'>YouTube Studio</h1>
          <p className='text-gray-500 text-sm'>Pesquise, strategize e gere vídeos completos com IA</p>
        </div>
      </div>

      {/* Pipeline Visual */}
      {pipelineSteps.length > 0 && (
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
          <div className='flex items-center gap-2 overflow-x-auto pb-2'>
            {pipelineSteps.map((step, i) => (
              <React.Fragment key={i}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  step.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    step.done ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
                  }`}>
                    {step.done ? '✓' : step.step}
                  </div>
                  {step.label}
                </div>
                {i < pipelineSteps.length - 1 && <ChevronRight className='w-4 h-4 text-gray-300 shrink-0' />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className='grid lg:grid-cols-3 gap-6'>
        {/* Form */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Video Style */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h3 className='font-bold text-gray-900 mb-4'>Estilo do Vídeo</h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {videoStyles.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-4 rounded-xl border-2 transition text-left
                    ${selectedStyle === style.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <span className='text-2xl'>{style.icon}</span>
                  <p className='font-medium text-sm mt-2'>{style.label}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Content Settings */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h3 className='font-bold text-gray-900 mb-4'>Configurações</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Título / Tema</label>
                <Input
                  placeholder='Ex: 5 ferramentas de IA que vão mudar seu trabalho'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Descrição adicional</label>
                <Textarea
                  placeholder='Detalhes sobre o conteúdo do vídeo...'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Tom de Voz</label>
                <div className='flex flex-wrap gap-2'>
                  {['educativo', 'entretenimento', 'storytelling', 'tutorial', 'inspirador'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize
                        ${tone === t
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Voz / Narração</label>
                <div className='grid grid-cols-2 gap-2'>
                  {voices.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setVoice(v.id)}
                      className={`p-3 rounded-xl border-2 transition text-left flex items-center gap-3
                        ${voice === v.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100 hover:border-gray-200'
                        }`}
                    >
                      <Mic className={`w-5 h-5 ${voice === v.id ? 'text-red-500' : 'text-gray-400'}`} />
                      <div>
                        <p className='font-medium text-sm'>{v.label}</p>
                        <p className='text-xs text-gray-500'>{v.lang}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-yellow-500' />
                  <span className='text-sm text-yellow-700'>{error}</span>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!topic || loading}
                className='w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-6 text-lg'
              >
                {loading ? (
                  <><Loader2 className='w-5 h-5 animate-spin mr-2' /> Processando pipeline completo...</>
                ) : (
                  <><Sparkles className='w-5 h-5 mr-2' /> Iniciar Pipeline de Conteúdo</>
                )}
              </Button>
            </div>
          </div>

          {/* Research Results */}
          {researchData && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <Search className='w-5 h-5 text-blue-500' />
                <h3 className='font-bold text-gray-900'>Resultado da Pesquisa</h3>
              </div>
              <div className='bg-blue-50 rounded-xl p-4 max-h-60 overflow-y-auto'>
                <pre className='text-xs text-gray-700 whitespace-pre-wrap font-mono'>{researchData}</pre>
              </div>
            </div>
          )}

          {/* Strategy Results */}
          {strategyData && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <Target className='w-5 h-5 text-purple-500' />
                <h3 className='font-bold text-gray-900'>Estratégia de Conteúdo</h3>
              </div>
              <div className='bg-purple-50 rounded-xl p-4 max-h-60 overflow-y-auto'>
                <pre className='text-xs text-gray-700 whitespace-pre-wrap font-mono'>{strategyData}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className='space-y-6'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6'>
            <h3 className='font-bold text-gray-900 mb-4'>Pré-visualização</h3>

            {/* Trend Score */}
            {trendScore !== null && (
              <div className={`mb-4 p-4 rounded-xl text-center ${
                trendScore >= 70 ? 'bg-green-50 border border-green-200' :
                trendScore >= 40 ? 'bg-yellow-50 border border-yellow-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <p className='text-xs text-gray-500 mb-1'>Score de Oportunidade</p>
                <p className={`text-3xl font-bold ${
                  trendScore >= 70 ? 'text-green-600' :
                  trendScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>{trendScore}</p>
                <p className='text-xs text-gray-500 mt-1'>
                  {trendScore >= 70 ? 'Excelente oportunidade!' :
                   trendScore >= 40 ? 'Oportunidade moderada' : 'Considere outro ângulo'}
                </p>
              </div>
            )}

            {script ? (
              <div className='space-y-4'>
                {/* Fonte da IA */}
                {aiSource && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium w-fit ${
                    aiSource === 'gemini'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {aiSource === 'gemini' ? '✨ Gerado por Gemini IA' : '📝 Geração local'}
                  </div>
                )}

                {/* YouTube Mock */}
                <div className='border rounded-xl overflow-hidden'>
                  <div className='aspect-video bg-gradient-to-br from-red-100 to-gray-100 flex items-center justify-center relative'>
                    <Play className='w-16 h-16 text-red-500 opacity-80' />
                    <div className='absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded'>
                      {selectedStyle === 'shorts' ? '0:45' : '5:30'}
                    </div>
                  </div>
                  <div className='p-3'>
                    <p className='font-semibold text-sm'>{title || topic}</p>
                    <p className='text-xs text-gray-500 mt-1'>Altomatico • Agora</p>
                  </div>
                </div>

                <div className='bg-gray-50 rounded-xl p-4'>
                  <p className='text-xs font-medium text-gray-500 mb-2'>ROTEIRO COMPLETO</p>
                  <p className='text-sm text-gray-700 whitespace-pre-line max-h-60 overflow-y-auto'>{script}</p>
                </div>

                {saved && (
                  <div className='bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2'>
                    <CheckCircle className='w-4 h-4 text-green-500' />
                    <span className='text-sm text-green-700'>Salvo no banco de dados!</span>
                  </div>
                )}

                <Button className='w-full bg-gradient-to-r from-red-500 to-red-700 text-white'>
                  <Youtube className='w-4 h-4 mr-2' /> Publicar no YouTube
                </Button>
              </div>
            ) : (
              <div className='text-center py-12 text-gray-400'>
                <Play className='w-12 h-12 mx-auto mb-3 opacity-50' />
                <p className='text-sm'>Configure e inicie o pipeline de conteúdo</p>
                <p className='text-xs mt-1 text-gray-300'>Pesquisa → Estratégia → Roteiro</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function generateLocalScript(topic: string, description: string, style: string): string {
  var isShort = style === 'shorts'
  var duration = isShort ? '45 segundos' : '5 minutos'
  var desc = description || ('Vou te mostrar algo incrivel sobre ' + topic + '.')
  var cleanTopic = topic.toLowerCase().replace(/\s/g, '')

  if (isShort) {
    return [
      '# SHORT: ' + topic,
      '',
      '**Duracao:** ' + duration,
      '**Formato:** Vertical 9:16',
      '',
      '---',
      '',
      '**HOOK (0-3s)**',
      'RED PAROU DE SCROLLAR? Isso vai mudar como voce ve ' + topic + '!',
      '',
      '**CONTEUDO (3-35s)**',
      desc,
      '',
      'Aquilo que eu vou te mostrar agora poupa horas do seu dia.',
      '',
      '**CTA (35-45s)**',
      'Salva esse video! Compartilha com aquele amigo que precisa ver isso! Segue pra mais!',
      '',
      '---',
      '',
      '**Titulo:** ' + topic,
      '**Hashtags:** #shorts #' + cleanTopic + ' #dicas'
    ].join('\n')
  }

  return [
    '# ROTEIRO: ' + topic,
    '',
    '**Duracao:** ' + duration,
    '**Formato:** 16:9 Horizontal',
    '',
    '---',
    '',
    '**HOOK (0-5s)**',
    'Ola! Hoje vou te mostrar ' + topic + '. Fica ate o final porque tem uma dica que vai te surpreender!',
    '',
    '**ABERTURA (5-15s)**',
    'Se voce sempre quis entender melhor sobre ' + topic + ', esse video e pra voce. Vou explicar tudo de forma clara e objetiva.',
    '',
    '**DESENVOLVIMENTO (15-3:30min)**',
    desc,
    '',
    '1. **Primeiro ponto** - Contexto e importancia',
    '2. **Segundo ponto** - Como aplicar na pratica',
    '3. **Terceiro ponto** - Dicas avancadas que poucos conhecem',
    '',
    '**CONCLUSAO (3:30-5:00min)**',
    'Resumindo: ' + topic + ' e essencial para quem quer resultados. Aplica essas dicas e me conta nos comentarios como foi!',
    '',
    'Se esse conteudo te ajudou, deixa o like, se inscreve no canal e ativa o sininho pra nao perder os proximos videos!',
    '',
    '---',
    '',
    '**Titulo sugerido:** ' + topic,
    '**Descricao:** ' + topic + ' - Neste video explico tudo que voce precisa saber.',
    '**Tags:** #' + cleanTopic + ' #conteudo #dicas #educacao'
  ].join('\n')
}
