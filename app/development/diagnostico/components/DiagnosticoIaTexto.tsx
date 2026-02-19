"use client";

import React from "react";
import { DiagnosticoIaTexto as DiagnosticoType, InsightCard } from "../hooks/diagnosticoTypes";
import { 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Info, 
  FileText,
  Bot
} from "lucide-react";

/* ======================================================
   PARSER DE TEXTO (Estilo Moderno - Sem "Caixa")
   Atualizado para suportar HTML Inline (SVGs e <br/>)
====================================================== */
function renderHighlightedText(text: string) {
  // Regex atualizada para manter o split, mas permitindo injetar o HTML
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const content = part.slice(2, -2);
      return (
        <strong
          key={index}
          style={{
            color: "#38bdf8", // Azul Cyan vibrante para destaque no dark mode
            fontWeight: 700,
            letterSpacing: "0.02em"
          }}
          // Se o conteúdo em negrito tiver alguma tag (raro, mas protegido)
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      );
    }
    // Renderiza a parte normal do texto (que pode conter os <svg> e <br/> do backend)
    return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
  });
}

/* ======================================================
   SUB-COMPONENTE: MINI GRÁFICO (SPARKLINE)
====================================================== */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const width = 80;
  const height = 24; // Altura pequena para caber ao lado do título
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Evita divisão por zero se os valores forem iguais

  // Mapeia os dados para coordenadas X e Y dentro do SVG
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(" L ");

  // Coordenadas do último ponto para desenhar a "bolinha" de destaque
  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * height;

  return (
    <svg width={width} height={height} style={{ overflow: "visible", opacity: 0.9 }}>
      {/* Linha do Gráfico */}
      <path 
        d={`M ${points}`} 
        fill="none" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Ponto final em destaque */}
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
      {/* Efeito de brilho sutil no ponto */}
      <circle cx={lastX} cy={lastY} r="6" fill={color} opacity="0.3" />
    </svg>
  );
}

/* ======================================================
   SUB-COMPONENTE: CARD DE INSIGHT (DESIGN "LEFT BORDER")
====================================================== */
function InsightCardItem({ card }: { card: InsightCard }) {
    const config = {
        CRITICO: {
            color: "#EF4444", // Vermelho
            icon: AlertTriangle,
            bgHover: "rgba(239, 68, 68, 0.05)"
        },
        ALERTA: {
            color: "#F59E0B", // Laranja/Amarelo
            icon: TrendingUp, // Seta subindo ou Alerta
            bgHover: "rgba(245, 158, 11, 0.05)"
        },
        MELHORIA: {
            color: "#22C55E", // Verde
            icon: CheckCircle2,
            bgHover: "rgba(34, 197, 94, 0.05)"
        },
        INFO: {
            color: "#3B82F6", // Azul
            icon: Info,
            bgHover: "rgba(59, 130, 246, 0.05)"
        }
    }[card.tipo];

    const IconComponent = config.icon;

    return (
        <div style={{
            background: "rgba(255, 255, 255, 0.03)", 
            borderLeft: `4px solid ${config.color}`, 
            borderRadius: "4px 12px 12px 4px", 
            padding: "14px 16px",
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            transition: "all 0.2s ease",
            border: "1px solid rgba(255,255,255,0.05)",
            borderLeftWidth: 4, 
            borderLeftColor: config.color
        }}>
            {/* Header do Card com Título e Gráfico (Se existir) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconComponent size={18} color={config.color} strokeWidth={2.5} />
                    <span style={{ 
                        fontWeight: 700, 
                        fontSize: "0.8rem", 
                        color: config.color, 
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                    }}>
                        {card.titulo}
                    </span>
                </div>
                
                {/* ✅ MINI GRÁFICO (SPARKLINE) */}
                {card.chartData && card.chartData.length >= 2 && (
                    <div style={{ marginLeft: 16 }}>
                        <Sparkline data={card.chartData} color={config.color} />
                    </div>
                )}
            </div>

            {/* Descrição com renderizador de negrito para destacar os valores */}
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                {renderHighlightedText(card.descricao)}
            </p>
        </div>
    );
}

/* ======================================================
   COMPONENTE PRINCIPAL
====================================================== */
export default function DiagnosticoIaTexto({
  data,
}: {
  data?: DiagnosticoType;
}) {
  
  if (!data) {
    return (
      <div style={emptyStyle}>
        <Bot size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
        <p>Aguardando dados para gerar o diagnóstico...</p>
      </div>
    );
  }

  const safeInsights = data.insights || [];

  const headerConfig = {
    melhora: { color: "#22c55e", label: "CENÁRIO POSITIVO", bg: "rgba(34, 197, 94, 0.15)" },
    piora: { color: "#ef4444", label: "CENÁRIO NEGATIVO", bg: "rgba(239, 68, 68, 0.15)" },
    estavel: { color: "#3b82f6", label: "ESTÁVEL", bg: "rgba(59, 130, 246, 0.15)" },
    indefinido: { color: "#94a3b8", label: "ANÁLISE DE PERÍODO", bg: "rgba(255,255,255,0.1)" },
  }[data.tendencia || "indefinido"];

  return (
    <div style={containerStyle}>
        
        {/* ================= HEADER ================= */}
        <div style={headerStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ 
                    width: 32, height: 32, borderRadius: 8, 
                    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", 
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)"
                }}>
                    <Bot size={18} color="#fff" />
                </div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#fff", letterSpacing: "0.02em" }}>
                    {data.titulo}
                </h2>
            </div>

            <span style={{ 
                padding: "6px 12px", borderRadius: 6, 
                background: headerConfig.bg, 
                color: headerConfig.color, 
                border: `1px solid ${headerConfig.color}40`, 
                fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.08em" 
            }}>
                {headerConfig.label}
            </span>
        </div>

        {/* ================= GRID CONTENT (40% / 60%) ================= */}
        <div style={gridStyle}>
            
            {/* LADO ESQUERDO: RESUMO NARRATIVO (40%) */}
            <div style={{ width: "40%", display: "flex", flexDirection: "column", minWidth: 300 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <FileText size={16} color="#64748b" />
                    <h3 style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", margin: 0, letterSpacing: "0.05em" }}>
                        Resumo Executivo
                    </h3>
                </div>
                
                <div style={{ 
                    fontSize: "0.95rem", 
                    lineHeight: 1.8, 
                    color: "#e2e8f0", 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 16 
                }}>
                    {(data.resumoGeral || "Analisando dados...").split("\n\n").map((paragrafo, idx) => (
                        <p key={idx} style={{ margin: 0 }}>{renderHighlightedText(paragrafo)}</p>
                    ))}
                </div>

                {/* KPI CHIPS */}
                <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(data.indicadoresChave || []).map((ind, i) => (
                        <span key={i} style={chipStyle}>
                            {ind}
                        </span>
                    ))}
                </div>
            </div>

            {/* SEPARADOR VERTICAL */}
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)", margin: "0 10px" }} />

            {/* LADO DIREITO: INSIGHT CARDS (60%) */}
            <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <TrendingUp size={16} color="#64748b" />
                    <h3 style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", margin: 0, letterSpacing: "0.05em" }}>
                        Alertas & Insights
                    </h3>
                </div>
                
                {/* GRID PARA CARDS: Se houver espaço, mostra em 2 colunas. */}
                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
                    gap: 12 
                }}>
                    {safeInsights.length === 0 ? (
                        <div style={{ ...emptyCardStyle, gridColumn: "1 / -1" }}>
                            <CheckCircle2 size={24} color="#22c55e" style={{ opacity: 0.5, marginBottom: 8 }} />
                            <span>Nenhum alerta crítico detectado no período.</span>
                        </div>
                    ) : (
                        safeInsights.map((card, idx) => (
                            <InsightCardItem key={idx} card={card} />
                        ))
                    )}
                </div>
            </div>

        </div>
    </div>
  );
}

/* ======================================================
   ESTILOS
====================================================== */
const containerStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)", 
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 0, 
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
    overflow: "hidden"
};

const headerStyle: React.CSSProperties = {
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: "20px 24px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
    borderBottom: "1px solid rgba(255,255,255,0.08)"
};

const gridStyle: React.CSSProperties = {
    display: "flex",
    gap: 20,
    padding: "24px",
    flexWrap: "wrap", 
};

const chipStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "6px 12px",
    borderRadius: 6,
    color: "#94a3b8",
    letterSpacing: "0.02em"
};

const emptyStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    padding: 40,
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed rgba(255,255,255,0.1)",
};

const emptyCardStyle: React.CSSProperties = {
    padding: 30, 
    textAlign: "center", 
    color: "#64748b", 
    border: "1px dashed rgba(255,255,255,0.1)", 
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontSize: "0.85rem"
};