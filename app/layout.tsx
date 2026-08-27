import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Altomatico - Gerador de Conteúdo IA",
  description: "Gere conteúdo automaticamente para Instagram, YouTube e TikTok com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={outfit.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
