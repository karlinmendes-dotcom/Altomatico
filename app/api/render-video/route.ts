import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/render-video
// Pipeline interna 100% GRATUITA — Sem APIs pagas
// Gemini (roteiro) + Pixabay (footage) + Edge TTS (narração)
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

async function fetchStockVideos(pixabayKey: string, query: string, count: number = 2): Promise<Array<{ url: string; downloadUrl: string; duration: number }>> {
  const videos: Array<{ url: string; downloadUrl: string; duration: number }> = []
  try {
    const res = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(query.slice(0, 100))}&per_page=${count}&min_width=720`)
    const data = await res.json()
    if (data.hits) {
      for (const hit of data.hits) {
        const downloadUrl = hit.videos?.portrait?.url || hit.videos?.medium?.url || hit.videos?.small?.url || ''
        if (downloadUrl) {
          videos.push({ url: hit.pageURL, downloadUrl, duration: hit.duration || 10 })
        }
      }
    }
  } catch (err) { console.error('Pixabay error:', err) }
  return videos
}

async function fetchMusic(pixabayKey: string, mood: string): Promise<string> {
  try {
    const res = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(mood + ' lofi background music')}&per_page=1`)
    const data = await res.json()
    return data.hits?.[0]?.videos?.small?.url || data.hits?.[0]?.videos?.medium?.url || ''
  } catch { return '' }
}

// Generate TTS audio URL using Edge TTS (free service)
async function generateTTSUrl(text: string, voice: string = 'pt-BR-FranciscaNeural'): Promise<string> {
  // Edge TTS generates audio - we return the text for client-side processing
  // The client will use Web Speech API or Edge TTS for actual audio generation
  return text
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
    let footageData: Array<{ url: string; downloadUrl: string; duration: number }> = []
    if (pixabayKey) {
      for (const scene of script.scenes) {
        const vids = await fetchStockVideos(pixabayKey, scene.visualDescription, 1)
        footageData.push(...vids)
        await new Promise(r => setTimeout(r, 200))
      }
    }

    // ─── FASE 3: Buscar Música ────────────────────────────
    let musicUrl = ''
    if (pixabayKey && script.scenes.length > 0) {
      musicUrl = await fetchMusic(pixabayKey, script.scenes[0].musicMood || 'inspirador')
    }

    // ─── FASE 4: Preparar Narração ────────────────────────
    const narrationText = script.scenes.map(s => s.narration).join('\n\n')

    // ─── FASE 5: Montar Resultado para Renderização no Cliente ──
    // O rendering real acontece no browser usando ffmpeg.wasm
    //返还没有クリエイトマート依存の完全内部パイプライン

    return NextResponse.json({
      success: true,
      video: {
        script,
        footageUrls: footageData.map(v => v.downloadUrl),
        footageData,
        musicUrl,
        narrationText,
        thumbnailUrl: footageData[0]?.downloadUrl || '',
        renderMode: 'client_ffmpeg', // Indica que renderização é no cliente
        status: 'ready_to_render',
      },
      message: `Assets prontos! ${script.scenes.length} cenas, ${footageData.length} clips, render será feito no navegador.`,
    })
  } catch (error) {
    console.error('Render video error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
