import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/generate-now
// Gera conteúdo manualmente para um canal via Gemini AI
// ═══════════════════════════════════════════════════════════════

interface GenerateRequest {
  channelName: string
  niche: string
  systemPrompt: string
  mode: 'AUTO_GENERATED' | 'URL_CLIPS'
  targetUrl?: string
  platform: 'youtube' | 'instagram' | 'tiktok'
  postStyle?: 'carousel' | 'reel' | 'static' | 'story'
}

interface CarouselSlide {
  slideNumber: number
  headline: string
  subtext: string
  visualDescription: string
  backgroundColor: string
  textColor: string
}

interface GeneratedContent {
  title: string
  hook: string
  script: string
  caption: string
  hashtags: string[]
  visualConcept: string
  musicSuggestion: string
  duration: string
  bestTime: string
  carouselSlides?: CarouselSlide[]
  postType?: string
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Erro na API Gemini (${GEMINI_MODEL}): ${err}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini retornou resposta vazia')
  return text
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return fallback
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { channelName, niche, systemPrompt, mode, targetUrl, platform } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
    }

    const platformLabel = platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : 'TikTok'

    const postStyle = body.postStyle || 'carousel'
    let prompt: string

    if (platform === 'instagram' && (postStyle === 'carousel' || postStyle === 'static')) {
      // ─── INSTAGRAM CAROUSEL/STATICO: Posts profissionais estilo portfolio ───
      prompt = `Você é um Designer de Conteúdo Visual profissional especializado em Instagram.

Canal: ${channelName}
Nicho: ${niche}
${systemPrompt ? `Instruções personalizadas: ${systemPrompt}` : ''}

Crie um POST CARROSSEL para Instagram com 5 a 8 slides profissionais.

ESTILO VISUAL (obrigatório):
- Fundo com gradientes modernos (laranja, azul, roxo, verde — combine com o nicho)
- Mockups de celular/tablet mostrando a solução/produto
- Tipografia bold e impactante (títulos grandes)
- Design limpo e profissional — pareça uma agência de design
- Cada slide tem uma função: Capa → Problema → Solução → Benefícios → Depoimento → CTA

FORMATO DOS SLIDES:
- Slide 1 (Capa): Título chamativo grande + mockup de celular
- Slide 2-3 (Problema/Solução): Texto curto + ícone/mockup
- Slide 4-5 (Benefícios): Lista visual com checkmarks
- Slide 6 (CTA): Chamada para ação com link/botão visual

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título otimizado SEO (máx 60 chars)",
  "hook": "gancho irresistível",
  "script": "roteiro do post",
  "caption": "legenda completa com emojis, quebras de linha e CTA",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "visualConcept": "descrição geral do estilo visual",
  "musicSuggestion": "mood da música",
  "duration": "N/A — Post estático/carrossel",
  "bestTime": "melhor horário para postar",
  "postType": "carousel",
  "carouselSlides": [
    {
      "slideNumber": 1,
      "headline": "Título grande e impactante da capa",
      "subtext": "Subtítulo ou tagline curta",
      "visualDescription": "Descrição do que aparece: mockup de celular com interface, gradiente laranja para azul no fundo",
      "backgroundColor": "gradiente de #FF6B35 para #004E89",
      "textoColor": "#FFFFFF"
    },
    {
      "slideNumber": 2,
      "headline": "O Problema",
      "subtext": "Texto curto descrevendo a dor do cliente",
      "visualDescription": "Ícone de problema + mockup escuro",
      "backgroundColor": "gradiente de #1A1A2E para #16213E",
      "textoColor": "#FFFFFF"
    }
  ]
}

IMPORTANTE para os slides:
- Cada slide DEVE ter uma descrição visual CLARA para geração de imagem
- Os colors devem ser hex codes ou gradientes CSS
- O headline deve ser curto e impactante (máx 6 palavras)
- O subtext complementa em 1-2 frases curtas
- Inclua de 5 a 8 slides no total
- O último slide SEMPRE é CTA
- Tudo em português brasileiro
- Tom: profissional, moderno, confiante — como uma agência de design premium`
    } else if (mode === 'URL_CLIPS') {
      prompt = `Você é um criador de conteúdo viral especializado em ${platformLabel}.

Canal: ${channelName}
Nicho: ${niche}
${systemPrompt ? `Instruções personalizadas: ${systemPrompt}` : ''}
URL de referência: ${targetUrl || '(não fornecida)'}

Com base no contexto da URL fornecida, gere um conteúdo para recorte/clip:
1. Um título chamativo (máx 60 caracteres)
2. Um gancho/hook irresistível (primeiros 3 segundos)
3. Um roteiro curto cena a cena (15-30 segundos)
4. Uma legenda completa com emojis
5. 10 hashtags estratégicas relevantes ao nicho
6. Direção visual (o que aparece na tela)
7. Sugestão de música/mood sonoro

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título chamativo",
  "hook": "gancho dos primeiros 3 segundos",
  "script": "roteiro cena a cena",
  "caption": "legenda completa com emojis e quebras de linha",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "visualConcept": "direção visual descritiva",
  "musicSuggestion": "música ou mood sugerido",
  "duration": "15-30s",
  "bestTime": "horário sugerido para postar"
}`
    } else {
      prompt = `Você é um criador de conteúdo profissional e viral para ${platformLabel}.

Canal: ${channelName}
Nicho: ${niche}
${systemPrompt ? `Instruções personalizadas do canal:\n${systemPrompt}` : 'Crie conteúdo envolvente e de alta qualidade para este nicho.'}

Gere um conteúdo COMPLETO para postagem automática:

1. Título otimizado para SEO (máx 60 caracteres)
2. Gancho/Hook irresistível (primeiros 3 segundos do vídeo ou primeira linha do post)
3. Roteiro completo cena a cena (desenvolvimento, 15-60 segundos)
4. CTA forte no final (chamada para ação)
5. Legenda completa para a rede social (com emojis, quebras de linha, tom do nicho)
6. 10 hashtags estratégicas (mistura de broad, medium e niche)
7. Conceito visual detalhado (o que aparece na tela em cada cena)
8. Sugestão de trilha sonora/mood
9. Melhor horário para postar
10. Duração sugerida

IMPORTANTE:
- Tudo em português brasileiro
- Tom Natural: não pareça robô
- Hashtags devem ser relevantes ao nicho: ${niche}
- Legenda deve ter entre 100-500 caracteres
- O roteiro deve ser envolvente do início ao fim

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título otimizado",
  "hook": "gancho dos primeiros 3 segundos",
  "script": "roteiro completo cena a cena",
  "cta": "chamada para aação no final",
  "caption": "legenda completa formatada com emojis e quebras de linha",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "visualConcept": "direção visual cena a cena",
  "musicSuggestion": "música ou mood sugerido",
  "duration": "duração sugerida",
  "bestTime": "melhor horário para postar"
}`
    }

    const result = await callGemini(apiKey, prompt, 4096)
    const parsed = parseJSON<GeneratedContent>(result, {
      title: 'Conteúdo gerado',
      hook: '',
      script: result,
      caption: '',
      hashtags: [],
      visualConcept: '',
      musicSuggestion: '',
      duration: '30s',
      bestTime: '12:00',
    })

    console.log(`[generate-now] ✅ Conteúdo gerado: ${parsed.title} | Modelo: ${GEMINI_MODEL} | Platform: ${platform} | PostStyle: ${postStyle}`)
    if (parsed.carouselSlides) {
      console.log(`[generate-now] 📸 Carousel: ${parsed.carouselSlides.length} slides gerados`)
    }

    return NextResponse.json({
      success: true,
      content: {
        title: parsed.title,
        hook: parsed.hook,
        script: parsed.script,
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        visualConcept: parsed.visualConcept,
        musicSuggestion: parsed.musicSuggestion,
        duration: parsed.duration,
        bestTime: parsed.bestTime,
        carouselSlides: parsed.carouselSlides || [],
        postType: parsed.postType || postStyle,
        platform,
        mode,
        niche,
        channelName,
      },
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
