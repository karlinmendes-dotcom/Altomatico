import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/render-video
// Pipeline completa: Roteiro → Footage → Narração → Render MP4
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

async function fetchMusic(pixabayKey: string, mood: string): Promise<string> {
  try {
    const res = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(mood + ' lofi background')}&per_page=1`)
    const data = await res.json()
    return data.hits?.[0]?.videos?.small?.url || data.hits?.[0]?.videos?.medium?.url || ''
  } catch { return '' }
}

async function createCreatomateRender(apiKey: string, script: VideoScript, footageUrls: string[], musicUrl: string): Promise<{ id: string; status: string; url: string }> {
  const elements: Array<Record<string, unknown>> = []
  let time = 0

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i]
    const footage = footageUrls[i % footageUrls.length]

    if (footage) {
      elements.push({
        type: 'video', source: footage, duration: scene.duration, time,
        width: 1080, height: 1920, fit: 'cover',
      })
    }

    elements.push({
      type: 'text', text: scene.narration, duration: scene.duration, time,
      width: 900, height: 200, x: 90, y: 1600,
      font_size: 48, font_color: '#FFFFFF',
      background_color: 'rgba(0,0,0,0.6)', text_align: 'center',
      border_radius: 20, padding: 20,
    })

    time += scene.duration
  }

  if (musicUrl) {
    elements.push({ type: 'audio', source: musicUrl, duration: script.totalDuration, time: 0, volume: 0.3 })
  }

  const res = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ output_format: 'mp4', width: 1080, height: 1920, fps: 30, elements }),
  })

  if (!res.ok) throw new Error(`Creatomate error: ${await res.text()}`)
  const result = await res.json()
  return { id: result.id, status: result.status, url: result.url || '' }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { niche, systemPrompt, mode, targetUrl, platform } = body

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
    }

    const pixabayKey = process.env.PIXABAY_API_KEY
    const creatomateKey = process.env.CREATOMATE_API_KEY

    const platformLabel = platform === 'youtube' ? 'YouTube Shorts' : platform === 'instagram' ? 'Instagram Reels' : 'TikTok'

    // ─── FASE 1: Gerar Roteiro ────────────────────────────
    const scriptPrompt = `Você é um roteirista profissional de vídeos curtos para ${platformLabel}.

Nicho: ${niche}
${systemPrompt ? `Instruções: ${systemPrompt}` : ''}
Modo: ${mode === 'URL_CLIPS' ? 'Recorte' : 'Geração do zero'}
${targetUrl ? `URL: ${targetUrl}` : ''}

Gere roteiro para vídeo de 30-60 segundos, cena a cena.
Cada cena: narração, descrição visual ESPECÍFICA para stock, duração, mood música.
3-6 cenas. Português brasileiro. Gancho forte nos 3s iniciais.

JSON (sem markdown):
{
  "title": "título (máx 60 chars)",
  "hook": "gancho 3s",
  "scenes": [{ "narration": "texto", "visualDescription": "descrição específica para stock", "duration": 8, "musicMood": "inspirador" }],
  "caption": "legenda com emojis",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10"],
  "totalDuration": 45
}`

    const scriptText = await callGemini(geminiKey, scriptPrompt, 4096)
    const script = parseJSON<VideoScript>(scriptText, {
      title: 'Vídeo', hook: '',
      scenes: [{ narration: scriptText, visualDescription: 'stock video', duration: 30, musicMood: 'inspirador' }],
      caption: '', hashtags: [], totalDuration: 30,
    })

    // ─── FASE 2: Buscar Footage ───────────────────────────
    let footageUrls: string[] = []
    if (pixabayKey) {
      for (const scene of script.scenes) {
        const urls = await fetchStockVideos(pixabayKey, scene.visualDescription, 1)
        footageUrls.push(...urls)
        await new Promise(r => setTimeout(r, 200))
      }
    }

    // ─── FASE 3: Buscar Música ────────────────────────────
    let musicUrl = ''
    if (pixabayKey && script.scenes.length > 0) {
      musicUrl = await fetchMusic(pixabayKey, script.scenes[0].musicMood || 'inspirador')
    }

    // ─── FASE 4: Renderizar com Creatomate ────────────────
    let renderResult: { id: string; status: string; url: string } = { id: '', status: 'assets_only', url: footageUrls[0] || '' }

    if (creatomateKey && footageUrls.length > 0) {
      try {
        renderResult = await createCreatomateRender(creatomateKey, script, footageUrls, musicUrl)
      } catch (err) {
        console.error('Creatomate render error:', err)
        renderResult = { id: '', status: 'render_failed', url: footageUrls[0] || '' }
      }
    }

    const narrationText = script.scenes.map(s => s.narration).join('\n\n')

    return NextResponse.json({
      success: true,
      video: {
        script,
        footageUrls,
        musicUrl,
        narrationText,
        renderId: renderResult.id,
        renderStatus: renderResult.status,
        videoUrl: renderResult.url,
        thumbnailUrl: footageUrls[0] || '',
      },
      message: `Vídeo processado! ${script.scenes.length} cenas, ${footageUrls.length} clips.`,
    })
  } catch (error) {
    console.error('Render video error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
