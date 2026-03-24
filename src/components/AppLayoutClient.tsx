// src/components/AppLayoutClient.tsx
"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { MainSidebar } from "@/components/MainSidebar";

// ✅ Importação do novo Wallpaper e Layout Global
import "./AppLayoutClient-glass.css"; 

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 🔥 AJUSTE: Iniciando como 'true' para que a sidebar apareça fechada ao entrar
  const [collapsed, setCollapsed] = useState(true);

  // 🚫 LISTA NEGRA: Rotas onde o Sidebar NÃO deve aparecer
  // Adicione outras rotas públicas aqui se necessário
  const isPublicPage = pathname === "/";

  // Se for página pública (Raiz), renderiza apenas o conteúdo limpo
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Se for sistema interno, renderiza a estrutura com Sidebar persistente
  return (
    <div className={`glass-app-container ${collapsed ? "glass-is-collapsed" : ""}`}>
      
      {/* O Sidebar mora aqui e NUNCA é desmontado na navegação interna */}
      <MainSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* O Conteúdo das páginas é renderizado aqui dentro */}
      <main className="glass-app-content">
        {children}
      </main>
      
    </div>
  );
}