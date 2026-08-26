'use client'
import React, { useState } from 'react'
import { Instagram, Send, Loader2, Copy, Sparkles, Hash, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
  const [generated, setGenerated] = useState<{ caption: string; hashtags: string[] } | null>(null)

  const handleGenerate = async () => {
    if (!topic) return
    setLoading(true)
    // Simular geração - em produção usa Gemini API
    await new Promise(r => setTimeout(r, 2000))
    setGenerated({
      caption: `✨ ${topic}\n\n${getCaptionByTone(tone)}\n\n${niche ? `#${niche.toLowerCase().replace(/\s/g, '')}` : ''}`,
      hashtags: generateHashtags(topic, niche),
    })
    setLoading(false)
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-8'>
        <div className='w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center'>
          <Instagram className='w-6 h-6 text-white' />
        </div>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Instagram</h1>
          <p className='text-gray-500 text-sm'>Gere posts automáticos com IA</p>
        </div>
      </div>

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
                <label className='block text-sm font-medium text-gray-700 mb-1'>Tom de Voz</label>
                <div className='flex gap-2'>
                  {['profissional', 'casual', 'engajante', 'inspirador'].map(t => (
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

              <Button
                onClick={handleGenerate}
                disabled={!topic || loading}
                className='w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-6 text-lg'
              >
                {loading ? (
                  <><Loader2 className='w-5 h-5 animate-spin mr-2' /> Gerando...</>
                ) : (
                  <><Sparkles className='w-5 h-5 mr-2' /> Gerar Conteúdo</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className='space-y-6'>
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6'>
            <h3 className='font-bold text-gray-900 mb-4'>Pré-visualização</h3>
            {generated ? (
              <div className='space-y-4'>
                {/* Instagram Mock */}
                <div className='border rounded-xl overflow-hidden'>
                  <div className='flex items-center gap-3 p-3 border-b'>
                    <div className='w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full' />
                    <span className='font-semibold text-sm'>seu.perfil</span>
                  </div>
                  <div className='aspect-square bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center'>
                    <Image className='w-12 h-12 text-pink-300' />
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

                <Button
                  onClick={() => navigator.clipboard.writeText(generated.caption + '\n\n' + generated.hashtags.join(' '))}
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
                <p className='text-sm'>Preencha o formulário e clique em Gerar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getCaptionByTone(tone: string): string {
  const captions: Record<string, string> = {
    profissional: 'Conteúdo profissional para engajar seu público.',
    casual: 'Ei! Tudo bem? Esse post é pra você que quer algo mais leve 😊',
    engajante: '🔥 SALVA esse post! Você não vai querer perder isso!',
    inspirador: 'Acredite no seu potencial. Cada passo conta na sua jornada. 💪',
  }
  return captions[tone] || captions.profissional
}

function generateHashtags(topic: string, niche: string): string[] {
  const base = ['#conteudo', '#marketing', '#dicas']
  const nicheTag = niche ? [`#${niche.toLowerCase().replace(/\s/g, '')}`] : []
  const topicWords = topic.split(' ').slice(0, 3).map(w => `#${w.toLowerCase()}`)
  return [...base, ...nicheTag, ...topicWords].slice(0, 8)
}
