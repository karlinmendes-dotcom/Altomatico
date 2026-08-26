'use client'
import React, { useState } from 'react'
import { Settings, Save, Youtube, Instagram, Brain, Clock, Shield, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const LLM_OPTIONS = [
  { id: 'gemini', name: 'Gemini 2.0 Flash', desc: 'Rápido e eficiente' },
  { id: 'gpt4', name: 'GPT-4o', desc: 'Alta qualidade' },
  { id: 'claude', name: 'Claude 3.5', desc: 'Ótimo para texto' },
]

const VOICE_OPTIONS = [
  { id: 'pt-female-1', name: 'Feminina PT - Ana', lang: 'Português' },
  { id: 'pt-male-1', name: 'Masculina PT - Pedro', lang: 'Português' },
  { id: 'en-female-1', name: 'Feminina EN - Sarah', lang: 'Inglês' },
  { id: 'en-male-1', name: 'Masculina EN - James', lang: 'Inglês' },
]

const AUTOMATION_MODES = [
  { id: 'manual', name: 'Manual', desc: 'Nada publica sem sua aprovação', icon: '✋' },
  { id: 'semi', name: 'Semi-automático', desc: 'IA cria, você aprova', icon: '🤝' },
  { id: 'automatic', name: 'Automático', desc: 'IA pesquisa, cria e publica', icon: '🤖' },
]

export default function SettingsPage() {
  const settings = useQuery(api.settings.getDefault)
  const createOrUpdate = useMutation(api.settings.createOrUpdate)

  const [brandName, setBrandName] = useState('')
  const [brandNiche, setBrandNiche] = useState('')
  const [brandTone, setBrandTone] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [preferredLlm, setPreferredLlm] = useState('gemini')
  const [preferredVoice, setPreferredVoice] = useState('pt-female-1')
  const [automationMode, setAutomationMode] = useState('manual')
  const [prohibitedKeywords, setProhibitedKeywords] = useState('')
  const [prohibitedTopics, setProhibitedTopics] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    try {
      await createOrUpdate({
        userId: 'default',
        brandName,
        brandNiche,
        brandTone,
        brandVoice,
        preferredLlm,
        preferredVoice,
        automationMode: automationMode as 'manual' | 'semi' | 'automatic',
        prohibitedKeywords: prohibitedKeywords.split(',').map(k => k.trim()).filter(Boolean),
        prohibitedTopics: prohibitedTopics.split(',').map(t => t.trim()).filter(Boolean),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar:', err)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center'>
            <Settings className='w-6 h-6 text-white' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Configurações</h1>
            <p className='text-gray-500 text-sm'>Personalize o Altomatico</p>
          </div>
        </div>
        <Button onClick={handleSave} className='bg-gradient-to-r from-purple-600 to-pink-600 text-white'>
          {saved ? <><CheckCircle className='w-4 h-4 mr-2' /> Salvo!</> : <><Save className='w-4 h-4 mr-2' /> Salvar</>}
        </Button>
      </div>

      <div className='grid lg:grid-cols-2 gap-6'>
        {/* Brand Identity */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
            <span className='text-xl'>🎨</span> Identidade da Marca
          </h3>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Nome da Marca/Canal</label>
              <Input placeholder='Ex: TechTips Brasil' value={brandName} onChange={e => setBrandName(e.target.value)} />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Nicho</label>
              <Input placeholder='Ex: Tecnologia, Fitness, Culária' value={brandNiche} onChange={e => setBrandNiche(e.target.value)} />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Tom de Voz</label>
              <Input placeholder='Ex: Profissional, casual, divertido' value={brandTone} onChange={e => setBrandTone(e.target.value)} />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Estilo de Voz</label>
              <Input placeholder='Ex: Técnico mas acessível' value={brandVoice} onChange={e => setBrandVoice(e.target.value)} />
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
            <Brain className='w-5 h-5 text-purple-500' /> Configurações de IA
          </h3>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Modelo de IA Preferido</label>
              <div className='space-y-2'>
                {LLM_OPTIONS.map(llm => (
                  <button
                    key={llm.id}
                    onClick={() => setPreferredLlm(llm.id)}
                    className={`w-full p-3 rounded-xl border-2 transition text-left flex items-center justify-between
                      ${preferredLlm === llm.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-100 hover:border-gray-200'
                      }`}
                  >
                    <div>
                      <p className='font-medium text-sm'>{llm.name}</p>
                      <p className='text-xs text-gray-500'>{llm.desc}</p>
                    </div>
                    {preferredLlm === llm.id && <CheckCircle className='w-4 h-4 text-purple-500' />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Voz Preferida (TTS)</label>
              <div className='grid grid-cols-2 gap-2'>
                {VOICE_OPTIONS.map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => setPreferredVoice(voice.id)}
                    className={`p-3 rounded-xl border-2 transition text-left
                      ${preferredVoice === voice.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-100 hover:border-gray-200'
                      }`}
                  >
                    <p className='font-medium text-xs'>{voice.name}</p>
                    <p className='text-xs text-gray-500'>{voice.lang}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Automation Mode */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
            <span className='text-xl'>⚡</span> Modo de Automação
          </h3>
          <div className='space-y-3'>
            {AUTOMATION_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setAutomationMode(mode.id)}
                className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center gap-4
                  ${automationMode === mode.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-100 hover:border-gray-200'
                  }`}
              >
                <span className='text-2xl'>{mode.icon}</span>
                <div>
                  <p className='font-medium text-sm'>{mode.name}</p>
                  <p className='text-xs text-gray-500'>{mode.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Safety Rules */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
            <Shield className='w-5 h-5 text-red-500' /> Regras de Segurança
          </h3>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Palavras Proibidas</label>
              <Textarea
                placeholder='Separar por vírgula: palavra1, palavra2, palavra3'
                value={prohibitedKeywords}
                onChange={e => setProhibitedKeywords(e.target.value)}
                rows={3}
              />
              <p className='text-xs text-gray-400 mt-1'>Conteúdo com essas palavras será bloqueado</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Temas Proibidos</label>
              <Textarea
                placeholder='Separar por vírgula: tema1, tema2, tema3'
                value={prohibitedTopics}
                onChange={e => setProhibitedTopics(e.target.value)}
                rows={3}
              />
              <p className='text-xs text-gray-400 mt-1'>Conteúdo sobre esses temas será bloqueado</p>
            </div>
          </div>
        </div>

        {/* Platform Connections */}
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2'>
          <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
            <span className='text-xl'>🔗</span> Conexões de Plataforma
          </h3>
          <div className='grid md:grid-cols-2 gap-4'>
            <div className='border rounded-xl p-4'>
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center'>
                  <Youtube className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p className='font-medium'>YouTube</p>
                  <p className='text-xs text-gray-500'>Upload automático de vídeos</p>
                </div>
              </div>
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700'>
                ⚠️ Configure as credenciais OAuth do YouTube no Convex para habilitar a publicação automática.
              </div>
            </div>

            <div className='border rounded-xl p-4'>
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg flex items-center justify-center'>
                  <Instagram className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p className='font-medium'>Instagram</p>
                  <p className='text-xs text-gray-500'>Postagem automática</p>
                </div>
              </div>
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700'>
                ⚠️ Configure o token do Meta Graph API no Convex para habilitar a publicação automática.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
