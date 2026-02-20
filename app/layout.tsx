import type { Metadata } from "next";
import "./globals.css";
import AppLayoutClient from "@/components/AppLayoutClient";

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
        {/* O AppLayoutClient gerencia se mostra o menu ou não */}
        <AppLayoutClient>{children}</AppLayoutClient>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </body>
    </html>
  );
}