"use client";

import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ======================================================
   CORES
====================================================== */
const COLORS = [
  "#3B82F6", // Azul Vibrante
  "#EF4444", // Vermelho
  "#F97316", // Laranja
  "#EAB308", // Amarelo
  "#10B981", // Verde
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#8B5CF6", // Roxo
  "#EC4899", // Rosa
  "#64748B", // Slate
  "#14B8A6", // Teal
  "#84CC16", // Lime
  "#D946EF", // Fuchsia
];

/* ======================================================
   TIPOS
====================================================== */
interface ModelItem {
  modelo: string;       // Nome correto vindo da API
  produzido: number;    // Nome correto vindo da API
  defeitos: number;     // Nome correto vindo da API
  ppm: number;
  
  // ✅ CORREÇÃO TYPESCRIPT:
  // Permite acesso dinâmico de propriedades para o Recharts
  [key: string]: any;
}

interface Props {
  data: ModelItem[];
}

/* ======================================================
   COMPONENTE
====================================================== */
export default function IndicePorModelo({ data }: Props) {
  // Estado para controlar o destaque ao passar o mouse (Hover)
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  /* ===============================
     PREPARAÇÃO DOS DADOS
  ============================== */
  const chartData = (data || [])
    .filter((d) => d.produzido > 0) 
    .sort((a, b) => b.ppm - a.ppm);

  if (chartData.length === 0) {
    return (
      <div style={emptyContainerStyle}>
        Nenhum dado de modelo disponível
      </div>
    );
  }

  // Handlers de Mouse para o Gráfico
  const onPieEnter = (_: any, index: number) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(undefined);

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <h2 style={{ fontSize: "1.1rem" }}>
          📊 Índice por Modelo (PPM)
        </h2>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
          {chartData.length} modelos registrados
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16, overflow: "hidden" }}>
        
        {/* =========================================
            ESQUERDA: GRÁFICO (DONUT) 
           ========================================= */}
        <div style={{ flex: "1", position: "relative", minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={2}
                dataKey="ppm"
                nameKey="modelo"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartData.map((entry, index) => {
                  const isActive = activeIndex === index;
                  const isDimmed = activeIndex !== undefined && !isActive;
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke="rgba(0,0,0,0)"
                      // Se outro item estiver focado, diminui a opacidade deste
                      opacity={isDimmed ? 0.3 : 1}
                    />
                  );
                })}
              </Pie>

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataItem = payload[0].payload as ModelItem;
                    return (
                      <div style={tooltipStyle}>
                        <p style={{ fontWeight: "bold", marginBottom: "8px", color: "#fff" }}>
                           {dataItem.modelo}
                        </p>
                        <p style={{ color: "#60a5fa" }}>
                          🔹 {dataItem.ppm.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PPM
                        </p>
                        <p style={{ color: "#cbd5e1", fontSize: 11, marginTop: 4 }}>
                          Prod: {dataItem.produzido.toLocaleString("pt-BR")} | Def: {dataItem.defeitos}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Texto Central do Donut */}
          <div style={centerTextStyle}>
             <span style={{fontSize: 20, fontWeight: "bold", color: "#fff"}}>
               {chartData.length}
             </span>
             <span style={{fontSize: 9, color: "#94a3b8"}}>ITEMS</span>
          </div>
        </div>

        {/* =========================================
            DIREITA: LISTA CUSTOMIZADA (SCROLL) 
           ========================================= */}
        <div className="custom-scrollbar" style={listContainerStyle}>
          {chartData.map((item, index) => {
             const color = COLORS[index % COLORS.length];
             const isActive = activeIndex === index;
             const isDimmed = activeIndex !== undefined && !isActive;

             return (
               <div 
                  key={index} 
                  style={{
                    ...listItemStyle,
                    opacity: isDimmed ? 0.4 : 1, // Apaga itens não focados
                    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
               >
                  <div style={{ 
                      width: 8, height: 8, borderRadius: "50%", 
                      background: color, flexShrink: 0,
                      boxShadow: isActive ? `0 0 8px ${color}` : "none"
                  }} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#f1f5f9", fontWeight: 500, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.modelo}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "#cbd5e1" }}>
                           {Math.round(item.ppm).toLocaleString("pt-BR")} PPM
                        </span>
                    </div>
                  </div>
               </div>
             );
          })}
        </div>

      </div>

      {/* Estilo Global para Scrollbar (Injetado apenas para este componente) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

/* ======================================================
   ESTILOS CSS-IN-JS
====================================================== */
const containerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
  height: 400,
  display: "flex",
  flexDirection: "column",
};

const emptyContainerStyle: React.CSSProperties = {
  ...containerStyle,
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
};

const tooltipStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "10px",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
  zIndex: 100
};

const centerTextStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  lineHeight: 1,
};

// Container da Lista (Direita) - Onde o scroll acontece
const listContainerStyle: React.CSSProperties = {
  flex: "1.1", // Um pouco mais largo que o gráfico
  display: "flex",
  flexDirection: "column",
  gap: 2,
  overflowY: "auto", // ✅ HABILITA O SCROLL
  paddingRight: 8,
  height: "100%",
};

// Item da Lista
const listItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 8px",
  borderRadius: 6,
  cursor: "pointer",
  transition: "all 0.2s",
  borderBottom: "1px solid rgba(255,255,255,0.02)",
};