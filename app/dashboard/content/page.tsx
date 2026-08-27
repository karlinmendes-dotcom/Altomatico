"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ContentPage() {
  const userId =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("altomatico_user") || "{}").id ||
        "default_user"
      : "default_user";

  const contents = useQuery(api.contentQueue.listByUser, {
    userId,
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-400",
    ai_generating: "bg-yellow-500/10 text-yellow-400",
    ready: "bg-green-500/10 text-green-400",
    scheduled: "bg-blue-500/10 text-blue-400",
    publishing: "bg-purple-500/10 text-purple-400",
    published: "bg-emerald-500/10 text-emerald-400",
    failed: "bg-red-500/10 text-red-400",
  };

  const platformIcons: Record<string, string> = {
    youtube: "🎬",
    instagram: "📱",
    tiktok: "🎵",
    multi: "🌐",
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Conteúdos</h1>
        <p className="text-gray-400 mt-1">
          Fila unificada de todos os conteúdos gerados
        </p>
      </div>

      {!contents ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      ) : contents.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhum conteúdo ainda
          </h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Vá para YouTube ou Instagram e gere seu primeiro conteúdo com IA.
            Ele aparecerá aqui na fila.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map((item: any) => (
            <div
              key={item._id}
              className="glass-card rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{platformIcons[item.platform] || "📄"}</span>
                <div>
                  <h3 className="text-sm font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.contentType} • {item.source} •{" "}
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusColors[item.status] || "bg-gray-500/10 text-gray-400"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
