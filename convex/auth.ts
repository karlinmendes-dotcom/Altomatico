import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// Auth — Sistema de autenticação simples
// ═══════════════════════════════════════════════════════════════

export const users = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userSettings").collect();
  },
});

// ─── Registrar usuário ──────────────────────────────────────
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verificar se email já existe
    const existing = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existing) {
      throw new Error("Email já cadastrado");
    }

    const now = new Date().toISOString();
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const id = await ctx.db.insert("userSettings", {
      userId,
      email: args.email,
      displayName: args.displayName || args.email.split("@")[0],
      preferredLlm: "gemini",
      language: "pt-BR",
      country: "BR",
      automationMode: "manual",
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      email: args.email,
      displayName: args.displayName || args.email.split("@")[0],
    };
  },
});

// ─── Login ─────────────────────────────────────────────────
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Para simplificar, usamos uma validação básica
    // Em produção, usar hash de senha
    if (args.password.length < 4) {
      throw new Error("Senha inválida");
    }

    return {
      id: user._id,
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
    };
  },
});

// ─── Verificar sessão ──────────────────────────────────────
export const getCurrentUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return null;

    const user = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user) return null;

    return {
      id: user._id,
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      youtubeConnected: user.youtubeConnected,
      instagramConnected: user.instagramConnected,
    };
  },
});

// ─── Atualizar perfil ──────────────────────────────────────
export const updateProfile = mutation({
  args: {
    userId: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user) throw new Error("Usuário não encontrado");

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (args.displayName) updates.displayName = args.displayName;
    if (args.email) updates.email = args.email;

    await ctx.db.patch(user._id, updates);
    return { success: true };
  },
});

// ─── Logout ────────────────────────────────────────────────
export const logout = mutation({
  args: {},
  handler: async () => {
    // No server-side state to clear for this simple auth
    return { success: true };
  },
});
