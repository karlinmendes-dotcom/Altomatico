import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Criar tarefa de vídeo (YouTube)
export const create = mutation({
  args: {
    theme: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("videoTasks", {
      theme: args.theme,
      status: "pending",
      createdBy: args.createdBy,
      createdAt: new Date().toISOString(),
    });
    return id;
  },
});

// Atualizar status da tarefa
export const updateStatus = mutation({
  args: {
    id: v.id("videoTasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    videoUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      videoUrl: args.videoUrl,
      errorMessage: args.errorMessage,
      ...(args.status === "completed" || args.status === "failed"
        ? { completedAt: new Date().toISOString() }
        : {}),
    });
  },
});

// Listar tarefas do usuário
export const listByUser = query({
  args: { createdBy: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videoTasks")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.createdBy))
      .order("desc")
      .collect();
  },
});

// Buscar tarefa por ID
export const get = query({
  args: { id: v.id("videoTasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
