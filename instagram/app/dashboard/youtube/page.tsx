'use client'
import React, { useState } from 'react'
import { Youtube, Loader2, Sparkles, Play, Mic, Captions, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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

  const handleGenerate = async () => {
    if (!topic) return
    setLoading(true)
    setStep(1)
    // Simular geração de roteiro
    await new Promise(r => setTimeout(r, 2000))
    setScript(`# Roteiro: ${topic}\n\n**Introdução (0-5s)**\nOlá! Hoje vou te mostrar ${topic}.\n\n**Conteúdo Principal (5-45s)**\n${description || 'Vou explicar tudo passo a passo para você entender perfeitamente.'}\n\n**Conclusão (45-60s)**\nSe gostou, deixe seu like e se inscreva!`)
    setStep(2)
    await new Promise(r => setTimeout(r, 1500))
    setStep(3)
    await new Promise(r => setTimeout(r, 1500))
    setStep(4)
    setLoading(false)
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

              <Button
                onClick={handleGenerate}
                disabled={!topic || loading}
                className='w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-6 text-lg'
              >
                {loading ? (
                  <><Loader2 className='w-5 h-5 animate-spin mr-2' /> Gerando...</>
                ) : (
                  <><Sparkles className='w-5 h-5 mr-2' /> Gerar Vídeo</>
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
                  { s: 1, label: 'Gerando roteiro com IA', icon: <Sparkles className='w-4 h-4' /> },
                  { s: 2, label: 'Buscando vídeos de stock', icon: <Video className='w-4 h-4' /> },
                  { s: 3, label: 'Gerando narração (TTS)', icon: <Mic className='w-4 h-4' /> },
                  { s: 4, label: 'Adicionando legendas', icon: <Captions className='w-4 h-4' /> },
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
                    <p className='font-semibold text-sm'>{topic}</p>
                    <p className='text-xs text-gray-500 mt-1'>Altomatico • Agora</p>
                  </div>
                </div>

                <div className='bg-gray-50 rounded-xl p-4'>
                  <p className='text-xs font-medium text-gray-500 mb-2'>ROTEIRO</p>
                  <p className='text-sm text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto'>{script}</p>
                </div>

                <Button className='w-full bg-gradient-to-r from-red-500 to-red-700 text-white'>
                  <Youtube className='w-4 h-4 mr-2' /> Publicar no YouTube
                </Button>
              </div>
            ) : (
              <div className='text-center py-12 text-gray-400'>
                <Play className='w-12 h-12 mx-auto mb-3 opacity-50' />
                <p className='text-sm'>Configure e clique em Gerar Vídeo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
