import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// API Route: /api/generate-image
// Gera imagens profissionais usando Gemini Image Generation
// ═══════════════════════════════════════════════════════════════

interface GenerateImageRequest {
  prompt: string
  brandName?: string
  niche?: string
  style?: 'professional' | 'modern' | 'tech' | 'elegant' | 'bold'
  aspectRatio?: '1:1' | '16:9' | '9:16'
}

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json()
    const { prompt, brandName, niche, style = 'modern', aspectRatio = '1:1' } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
    }

    // Construir prompt detalhado para geração de imagem
    const styleDescriptions: Record<string, string> = {
      professional: 'clean corporate design, blue and white gradient background, modern typography, professional layout',
      modern: 'vibrant gradient background (purple to orange), modern 3D elements, sleek design, bold typography',
      tech: 'dark futuristic background with neon accents, circuit board patterns, holographic elements, tech aesthetic',
      elegant: 'soft pastel gradient, elegant serif typography, minimalist layout, luxury feel',
      bold: 'high contrast colors, bold sans-serif typography, dynamic composition, eye-catching design',
    }

    const enhancedPrompt = `Create a professional Instagram marketing image for ${brandName || 'a brand'} in the ${niche || 'business'} niche.

Style: ${styleDescriptions[style] || styleDescriptions.modern}

Requirements:
- Square format (1:1 aspect ratio)
- Professional marketing quality
- Include the brand name "${brandName || 'Brand'}" prominently displayed
- Clean, modern design suitable for Instagram
- High resolution and sharp text
- NO watermarks, NO stock photo look
- The image should look like it was made by a professional design agency

Additional details: ${prompt}

Generate ONLY the image, no text response needed.`

    console.log(`[generate-image] 🎨 Generating image: model=${GEMINI_IMAGE_MODEL}, style=${style}`)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: enhancedPrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 1.0,
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[generate-image] ❌ Gemini error: ${errText}`)
      return NextResponse.json(
        { error: `Erro na API Gemini (${GEMINI_IMAGE_MODEL}): ${errText}` },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Extrair imagem da resposta
    const candidates = data.candidates || []
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'Gemini não retornou candidatos' }, { status: 500 })
    }

    const parts = candidates[0].content?.parts || []
    let imageData: string | null = null
    let textResponse = ''

    for (const part of parts) {
      if (part.inlineData?.data) {
        imageData = part.inlineData.data
      }
      if (part.text) {
        textResponse = part.text
      }
    }

    if (!imageData) {
      console.error('[generate-image] ❌ No image in response. Parts:', JSON.stringify(parts.map((p: Record<string, unknown>) => Object.keys(p))))
      return NextResponse.json(
        { error: 'Gemini não retornou imagem. Resposta: ' + textResponse.slice(0, 200) },
        { status: 500 }
      )
    }

    console.log(`[generate-image] ✅ Image generated: ${imageData.length} bytes`)

    return NextResponse.json({
      success: true,
      image: imageData, // base64
      mimeType: 'image/png',
      prompt: enhancedPrompt,
      model: GEMINI_IMAGE_MODEL,
    })
  } catch (error) {
    console.error('[generate-image] ❌ Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
