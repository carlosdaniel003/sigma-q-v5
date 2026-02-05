"use client";

import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Label,
  CartesianGrid,
} from "recharts";

/* ======================================================
   CONSTANTES
====================================================== */
const COLORS_RESP: Record<string, string> = {
  "FORN. IMPORTADO": "#60A5FA", "FORN. LOCAL": "#2563EB",
  "PROCESSO": "#F59E0B", "PROJETO": "#8B5CF6",
};

const COLORS_CAT: Record<string, string> = {
  BBS: "#60A5FA", CM: "#2563EB", TV: "#22C55E", MWO: "#F59E0B",
  TW: "#8B5CF6", TM: "#EC4899", ARCON: "#14B8A6", NBX: "#F97316",
};

const PALETA_MODELOS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", 
  "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6",
  "#F97316", "#06B6D4", "#84CC16", "#A855F7"
];

const COLOR_GERAL = "#3B82F6";
const META_PPM = 6200;

export type PpmViewMode = "geral" | "responsabilidade" | "categoria" | "modelo";

// Tipos
export interface TrendItem {
  name: string; 
  label: string;
  production: number;
  defects: number;
  ppm: number;
  responsabilidade: Record<string, number>;
  categoria: Record<string, number>;
  modelo: Record<string, number>; 
  abs_responsabilidade: Record<string, number>;
  abs_categoria: Record<string, number>;
  abs_modelo: Record<string, number>; 
  totalDefects?: number; 
  totalPpmDisplay?: number;
}

export interface TrendHierarchy {
  monthly: TrendItem[];
  weekly: Record<string, TrendItem[]>;
  daily: Record<string, TrendItem[]>;
}

interface Props {
  viewMode: PpmViewMode; 
  responsabilidadeData?: any[]; 
  categoriaData?: any[];
  ppmMonthlyTrend?: any[];
  trendData: TrendHierarchy; 
  filters?: any;
  allowedModels?: string[];
}

/* ======================================================
   UTILS DE FORMATAÇÃO
====================================================== */
function formatLabelFull(label: string | number, isContext: boolean = false): string {
  if (!label) return "";
  const strLabel = String(label);

  if (isContext) {
      if (strLabel.match(/^\d{4}-\d{2}$/)) {
          const [y, m] = strLabel.split("-").map(Number);
          const date = new Date(y, m - 1, 1);
          const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
          return `MÊS DE ${monthName.toUpperCase()}`; 
      }
      if (strLabel.includes("W")) {
          const weekNum = strLabel.split("-")[1].replace("W", "");
          return `TOTAL DA SEMANA ${Number(weekNum)}`; 
      }
      return "TOTAL DO PERÍODO";
  }
  
  if (strLabel.match(/^\d{4}-\d{2}$/)) {
    const [y, m] = strLabel.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
    return monthName.charAt(0).toUpperCase() + monthName.slice(1); 
  }
  
  if (strLabel.includes("W")) {
      const weekNum = strLabel.split("-")[1].replace("W", "");
      return `Semana ${Number(weekNum)}`; 
  }

  if (strLabel.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = strLabel.split("-");
      const day = parts[2];
      return `DIA ${day}`;
  }

  return strLabel; 
}

function formatLabelAxis(label: string | number, isContext: boolean = false): string {
  if (!label) return "";
  
  // Se for contexto, damos uma dica visual (mas o XAxis vai sobrescrever com formatação customizada se quiser)
  if (isContext) {
      if (String(label).match(/^\d{4}-\d{2}$/)) {
        const [y, m] = String(label).split("-").map(Number);
        const date = new Date(y, m - 1, 1);
        return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).toUpperCase().replace(".", "");
      }
      if (String(label).includes("W")) {
          return `S${Number(String(label).split("-")[1].replace("W", ""))}`;
      }
      return "TOTAL";
  }

  const strLabel = String(label);
  
  if (strLabel.match(/^\d{4}-\d{2}$/)) {
    const [y, m] = strLabel.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).toUpperCase().replace(".", "");
  }
  
  if (strLabel.includes("W")) {
      return `S${Number(strLabel.split("-")[1].replace("W", ""))}`;
  }

  if (strLabel.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = strLabel.split("-");
      return parts[2]; 
  }

  return strLabel; 
}

/* ======================================================
   CUSTOM LABELS
====================================================== */
const renderCustomBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (height < 20 || !value) return null;
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fontWeight: "bold", pointerEvents: "none", textShadow: "0 0 2px rgba(0,0,0,0.5)" }}>
      {Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </text>
  );
};

const renderTotalLabel = (props: any, chartData: any[], activeKeys: string[]) => {
  const { x, y, width, index } = props;
  const item = chartData[index];
  
  if (!item) return null; 

  let totalVisiblePpm = 0;
  activeKeys.forEach(key => {
      const val = item[key];
      if (typeof val === 'number') {
          totalVisiblePpm += val;
      }
  });

  if (totalVisiblePpm === 0) return null;
  
  return (
    <text x={x + width / 2} y={y - 12} fill="#cbd5e1" textAnchor="middle" style={{ fontSize: 11, fontWeight: "bold" }}>
      {Number(totalVisiblePpm).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </text>
  );
};

/* ======================================================
   COMPONENTE PRINCIPAL
====================================================== */
export default function PpmDinamico({
  viewMode, 
  trendData, 
  filters,
  allowedModels 
}: Props) {

  /* ======================================================
      SELEÇÃO DE DADOS (CONTEXTO + DETALHE)
  ====================================================== */
  const chartData = useMemo(() => {
    let rawItems: TrendItem[] = [];
    let contextItem: TrendItem | null = null;
    let hasContext = false;

    if (trendData) {
        const { tipo, valor, ano, dia } = filters?.periodo || {};

        if (tipo === "mes" && valor && ano) {
            const monthKey = `${ano}-${String(valor).padStart(2, '0')}`;
            contextItem = trendData.monthly.find(m => m.name === monthKey) || null;
            rawItems = trendData.weekly[monthKey] || [];
        } 
        else if (tipo === "semana" && valor && ano) {
            const weekKey = `${ano}-W${String(valor).padStart(2, '0')}`;
            const allWeeks = Object.values(trendData.weekly).flat();
            contextItem = allWeeks.find(w => w.name === weekKey) || null;
            rawItems = trendData.daily[weekKey] || [];
            if (dia) {
                rawItems = rawItems.filter(d => d.name <= dia);
            }
        }
        else if (tipo === "semana") {
            const allWeeksArrays = Object.values(trendData.weekly);
            rawItems = allWeeksArrays.flat().sort((a, b) => a.name.localeCompare(b.name));
        }
        else {
            rawItems = trendData.monthly || [];
        }
    }

    let finalRawItems = [...rawItems];
    if (contextItem) {
        hasContext = true;
        finalRawItems = [{ ...contextItem, isContext: true } as any, ...rawItems];
    }

    return finalRawItems.map(item => {
        const isCtx = (item as any).isContext === true;
        const base = {
            name: item.name,
            labelAxis: formatLabelAxis(item.name, isCtx), 
            fullLabel: formatLabelFull(item.name, isCtx), 
            production: item.production,
            totalDefects: item.defects,
            totalPpmDisplay: item.ppm, 
            abs_resp: item.abs_responsabilidade,
            abs_cat: item.abs_categoria,
            abs_mod: item.abs_modelo,
            isContext: isCtx 
        };

        if (viewMode === "geral") return { ...base, "PPM Geral": item.ppm };
        if (viewMode === "responsabilidade") return { ...base, ...item.responsabilidade };
        if (viewMode === "categoria") return { ...base, ...item.categoria };
        if (viewMode === "modelo") return { ...base, ...item.modelo };
        
        return base;
    });

  }, [trendData, filters, viewMode]);

  /* ======================================================
      CONFIGURAÇÃO DE CORES E CHAVES
  ====================================================== */
  const keys = useMemo(() => {
    if (viewMode === "geral") return ["PPM Geral"];
    
    if (viewMode === "responsabilidade") {
        if (filters?.responsabilidade && filters.responsabilidade !== "Todos") {
            return [filters.responsabilidade];
        }
        const activeResp = new Set<string>();
        chartData.forEach(d => {
             Object.keys(COLORS_RESP).forEach(key => {
                 if (typeof d[key] === 'number' && d[key] > 0) activeResp.add(key);
             });
        });
        return activeResp.size > 0 ? Array.from(activeResp) : Object.keys(COLORS_RESP);
    }
    
    if (viewMode === "categoria") {
        if (filters?.categoria && filters.categoria !== "Todos") {
            return [filters.categoria];
        }
        return Object.keys(COLORS_CAT);
    }

    if (viewMode === "modelo") {
        if (filters?.modelo && filters.modelo !== "Todos") {
            return [filters.modelo];
        }
        const allModels = new Set<string>();
        chartData.forEach(d => {
             Object.keys(d).forEach(k => {
                 if (!['name', 'labelAxis', 'fullLabel', 'production', 'defects', 'ppm', 'totalDefects', 'totalPpmDisplay', 'abs_resp', 'abs_cat', 'abs_mod', 'isContext'].includes(k)) {
                     if (allowedModels && allowedModels.length > 0) {
                         if (!allowedModels.includes(k)) return;
                     }
                     if (typeof d[k] === 'number' && d[k] > 0) allModels.add(k);
                 }
             });
        });
        return Array.from(allModels);
    }

    return [];
  }, [viewMode, filters, chartData, allowedModels]); 

  const colors = useMemo(() => {
    if (viewMode === "geral") return { "PPM Geral": COLOR_GERAL };
    if (viewMode === "responsabilidade") return COLORS_RESP;
    if (viewMode === "categoria") return COLORS_CAT;
    
    if (viewMode === "modelo") {
        const mapping: any = {};
        keys.forEach((k, i) => {
            mapping[k] = PALETA_MODELOS[i % PALETA_MODELOS.length];
        });
        return mapping;
    }
    
    return {};
  }, [viewMode, keys]);

  /* ======================================================
      DADOS FINAIS
  ====================================================== */
  const finalData = useMemo(() => {
      return chartData.map(d => {
          let stackSum = 0;
          keys.forEach(k => {
              const val = d[k];
              if (typeof val === 'number') stackSum += val;
          });
          return { ...d, _stackTotal: stackSum > 0 ? stackSum : null };
      });
  }, [chartData, keys]);

  const hasContextItem = finalData.length > 0 && finalData[0].isContext;

  const maxVal = chartData.length > 0 
    ? Math.max(...chartData.map((d: any) => d.totalPpmDisplay || 0), META_PPM) * 1.2
    : META_PPM;

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
              {viewMode === "geral" && "📊 PPM Geral (Evolução)"}
              {viewMode === "responsabilidade" && `📊 PPM por Responsabilidade${filters?.categoria ? ` (${filters.categoria})` : ""}`}
              {viewMode === "categoria" && `📊 PPM por Categoria${filters?.modelo ? ` (${filters.modelo})` : ""}`}
              {viewMode === "modelo" && `📊 PPM por Modelo${filters?.categoria ? ` (${filters.categoria})` : ""}`}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {filters?.periodo?.tipo === "mes" && filters.periodo.valor ? "Total Mensal + Detalhe Semanal" :
                 filters?.periodo?.tipo === "semana" && filters.periodo.valor ? "Total Semanal + Detalhe Diário" : 
                 filters?.periodo?.tipo === "semana" ? "Visualização Semanal (Ano Todo)" :
                 "Visualização Mensal"}
            </span>
          </div>

          <div style={legendContainerStyle}>
            {keys.map((key) => (
              <div key={key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[key] }} />
                {key}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
        {chartData.length === 0 ? (
             <div style={{...emptyContainerStyle, height: "100%"}}>
                <span>Sem dados para esta seleção.</span>
             </div>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
                data={finalData} 
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                barCategoryGap={finalData.length < 10 ? "20%" : "10%"}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                    dataKey="labelAxis" 
                    tick={(props) => {
                        // ✅ CORREÇÃO AQUI: desconstruindo o 'index' corretamente
                        const { x, y, payload, index } = props;
                        
                        // Lógica: Se for o primeiro item (index 0) E tivermos contexto, destaca.
                        const isTotal = index === 0 && hasContextItem;

                        return (
                            <g transform={`translate(${x},${y})`}>
                                <text x={0} y={0} dy={16} 
                                      textAnchor="middle" 
                                      fill={isTotal ? "#60A5FA" : "#cbd5e1"} 
                                      fontWeight={isTotal ? "bold" : "normal"}
                                      fontSize={11}>
                                    {payload.value}
                                </text>
                            </g>
                        );
                    }}
                    axisLine={false} tickLine={false} interval={0} 
                />
                <YAxis 
                    domain={[0, maxVal]} 
                    tickFormatter={(v: any) => {
                        const val = Number(v);
                        return val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
                    }} 
                    tick={{ fill: "#cbd5e1", fontSize: 11 }} width={35} axisLine={false} tickLine={false} 
                />
                
                <ReferenceLine y={META_PPM} stroke="#EF4444" strokeDasharray="4 4">
                    <Label value={`Meta ${META_PPM}`} position="insideTopRight" fill="#EF4444" fontSize={10} offset={10} />
                </ReferenceLine>

                {hasContextItem && (
                    <ReferenceLine x={0.5} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                )}

                <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                    const dataItem = payload[0].payload;
                    const isCtx = dataItem.isContext;
                    return (
                        <div style={{ background: "#0f172a", border: isCtx ? "1px solid #60A5FA" : "1px solid rgba(255,255,255,0.15)", padding: "12px", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)", minWidth: 180 }}>
                        <p style={{ fontWeight: "bold", marginBottom: "8px", color: isCtx ? "#60A5FA" : "#fff", fontSize: "13px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px" }}>
                            {dataItem.fullLabel}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}><span>📦 Produção:</span><strong>{Number(dataItem.production).toLocaleString("pt-BR")}</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#fca5a5" }}><span>🔴 Defeitos:</span><strong>{Number(dataItem.totalDefects).toLocaleString("pt-BR")}</strong></div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#60a5fa" }}><span>🔹 PPM Total:</span><strong>{Number(dataItem.totalPpmDisplay).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                        </div>
                        {payload.map((entry: any, index: number) => {
                            if (entry.dataKey === "_stackTotal") return null;
                            return (
                                <div key={index} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color }} />
                                <span style={{ color: "#94a3b8", flex: 1 }}>{entry.name}:</span>
                                <span style={{ color: "#fff", fontWeight: 500 }}>{Number(entry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PPM</span>
                                </div>
                            );
                        })}
                        </div>
                    );
                    }
                    return null;
                }}
                />

                <Line
                    type="linear"
                    dataKey="_stackTotal"
                    stroke="#fff"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: "#fff", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                />

                {keys.map((key, index) => {
                const isLast = index === keys.length - 1;
                return (
                    <Bar key={key} dataKey={key} stackId="a" fill={colors[key]} maxBarSize={60}>
                    <LabelList dataKey={key} content={renderCustomBarLabel} />
                    {isLast && (
                        <LabelList dataKey={key} position="top" content={(props) => renderTotalLabel(props, finalData, keys)} />
                    )}
                    </Bar>
                );
                })}
            </ComposedChart>
            </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

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
  flexDirection: "column",
};

const emptyContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
};

const legendContainerStyle: React.CSSProperties = {
  display: "flex", gap: 12, fontSize: 11, opacity: 0.8, flexWrap: "wrap", color: "#cbd5e1", justifyContent: "flex-end", maxWidth: "60%"
};