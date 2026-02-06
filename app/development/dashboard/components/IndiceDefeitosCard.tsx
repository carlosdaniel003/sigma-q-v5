"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface IndiceDefeitosCardProps {
  meta: number;
  real: number | null;
  // ✅ Prop Opcional para Projeção
  projection?: number | null;
}

export default function IndiceDefeitosCard({
  meta,
  real,
  projection,
}: IndiceDefeitosCardProps) {
  // Lógica de Validação (PPM: Quanto maior, pior)
  const isAboveTarget = real !== null ? real > meta : false;

  // 1. Cálculo do Delta (Desvio %)
  let deltaPercent = 0;
  if (real !== null && meta > 0) {
    deltaPercent = ((real - meta) / meta) * 100;
  }

  // 2. Configuração Visual do Delta
  const isNegativeDelta = deltaPercent > 0; // No contexto de PPM, positivo é ruim
  const deltaColor = isNegativeDelta ? "#ef4444" : "#22c55e"; // Red vs Green
  const deltaBg = isNegativeDelta ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)";
  const DeltaIcon = deltaPercent === 0 ? Minus : isNegativeDelta ? TrendingUp : TrendingDown;

  // 3. Configuração da Projeção
  const projIsBad = projection !== null && projection !== undefined ? projection > meta : false;
  const projColor = projIsBad ? "#fb923c" : "#94a3b8"; // Laranja (Alerta) ou Cinza (Neutro)

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
            ? "rgba(255,80,80,0.4)"
            : "rgba(80,255,160,0.4)"
        }`,
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Título e Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ opacity: 0.7, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Índice de Defeitos (PPM)
            </div>
            <div style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                Meta: <strong style={{ color: "#e2e8f0" }}>{formatPpm(meta)}</strong>
            </div>
        </div>
      </div>

      {/* Valor Real e Delta */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 12 }}>
        
        {/* Valor Principal */}
        <div
            style={{
            fontSize: "2.2rem",
            fontWeight: 800,
            lineHeight: 1,
            color: real === null 
                ? "#94a3b8" 
                : isAboveTarget ? "#fca5a5" : "#86efac",
            }}
        >
            {real !== null ? formatPpm(real) : "—"}
        </div>

        {/* Badge de Delta */}
        {real !== null && (
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 6,
                background: deltaBg,
                color: deltaColor,
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: 4
            }}>
                <DeltaIcon size={14} strokeWidth={3} />
                <span>
                    {deltaPercent > 0 ? "+" : ""}
                    {deltaPercent.toFixed(1)}%
                </span>
            </div>
        )}
      </div>
      
      {/* ✅ NOVA ÁREA DE PROJEÇÃO (Rodapé condicional) */}
      {projection !== null && projection !== undefined && (
          <div style={{ 
              marginTop: 12, 
              paddingTop: 12, 
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              animation: "fadeIn 0.5s ease-in-out"
          }}>
              <Activity size={14} color={projColor} />
              <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                  No ritmo atual, fecha em <strong style={{ color: projColor }}>{formatPpm(projection)}</strong>
              </div>
          </div>
      )}

      {/* Estilo para animação simples */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}