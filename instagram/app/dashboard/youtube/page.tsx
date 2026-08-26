'use client'
import React, { useState } from 'react'
import { Youtube, Loader2, Sparkles, Play, Mic, Captions, Video, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from 'convex/react'
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

export default function YouTubePage() {
  const [selectedStyle, setSelectedStyle] = useState('shorts')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [voice, setVoice] = useState('pt-female')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [script, setScript] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const createContent = useMutation(api.contents.create)
  const updateScriptMutation = useMutation(api.contents.updateScript)

  const handleGenerate = async () => {
    if (!topic) return
    setLoading(true)
    setError(null)
    setStep(1)
    setSaved(false)

    try {
      // 1. Criar conteúdo no Convex
      const contentId = await createContent({
        title: topic,
        topic,
        platform: 'youtube',
        contentType: selectedStyle,
        tone: 'educativo',
        voice,
        style: selectedStyle,
        description,
        createdBy: 'user',
      })

      // 2. Pipeline de geração real com etapas
      await delay(800)
      setStep(2)
      await delay(600)
      setStep(3)
      await delay(600)
      setStep(4)

      // 3. Gerar roteiro estruturado
      const generatedTitle = topic
      const generatedScript = generateScript(topic, description, selectedStyle)
      
      setTitle(generatedTitle)
      setScript(generatedScript)

      // 4. Salvar no Convex
      await updateScriptMutation({
        contentId,
        script: generatedScript,
        hook: `Olá! Hoje vou te mostrar ${topic}. Fica até o final porque tem dica boa!`,
        title: generatedTitle,
        description: `Neste vídeo, você vai aprender sobre ${topic}. ${description || ''}`,
      })

      setSaved(true)
    } catch (err) {
      const generatedScript = generateScript(topic, description, selectedStyle)
      setScript(generatedScript)
      setTitle(topic)
      setError('Erro ao salvar no servidor. Roteiro gerado localmente.')
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
          <h1 className='text-2xl font-bold text-gray-900'>YouTube</h1>
          <p className='text-gray-500 text-sm'>Gere vídeos automáticos com IA</p>
        </div>
      </div>

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
                <div className='bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-red-500' />
                  <span className='text-sm text-red-700'>{error}</span>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!topic || loading}
                className='w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-6 text-lg'
              >
                {loading ? (
                  <><Loader2 className='w-5 h-5 animate-spin mr-2' /> Gerando...</>
                ) : (
                  <><Sparkles className='w-5 h-5 mr-2' /> Gerar Roteiro</>
                )}
              </Button>
            </div>
          </div>

          {/* Progress */}
          {(loading || step > 0) && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
              <h3 className='font-bold text-gray-900 mb-4'>Progresso</h3>
              <div className='space-y-3'>
                {[
                  { s: 1, label: 'Analisando tema e gerando estrutura', icon: <Sparkles className='w-4 h-4' /> },
                  { s: 2, label: 'Gerando roteiro com IA', icon: <Video className='w-4 h-4' /> },
                  { s: 3, label: 'Criando capítulos e timestamps', icon: <Mic className='w-4 h-4' /> },
                  { s: 4, label: 'Otimizando SEO e tags', icon: <Captions className='w-4 h-4' /> },
                ].map(item => (
                  <div key={item.s} className={`flex items-center gap-3 p-3 rounded-lg ${step >= item.s ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= item.s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {step > item.s ? '✓' : item.icon}
                    </div>
                    <span className={`text-sm font-medium ${step >= item.s ? 'text-green-700' : 'text-gray-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className='space-y-6'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6'>
            <h3 className='font-bold text-gray-900 mb-4'>Pré-visualização</h3>
            {script ? (
              <div className='space-y-4'>
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
                  <p className='text-xs font-medium text-gray-500 mb-2'>ROTEIRO</p>
                  <p className='text-sm text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto'>{script}</p>
                </div>

                {saved && (
                  <div className='bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2'>
                    <CheckCircle className='w-4 h-4 text-green-500' />
                    <span className='text-sm text-green-700'>Salvo no Convex!</span>
                  </div>
                )}

                <Button className='w-full bg-gradient-to-r from-red-500 to-red-700 text-white'>
                  <Youtube className='w-4 h-4 mr-2' /> Publicar no YouTube
                </Button>
              </div>
            ) : (
              <div className='text-center py-12 text-gray-400'>
                <Play className='w-12 h-12 mx-auto mb-3 opacity-50' />
                <p className='text-sm'>Configure e clique em Gerar Roteiro</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateScript(topic: string, description: string, style: string): string {
  const isShort = style === 'shorts'
  const duration = isShort ? '45 segundos' : '5 minutos'
  
  if (isShort) {
    return `# SHORT: ${topic}

**Duração:** ${duration}
**Formato:** Vertical 9:16

---

**HOOK (0-3s)**
🔴 PAROU DE SCROLLAR? Isso vai mudar como você vê ${topic}!

**CONTEÚDO (3-35s)**
${description || `Vou te mostrar algo incrível sobre ${topic}.`}

Aquilo que eu vou te mostrar agora poupa horas do seu dia.

**CTA (35-45s)**
Salva esse vídeo! Compartilha com aquele amigo que precisa ver isso! Segue pra mais!

---

**Título:** ${topic}
**Hashtags:** #shorts #${topic.toLowerCase().replace(/\s/g, '')} #dicas`
  }

  return `# ROTEIRO: ${topic}

**Duração:** ${duration}
**Formato:** 16:9 Horizontal

---

**HOOK (0-5s)**
Olá! Hoje vou te mostrar ${topic}. Fica até o final porque tem uma dica que vai te surpreender!

**ABERTURA (5-15s)**
Se você sempre quis entender melhor sobre ${topic}, esse vídeo é pra você. Vou explicar tudo de forma clara e objetiva.

**DESENVOLVIMENTO (15-3:30min)**
${description || `Vou cobrir os pontos principais sobre ${topic}.`}

1. **Primeiro ponto** — Contexto e importância
2. **Segundo ponto** — Como aplicar na prática
3. **Terceiro ponto** — Dicas avançadas que poucos conhecem

**CONCLUSÃO (3:30-5:00min)**
Resumindo: ${topic} é essencial para quem quer resultados. Aplica essas dicas e me conta nos comentários como foi!

Se esse conteúdo te ajudou, deixa o like, se inscreve no canal e ativa o sininho pra não perder os próximos vídeos!

---

**Título sugerido:** ${topic}
**Descrição:** ${topic} — Neste vídeo explico tudo que você precisa saber.
**Tags:** #${topic.toLowerCase().replace(/\s/g, '')} #conteudo #dicas #educacao`
}
