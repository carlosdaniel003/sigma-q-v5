"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Label,
  CartesianGrid
} from "recharts";
import { TrendItem } from "../hooks/useDashboard"; 

const META_PPM = 6200;

interface Props {
  data: TrendItem[];
  tipoLabel: string;
}

/* ======================================================
   UTILS DE FORMATAÇÃO
====================================================== */
function formatLabel(value: string, tipo: string): string {
  if (!value) return "";
  
  const t = tipo.toLowerCase();

  if (t === "dia") {
      const parts = value.split("-");
      if (parts.length === 3) {
          const d = parts[2].padStart(2, "0");
          const m = parts[1].padStart(2, "0");
          return `${d}/${m}`;
      }
  }
  
  if (t === "semana") {
      if (value.includes("W")) {
          const w = value.split("-W")[1];
          return `S${Number(w)}`; 
      }
  }

  if (value.length >= 7) {
      const [y, m] = value.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      if (!isNaN(date.getTime())) {
          const monthName = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);
          return `${monthName.toUpperCase()}/${y.substring(2)}`; 
      }
  }

  return value;
}

/* ======================================================
   CUSTOM LABELS PARA BARRAS EMPILHADAS
====================================================== */

// Label para a parte AZUL (Segura)
const renderSafeLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  const totalPpm = Number(value || 0);

  // Se passou da meta, a responsabilidade de mostrar o número é da parte vermelha.
  // Retorna null para não desenhar nada na parte azul.
  if (totalPpm > META_PPM) return null;
  
  // Se a barra azul for muito pequena, não desenha para não cortar
  if (width < 40) return null;

  return (
    <text
      x={x + width - 8}
      y={y + height / 2}
      fill="#fff" // Branco pois está dentro da barra azul
      textAnchor="end"
      dominantBaseline="middle"
      style={{ fontSize: 11, fontWeight: "bold", pointerEvents: "none" }}
    >
      {totalPpm.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PPM
    </text>
  );
};

// Label para a parte VERMELHA (Excedente)
// ✅ NOVA REGRA: Se essa função for chamada (significa que tem excesso), 
// o texto será SEMPRE vermelho e SEMPRE fora da barra (à direita).
const renderExcessLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  const totalPpm = Number(value || 0);

  // Segurança: se não passou da meta, não desenha (deveria ser tratado pelo SafeLabel)
  if (totalPpm <= META_PPM) return null;
  
  return (
    <text
      x={x + width + 5} // Sempre desenha 5px à direita do final da barra vermelha
      y={y + height / 2}
      fill="#EF4444" // Sempre Vermelho
      textAnchor="start" // Alinhado à esquerda (começa logo após a barra)
      dominantBaseline="middle"
      style={{ fontSize: 11, fontWeight: "bold", pointerEvents: "none" }}
    >
      {totalPpm.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PPM
    </text>
  );
};

/* ======================================================
   COMPONENTE
====================================================== */
export default function IndicePorMes({ data, tipoLabel }: Props) {
  
  // 1. PREPARAÇÃO DOS DADOS (SPLIT AZUL/VERMELHO)
  const chartData = (data || [])
    .filter(d => d.production > 0)
    .map(d => {
        const ppmReal = d.ppm || 0;
        
        // Separa o valor em duas partes
        const ppmSafe = Math.min(ppmReal, META_PPM); // Azul vai até a meta no máximo
        const ppmExcess = Math.max(0, ppmReal - META_PPM); // Vermelho é só o que sobra

        return {
            labelKey: d.name, 
            ppmTotal: ppmReal, // Valor real para tooltips e labels
            ppmSafe: ppmSafe,
            ppmExcess: ppmExcess,
            production: d.production,
            defects: d.defects
        };
    });

  if (chartData.length === 0) {
     return (
        <div style={emptyContainerStyle}>
            Nenhum dado de histórico disponível para esta seleção.
        </div>
     );
  }

  // Calcula máximo dinâmico e aumenta a margem (x 1.3) para garantir espaço para o label externo
  const maxVal = Math.max(...chartData.map(d => d.ppmTotal), META_PPM) * 1.3;

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: 16, color: "#fff" }}>
        📊 Evolução Temporal ({tipoLabel})
      </h2>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            // Aumentei a margem direita (right: 80) para o texto vermelho não cortar
            margin={{ top: 20, right: 80, left: 10, bottom: 5 }} 
            barCategoryGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
            
            <XAxis type="number" hide domain={[0, maxVal]} />
            
            <YAxis 
                dataKey="labelKey" 
                type="category" 
                tickFormatter={(val) => formatLabel(val, tipoLabel)}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                width={60}
                axisLine={false}
                tickLine={false}
                interval={0} 
            />

            <Tooltip 
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                        const dataItem = payload[0].payload;
                        return (
                            <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", padding: "12px", borderRadius: "8px", fontSize: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)" }}>
                                <p style={{ fontWeight: "bold", marginBottom: "8px", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4 }}>
                                    {formatLabel(label as string, tipoLabel)}
                                </p>
                                <div style={{ marginBottom: 6 }}>
                                    {/* Mostra o Total Real */}
                                    <span style={{ color: dataItem.ppmTotal > META_PPM ? "#EF4444" : "#60a5fa" }}>
                                        🔸 PPM: <strong>{dataItem.ppmTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </span>
                                </div>
                                <div style={{ display: "flex", gap: 12, color: "#cbd5e1" }}>
                                    <span>📦 Prod: {dataItem.production.toLocaleString("pt-BR")}</span>
                                    <span style={{ color: "#fca5a5" }}>🔴 Def: {dataItem.defects.toLocaleString("pt-BR")}</span>
                                </div>
                            </div>
                        );
                    }
                    return null;
                }}
            />

            <ReferenceLine x={META_PPM} stroke="#EF4444" strokeDasharray="4 4">
                <Label 
                    value={`Meta ${META_PPM.toLocaleString("pt-BR")} PPM`} 
                    position="insideTopRight" 
                    fill="#EF4444" 
                    fontSize={10} 
                    offset={-5}
                    fontWeight={700}
                />
            </ReferenceLine>

            {/* BARRA AZUL (SEGURA) */}
            <Bar 
                dataKey="ppmSafe" 
                stackId="a" 
                fill="#3B82F6" 
                radius={[0, 4, 4, 0]} 
                barSize={20}
            >
                <LabelList dataKey="ppmTotal" content={renderSafeLabel} />
            </Bar>

            {/* BARRA VERMELHA (EXCEDENTE) */}
            <Bar 
                dataKey="ppmExcess" 
                stackId="a" 
                fill="#EF4444" 
                radius={[0, 4, 4, 0]} 
                barSize={20}
            >
                <LabelList dataKey="ppmTotal" content={renderExcessLabel} />
            </Bar>

          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
  height: 480,
  display: "flex",
  flexDirection: "column",
};

const emptyContainerStyle: React.CSSProperties = {
  ...containerStyle,
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
};