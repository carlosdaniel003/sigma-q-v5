// app/development/dashboard/components/IndicePorData.tsx
"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ======================================================
   TIPOS
====================================================== */
// Aceita tanto "date" quanto "month" para flexibilidade
interface TimeSeriesItem {
  date?: string; 
  month?: string;
  ppm: number | null;
  production?: number;
  defects?: number;
  [key: string]: any;
}

interface Props {
  data: TimeSeriesItem[];
}

/* ======================================================
   UTILS
====================================================== */
function formatDate(value: string): string {
  if (!value) return "";
  // Se for formato YYYY-MM (Mensal)
  if (value.length === 7) {
     const [y, m] = value.split("-");
     const date = new Date(Number(y), Number(m) - 1, 1);
     return date.toLocaleString("pt-BR", { month: "short" }).toUpperCase();
  }
  // Se for formato YYYY-MM-DD (Diário)
  const date = new Date(value);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* ======================================================
   COMPONENTE
====================================================== */
export default function IndicePorData({ data }: Props) {
  /* ===============================
     PREPARAÇÃO DOS DADOS
  ============================== */
  const chartData = (data || [])
    .map(d => ({
      ...d,
      // Normaliza a chave de tempo para 'label'
      label: d.date || d.month || "",
      ppm: d.ppm ?? 0,
      production: d.production || 0,
      defects: d.defects || 0
    }))
    .filter(d => d.production > 0); // Opcional: Mostra apenas dias com produção

  if (chartData.length === 0) {
    return (
      <div style={emptyContainerStyle}>
        Nenhum dado temporal disponível
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: 16 }}>
        📈 Índice por Data (Tendência PPM)
      </h2>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }} // Pequeno ajuste na margem esquerda para garantir que JAN não corte
          >
            <defs>
              <linearGradient id="colorPpm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            
            <XAxis 
              dataKey="label" 
              tickFormatter={formatDate}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              // ✅ CORREÇÃO: interval={0} força a exibição de TODOS os rótulos disponíveis
              interval={0} 
              axisLine={false}
              tickLine={false}
            />
            
            <YAxis 
              hide 
              domain={['auto', 'auto']}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const dataItem = payload[0].payload;
                  return (
                    <div style={tooltipStyle}>
                      <p style={{ fontWeight: "bold", marginBottom: "8px", color: "#fff" }}>
                         📅 {formatDate(dataItem.label)}
                      </p>
                      <p style={{ color: "#60a5fa" }}>
                        🔹 Índice: <strong>{dataItem.ppm.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PPM</strong>
                      </p>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                          <p style={{ color: "#cbd5e1", fontSize: 11 }}>
                            📦 Prod: {dataItem.production.toLocaleString("pt-BR")}
                          </p>
                          <p style={{ color: "#fca5a5", fontSize: 11 }}>
                            🔴 Def: {dataItem.defects.toLocaleString("pt-BR")}
                          </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area 
              type="monotone" 
              dataKey="ppm" 
              stroke="#3B82F6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPpm)" 
            />
          </AreaChart>
        </ResponsiveContainer>
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
  height: 300, 
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
};