"use client";

import React from "react";
import { SearchX, Factory, Trophy, LucideIcon } from "lucide-react";

type MessageType = "sem_dados" | "sem_producao" | "sucesso";

interface DashboardMessageProps {
  tipo: MessageType;
  filtro?: string; // Opcional, para personalizar a mensagem (ex: nome do modelo)
}

const CONFIG: Record<MessageType, { icon: LucideIcon; title: string; desc: string; color: string }> = {
  sem_dados: {
    icon: SearchX,
    title: "Nenhum registro encontrado",
    desc: "Não há dados correspondentes para a combinação de filtros selecionada. Tente ajustar o período ou as categorias.",
    color: "#94a3b8", // Slate 400
  },
  sem_producao: {
    icon: Factory,
    title: "Sem Produção Registrada",
    desc: "Não houve apontamento de produção para este modelo/categoria no período selecionado. O cálculo de PPM não se aplica.",
    color: "#f59e0b", // Amber 500
  },
  sucesso: {
    icon: Trophy,
    title: "Excelência Total!",
    desc: "Parabéns! A produção ocorreu normalmente e atingiu 100% de qualidade (0 Defeitos) neste período.",
    color: "#22c55e", // Green 500
  },
};

export default function DashboardMessage({ tipo, filtro }: DashboardMessageProps) {
  const { icon: Icon, title, desc, color } = CONFIG[tipo];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.1)",
        borderRadius: 16,
        textAlign: "center",
        height: "100%",
        minHeight: 300,
        animation: "fadeIn 0.5s ease-in-out",
      }}
    >
      <div
        style={{
          background: `${color}20`, // 20% opacidade
          padding: 20,
          borderRadius: "50%",
          marginBottom: 16,
          boxShadow: `0 0 20px ${color}10`,
        }}
      >
        <Icon size={48} color={color} strokeWidth={1.5} />
      </div>
      
      <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: 8 }}>
        {title}
      </h3>
      
      <p style={{ fontSize: "0.95rem", color: "#94a3b8", maxWidth: 450, lineHeight: 1.6 }}>
        {desc}
      </p>

      {/* Estilo de animação simples */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}