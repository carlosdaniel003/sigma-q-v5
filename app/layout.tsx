// app\layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AppLayoutClient from "@/components/AppLayoutClient";

// ✅ 1. Importação do nosso novo Cérebro Global
import { ValidationProvider } from "@/contexts/ValidationContext";

export const metadata: Metadata = {
  title: "SIGMA-Q",
  description: "Sistema de Gestão de Qualidade",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {/* ✅ 2. Envolvemos TUDO com o ValidationProvider. 
            A partir de agora, o sistema inteiro sabe quando tem erro! */}
        <ValidationProvider>
          {/* O AppLayoutClient gerencia se mostra o menu ou não */}
          <AppLayoutClient>{children}</AppLayoutClient>
        </ValidationProvider>
        
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </body>
    </html>
  );
}