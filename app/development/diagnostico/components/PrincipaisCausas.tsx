"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Cpu } from "lucide-react";

/* ======================================================
   TIPAGEM (Compatível com o Aggregation de 4 Níveis)
====================================================== */
interface PosicaoItem {
  nome: string;
  ocorrencias: number;
}

interface ModeloItem {
  nome: string;
  ocorrencias: number;
  posicoes?: PosicaoItem[];
}

interface AnaliseItem {
  nome: string;
  ocorrencias: number;
  modelos?: ModeloItem[];
}

interface AgrupamentoItem {
  nome: string;
  ocorrencias: number;
  detalhes?: AnaliseItem[];
}

export default function PrincipaisCausas({
  data,
}: {
  data?: AgrupamentoItem[];
}) {
  // Estados para controlar a expansão de cada nível
  // Nível 1: Índice do Agrupamento (0, 1, 2)
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  
  // Nível 2: String composta "grupoIdx-analiseIdx"
  const [expandedAnalise, setExpandedAnalise] = useState<string | null>(null);
  
  // Nível 3: String composta "grupoIdx-analiseIdx-modeloIdx"
  const [expandedModelo, setExpandedModelo] = useState<string | null>(null);

  const toggleGroup = (index: number) => {
    setExpandedGroup(expandedGroup === index ? null : index);
    // Fecha os filhos ao fechar o pai
    if (expandedGroup === index) {
        setExpandedAnalise(null);
        setExpandedModelo(null);
    }
  };

  const toggleAnalise = (key: string) => {
    setExpandedAnalise(expandedAnalise === key ? null : key);
    if (expandedAnalise === key) setExpandedModelo(null);
  };

  const toggleModelo = (key: string) => {
    setExpandedModelo(expandedModelo === key ? null : key);
  };

  const listaCausas = data || [];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#e5e7eb", margin: 0 }}>
          Principais Causas
        </h3>
        <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Drill-down (4 Níveis)
        </span>
      </div>

      {listaCausas.length === 0 && (
        <span style={{ fontSize: 13, color: "#94a3b8", opacity: 0.85 }}>
          Nenhuma causa crítica identificada para os filtros aplicados.
        </span>
      )}

      {/* ================= NÍVEL 1: AGRUPAMENTO ================= */}
      {listaCausas.map((group, groupIdx) => {
        const isGroupOpen = expandedGroup === groupIdx;
        const rankColor = groupIdx === 0 ? "#ef4444" : groupIdx === 1 ? "#f59e0b" : "#22c55e";

        return (
          <div key={groupIdx} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            
            {/* CABEÇALHO DO GRUPO */}
            <div
              onClick={() => toggleGroup(groupIdx)}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 12,
                background: isGroupOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                borderLeft: `5px solid ${rankColor}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 14, color: rankColor }}>
                #{groupIdx + 1}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column'}}>
                  <strong style={{ fontSize: 14, color: "#f8fafc" }}>
                    {group.nome}
                  </strong>
                  <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                      {isGroupOpen ? "Clique para fechar" : "Clique para ver análises"}
                  </span>
              </div>

              <span style={{ fontSize: 13, color: "#e5e7eb", fontWeight: isGroupOpen ? 700 : 400 }}>
                {group.ocorrencias.toLocaleString("pt-BR")}
              </span>
            </div>

            {/* ================= NÍVEL 2: ANÁLISE ================= */}
            {isGroupOpen && group.detalhes && (
              <div style={{
                  padding: "8px 0px 8px 16px",
                  marginLeft: 12,
                  borderLeft: `2px solid ${rankColor}40`, // 40 = opacity
                  animation: "fadeIn 0.3s ease-in-out",
                  display: "flex", flexDirection: "column", gap: 6
              }}>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", paddingLeft: 8, marginBottom: 4 }}>
                    Principais Análises:
                </div>

                {group.detalhes.map((analise, analiseIdx) => {
                    const analiseKey = `${groupIdx}-${analiseIdx}`;
                    const isAnaliseOpen = expandedAnalise === analiseKey;
                    const hasModelos = analise.modelos && analise.modelos.length > 0;

                    return (
                        <div key={analiseIdx} style={{ display: "flex", flexDirection: "column" }}>
                            <div 
                                onClick={() => hasModelos && toggleAnalise(analiseKey)}
                                style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    background: isAnaliseOpen ? "rgba(255,255,255,0.06)" : "transparent",
                                    cursor: hasModelos ? "pointer" : "default",
                                    transition: "background 0.2s"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {hasModelos && (
                                        isAnaliseOpen ? <ChevronDown size={14} color="#94a3b8"/> : <ChevronRight size={14} color="#94a3b8"/>
                                    )}
                                    <span style={{ fontSize: 13, color: isAnaliseOpen ? "#fff" : "#e2e8f0", fontWeight: isAnaliseOpen ? 600 : 400 }}>
                                        {analise.nome}
                                    </span>
                                </div>
                                <span style={{ fontSize: 12, color: "#94a3b8" }}>{analise.ocorrencias}</span>
                            </div>

                            {/* ================= NÍVEL 3: MODELO ================= */}
                            {isAnaliseOpen && hasModelos && (
                                <div style={{
                                    marginLeft: 24,
                                    marginTop: 4,
                                    marginBottom: 8,
                                    paddingLeft: 12,
                                    borderLeft: "1px dashed rgba(255,255,255,0.1)",
                                    display: "flex", flexDirection: "column", gap: 4
                                }}>
                                    {analise.modelos!.map((modelo, modeloIdx) => {
                                        const modeloKey = `${analiseKey}-${modeloIdx}`;
                                        const isModeloOpen = expandedModelo === modeloKey;
                                        const hasPosicoes = modelo.posicoes && modelo.posicoes.length > 0;

                                        return (
                                            <div key={modeloIdx} style={{ display: "flex", flexDirection: "column" }}>
                                                <div 
                                                    onClick={() => hasPosicoes && toggleModelo(modeloKey)}
                                                    style={{
                                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        background: isModeloOpen ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.03)",
                                                        border: isModeloOpen ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid transparent",
                                                        cursor: hasPosicoes ? "pointer" : "default"
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <Cpu size={12} color={isModeloOpen ? "#60a5fa" : "#64748b"} />
                                                        <span style={{ fontSize: 12, color: isModeloOpen ? "#93c5fd" : "#cbd5e1" }}>
                                                            {modelo.nome}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: isModeloOpen ? "#60a5fa" : "#64748b" }}>
                                                        {modelo.ocorrencias}
                                                    </span>
                                                </div>

                                                {/* ================= NÍVEL 4: POSIÇÃO MECÂNICA ================= */}
                                                {isModeloOpen && hasPosicoes && (
                                                    <div style={{
                                                        marginTop: 6,
                                                        marginLeft: 12,
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 6,
                                                        animation: "slideUp 0.2s ease-out"
                                                    }}>
                                                        {modelo.posicoes!.map((pos, posIdx) => (
                                                            <div 
                                                                key={posIdx}
                                                                style={{
                                                                    display: "flex", alignItems: "center", gap: 4,
                                                                    background: "rgba(0,0,0,0.3)",
                                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                                    borderRadius: 4,
                                                                    padding: "2px 6px"
                                                                }}
                                                            >
                                                                <MapPin size={10} color="#fcd34d" />
                                                                <span style={{ fontSize: 11, color: "#f1f5f9", fontWeight: 500 }}>
                                                                    {pos.nome}
                                                                </span>
                                                                <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 2 }}>
                                                                    ({pos.ocorrencias})
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Estilos Globais de Animação */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}