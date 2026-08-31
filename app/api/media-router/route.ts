import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/media-router
// Roteador Inteligente de Mídia — Aciona o motor correto
// ═══════════════════════════════════════════════════════════════

type MotorType = 'animation_2d' | 'url_clips' | 'stock_video' | 'static_post' | 'manga_video'

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
  const scriptPrompt = `Você é o diretor criativo e roteirista chefe do canal de animações 2D "A Idade da Pedra".
Sua missão é gerar um script completo para um vídeo curto (Shorts/Reels/TikTok) de 45 a 55 segundos no formato vertical (9:16), mantendo perfeita consistência de estilo, humor e otimização para SEO.

═══════════════════════════════════════════════════
Nicho: ${niche}
${systemPrompt ? `Instruções personalizadas do canal: ${systemPrompt}` : ''}
═══════════════════════════════════════════════════

ESTILO VISUAL E ESTÉTICA DA ANIMAÇÃO:
- Estilo gráfico: Cartum 2D minimalista em preto e branco com detalhes pontuais de cor (estilo palitinho/stick-figure moderno, olhos expressivos, linhas pretas grossas e traço limpo).
- Cenas compostas por ilustrações cômicas e diretas (quadros dinâmicos que mudam a cada 3-5 segundos para manter a retenção máxima).
- Textos na tela curtos e impactantes sobrepostos na parte superior da imagem (fonte limpa e legível).

TOM DE VOZ E NARRATIVA:
- Narração: Cômica, irônica, rápida e em Português (PT-BR).
- Nicho: Comparações engraçadas entre a vida na Idade da Pedra (pré-história sem tecnologia, invenções absurdas com pedras/ossos/cavernas) e os problemas absurdos da vida moderna.
- Estrutura do Roteiro:
  1. HOOK (0-5s): Pergunta ou afirmação chocante/engraçada para prender a atenção nos primeiros segundos.
  2. DESENVOLVIMENTO (5-40s): História cômica dividida em 6 a 8 quadros/cenas visuais.
  3. CTA / ENCERRAMENTO (40-50s): Piada final com chamada rápida para curtir e se inscrever.

REQUISITOS DE SEO E MONETIZAÇÃO (ALTA RETENÇÃO):
- Título: Chamativo, com gatilho de curiosidade, otimizado para SEO (máximo 60 caracteres) + emojis estratégicos.
- Legenda (Caption): Resumo engajante da piada com pergunta no final para gerar comentários.
- Hashtags: 10 hashtags virais e focadas no nicho (ex: #AIdadeDaPedra #DesenhoEngracado #Animacao2D #Humor #Shorts #TikTokBrasil).
- Trilha Sonora & Efeitos: Recomendação de estilo de áudio cômico (ex: música instrumental alegre em background + efeitos sonoros de pancada de clava/risadas/sons pré-históricos).

FORMATO ESTRITO DA SAÍDA — Responda EXCLUSIVAMENTE em JSON válido (sem markdown, sem crases, sem texto antes ou depois):
{
  "title": "Título altamente clicável",
  "narrativeScript": "Texto completo para ser lido pela narração sintetizada (TTS)",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": 5,
      "visualDescription": "Descrição detalhada do desenho 2D palitinho para geração da arte (estilo cartum preto e branco)",
      "textOnScreen": "Texto curto na tela"
    }
  ],
  "caption": "Legenda completa do post",
  "hashtags": ["#tag1", "#tag2"],
  "audioStrategy": {
    "bgMusicGenre": "Música cômica/instrumental leve",
    "soundEffects": ["efeito1", "efeito2"]
  }
}`

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096)
  const script = parseJSON(scriptText, {
    title: 'A Idade da Pedra',
    narrativeScript: scriptText,
    scenes: [{ sceneNumber: 1, durationSeconds: 5, visualDescription: 'stick figure na caverna', textOnScreen: '', narration: scriptText, duration: 5, musicMood: 'cômico' }],
    caption: '',
    hashtags: ['#AIdadeDaPedra', '#DesenhoEngracado', '#Animacao2D', '#Humor', '#Shorts'],
    audioStrategy: { bgMusicGenre: 'cômico instrumental', soundEffects: ['clava', 'risada'] },
    totalDuration: 45,
  })

  // Normalizar scenes para o formato do renderer
  const rawScenes = (script.scenes || []) as Array<Record<string, unknown>>
  const normalizedScenes = rawScenes.map((s, i) => ({
    narration: String(s.narrativeScript || s.narration || s.textOnScreen || ''),
    visualDescription: String(s.visualDescription || 'stick figure animation'),
    duration: Number(s.durationSeconds || s.duration || 5),
    musicMood: String(s.musicMood || 'cômico'),
    textOnScreen: String(s.textOnScreen || ''),
    sceneNumber: Number(s.sceneNumber || i + 1),
  }))

  const fullNarration = normalizedScenes.map(s => s.narration).join('\n\n')
  const descriptions = normalizedScenes.map(s => s.visualDescription)

  return {
    success: true, motorType: 'animation_2d',
    title: String(script.title || 'A Idade da Pedra'),
    caption: String(script.caption || ''),
    hashtags: (script.hashtags as string[]) || ['#AIdadeDaPedra', '#Humor', '#Shorts'],
    scenes: normalizedScenes,
    script: String(script.narrativeScript || fullNarration),
    narrationText: String(script.narrativeScript || fullNarration),
    footageUrls: descriptions,
    audioStrategy: (script.audioStrategy as Record<string, unknown>) || {},
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

// ─── Motor 5: Manga/Manhwa Slideshow ──────────────────────

async function motorMangaVideo(geminiKey: string, pixabayKey: string | undefined, niche: string, systemPrompt: string, platform: string) {
  const scriptPrompt = `Você é um roteirista de VÍDEOS do tipo SLIDESHOW de mangá/manhwa para ${platform}.

Nicho: ${niche}
${systemPrompt ? `Instruções: ${systemPrompt}` : ""}

Gere um roteiro para um vídeo slideshow de páginas de mangá/manhwa.
Cada "cena" deve descrever uma página ou quadro do mangá.
Total: 30-90 segundos (páginas ficam 3-5 segundos cada).
Inclua transições suaves estilo virar página.

JSON (sem markdown):
{
  "title": "título do vídeo",
  "hook": "gancho inicial",
  "scenes": [{
    "narration": "narração sobre a página",
    "visualDescription": "descrição da página do mangá",
    "duration": 4,
    "musicMood": "epic",
    "imageQuery": "palavras-chave para buscar imagem"
  }],
  "caption": "legenda",
  "hashtags": ["#manga","#manhwa","#anime","#shorts"],
  "totalDuration": 45
}`

  const scriptText = await callGemini(geminiKey, scriptPrompt, 4096)
  const script = parseJSON(scriptText, {
    title: 'Manga Slideshow', hook: '',
    scenes: [{ narration: scriptText, visualDescription: 'manga page', duration: 4, musicMood: 'epic' }],
    caption: '', hashtags: ['#manga', '#manhwa', '#anime', '#shorts'], totalDuration: 30,
  })

  let footageUrls: string[] = []
  if (pixabayKey) {
    for (const scene of script.scenes) {
      const query = (scene as { imageQuery?: string }).imageQuery || scene.visualDescription
      const urls = await fetchStockImages(pixabayKey, query + ' manga anime illustration', 1)
      footageUrls.push(...urls)
      await new Promise(r => setTimeout(r, 200))
    }
  }

  let musicUrl = ''
  if (pixabayKey && script.scenes.length > 0) {
    musicUrl = await fetchMusic(pixabayKey, (script.scenes[0] as { musicMood?: string }).musicMood || 'epic')
  }

  return {
    success: true, motorType: 'manga_video',
    title: script.title, caption: script.caption, hashtags: script.hashtags,
    script: script.scenes.map((s: { narration: string }) => s.narration).join('\n\n'),
    footageUrls, musicUrl,
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
      case 'manga_video':
        result = await motorMangaVideo(geminiKey, pixabayKey, niche, systemPrompt || '', platform)
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
      { id: 'manga_video', name: 'Slideshow Mangá', icon: '📖', bestFor: 'Mangá, manhwa, anime, história em quadrinhos' },
    ],
  })
}
