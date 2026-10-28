import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Oráculo das Conexões Narrativas — IA e a Ciência das Histórias",
  description:
    "Estação de trabalho analítica que usa LLMs para dissecar o monomito e a estrutura narrativa, transformando arquétipos abstratos em dados visuais e insights acionáveis.",
  keywords: [
    "mitologia",
    "narratologia",
    "monomito",
    "Jung",
    "Campbell",
    "arquétipos",
    "inteligência artificial",
    "análise narrativa",
    "storytelling",
    "comparação de mitos",
  ],
  authors: [{ name: "Oráculo das Conexões Narrativas" }],
  openGraph: {
    title: "Oráculo das Conexões Narrativas",
    description:
      "Disseque o monomito com agentes de IA — grafo de conexões, arquétipos e paralelos entre mitos, literatura e cultura pop.",
    siteName: "Oráculo das Conexões Narrativas",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oráculo das Conexões Narrativas",
    description:
      "IA e a ciência das histórias: paralelos entre mitos, literatura e cultura pop.",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
