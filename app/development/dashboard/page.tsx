"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getUser } from "@/services/userStorage";
import { useDashboard, TrendItem } from "./hooks/useDashboard";
import { useDashboardFilters } from "./store/dashboardFilters";

// Estrutura
import SidebarDashboard from "./components/SidebarDashboard";
import DashboardLoading from "./components/DashboardLoading";

// KPIs
import IndiceDefeitosCard from "./components/IndiceDefeitosCard";
import KpiQuantidadeDefeitos from "./components/KpiQuantidadeDefeitos";
import KpiProducaoTotal from "./components/KpiProducaoTotal";
import TendenciaPpm from "./components/TendenciaPpm";
import IndicePorMes from "./components/IndicePorMes";

// Gráfico Dinâmico
import PpmDinamico, { PpmViewMode } from "./components/PpmDinamico";

// Ranking
import RankingCausas from "./components/RankingCausas";

// ✅ NOVO COMPONENTE: Tabela Detalhada Top 3
import TabelaDetalhamento from "./components/TabelaDetalhamento";

/* ======================================================
    CONSTANTES
====================================================== */
const META_PPM = 6200;

export default function DevelopmentDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<PpmViewMode>("responsabilidade");
  
  const [filterOptions, setFilterOptions] = useState<any>(null);

  const { data, loading, error } = useDashboard();
  const { appliedFilters } = useDashboardFilters();

  /* ======================================================
      AUTH & LOAD OPTIONS
  ====================================================== */
  useEffect(() => {
    const storedUser = getUser();
    setUser(storedUser);
    setMounted(true);

    if (!storedUser || storedUser.role === "viewer") {
      localStorage.removeItem("sigma_user");
      document.cookie =
        "sigma_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      window.location.href = "/login";
    }

    async function loadOptions() {
        try {
            const res = await fetch("/api/diagnostico/filtros");
            if (res.ok) {
                const json = await res.json();
                setFilterOptions(json);
            }
        } catch (e) {
            console.error("Erro ao carregar opcoes", e);
        }
    }
    loadOptions();
  }, []);

  /* ======================================================
      MEMOS: Lógica de Filtros e Seleção de Dados
  ====================================================== */
  
  const allowedModels = useMemo(() => {
      if (!filterOptions || !appliedFilters.categoria || appliedFilters.categoria === "Todos") {
          return undefined;
      }
      return filterOptions.modelos.filter((m: string) => 
          filterOptions.modeloCategoriaMap[m] === appliedFilters.categoria
      );
  }, [filterOptions, appliedFilters.categoria]);

  // 1️⃣ CÁLCULO DOS DADOS DA TIMELINE (GRÁFICOS E TENDÊNCIA)
  const { timelineItems, labelType } = useMemo(() => {
      if (!data) return { timelineItems: [], labelType: "Mês" };

      const { tipo, valor, ano } = appliedFilters.periodo;
      let items: TrendItem[] = [];
      let type = "Mês";

      if (tipo === "mes" && valor && ano) {
          const key = `${ano}-${String(valor).padStart(2, '0')}`;
          items = data.trendData.weekly[key] || [];
          type = "Semana";
      } 
      else if (tipo === "semana" && valor && ano) {
          const key = `${ano}-W${String(valor).padStart(2, '0')}`;
          items = data.trendData.daily[key] || [];
          type = "Dia";
      }
      else if (tipo === "semana") {
          const allWeeksArrays = Object.values(data.trendData.weekly);
          items = allWeeksArrays.flat().sort((a, b) => a.name.localeCompare(b.name));
          type = "Semana";
      }
      else {
          items = data.trendData.monthly || [];
          type = "Mês";
      }

      const sortedItems = items
          .filter((m) => m.production > 0 && m.ppm !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

      return { timelineItems: sortedItems, labelType: type };

  }, [data, appliedFilters.periodo]);

  // 2️⃣ CÁLCULO DOS KPIs (META, PRODUÇÃO, DEFEITOS)
  const kpiData = useMemo(() => {
    if (!data) return { ppm: 0, defects: 0, production: 0 };

    if (appliedFilters.periodo.dia && labelType === "Dia") {
        const diaAlvo = appliedFilters.periodo.dia;
        const diaItem = timelineItems.find(i => i.name === diaAlvo);

        if (diaItem) {
            return {
                ppm: diaItem.ppm,
                defects: diaItem.defects,
                production: diaItem.production
            };
        }
        return { ppm: 0, defects: 0, production: 0 };
    }

    return {
        ppm: data.meta.ppmGeral || 0,
        defects: data.meta.totalDefects,
        production: data.meta.totalProduction
    };
  }, [data, appliedFilters.periodo.dia, timelineItems, labelType]);

  // ✅ 3️⃣ GERA O LABEL AMIGÁVEL PARA A TABELA
  const tabelaLabel = useMemo(() => {
      const { tipo, valor, ano, dia } = appliedFilters.periodo;

      if (dia) {
          // Formata 2025-10-08 para 08/10/2025
          const [y, m, d] = dia.split("-");
          return `Dia ${d}/${m}/${y}`;
      }

      if (tipo === "mes" && valor && ano) {
          const date = new Date(ano, valor - 1, 1);
          // Retorna "Outubro de 2025"
          const mesExtenso = date.toLocaleDateString("pt-BR", { month: "long" });
          return `${mesExtenso.charAt(0).toUpperCase() + mesExtenso.slice(1)} de ${ano}`;
      }

      if (tipo === "semana" && valor) {
          return `Semana ${valor} de ${ano}`;
      }

      return "Período Completo";
  }, [appliedFilters.periodo]);


  if (!mounted || !user) return null;

  /* ======================================================
      RENDER
  ====================================================== */
  return (
    <div style={{ color: "#fff", minHeight: "100vh", paddingBottom: 40 }}>

      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
          SIGMA-Q | Dashboard Técnico
        </h1>
        <p style={{ opacity: 0.7, fontSize: "0.9rem", marginBottom: 20 }}>
          Visão geral dinâmica de indicadores de qualidade e produtividade.
        </p>
        <SidebarDashboard />
      </div>

      {/* CONTEÚDO */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {loading && <DashboardLoading />}

        {error && (
          <div style={{ padding: 20, color: "#ef4444", border: "1px solid #ef4444", borderRadius: 12 }}>
            <strong>Erro:</strong> {error}
          </div>
        )}

        {!loading && !error && !data && (
          <div style={{
            padding: 40,
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: 16,
            textAlign: "center",
            color: "#94a3b8"
          }}>
            Selecione os filtros e clique em <strong>Buscar</strong>.
          </div>
        )}

        {!loading && data && (
          <>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <IndiceDefeitosCard meta={META_PPM} real={kpiData.ppm} />
              <KpiQuantidadeDefeitos value={kpiData.defects.toLocaleString("pt-BR")} />
              <KpiProducaoTotal value={kpiData.production.toLocaleString("pt-BR")} />

              {/* TENDÊNCIA DE PPM */}
              {(() => {
                if (appliedFilters.periodo.dia) {
                    const idxAtual = timelineItems.findIndex(t => t.name === appliedFilters.periodo.dia);
                    if (idxAtual >= 0) {
                        const itemAtual = timelineItems[idxAtual];
                        const itemAnterior = idxAtual > 0 ? timelineItems[idxAtual - 1] : null;
                        
                        if (itemAnterior) {
                             const formatCardLabel = (name: string) => {
                                const parts = name.split("-");
                                return parts.length === 3 ? `${parts[2]}/${parts[1]}` : name;
                             };
                             return (
                                <TendenciaPpm
                                  anterior={itemAnterior.ppm}
                                  atual={itemAtual.ppm}
                                  labelAnterior={formatCardLabel(itemAnterior.name)}
                                  labelAtual={formatCardLabel(itemAtual.name)}
                                  tipo="dia"
                                />
                             );
                        }
                    }
                }

                if (timelineItems.length >= 2) {
                  const a = timelineItems[timelineItems.length - 2]; 
                  const b = timelineItems[timelineItems.length - 1]; 
                  const formatCardLabel = (name: string) => {
                      if (labelType === "Dia") {
                          const [y, m, d] = name.split("-");
                          return `${d}/${m}`;
                      }
                      if (labelType === "Semana") {
                          const w = name.split("-W")[1];
                          return `S${Number(w)}`;
                      }
                      return name;
                  };
                  return (
                    <TendenciaPpm
                      anterior={a.ppm}
                      atual={b.ppm}
                      labelAnterior={formatCardLabel(a.name)}
                      labelAtual={formatCardLabel(b.name)}
                      tipo={labelType.toLowerCase()}
                    />
                  );
                }
                return <div />;
              })()}
            </div>

            {/* BOTÕES DE VISÃO */}
            <div style={{ display: "flex", gap: 8 }}>
              <TabButton 
                label="Responsabilidade" 
                active={viewMode === "responsabilidade"} 
                onClick={() => setViewMode("responsabilidade")} 
              />
              <TabButton 
                label="Categoria" 
                active={viewMode === "categoria"} 
                onClick={() => setViewMode("categoria")} 
              />
              <TabButton 
                label="Modelo" 
                active={viewMode === "modelo"} 
                onClick={() => setViewMode("modelo")} 
              />
            </div>

            {/* ✅ 1. PPM DINÂMICO (100% Largura) */}
            <PpmDinamico
              viewMode={viewMode}
              ppmMonthlyTrend={data.ppmMonthlyTrend}
              trendData={data.trendData}
              filters={appliedFilters}
              allowedModels={allowedModels}
            />

            {/* ✅ 2. TABELA DETALHADA TOP 3 POR TURNO */}
            <TabelaDetalhamento 
                data={data.details} 
                filterLabel={tabelaLabel} // ✅ Passa o label formatado
            />

            {/* ✅ 3. GRID INFERIOR (50/50): Ranking | Histórico */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                
                {/* Ranking de Causas */}
                <RankingCausas data={data.topCauses} />

                {/* Índice Histórico Temporal */}
                <IndicePorMes 
                    data={timelineItems} 
                    tipoLabel={labelType} 
                />
            </div>

          </>
        )}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        background: active ? "#3B82F6" : "rgba(255,255,255,0.04)",
        color: active ? "#fff" : "#94a3b8",
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      {label}
    </button>
  );
}