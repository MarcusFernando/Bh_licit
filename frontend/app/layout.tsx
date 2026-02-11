import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- ESSA LINHA É A MÁGICA QUE FALTOU!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BH Licit - Monitor Inteligente",
  description: "Sistema de monitoramento de licitações com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}