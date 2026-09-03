import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/instagram-daily
// Gera 3 posts diários para Instagram com 3 imagens cada
// Tudo em português, com CTA, hashtags, legendas completas
// ═══════════════════════════════════════════════════════════════

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp'

interface DailyPost {
  id: number
  title: string
  caption: string
  hashtags: string[]
  cta: string
  images: Array<{
    prompt: string
    style: string
  }>
}

interface DailyContent {
  posts: DailyPost[]
  generatedAt: string
  brandName: string
}

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: maxTokens },
      }),
    }
  )
  if (!response.ok) throw new Error(`Gemini error: ${await response.text()}`)
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function generateImage(apiKey: string, prompt: string, brandName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Create a professional Instagram post image for "${brandName}". ${prompt}. Modern, clean, marketing quality. Square format 1:1.` }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], temperature: 1.0 },
        }),
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.data) return part.inlineData.data
    }
    return null
  } catch { return null }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brandName = 'AgendAI', niche = 'Tecnologia', topic = 'automação de agendamentos' } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
    }

    console.log(`[instagram-daily] 🚀 Gerando 3 posts para: ${brandName} | Nicho: ${niche}`)

    // ─── FASE 1: Gerar 3 ideias de posts via Gemini ────────────
    const ideasPrompt = `Você é um social media manager profissional para a marca "${brandName}" no nicho de ${niche}.

Gere EXATAMENTE 3 posts para Instagram sobre o tema: ${topic}

Cada post deve ter:
- Um tema diferente e engajante
- Focado em ${niche}
- Tom: profissional mas acessível
- Público: empreendedores e donos de negócio

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "posts": [
    {
      "id": 1,
      "title": "Título chamativo do post",
      "theme": "tema específico do post",
      "imagePrompts": [
        "Descrição detalhada da imagem 1 para o Gemini gerar",
        "Descrição detalhada da imagem 2",
        "Descrição detalhada da imagem 3"
      ]
    }
  ]
}`

    const ideasText = await callGemini(apiKey, ideasPrompt, 2048)
    let ideas: { posts: Array<{ id: number; title: string; theme: string; imagePrompts: string[] }> }

    try {
      const cleaned = ideasText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      ideas = JSON.parse(cleaned)
    } catch {
      // Fallback se JSON falhar
      ideas = {
        posts: [
          { id: 1, title: `5 benefícios de usar ${brandName} no seu negócio`, theme: 'benefícios', imagePrompts: [
            `Smartphone showing ${brandName} app with calendar and appointments`,
            `Person happily using phone with scheduling app`,
            `Business growth chart with ${brandName} logo`
          ]},
          { id: 2, title: `Como ${brandName} transforma seu atendimento`, theme: 'transformação', imagePrompts: [
            `Before and after comparison of manual vs automated scheduling`,
            `${brandName} dashboard showing customer management`,
            `Happy customers with 5 star reviews`
          ]},
          { id: 3, title: `Dica rápida: Organize sua agenda em 5 minutos`, theme: 'dica rápida', imagePrompts: [
            `Timer showing 5 minutes with ${brandName} app`,
            `Organized calendar with color coded appointments`,
            `Professional person smiling with organized schedule`
          ]},
        ]
      }
    }

    console.log(`[instagram-daily] ✅ ${ideas.posts.length} ideias geradas`)

    // ─── FASE 2: Para cada post, gerar legenda + hashtags + CTA ──
    const posts: DailyPost[] = []

    for (const idea of ideas.posts) {
      const captionPrompt = `Você é um copywriter profissional para Instagram.

Marca: ${brandName}
Nicho: ${niche}
Tema do post: ${idea.title}

Gere uma LEGENDA COMPLETA para Instagram:
1. Primeira linha chamativa (gancho) - máx 15 palavras
2. Desenvolvimento do conteúdo (3-5 parágrafos curtos)
3. Lista de benefícios ou dicas (com emojis)
4. CTA forte no final (chamada para ação)
5. 20 hashtags relevantes (mistura broad + niche + locais)
6. Texto alternativo para acessibilidade

IMPORTANTE:
- Tudo em português brasileiro
- Tom: profissional mas amigável
- Use emojis com moderação (não exagere)
- Legenda entre 150-400 caracteres
- Hashtags em português e inglês

Responda EXATAMENTE neste formato JSON (sem markdown):
{
  "firstLine": "gancho chamativo",
  "caption": "legenda completa com emojis",
  "cta": "chamada para ação",
  "hashtags": ["#tag1", "#tag2", ...],
  "altText": "texto alternativo para acessibilidade"
}`

      const captionText = await callGemini(apiKey, captionPrompt, 1500)
      let captionData: { firstLine: string; caption: string; cta: string; hashtags: string[]; altText: string }

      try {
        const cleaned = captionText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        captionData = JSON.parse(cleaned)
      } catch {
        captionData = {
          firstLine: `Você sabia que ${brandName} pode transformar seu negócio? 🚀`,
          caption: captionText.slice(0, 400),
          cta: `Experimente ${brandName} agora mesmo! Link na bio 👆`,
          hashtags: ['#automacao', '#agendamento', '#tecnologia', '#negocios', '#empreendedorismo', '#produtividade', '#gestao', '#marketingdigital', '#instagrambrasil', '#dicasdenegocios'],
          altText: `Post sobre ${idea.title} da marca ${brandName}`,
        }
      }

      posts.push({
        id: idea.id,
        title: idea.title,
        caption: captionData.firstLine + '\n\n' + captionData.caption,
        hashtags: captionData.hashtags,
        cta: captionData.cta,
        images: (idea.imagePrompts || []).map((prompt: string, idx: number) => ({
          prompt,
          style: idx === 0 ? 'modern' : idx === 1 ? 'tech' : 'professional',
        })),
      })

      console.log(`[instagram-daily] ✅ Post ${idea.id}: "${idea.title}" | ${captionData.hashtags.length} hashtags`)
    }

    // ─── FASE 3: Gerar imagens (opcional - pode ser chamado depois) ──
    const generateImages = body.generateImages === true
    const generatedImages: Record<number, string[]> = {}

    if (generateImages) {
      for (const post of posts) {
        generatedImages[post.id] = []
        for (const img of post.images) {
          const imgData = await generateImage(apiKey, img.prompt, brandName)
          if (imgData) {
            generatedImages[post.id].push(imgData)
            console.log(`[instagram-daily] 🎨 Imagem gerada para post ${post.id}`)
          }
        }
      }
    }

    const result: DailyContent & { images?: Record<number, string[]> } = {
      posts,
      generatedAt: new Date().toISOString(),
      brandName,
    }

    if (generateImages) {
      result.images = generatedImages
    }

    console.log(`[instagram-daily] 🎉 CONCLUÍDO: ${posts.length} posts gerados`)

    return NextResponse.json({
      success: true,
      content: result,
      message: `${posts.length} posts gerados com sucesso! Cada um com ${posts[0]?.images?.length || 3} imagens.`,
    })
  } catch (error) {
    console.error('[instagram-daily] ❌ Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
