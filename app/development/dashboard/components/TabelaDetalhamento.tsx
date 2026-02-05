"use client";

import React from "react";
import { TurnoStats } from "../hooks/useDashboard";

interface Props {
  data: TurnoStats[];
  filterLabel: string;
}

export default function TabelaDetalhamento({ data, filterLabel }: Props) {
  
  if (!data || data.length === 0) return null;

  const formatTitleDate = (label: string) => {
      if (label.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parts = label.split("-");
          return `${parts[2]}/${parts[1]}/${parts[0]}`; 
      }
      return label; 
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 24 }}>
      {data.map((turnoData) => (
        <TurnoTable 
            key={turnoData.turno} 
            stats={turnoData} 
            label={formatTitleDate(filterLabel)} 
        />
      ))}
    </div>
  );
}

function TurnoTable({ stats, label }: { stats: TurnoStats; label: string }) {
  return (
    <div style={containerStyle}>
      {/* CABEÇALHO */}
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff", fontWeight: 700 }}>
          TOP 3 POR RESPONSABILIDADE ({label}) - {stats.turno}
        </h3>
        <div style={{ fontSize: "0.9rem", color: "#cbd5e1" }}>
          Produção: <strong>{stats.producao.toLocaleString("pt-BR")}</strong> | 
          Total Defeitos: <strong style={{ color: "#EF4444" }}>{stats.totalDefeitos}</strong>
        </div>
      </div>

      {/* TABELA */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "#e2e8f0" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={thStyle}>COD</th>
              <th style={thStyle}>MODELO</th>
              <th style={thStyle}>DESCRIÇÃO DA FALHA</th>
              <th style={thStyle}>PEÇA / PLACA</th>
              <th style={thStyle}>REF / POSIÇÃO</th>
              <th style={thStyle}>ANÁLISE</th>
              <th style={thStyleCenter}>QTD</th>
              <th style={thStyleCenter}>PPM</th>
            </tr>
          </thead>
          <tbody>
            {stats.groups.length === 0 ? (
                <tr>
                    <td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                        Nenhum defeito registrado neste turno para o período selecionado.
                    </td>
                </tr>
            ) : (
                // ✅ ITERA SOBRE OS GRUPOS DE RESPONSABILIDADE
                stats.groups.map((group) => (
                    <React.Fragment key={group.responsibility}>
                        {/* SEPARADOR DE RESPONSABILIDADE (AGORA CENTRALIZADO) */}
                        <tr style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td colSpan={8} style={{ 
                                padding: "8px 16px", 
                                fontWeight: "bold", 
                                color: "#60A5FA", 
                                textTransform: "uppercase", 
                                fontSize: "0.8rem", 
                                letterSpacing: "0.05em",
                                textAlign: "center" // ✅ Centralizado
                            }}>
                                {group.responsibility}
                            </td>
                        </tr>
                        
                        {/* LISTA DE DEFEITOS DESTA RESPONSABILIDADE */}
                        {group.top3.map((row, idx) => (
                            <tr key={`${group.responsibility}-${idx}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                                <td style={tdStyle}>{row.cod}</td>
                                <td style={{ ...tdStyle, color: "#93C5FD", fontWeight: 600 }}>{row.modelo}</td>
                                <td style={tdStyle}>{row.falha}</td>
                                <td style={tdStyle}>{row.peca}</td>
                                <td style={tdStyle}>{row.ref}</td>
                                <td style={tdStyle}>{row.analise}</td>
                                <td style={{ ...tdStyleCenter, color: "#fff", fontWeight: "bold" }}>{row.qtd}</td>
                                {/* ✅ Cor do PPM alterada para Azul (#3B82F6) */}
                                <td style={{ ...tdStyleCenter, color: "#F59E0B", fontWeight: "bold" }}>
                                    {row.ppm.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </React.Fragment>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Estilos
const containerStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
};

const headerStyle: React.CSSProperties = {
  padding: "16px 20px",
  background: "rgba(255,255,255,0.03)",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" };
const thStyleCenter: React.CSSProperties = { ...thStyle, textAlign: "center" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", whiteSpace: "nowrap" };
const tdStyleCenter: React.CSSProperties = { ...tdStyle, textAlign: "center" };