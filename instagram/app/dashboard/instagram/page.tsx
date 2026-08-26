'use client'
import React, { useState } from 'react'
import { Instagram, Send, Loader2, Copy, Sparkles, CheckCircle, AlertCircle, Search, Target, TrendingUp, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const postTypes = [
  { id: 'post', label: 'Post', icon: '📷', desc: 'Postagem comum no feed' },
  { id: 'reel', label: 'Reel', icon: '🎬', desc: 'Vídeo curto vertical' },
  { id: 'story', label: 'Story', icon: '📱', desc: 'História temporária' },
  { id: 'carousel', label: 'Carousel', icon: '🖼️', desc: 'Múltiplas imagens' },
]

const niches = [
  'Moda', 'Fitness', 'Culinária', 'Viagem', 'Tecnologia',
  'Marketing', 'Educação', 'Humor', 'Negócios', 'Lifestyle',
  'Beleza', 'Saúde', 'Pets', 'Fotografia', 'Música'
]

export default function InstagramPage() {
  const [selectedType, setSelectedType] = useState('post')
  const [niche, setNiche] = useState('')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('profissional')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<{ caption: string; hashtags: string[]; firstLine: string; cta: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [aiSource, setAiSource] = useState<'gemini' | 'local' | null>(null)
  const [researchData, setResearchData] = useState('')
  const [strategyData, setStrategyData] = useState('')
  const [trendScore, setTrendScore] = useState<number | null>(null)
  const [pipelineSteps, setPipelineSteps] = useState<{ step: number; label: string; done: boolean }[]>([])

  const createContent = useMutation(api.contents.create)
  const updateScript = useMutation(api.contents.updateScript)
  const generatePost = useAction(api.generateContent.generateInstagramPost)
  const runResearch = useAction(api.aiEngine.researchTopic)
  const runStrategy = useAction(api.aiEngine.createStrategy)
  const runInstagramSEO = useAction(api.seoEngine.generateInstagramSEO)
  const runTrendScore = useAction(api.aiEngine.calculateTrendScore)

  const handleGenerate = async () => {
    if (!topic) return
    setLoading(true)
    setError(null)
    setGenerated(null)
    setSaved(false)
    setAiSource(null)
    setResearchData('')
    setStrategyData('')
    setTrendScore(null)

    const steps = [
      { step: 1, label: 'Pesquisando tema...', done: false },
      { step: 2, label: 'Analisando oportunidades...', done: false },
      { step: 3, label: 'Criando estratégia...', done: false },
      { step: 4, label: 'Gerando conteúdo com IA...', done: false },
      { step: 5, label: 'Calculando score...', done: false },
      { step: 6, label: 'Salvando...', done: false },
    ]
    setPipelineSteps(steps)

    try {
      // 1. Criar conteúdo no Convex
      const contentId = await createContent({
        title: topic,
        topic,
        platform: 'instagram',
        contentType: selectedType,
        niche,
        tone,
        createdBy: 'user',
      })

      // 2. Research Engine
      setPipelineSteps(s => s.map((st, i) => i === 0 ? { ...st, done: true } : st))
      let researchResult: Record<string, unknown> | null = null
      try {
        researchResult = await runResearch({
          topic,
          platform: 'instagram',
          niche: niche || undefined,
        })
        setResearchData(JSON.stringify(researchResult, null, 2))
        setPipelineSteps(s => s.map((st, i) => i === 1 ? { ...st, done: true } : st))
      } catch {
        setPipelineSteps(s => s.map((st, i) => i === 1 ? { ...st, done: true } : st))
      }

      // 3. Strategy Engine
      setPipelineSteps(s => s.map((st, i) => i === 2 ? { ...st, done: true } : st))
      let strategyResult: Record<string, unknown> | null = null
      try {
        strategyResult = await runStrategy({
          topic,
          platform: 'instagram',
          researchData: researchResult ? JSON.stringify(researchResult) : undefined,
          brandNiche: niche || undefined,
          brandTone: tone,
          objective: 'engajar',
        })
        setStrategyData(JSON.stringify(strategyResult, null, 2))
      } catch {
        // Continuar
      }

      // 4. Gerar conteúdo Instagram
      setPipelineSteps(s => s.map((st, i) => i === 3 ? { ...st, done: true } : st))
      let caption = ''
      let hashtags: string[] = []
      let firstLine = ''
      let cta = ''

      try {
        const result = await generatePost({
          topic,
          niche: niche || undefined,
          tone,
          postType: selectedType,
        })
        caption = result.caption
        hashtags = result.hashtags
        firstLine = result.firstLine
        cta = result.cta
        setAiSource('gemini')
      } catch {
        caption = generateLocalCaption(topic, niche, tone)
        hashtags = generateLocalHashtags(topic, niche)
        firstLine = caption.split('\n')[0] || topic
        cta = 'Salve e compartilhe!'
        setAiSource('local')
        setError('Gemini indisponível. Conteúdo gerado localmente.')
      }

      setGenerated({ caption, hashtags, firstLine, cta })

      // 5. Trend Score
      setPipelineSteps(s => s.map((st, i) => i === 4 ? { ...st, done: true } : st))
      try {
        const score = await runTrendScore({ topic, platform: 'instagram', niche: niche || undefined })
        setTrendScore(score.totalScore)
      } catch {
        // Continuar
      }

      // 6. Salvar no Convex
      setPipelineSteps(s => s.map((st, i) => i === 5 ? { ...st, done: true } : st))
      await updateScript({
        contentId,
        script: caption,
        hook: firstLine,
        cta,
      })

      setSaved(true)
    } catch (err) {
      const caption = generateLocalCaption(topic, niche, tone)
      const hashtags = generateLocalHashtags(topic, niche)
      setGenerated({
        caption,
        hashtags,
        firstLine: caption.split('\n')[0] || topic,
        cta: 'Salve e compartilhe!',
      })
      setAiSource('local')
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
          <h1 className='text-2xl font-bold text-gray-900'>Instagram Studio</h1>
          <p className='text-gray-500 text-sm'>Pesquise, strategize e gere posts completos com IA</p>
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
          {/* Post Type */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h3 className='font-bold text-gray-900 mb-4'>Tipo de Post</h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {postTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-xl border-2 transition text-left
                    ${selectedType === type.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <span className='text-2xl'>{type.icon}</span>
                  <p className='font-medium text-sm mt-2'>{type.label}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Content Settings */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
            <h3 className='font-bold text-gray-900 mb-4'>Configurações</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Nicho</label>
                <div className='flex flex-wrap gap-2'>
                  {niches.map(n => (
                    <button
                      key={n}
                      onClick={() => setNiche(n)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition
                        ${niche === n
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Tópico / Tema</label>
                <Input
                  placeholder='Ex: 5 dicas para produtividade no home office'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Descrição adicional</label>
                <Textarea
                  placeholder='Detalhes sobre o conteúdo do post...'
                  value={''}
                  onChange={() => {}}
                  rows={2}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Tom de Voz</label>
                <div className='flex flex-wrap gap-2'>
                  {['profissional', 'casual', 'engajante', 'inspirador', 'humorístico'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize
                        ${tone === t
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t}
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
                className='w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-6 text-lg'
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

            {generated ? (
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

                {/* Instagram Mock */}
                <div className='border rounded-xl overflow-hidden'>
                  <div className='flex items-center gap-3 p-3 border-b'>
                    <div className='w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full' />
                    <span className='font-semibold text-sm'>seu.perfil</span>
                  </div>
                  <div className='aspect-square bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center'>
                    <Instagram className='w-12 h-12 text-pink-300' />
                  </div>
                  <div className='p-3'>
                    <p className='text-sm whitespace-pre-line'>{generated.caption}</p>
                    <div className='mt-2 flex flex-wrap gap-1'>
                      {generated.hashtags.map((h, i) => (
                        <span key={i} className='text-blue-600 text-xs'>{h}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {saved && (
                  <div className='bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2'>
                    <CheckCircle className='w-4 h-4 text-green-500' />
                    <span className='text-sm text-green-700'>Salvo no banco de dados!</span>
                  </div>
                )}

                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generated.caption + '\n\n' + generated.hashtags.join(' '))
                  }}
                  variant='outline'
                  className='w-full'
                >
                  <Copy className='w-4 h-4 mr-2' /> Copiar
                </Button>

                <Button className='w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white'>
                  <Send className='w-4 h-4 mr-2' /> Publicar Agora
                </Button>
              </div>
            ) : (
              <div className='text-center py-12 text-gray-400'>
                <Sparkles className='w-12 h-12 mx-auto mb-3 opacity-50' />
                <p className='text-sm'>Configure e inicie o pipeline de conteúdo</p>
                <p className='text-xs mt-1 text-gray-300'>Pesquisa → Estratégia → Conteúdo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function generateLocalCaption(topic: string, niche: string, tone: string): string {
  const tones: Record<string, string> = {
    profissional: `📊 ${topic}\n\nConteúdo profissional para engajar seu público. Análise completa e dados atualizados.`,
    casual: `Hey! 😊 ${topic}\n\nAlgo mais leve pra você que curte conteúdo de qualidade! Bora lá?`,
    engajante: `🔥 SALVA ESSE POST! ${topic}\n\nVocê não vai querer perder isso! Compartilha com quem precisa!`,
    inspirador: `💪 ${topic}\n\nAcredite no seu potencial. Cada passo conta na sua jornada. Comece hoje!`,
    'humorístico': `😂 ${topic}\n\nQuemIdentifica? Compartilha com aquele amigo que precisa ver isso!`,
  }
  const base = tones[tone] || tones.profissional
  const nicheTag = niche ? `\n\n#${niche.toLowerCase().replace(/\s/g, '')}` : ''
  const cta = '\n\n💬 Comenta abaixo o que achou! 👇'
  return base + nicheTag + cta
}

function generateLocalHashtags(topic: string, niche: string): string[] {
  const base = ['#conteudo', '#marketing', '#dicas', '#socialmedia']
  const nicheTag = niche ? [`#${niche.toLowerCase().replace(/\s/g, '')}`] : []
  const topicWords = topic.split(' ').slice(0, 4).map(w => {
    const clean = w.toLowerCase().replace(/[^a-záàãâéêíóôõúç]/gi, '')
    return clean.length > 2 ? `#${clean}` : null
  }).filter(Boolean) as string[]
  return [...base, ...nicheTag, ...topicWords].slice(0, 10)
}
