import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/media-router
// Roteador Inteligente de Mídia — Aciona o motor correto
// ═══════════════════════════════════════════════════════════════

type MotorType = 'animation_2d' | 'url_clips' | 'stock_video' | 'static_post'

interface MotorConfig {
  animationStyle?: string
  frameRate?: number
  clipDuration?: number
  cropMode?: string
  stockSource?: string
  ttsVoice?: string
  imageSize?: string
  designTemplate?: string
}

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: maxTokens },
      }),
    }
  )
  if (!response.ok) throw new Error(`Gemini error: ${await response.text()}`)
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini retornou vazio')
  return text
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch { return fallback }
}

async function fetchStockVideos(pixabayKey: string, query: string, count: number = 2): Promise<string[]> {
  const urls: string[] = []
  try {
    const res = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(query.slice(0, 100))}&per_page=${count}&min_width=720`)
    const data = await res.json()
    if (data.hits) {
      for (const hit of data.hits) {
        const url = hit.videos?.portrait?.url || hit.videos?.medium?.url || hit.videos?.small?.url || ''
        if (url) urls.push(url)
      }
    }
  } catch (err) { console.error('Pixabay error:', err) }
  return urls
}

async function fetchStockImages(pixabayKey: string, query: string, count: number = 2): Promise<string[]> {
  const urls: string[] = []
  try {
    const res = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query.slice(0, 100))}&per_page=${count}&image_type=photo&orientation=vertical`)
    const data = await res.json()
    if (data.hits) {
      for (const hit of data.hits) {
        urls.push(hit.largeImageURL || hit.webformatURL || '')
      }
    }
  } catch (err) { console.error('Pixabay images error:', err) }
  return urls
}

async function fetchMusic(pixabayKey: string, mood: string): Promise<string> {
  try {
    const res = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(mood + ' lofi background')}&per_page=1`)
    const data = await res.json()
    return data.hits?.[0]?.videos?.small?.url || data.hits?.[0]?.videos?.medium?.url || ''
  } catch { return '' }
}

// ─── Motor 1: Animação 2D ───────────────────────────────────

async function motorAnimation2D(geminiKey: string, niche: string, systemPrompt: string) {
  const scriptPrompt = `Você é um roteirista de ANIMAÇÃO 2D / STICK FIGURE para vídeos cômicos.

Nicho: ${niche}
${systemPrompt ? `Instruções: ${systemPrompt}` : ""}

Gere um roteiro CÔMICO para animação 2D, cena a cena.
Cada cena: narração cômica, descrição visual para stick figure, duração, expressão facial.
Total: 30-60 segundos. 4-8 cenas. Estilo: cômico, viral.

JSON (sem markdown):
{
  "title": "título cômico (máx 60 chars)",
  "hook": "gancho cômico 3s",
  "scenes": [{
    "narration": "narração cômica",
    "visualDescription": "descrição para stick figure 2D",
    "duration": 5,
    "facialExpression": "surpreso",
    "musicMood": "cômico"
  }],
  "caption": "legenda com emojis",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "totalDuration": 45
}`

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096)
  const script = parseJSON(scriptText, {
    title: 'Animação 2D', hook: '',
    scenes: [{ narration: scriptText, visualDescription: 'stick figure', duration: 8, musicMood: 'cômico' }],
    caption: '', hashtags: [], totalDuration: 30,
  })

  return {
    success: true, motorType: 'animation_2d',
    title: script.title, caption: script.caption, hashtags: script.hashtags,
    script: script.scenes.map((s: { narration: string }) => s.narration).join('\n\n'),
    footageUrls: script.scenes.map((s: { visualDescription: string }) => s.visualDescription),
  }
}

// ─── Motor 2: URL Clipes ────────────────────────────────────

async function motorUrlClips(geminiKey: string, niche: string, systemPrompt: string, targetUrl: string) {
  const scriptPrompt = `Você é um editor de vídeo especializado em CORTES VIRAIS.

Nicho: ${niche}
URL do vídeo: ${targetUrl}
${systemPrompt ? `Instruções: ${systemPrompt}` : ""}

Gere roteiro para CORTAR o melhor trecho (15-60s):
1. Momento mais viral
2. Legendas dinâmicas
3. Cortes/zooms

JSON (sem markdown):
{
  "title": "título viral",
  "hook": "gancho do trecho",
  "scenes": [{
    "narration": "narração/texto sobreposto",
    "visualDescription": "descrição do vídeo",
    "duration": 15,
    "subtitleText": "legenda dinâmica",
    "zoomEffect": "zoom_in"
  }],
  "caption": "legenda",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "totalDuration": 30
}`

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096)
  const script = parseJSON(scriptText, {
    title: 'Corte Viral', hook: '',
    scenes: [{ narration: scriptText, visualDescription: 'vídeo original', duration: 15 }],
    caption: '', hashtags: [], totalDuration: 15,
  })

  return {
    success: true, motorType: 'url_clips',
    title: script.title, caption: script.caption, hashtags: script.hashtags,
    script: script.scenes.map((s: { narration: string }) => s.narration).join('\n\n'),
    footageUrls: [targetUrl],
  }
}

// ─── Motor 3: Stock Videos ──────────────────────────────────

async function motorStockVideo(geminiKey: string, pixabayKey: string | undefined, niche: string, systemPrompt: string, platform: string) {
  const platformLabel = platform === 'youtube' ? 'YouTube Shorts' : platform === 'instagram' ? 'Instagram Reels' : 'TikTok'

  const scriptPrompt = `Roteirista profissional para ${platformLabel}.

Nicho: ${niche}
${systemPrompt ? `Instruções: ${systemPrompt}` : ""}

Vídeo 30-60s, cena a cena. Narração + descrição visual ESPECÍFICA para stock + duração + mood música.
3-6 cenas. PT-BR. Gancho forte 3s.

JSON (sem markdown):
{
  "title": "título (máx 60)",
  "hook": "gancho 3s",
  "scenes": [{ "narration": "texto", "visualDescription": "descrição específica stock", "duration": 8, "musicMood": "inspirador" }],
  "caption": "legenda com emojis",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10"],
  "totalDuration": 45
}`

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096)
  const script = parseJSON(scriptText, {
    title: 'Vídeo Stock', hook: '',
    scenes: [{ narration: scriptText, visualDescription: 'stock video', duration: 30, musicMood: 'inspirador' }],
    caption: '', hashtags: [], totalDuration: 30,
  })

  let footageUrls: string[] = []
  if (pixabayKey) {
    for (const scene of script.scenes) {
      const urls = await fetchStockVideos(pixabayKey, scene.visualDescription, 1)
      footageUrls.push(...urls)
      await new Promise(r => setTimeout(r, 200))
    }
  }

  let musicUrl = ''
  if (pixabayKey && script.scenes.length > 0) {
    musicUrl = await fetchMusic(pixabayKey, script.scenes[0].musicMood || 'inspirador')
  }

  return {
    success: true, motorType: 'stock_video',
    title: script.title, caption: script.caption, hashtags: script.hashtags,
    script: script.scenes.map((s: { narration: string }) => s.narration).join('\n\n'),
    footageUrls, musicUrl,
  }
}

// ─── Motor 4: Post Estático ─────────────────────────────────

async function motorStaticPost(geminiKey: string, pixabayKey: string | undefined, niche: string, systemPrompt: string) {
  const scriptPrompt = `Designer de posts para redes sociais.

Nicho: ${niche}
${systemPrompt ? `Instruções: ${systemPrompt}` : ""}

Gere POST ESTÁTICO:
1. Texto da arte (máx 20 palavras)
2. Descrição visual para imagem stock
3. Legenda completa com emojis
4. 10 hashtags

JSON (sem markdown):
{
  "title": "texto da arte",
  "imageDescription": "descrição específica para imagem stock",
  "caption": "legenda completa",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10"]
}`

  const scriptText = await callGemini(geminiKey, scriptPrompt, 2048)
  const script = parseJSON(scriptText, {
    title: 'Post Estático', imageDescription: niche, caption: '', hashtags: [],
  })

  let imageUrl = ''
  if (pixabayKey) {
    const images = await fetchStockImages(pixabayKey, script.imageDescription || niche, 1)
    if (images.length > 0) imageUrl = images[0]
  }

  return {
    success: true, motorType: 'static_post',
    imageUrl, mediaUrl: imageUrl,
    title: script.title, caption: script.caption, hashtags: script.hashtags,
    script: script.title,
  }
}

// ─── POST handler ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { niche, systemPrompt, motorType, platform, targetUrl } = body as {
      niche: string
      systemPrompt?: string
      motorType: MotorType
      platform: string
      targetUrl?: string
      motorConfig?: MotorConfig
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
    }

    const pixabayKey = process.env.PIXABAY_API_KEY

    let result: Record<string, unknown>

    switch (motorType) {
      case 'animation_2d':
        result = await motorAnimation2D(geminiKey, niche, systemPrompt || '')
        break
      case 'url_clips':
        if (!targetUrl) return NextResponse.json({ error: 'URL necessária para url_clips' }, { status: 400 })
        result = await motorUrlClips(geminiKey, niche, systemPrompt || '', targetUrl)
        break
      case 'stock_video':
        result = await motorStockVideo(geminiKey, pixabayKey, niche, systemPrompt || '', platform)
        break
      case 'static_post':
        result = await motorStaticPost(geminiKey, pixabayKey, niche, systemPrompt || '')
        break
      default:
        return NextResponse.json({ error: `Motor desconhecido: ${motorType}` }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      motorType,
      ...result,
      message: `Motor ${motorType} executado com sucesso!`,
    })
  } catch (error) {
    console.error('Media router error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// ─── GET: Listar motores disponíveis ─────────────────────────

export async function GET() {
  return NextResponse.json({
    motors: [
      { id: 'animation_2d', name: 'Animação 2D', icon: '🎨', bestFor: 'Humor, entretenimento, curiosidades' },
      { id: 'url_clips', name: 'Corte por URL', icon: '✂️', bestFor: 'Podcasts, reações, cortes de lives' },
      { id: 'stock_video', name: 'Stock + Voz IA', icon: '🎬', bestFor: 'Educativo, documentários, motivação' },
      { id: 'static_post', name: 'Post Estático', icon: '🖼️', bestFor: 'Instagram, LinkedIn, frases' },
    ],
  })
}
