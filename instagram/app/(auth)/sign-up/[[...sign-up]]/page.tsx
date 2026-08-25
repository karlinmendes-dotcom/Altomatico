import React from "react";

export default function Page() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Bem-vindo ao Altomatico</h1>
        <p className="text-gray-600 mb-4">Autenticação via Convex Auth</p>
        <a href="/dashboard" className="bg-primary text-white px-6 py-2 rounded-lg">
          Entrar
        </a>
      </div>
    </div>
  );
}
