import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

const inter = Outfit ({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Altomatico - Gerador de Conteúdo IA",
  description: "Gere conteúdo automaticamente para Instagram e YouTube com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
