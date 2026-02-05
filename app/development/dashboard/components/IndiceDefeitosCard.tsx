// C:\Users\cdaniel\sigma-q-v3\app\development\dashboard\components\IndiceDefeitosCard.tsx
"use client";

import React from "react";

interface IndiceDefeitosCardProps {
  meta: number;
  real: number | null;
}

export default function IndiceDefeitosCard({
  meta,
  real,
}: IndiceDefeitosCardProps) {
  const isAboveTarget =
    real !== null ? real > meta : false;

  // ✅ Função auxiliar para garantir a formatação padrão PT-BR (1.000,00)
  const formatPpm = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${
          isAboveTarget
            ? "rgba(255,80,80,0.6)"
            : "rgba(80,255,160,0.6)"
        }`,
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 13 }}>
        Índice de Defeitos (PPM)
      </div>

      <div
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          marginTop: 8,
        }}
      >
        {/* ✅ Meta formatada */}
        Meta: {formatPpm(meta)} PPM
      </div>

      <div
        style={{
          fontSize: "1.8rem",
          fontWeight: 800,
          marginTop: 4,
          color: isAboveTarget
            ? "#ff6b6b"
            : "#6bffb0",
        }}
      >
        Real:{" "}
        {real !== null
          ? `${formatPpm(real)} PPM` // ✅ Real formatado igual à meta
          : "—"}
      </div>
    </div>
  );
}