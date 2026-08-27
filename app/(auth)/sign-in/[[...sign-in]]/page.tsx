"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function SignInPage() {
  const router = useRouter();
  const login = useMutation(api.auth.login);
  const register = useMutation(api.auth.register);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !password) {
        throw new Error("Preencha todos os campos");
      }

      if (password.length < 4) {
        throw new Error("A senha deve ter pelo menos 4 caracteres");
      }

      // Tentar login no Convex
      try {
        const result = await login({ email, password });
        localStorage.setItem(
          "altomatico_user",
          JSON.stringify({
            id: result.userId,
            email: result.email,
            displayName: result.displayName,
            convexId: result.id,
          })
        );
        router.push("/dashboard");
        return;
      } catch (loginErr) {
        // Se usuario nao existe, tentar criar
        if (loginErr instanceof Error && loginErr.message.includes("não encontrado")) {
          try {
            const result = await register({
              email,
              password,
              displayName: email.split("@")[0],
            });
            localStorage.setItem(
              "altomatico_user",
              JSON.stringify({
                id: result.userId,
                email: result.email,
                displayName: result.displayName,
                convexId: result.id,
              })
            );
            router.push("/dashboard");
            return;
          } catch {
            // Se registro falhar, usar localStorage
          }
        }
      }

      // Fallback: localStorage
      const userId = `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const displayName = email.split("@")[0];

      localStorage.setItem(
        "altomatico_user",
        JSON.stringify({
          id: userId,
          email,
          displayName,
        })
      );

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-white font-bold text-2xl">Altomatico</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h1>
          <p className="text-gray-400">Entre na sua conta para continuar</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition pr-12"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Nao tem uma conta?{" "}
              <Link href="/sign-up" className="text-purple-400 hover:text-purple-300 font-medium transition">
                Criar conta gratis
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Uso pessoal — Seus dados sao protegidos
        </p>
      </div>
    </div>
  );
}
