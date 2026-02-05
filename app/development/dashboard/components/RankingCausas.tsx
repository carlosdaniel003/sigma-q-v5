"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Cell
} from "recharts";
import { CauseItem } from "../hooks/useDashboard";

interface Props {
  data: {
    byAnalysis: CauseItem[];
    byFailure: CauseItem[];
    // byPosition removido
  };
}

// ✅ REMOVIDO "posicao" DA TIPAGEM
type RankingMode = "analise" | "falha";

export default function RankingCausas({ data }: Props) {
  const [mode, setMode] = useState<RankingMode>("analise");

  // ✅ LOGICA ATUALIZADA (SEM POSIÇÃO)
  const chartData = useMemo(() => {
    if (!data) return [];
    if (mode === "analise") return data.byAnalysis || [];
    if (mode === "falha") return data.byFailure || [];
    return [];
  }, [data, mode]);

  if (chartData.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerWrapper}>
            <Tabs mode={mode} setMode={setMode} />
        </div>
        <div style={emptyState}>Sem dados para esta visão no período.</div>
      </div>
    );
  }

  const maxVal = Math.max(...chartData.map(d => d.ppm), 1);

  return (
    <div style={containerStyle}>
      <div style={headerWrapper}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: "1.1rem", color: "#fff", margin: 0 }}>
            🚧 Ranking de Ofensores
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
            Principais análises e falhas
          </p>
        </div>
        
        {/* Botões de Seleção de Visão */}
        <Tabs mode={mode} setMode={setMode} />
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
            barCategoryGap={6}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
            
            <XAxis type="number" hide domain={[0, maxVal * 1.15]} />
            
            <YAxis 
              dataKey="name" 
              type="category" 
              width={130} 
              tick={{ fill: "#cbd5e1", fontSize: 10 }}
              interval={0}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => val.length > 20 ? val.substring(0, 18) + "..." : val}
            />

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={<CustomTooltip mode={mode} />}
            />

            <Bar dataKey="ppm" radius={[0, 4, 4, 0]} barSize={18}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index < 3 ? "#EF4444" : "#3B82F6"} />
              ))}
              <LabelList dataKey="ppm" content={renderCustomLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ======================================================
   SUB-COMPONENTES AUXILIARES
====================================================== */

function Tabs({ mode, setMode }: { mode: RankingMode, setMode: (m: RankingMode) => void }) {
    return (
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.2)", padding: 4, borderRadius: 8 }}>
            <TabBtn active={mode === "analise"} label="Análise" onClick={() => setMode("analise")} />
            <TabBtn active={mode === "falha"} label="Falha" onClick={() => setMode("falha")} />
            {/* Botão Posição Removido */}
        </div>
    );
}

function TabBtn({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} style={{
            padding: "4px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
            background: active ? "#3B82F6" : "transparent",
            color: active ? "#fff" : "#94a3b8"
        }}>{label}</button>
    );
}

const CustomTooltip = ({ active, payload, mode }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload as CauseItem;
    const formatPercent = (v: any) => v ? `(${Math.round(v * 100)}%)` : "";

    return (
        <div style={{ 
            background: "#0f172a", 
            border: "1px solid rgba(255,255,255,0.15)", 
            padding: "12px", 
            borderRadius: "8px", 
            fontSize: "11px", 
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
            minWidth: 220
        }}>
            <p style={{ fontWeight: "bold", color: "#fff", marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 4 }}>
                {d.name}
            </p>
            <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#3B82F6" }}>🔸 PPM: <strong>{Math.round(d.ppm)}</strong></span>
                <span style={{ color: "#cbd5e1", marginLeft: 10 }}>🔴 Qtd: <strong>{d.defects}</strong></span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 8 }}>
                {d.topModel && <div><span style={{color: "#94a3b8"}}>🏆 Modelo:</span> {d.topModel.name} {formatPercent(d.topModel.percent)}</div>}
                
                {mode !== "analise" && d.topAnalysis && (
                    <div><span style={{color: "#94a3b8"}}>🔎 Análise:</span> {d.topAnalysis.name} {formatPercent(d.topAnalysis.percent)}</div>
                )}
                
                {mode !== "falha" && d.topFailure && (
                    <div><span style={{color: "#94a3b8"}}>📝 Falha:</span> {d.topFailure.name} {formatPercent(d.topFailure.percent)}</div>
                )}
                
                {/* Linha de Contexto de Posição Removida do Tooltip para limpar */}
            </div>
        </div>
    );
};

const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
        <text x={x + width + 5} y={y + height / 2 + 1} fill="#cbd5e1" textAnchor="start" dominantBaseline="middle" style={{ fontSize: 10, fontWeight: "bold" }}>
            {Math.round(value).toLocaleString("pt-BR")}
        </text>
    );
};

/* ======================================================
   ESTILOS
====================================================== */
const containerStyle: React.CSSProperties = { 
    background: "rgba(255,255,255,0.04)", 
    border: "1px solid rgba(255,255,255,0.08)", 
    borderRadius: 16, 
    padding: 24, 
    height: 480, 
    display: "flex", 
    flexDirection: "column" 
};

const headerWrapper: React.CSSProperties = { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    marginBottom: 16 
};

const emptyState: React.CSSProperties = { 
    flex: 1, 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    color: "#94a3b8" 
};