// app\development\dashboard\components\KpiQuantidadeDefeitos.tsx
"use client";

import React from "react";

interface KpiQuantidadeDefeitosProps {
  value: string;
}

export default function KpiQuantidadeDefeitos({ value }: KpiQuantidadeDefeitosProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 20,
        // Removemos o height: 100% para evitar a "invasão" na parte inferior
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 8, // Pequeno espaço entre título e número
      }}
    >
      {/* Título sem Emoji */}
      <div style={{ opacity: 0.7, fontSize: 13, fontWeight: 500 }}>
        Quantidade de Defeitos
      </div>

      {/* Valor */}
      <div
        style={{
          fontSize: "1.8rem",
          fontWeight: 800,
          marginTop: 4,
          color: "#fff",
        }}
      >
        {value}
      </div>
    </div>
  );
}