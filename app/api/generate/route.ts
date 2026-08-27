import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, platform, niche, postType, type, duration } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const lang = "português brasileiro";
    const nicheCtx = niche ? ` do nicho de ${niche}` : "";

    let systemPrompt = "";

    if (platform === "youtube") {
      if (type === "cuts") {
        systemPrompt = `Você é um especialista em edição de vídeos para YouTube Shorts.
Analise o vídeo descrito e corte os melhores momentos.
Retorne um JSON válido com: title, description, script (array de cenas com timestamp e texto), hashtags (array).
Formato: {"title": "...", "description": "...", "script": [{"timestamp": "0:00", "text": "...", "visual": "..."}], "hashtags": ["..."]}`;
      } else {
        systemPrompt = `Você é um especialista em criação de vídeos para YouTube.
Gere conteúdo completo em ${lang}${nicheCtx} para um vídeo de ${duration || 30} segundos.
Retorne um JSON válido com: title (título chamativo), description (descrição SEO), script (array de cenas com timestamp, texto e descrição visual), hashtags (array de tags relevantes), thumbnail_prompt (descrição para gerar thumbnail).
Formato: {"title": "...", "description": "...", "script": [{"timestamp": "0:00", "text": "...", "visual": "..."}], "hashtags": ["..."], "thumbnail_prompt": "..."}`;
      }
    } else if (platform === "instagram") {
      const typeDesc =
        postType === "reel"
          ? "Reels (vídeo vertical de até 60 segundos)"
          : postType === "carousel"
            ? "Carrossel (múltiplas imagens com texto)"
            : "Post (imagem única com legenda)";

      systemPrompt = `Você é um especialista em criação de conteúdo para Instagram.
Gere um ${typeDesc} completo em ${lang}${nicheCtx}.
Retorne um JSON válido com:
- caption: legenda completa com emojis, quebra de linha e tom de voz envolvente (mínimo 200 caracteres)
- hashtags: array com 10-15 hashtags estratégicas do nicho
- post_type: "${postType}"
- visual_concept: descrição detalhada do visual/conceito artístico
- cta: chamada para ação para engajamento

Formato: {"caption": "...", "hashtags": ["tag1", "tag2"], "post_type": "${postType}", "visual_concept": "...", "cta": "..."}`;
    } else {
      systemPrompt = `Você é um especialista em criação de conteúdo para TikTok.
Gere conteúdo completo em ${lang}${nicheCtx}.
Retorne um JSON válido com: title, description, script (array de cenas), hashtags (array).
Formato: {"title": "...", "description": "...", "script": [{"scene": 1, "text": "...", "visual": "..."}], "hashtags": ["..."]}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nTarefa do usuário: ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: "No content generated from Gemini" },
        { status: 500 }
      );
    }

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse Gemini response as JSON" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
