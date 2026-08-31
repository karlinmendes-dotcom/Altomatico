import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ═══════════════════════════════════════════════════════════════
  // CONTEÚDO — Pipeline principal
  // ═══════════════════════════════════════════════════════════════
  contents: defineTable({
    // Identidade
    title: v.string(),
    description: v.optional(v.string()),
    topic: v.string(),
    niche: v.optional(v.string()),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi")),
    contentType: v.string(), // "post", "reel", "story", "carousel", "short", "long", "tutorial", "podcast"

    // Pipeline status
    status: v.union(
      v.literal("idea"),
      v.literal("research"),
      v.literal("strategy"),
      v.literal("script"),
      v.literal("production"),
      v.literal("review"),
      v.literal("approved"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("archived")
    ),
    progress: v.number(), // 0-100

    // Geração
    aiModel: v.optional(v.string()),
    aiPrompt: v.optional(v.string()),
    aiResponse: v.optional(v.string()),
    script: v.optional(v.string()),
    hook: v.optional(v.string()),
    cta: v.optional(v.string()),
    tone: v.optional(v.string()),
    voice: v.optional(v.string()),
    style: v.optional(v.string()),
    language: v.optional(v.string()),
    country: v.optional(v.string()),
    duration: v.optional(v.string()),

    // SEO
    seoTitle: v.optional(v.string()),
    seoTitleAlternatives: v.optional(v.array(v.string())),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    seoHashtags: v.optional(v.array(v.string())),
    seoScore: v.optional(v.number()),

    // Scores
    originalityScore: v.optional(v.number()),
    policyScore: v.optional(v.number()),
    opportunityScore: v.optional(v.number()),
    confidenceScore: v.optional(v.number()),

    // Mídia
    thumbnailUrl: v.optional(v.string()),
    mediaUrls: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    subtitlesUrl: v.optional(v.string()),
    captionText: v.optional(v.string()),

    // Publicação
    publishedUrl: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    scheduledFor: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"), v.literal("unlisted"))),

    // Content DNA
    contentDna: v.optional(v.object({
      topic: v.optional(v.string()),
      niche: v.optional(v.string()),
      angle: v.optional(v.string()),
      hookType: v.optional(v.string()),
      emotion: v.optional(v.string()),
      format: v.optional(v.string()),
      duration: v.optional(v.string()),
      voice: v.optional(v.string()),
      visualStyle: v.optional(v.string()),
      ctaType: v.optional(v.string()),
      titleStyle: v.optional(v.string()),
      thumbnailStyle: v.optional(v.string()),
      publishingTime: v.optional(v.string()),
    })),

    // Policy
    policyCheck: v.optional(v.object({
      copyrightRisk: v.optional(v.string()),
      spamRisk: v.optional(v.string()),
      reusedContentRisk: v.optional(v.string()),
      misinformationRisk: v.optional(v.string()),
      aiDisclosureRequired: v.optional(v.boolean()),
      overallRisk: v.optional(v.string()),
      approved: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    })),

    // AI disclosure
    aiGenerated: v.optional(v.boolean()),
    aiAltered: v.optional(v.boolean()),
    requiresDisclosure: v.optional(v.boolean()),
    disclosureReason: v.optional(v.string()),

    // Metadata
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    completedAt: v.optional(v.string()),
    errorAt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.number(),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_status", ["status"])
    .index("by_platform", ["platform"])
    .index("by_createdBy", ["createdBy"])
    .index("by_createdAt", ["createdAt"])
    .index("by_platform_status", ["platform", "status"])
    .index("by_scheduledFor", ["scheduledFor"])
    .index("by_contentType", ["contentType"]),

  // ═══════════════════════════════════════════════════════════════
  // TAREFAS — Fila de processamento
  // ═══════════════════════════════════════════════════════════════
  tasks: defineTable({
    contentId: v.id("contents"),
    type: v.union(
      v.literal("research"),
      v.literal("script"),
      v.literal("video"),
      v.literal("thumbnail"),
      v.literal("seo"),
      v.literal("publish"),
      v.literal("analytics"),
      v.literal("policy_check"),
      v.literal("originality_check")
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    priority: v.number(), // 1-10
    progress: v.number(), // 0-100
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    retryCount: v.number(),
    maxRetries: v.number(),
    startedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    createdAt: v.string(),
    workerId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_contentId", ["contentId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_priority", ["priority"]),

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURAÇÕES DO USUÁRIO
  // ═══════════════════════════════════════════════════════════════
  userSettings: defineTable({
    userId: v.string(),

    // Perfil
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),

    // IA
    preferredLlm: v.optional(v.string()),
    preferredImageModel: v.optional(v.string()),
    preferredVoice: v.optional(v.string()),
    language: v.optional(v.string()),
    country: v.optional(v.string()),

    // YouTube
    youtubeChannelId: v.optional(v.string()),
    youtubeChannelName: v.optional(v.string()),
    youtubeConnected: v.optional(v.boolean()),

    // Instagram
    instagramAccountId: v.optional(v.string()),
    instagramUsername: v.optional(v.string()),
    instagramConnected: v.optional(v.boolean()),

    // Marca / Identidade
    brandName: v.optional(v.string()),
    brandNiche: v.optional(v.string()),
    brandTone: v.optional(v.string()),
    brandVoice: v.optional(v.string()),
    brandStyle: v.optional(v.string()),
    brandKeywords: v.optional(v.array(v.string())),
    prohibitedKeywords: v.optional(v.array(v.string())),
    prohibitedTopics: v.optional(v.array(v.string())),

    // Automação
    automationMode: v.optional(v.union(
      v.literal("manual"),
      v.literal("semi"),
      v.literal("automatic")
    )),

    // Horários
    postingSchedule: v.optional(v.object({
      monday: v.optional(v.array(v.object({ platform: v.string(), time: v.string() }))),
      tuesday: v.optional(v.array(v.object({ platform: v.string(), time: v.string() }))),
      wednesday: v.optional(v.array(v.object({ platform: v.string(), time: v.string() }))),
      thursday: v.optional(v.array(v.object({ platform: v.string(), time: v.string() }))),
      friday: v.optional(v.array(v.object({ platform: v.string(), time: v.string() }))),
      saturday: v.optional(v.array(v.object({ platform: v.string(), time: v.string() }))),
      sunday: v.optional(v.array(v.object({ platform: v.string(), time: v.string() }))),
    })),

    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS — Dados de desempenho
  // ═══════════════════════════════════════════════════════════════
  analytics: defineTable({
    contentId: v.id("contents"),
    platform: v.union(v.literal("youtube"), v.literal("instagram"), v.literal("tiktok")),
    externalId: v.optional(v.string()), // ID na plataforma

    // Métricas
    views: v.number(),
    impressions: v.optional(v.number()),
    reach: v.optional(v.number()),
    likes: v.number(),
    comments: v.number(),
    shares: v.optional(v.number()),
    saves: v.optional(v.number()),
    clickThroughRate: v.optional(v.number()),
    averageViewDuration: v.optional(v.number()),
    retentionRate: v.optional(v.number()),
    subscribersGained: v.optional(v.number()),
    profileVisits: v.optional(v.number()),

    // YouTube específicos
    watchTime: v.optional(v.number()),
    ctr: v.optional(v.number()),
    trafficSources: v.optional(v.string()),

    // Instagram específicos
    storyViews: v.optional(v.number()),

    // Timestamps
    collectedAt: v.string(),
    period: v.string(), // "24h", "48h", "7d", "28d"
    createdAt: v.string(),
  })
    .index("by_contentId", ["contentId"])
    .index("by_platform", ["platform"])
    .index("by_collectedAt", ["collectedAt"]),

  // ═══════════════════════════════════════════════════════════════
  // LEARNING — Aprendizado da IA
  // ═══════════════════════════════════════════════════════════════
  learnings: defineTable({
    category: v.union(
      v.literal("hook"),
      v.literal("title"),
      v.literal("thumbnail"),
      v.literal("format"),
      v.literal("duration"),
      v.literal("timing"),
      v.literal("topic"),
      v.literal("cta"),
      v.literal("voice"),
      v.literal("style")
    ),
    insight: v.string(),
    confidence: v.number(), // 0-1
    basedOnContents: v.array(v.id("contents")),
    platform: v.optional(v.union(v.literal("youtube"), v.literal("instagram"), v.literal("multi"))),
    niche: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_category", ["category"])
    .index("by_platform", ["platform"]),

  // ═══════════════════════════════════════════════════════════════
  // LOGS — Rastreabilidade
  // ═══════════════════════════════════════════════════════════════
  logs: defineTable({
    action: v.string(),
    contentId: v.optional(v.id("contents")),
    taskId: v.optional(v.id("tasks")),
    details: v.optional(v.string()),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    source: v.string(), // qual módulo gerou
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    duration: v.optional(v.number()), // ms
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index("by_contentId", ["contentId"])
    .index("by_level", ["level"])
    .index("by_timestamp", ["timestamp"]),

  // ═══════════════════════════════════════════════════════════════
  // BRAND MEMORY — Memória de identidade
  // ═══════════════════════════════════════════════════════════════
  brandMemory: defineTable({
    userId: v.string(),
    category: v.union(
      v.literal("tone"),
      v.literal("style"),
      v.literal("vocabulary"),
      v.literal("topics"),
      v.literal("positioning"),
      v.literal("cta"),
      v.literal("preference")
    ),
    key: v.string(),
    value: v.string(),
    confidence: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_category", ["category"]),

  // ═══════════════════════════════════════════════════════════════
  // CONEXÕES — Credenciais de plataformas
  // ═══════════════════════════════════════════════════════════════
  connections: defineTable({
    userId: v.string(),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok")
    ),
    youtubeAccessToken: v.optional(v.string()),
    youtubeRefreshToken: v.optional(v.string()),
    youtubeTokenExpiresAt: v.optional(v.number()),
    youtubeChannelId: v.optional(v.string()),
    youtubeChannelName: v.optional(v.string()),
    youtubeChannelThumbnail: v.optional(v.string()),
    instagramAccessToken: v.optional(v.string()),
    instagramTokenExpiresAt: v.optional(v.number()),
    facebookPageId: v.optional(v.string()),
    instagramAccountId: v.optional(v.string()),
    instagramUsername: v.optional(v.string()),
    tiktokAccessToken: v.optional(v.string()),
    tiktokRefreshToken: v.optional(v.string()),
    tiktokTokenExpiresAt: v.optional(v.number()),
    tiktokOpenId: v.optional(v.string()),
    tiktokCreatorUsername: v.optional(v.string()),
    isActive: v.boolean(),

    // ═══ Configurações de negócio por canal ═══
    niche: v.optional(v.string()), // Ex: "música", "fitness", "culinária"
    systemPrompt: v.optional(v.string()), // Instruções personalizadas de criação de conteúdo
    motorType: v.optional(v.union(
      v.literal("animation_2d"), // Motor 1: Animação 2D / Stick Figure
      v.literal("url_clips"), // Motor 2: Corte de vídeo por URL
      v.literal("stock_video"), // Motor 3: Vídeos de banco (Pexels/Pixabay + TTS)
      v.literal("static_post"), // Motor 4: Posts estáticos / Carrosséis
      v.literal("manga_video") // Motor 5: Slideshow de mangá/manhwa
    )),
    mode: v.optional(v.union(v.literal("AUTO_GENERATED"), v.literal("URL_CLIPS"))), // Compatibilidade
    targetUrl: v.optional(v.string()), // URL do vídeo para recortar (modo URL_CLIPS)
    postFrequency: v.optional(v.number()), // Ex: 1 = 1x ao dia, 2 = 2x ao dia
    autoPublish: v.optional(v.boolean()), // Padrão: false — cria como RASCUNHO/UNLISTED/PRIVATE
    lastCronRunAt: v.optional(v.number()), // Timestamp do último cron job executado
    contentCount: v.optional(v.number()), // Quantos conteúdos já foram gerados
    // Configurações específicas por motor
    motorConfig: v.optional(v.object({
      // Motor 1: Animação 2D
      animationStyle: v.optional(v.string()), // "stick_figure", "cartoon", "anime"
      frameRate: v.optional(v.number()),
      // Motor 2: URL Clipes
      clipDuration: v.optional(v.number()), // segundos
      cropMode: v.optional(v.string()), // "center", "face_detect"
      // Motor 3: Stock Video
      stockSource: v.optional(v.string()), // "pixabay", "pexels", "both"
      ttsVoice: v.optional(v.string()), // "pt-BR-FranciscaNeural", "pt-BR-AntonioNeural"
      // Motor 4: Post Estático
      imageSize: v.optional(v.string()), // "1080x1080", "1080x1350"
      designTemplate: v.optional(v.string()), // "minimal", "bold", "corporate"
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_platform", ["userId", "platform"]),

  // ═══════════════════════════════════════════════════════════════
  // FILA DE CONTEÚDO — Postagens rápidas
  // ═══════════════════════════════════════════════════════════════
  contentQueue: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok"),
      v.literal("multi")
    ),
    contentType: v.union(
      v.literal("short"),
      v.literal("reel"),
      v.literal("post"),
      v.literal("carousel"),
      v.literal("long_video")
    ),
    motorType: v.optional(v.union(
      v.literal("animation_2d"),
      v.literal("url_clips"),
      v.literal("stock_video"),
      v.literal("static_post"),
      v.literal("manga_video")
    )),
    status: v.union(
      v.literal("draft"),
      v.literal("ai_generating"),
      v.literal("rendering"),
      v.literal("ready"),
      v.literal("scheduled"),
      v.literal("publishing"),
      v.literal("published"),
      v.literal("failed")
    ),
    source: v.union(
      v.literal("ai_generated"),
      v.literal("youtube_cut"),
      v.literal("manual")
    ),
    aiPrompt: v.optional(v.string()),
    aiScript: v.optional(v.string()),
    aiNarration: v.optional(v.string()),
    aiHashtags: v.optional(v.array(v.string())),
    aiThumbnailUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    mediaUrl: v.optional(v.string()), // URL da mídia processada (vídeo/imagem)
    youtubeVideoId: v.optional(v.string()),
    instagramContainerId: v.optional(v.string()),
    tiktokPublishId: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    retryCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_userId_platform", ["userId", "platform"]),

  // ═══════════════════════════════════════════════════════════════
  // CRON JOBS — Registro de execuções de cron
  // ═══════════════════════════════════════════════════════════════
  cronJobs: defineTable({
    connectionId: v.id("connections"),
    userId: v.string(),
    platform: v.union(
      v.literal("youtube"),
      v.literal("instagram"),
      v.literal("tiktok")
    ),
    action: v.union(
      v.literal("generate_content"),
      v.literal("clip_from_url"),
      v.literal("publish"),
      v.literal("refresh_token")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    contentId: v.optional(v.id("contentQueue")),
    queueId: v.optional(v.id("contentQueue")),
    result: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_connectionId", ["connectionId"])
    .index("by_status", ["status"])
    .index("by_scheduledAt", ["scheduledAt"]),
});
