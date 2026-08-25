import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Salvar saída de IA (usado pelo Instagram)
export const save = mutation({
  args: {
    formData: v.string(),
    aiResponse: v.string(),
    templateSlug: v.string(),
    createdBy: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiOutputs", {
      formData: args.formData,
      aiResponse: args.aiResponse,
      templateSlug: args.templateSlug,
      createdBy: args.createdBy,
      createdAt: args.createdAt,
    });
    return id;
  },
});

// Buscar histórico por email do usuário
export const listByUser = query({
  args: { createdBy: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiOutputs")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.createdBy))
      .order("desc")
      .collect();
  },
});

// Buscar总量 de uso do usuário (contagem)
export const countByUser = query({
  args: { createdBy: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("aiOutputs")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.createdBy))
      .collect();
    return results.length;
  },
});

// Deletar saída de IA por ID
export const remove = mutation({
  args: { id: v.id("aiOutputs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
