import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tabela de saídas de IA (Instagram)
  aiOutputs: defineTable({
    formData: v.string(),
    aiResponse: v.optional(v.string()),
    templateSlug: v.string(),
    createdBy: v.string(),
    createdAt: v.string(),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_templateSlug", ["templateSlug"])
    .index("by_createdAt", ["createdAt"]),

  // Tabela de tarefas de vídeo (YouTube)
  videoTasks: defineTable({
    theme: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    videoUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"]),

  // Tabela de configurações do usuário
  userSettings: defineTable({
    userId: v.string(),
    youtubeApiKey: v.optional(v.string()),
    instagramApiKey: v.optional(v.string()),
    preferredLlm: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),
});
