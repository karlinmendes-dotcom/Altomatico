import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/generate-video
// Gera vídeo completo: roteiro + footage + narração + música
// ═══════════════════════════════════════════════════════════════

interface VideoScene {
  narration: string
  visualDescription: string
  duration: number
  musicMood: string
}

interface VideoScript {
  title: string
  hook: string
  scenes: VideoScene[]
  caption: string
  hashtags: string[]
  totalDuration: number
}

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
    throw new Error(`Erro na API Gemini: ${err}`)
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

async function findFootage(pixabayKey: string, query: string): Promise<string[]> {
  const urls: string[] = []
  try {
    const encodedQuery = encodeURIComponent(query.slice(0, 100))
    const res = await fetch(
      `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodedQuery}&per_page=3&min_width=720`
    )
    const data = await res.json()
    if (data.hits) {
      for (const hit of data.hits) {
        const url = hit.videos?.medium?.url || hit.videos?.small?.url || hit.videos?.large?.url || ''
        if (url) urls.push(url)
      }
    }
  } catch (err) {
    console.error('Pixabay error:', err)
  }
  return urls
}

async function findMusic(pixabayKey: string, mood: string): Promise<string> {
  try {
    const res = await fetch(
      `https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(mood + ' background music')}&per_page=1`
    )
    const data = await res.json()
    if (data.hits?.[0]) {
      return data.hits[0].videos?.small?.url || data.hits[0].videos?.medium?.url || ''
    }
  } catch (err) {
    console.error('Music search error:', err)
  }
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { niche, systemPrompt, mode, targetUrl, platform } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada. Adicione em Settings → Environment Variables.' },
        { status: 500 }
      )
    }

    const pixabayKey = process.env.PIXABAY_API_KEY

    // ─── FASE 1: Gerar Roteiro ────────────────────────────
    const platformLabel = platform === 'youtube' ? 'YouTube Shorts' : platform === 'instagram' ? 'Instagram Reels' : 'TikTok'

    const scriptPrompt = `Você é um roteirista profissional de vídeos curtos para ${platformLabel}.

Nicho: ${niche}
${systemPrompt ? `Instruções: ${systemPrompt}` : ''}
Modo: ${mode === 'URL_CLIPS' ? 'Recorte de vídeo existente' : 'Geração do zero'}
${targetUrl ? `URL de referência: ${targetUrl}` : ''}

Gere um roteiro COMPLETO para um vídeo curto (30-60 segundos) com CENA A CENA.

Para cada cena, especifique:
1. O que o narrador fala (narração) - tom natural, como se falasse com um amigo
2. O que aparece na tela (descrição visual específica para buscar imagem/vídeo de stock)
3. Duração da cena em segundos (total: 30-60s)
4. Mood da música de fundo

IMPORTANTE:
- 3-6 cenas no total
- Narração envolvente do início ao fim
- Descrições visuais ESPECÍFICAS (ex: "pessoa idosa sorrindo segurando um telefone antigo", não "pessoa feliz")
- Em português brasileiro
- Comece com um gancho forte nos primeiros 3 segundos

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "title": "título chamativo para o vídeo (máx 60 chars)",
  "hook": "gancho dos primeiros 3 segundos",
  "scenes": [
    {
      "narration": "texto que o narrador fala nesta cena",
      "visualDescription": "descrição ESPECÍFICA para buscar imagem/vídeo de stock",
      "duration": 8,
      "musicMood": "inspirador"
    }
  ],
  "caption": "legenda completa para a rede social com emojis e quebras de linha",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "totalDuration": 45
}`

    const scriptText = await callGemini(apiKey, scriptPrompt, 4096)
    const script = parseJSON<VideoScript>(scriptText, {
      title: 'Vídeo Gerado',
      hook: '',
      scenes: [{ narration: scriptText, visualDescription: 'vídeo de stock', duration: 30, musicMood: 'inspirador' }],
      caption: '',
      hashtags: [],
      totalDuration: 30,
    })

    // ─── FASE 2: Buscar Vídeos de Stock ───────────────────
    let footageUrls: string[] = []
    if (pixabayKey) {
      for (const scene of script.scenes) {
        const urls = await findFootage(pixabayKey, scene.visualDescription)
        footageUrls.push(...urls)
        await new Promise(r => setTimeout(r, 200)) // Rate limit
      }
    }

    // ─── FASE 3: Buscar Música ────────────────────────────
    let musicUrl = ''
    if (pixabayKey && script.scenes.length > 0) {
      musicUrl = await findMusic(pixabayKey, script.scenes[0].musicMood || 'inspirador')
    }

    // ─── FASE 4: Montar Resultado ─────────────────────────
    const narrationText = script.scenes.map(s => s.narration).join('\n\n')

    return NextResponse.json({
      success: true,
      video: {
        script,
        footageUrls,
        musicUrl,
        thumbnailUrl: footageUrls[0] || '',
        narrationText,
        status: footageUrls.length > 0 ? 'ready' : 'processing',
      },
      message: `Vídeo gerado! ${script.scenes.length} cenas, ${footageUrls.length} clips de stock.`,
    })
  } catch (error) {
    console.error('Generate video error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
