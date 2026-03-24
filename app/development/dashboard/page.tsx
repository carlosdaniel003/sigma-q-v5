// app/development/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useDashboard, TrendItem } from "./hooks/useDashboard";
import { useDashboardFilters } from "./store/dashboardFilters";

// CSS Global do Layout Glassmorphism (Apenas para os botões de Tab)
import "./page-dashboard-glass.css";

// Estrutura
import SidebarDashboard from "./components/SidebarDashboard";
import DashboardLoading from "./components/DashboardLoading";
import DashboardMessage from "./components/DashboardMessage";
import DashboardHeader from "./components/DashboardHeader"; // ✅ Importado aqui

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

// Tabela Detalhada Top 3
import TabelaDetalhamento from "./components/TabelaDetalhamento";

/* ======================================================
   CONSTANTES E METAS POR CATEGORIA (CONVERTIDAS PARA PPM)
   Fórmula: % * 10.000
====================================================== */
const METAS_POR_CATEGORIA: Record<string, number> = {
  "ARCON": 3600,   // 0,360%
  "BBS": 7820,     // 0,782%
  "CM": 5870,      // 0,587%
  "MWO": 1730,     // 0,173%
  "TM": 11680,     // 1,168%
  "TV": 6870,      // 0,687%
  "TW": 11680,     // 1,168%
  "GERAL": 5200    // 0,52%
};

export default function DevelopmentDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<PpmViewMode>("responsabilidade");
  const [filterOptions, setFilterOptions] = useState<any>(null);

  // Estados para notificação de novos dados
  const [newDefectsCount, setNewDefectsCount] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🔥 NOVO: Substitui o sessionStorage para guardar a base inicial na memória do componente
  const baseDefectCountRef = useRef<number | null>(null);

  // Hooks principais
  const { data, loading, error, lastUpdated, refresh } = useDashboard();
  const { appliedFilters } = useDashboardFilters();

  /* ======================================================
      LOAD OPTIONS (Autenticação Removida)
  ====================================================== */
  useEffect(() => {
    setMounted(true);

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
      🔄 SISTEMA DE POLLING (VERIFICAÇÃO SILENCIOSA - CORRIGIDO)
  ====================================================== */
  useEffect(() => {
    // Se não há dados ainda, não começamos o polling
    if (!data || !data.meta) return;

    // Registra a contagem inicial na referência (apenas se não existir ou se for uma atualização manual)
    if (baseDefectCountRef.current === null || baseDefectCountRef.current !== data.meta.totalDefects) {
      // Se não havia registro, ou se o total da API mudou "legitimamente" (por exemplo, após o refresh), atualizamos a base.
      baseDefectCountRef.current = data.meta.totalDefects;
    }

    const checkNewData = async () => {
      try {
        const params = new URLSearchParams();
        const { tipo, valor, ano, dia } = appliedFilters.periodo;
        
        if (tipo === "mes" && valor && ano) { params.set("mes", valor.toString()); params.set("ano", ano.toString()); }
        if (tipo === "semana" && valor && ano) { params.set("semana", valor.toString()); params.set("ano", ano.toString()); }
        if (dia) params.set("dia", dia);
        
        const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
        if (res.ok) {
          const newData = await res.json();
          const serverCount = newData.meta.totalDefects;
          
          // Lemos a base imutável armazenada no useRef
          const currentBaseCount = baseDefectCountRef.current || 0;

          // Se o servidor tem mais defeitos do que a nossa base guardada
          if (serverCount > currentBaseCount) {
             setNewDefectsCount(serverCount - currentBaseCount);
          } else {
             // Caso alguém delete defeitos ou limpe o banco
             setNewDefectsCount(0);
          }
        }
      } catch (err) {
        console.warn("Polling falhou:", err);
      }
    };

    // Roda a primeira vez logo em seguida (opcional, mas bom para sincronizar caso tenha navegado fora por muito tempo)
    const timeoutId = setTimeout(checkNewData, 5000); 

    // Configura o loop infinito a cada 60s
    pollingRef.current = setInterval(checkNewData, 60000); 

    return () => {
      clearTimeout(timeoutId);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [data, appliedFilters]);

  const handleRefresh = () => {
      // Atualizamos a base na memória com os dados mais recentes que virão da API após o refresh
      setNewDefectsCount(0);
      baseDefectCountRef.current = null; // Força o useEffect a recriar a base
      refresh();
  };

  /* ======================================================
      MEMOS: Lógica de Filtros e Seleção de Dados
  ====================================================== */
  
  const metaAtual = useMemo(() => {
    const cat = appliedFilters.categoria;
    if (cat && cat !== "Todos" && METAS_POR_CATEGORIA[cat]) {
      return METAS_POR_CATEGORIA[cat];
    }
    return METAS_POR_CATEGORIA["GERAL"];
  }, [appliedFilters.categoria]);

  const allowedModels = useMemo(() => {
      if (!filterOptions || !appliedFilters.categoria || appliedFilters.categoria === "Todos") {
          return undefined;
      }
      return filterOptions.modelos.filter((m: string) => 
          filterOptions.modeloCategoriaMap[m] === appliedFilters.categoria
      );
  }, [filterOptions, appliedFilters.categoria]);

  // 1️⃣ CÁLCULO DOS DADOS DA TIMELINE (GRÁFICO)
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

  // ✅ 2️⃣ CÁLCULO DOS KPIs (SINCRONIZADO COM A TIMELINE)
  const kpiData = useMemo(() => {
    if (!data) return { ppm: 0, defects: 0, production: 0 };

    const { tipo, valor, dia } = appliedFilters.periodo;

    // Caso A: Dia específico
    if (dia && labelType === "Dia") {
        const diaAlvo = dia;
        const diaItem = timelineItems.find(i => i.name === diaAlvo);
        if (diaItem) return { ppm: diaItem.ppm, defects: diaItem.defects, production: diaItem.production };
        return { ppm: 0, defects: 0, production: 0 };
    }

    // Caso B: Mês ou Semana
    if ((tipo === "mes" || tipo === "semana") && valor && timelineItems.length > 0) {
        const totalProd = timelineItems.reduce((acc, curr) => acc + curr.production, 0);
        const totalDef = timelineItems.reduce((acc, curr) => acc + curr.defects, 0);
        const calculatedPpm = totalProd > 0 ? (totalDef / totalProd) * 1000000 : 0;
        return { ppm: Number(calculatedPpm.toFixed(2)), defects: totalDef, production: totalProd };
    }

    // Caso C: Geral
    return { ppm: data.meta.ppmGeral || 0, defects: data.meta.totalDefects, production: data.meta.totalProduction };
  }, [data, appliedFilters.periodo, timelineItems, labelType]);

  // ✅ 3️⃣ CÁLCULO DA PROJEÇÃO
  const ppmForecast = useMemo(() => {
      const { tipo, valor, ano } = appliedFilters.periodo;
      if (tipo !== "mes" || !valor || !ano || timelineItems.length < 2) return null;
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1;
      if (ano < anoAtual) return null; 
      if (ano === anoAtual && valor < mesAtual) return null; 
      const activeDays = timelineItems.filter(d => d.production > 0);
      const recentDays = activeDays.slice(-3); 
      if (recentDays.length === 0) return null;
      const recentPpmAvg = recentDays.reduce((acc, curr) => acc + curr.ppm, 0) / recentDays.length;
      const historyPpm = kpiData.ppm;
      return (historyPpm * 0.3) + (recentPpmAvg * 0.7);
  }, [appliedFilters.periodo, timelineItems, kpiData.ppm]);

  // 4️⃣ GERA O LABEL AMIGÁVEL
  const tabelaLabel = useMemo(() => {
      const { tipo, valor, ano, dia } = appliedFilters.periodo;
      if (dia) { const [y, m, d] = dia.split("-"); return `Dia ${d}/${m}/${y}`; }
      if (tipo === "mes" && valor && ano) {
          const date = new Date(ano, valor - 1, 1);
          const mesExtenso = date.toLocaleDateString("pt-BR", { month: "long" });
          return `${mesExtenso.charAt(0).toUpperCase() + mesExtenso.slice(1)} de ${ano}`;
      }
      if (tipo === "semana" && valor) return `Semana ${valor} de ${ano}`;
      return "Período Completo";
  }, [appliedFilters.periodo]);

  if (!mounted) return null;

  return (
    <div style={{ color: "#fff", height: "100%", paddingBottom: 40 }}>

      {/* ✅ HEADER COMPONENTE */}
      <DashboardHeader 
        lastUpdated={lastUpdated} 
        loading={loading} 
        onRefresh={handleRefresh} 
        newDefectsCount={newDefectsCount} 
      />

      <SidebarDashboard />

      {/* CONTEÚDO */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 20 }}>

        {loading && <DashboardLoading />}

        {error && (
          <div style={{ padding: 20, color: "#ef4444", border: "1px solid #ef4444", borderRadius: 12 }}>
            <strong>Erro:</strong> {error}
          </div>
        )}

        {!loading && !error && !data && (
          <div style={{ padding: 40, border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 16, textAlign: "center", color: "#94a3b8" }}>
            Selecione os filtros e clique em <strong>Buscar</strong>.
          </div>
        )}

        {!loading && data && (
          <>
            {timelineItems.length === 0 && kpiData.production === 0 ? (
                <DashboardMessage tipo="sem_dados" />
            ) : (
                <>
                    {/* KPIs */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                        <IndiceDefeitosCard 
                            meta={metaAtual} 
                            real={kpiData.ppm}
                            projection={ppmForecast} 
                        />
                        
                        <KpiQuantidadeDefeitos value={kpiData.defects.toLocaleString("pt-BR")} />
                        <KpiProducaoTotal value={kpiData.production.toLocaleString("pt-BR")} />

                        {/* TENDÊNCIA DE PPM */}
                        {(() => {
                            const { tipo, valor, ano, dia } = appliedFilters.periodo;

                            if (dia) {
                                const idxAtual = timelineItems.findIndex(t => t.name === dia);
                                if (idxAtual >= 0) {
                                    const itemAtual = timelineItems[idxAtual];
                                    const itemAnterior = idxAtual > 0 ? timelineItems[idxAtual - 1] : null;
                                    const formatCardLabel = (name: string) => {
                                         const parts = name.split("-");
                                         return parts.length === 3 ? `${parts[2]}/${parts[1]}` : name;
                                    };
                                    return (
                                      <TendenciaPpm
                                        anterior={itemAnterior ? itemAnterior.ppm : 0}
                                        atual={itemAtual.ppm}
                                        labelAnterior={itemAnterior ? formatCardLabel(itemAnterior.name) : "Dia Anterior"}
                                        labelAtual={formatCardLabel(itemAtual.name)}
                                        tipo="dia"
                                      />
                                    );
                                }
                            }

                            if (tipo === "mes" && valor && ano) {
                                let prevMes = valor - 1; let prevAno = ano;
                                if (prevMes < 1) { prevMes = 12; prevAno--; }
                                const prevKey = `${prevAno}-${String(prevMes).padStart(2, '0')}`;
                                const prevItem = data.ppmMonthlyTrend.find(p => p.month === prevKey);
                                const dateLabel = new Date(prevAno, prevMes - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
                                return <TendenciaPpm anterior={prevItem?.ppm || 0} atual={kpiData.ppm} labelAnterior={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} labelAtual="Mês Atual" tipo="mês" />;
                            }

                            let itemAtual = null, itemAnterior = null;
                            if (timelineItems.length >= 2) { itemAnterior = timelineItems[timelineItems.length - 2]; itemAtual = timelineItems[timelineItems.length - 1]; } 
                            else if (timelineItems.length === 1) itemAtual = timelineItems[0];

                            if (itemAtual) {
                                return <TendenciaPpm anterior={itemAnterior?.ppm || 0} atual={itemAtual.ppm} labelAnterior={itemAnterior?.name || "Anterior"} labelAtual={itemAtual.name} tipo={labelType.toLowerCase()} />;
                            }
                            return <div />;
                        })()}
                    </div>

                    {/* GRÁFICOS E TABELAS */}
                    {kpiData.production === 0 ? <DashboardMessage tipo="sem_producao" /> : kpiData.defects === 0 ? <DashboardMessage tipo="sucesso" /> : (
                        <>
                            {/* ✅ ÚNICA MODIFICAÇÃO: AQUI ESTÃO AS CLASSES DO CSS GLASSMORPHISM */}
                            <div className="dashboard-tabs-wrapper">
                                <TabButton label="Responsabilidade" active={viewMode === "responsabilidade"} onClick={() => setViewMode("responsabilidade")} />
                                <TabButton label="Categoria" active={viewMode === "categoria"} onClick={() => setViewMode("categoria")} />
                                <TabButton label="Modelo" active={viewMode === "modelo"} onClick={() => setViewMode("modelo")} />
                            </div>

                            <PpmDinamico
                                viewMode={viewMode}
                                trendData={data.trendData}
                                filters={appliedFilters}
                                allowedModels={allowedModels}
                                metaDinamica={metaAtual} 
                            />

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <RankingCausas data={data.topCauses} />
                                <IndicePorMes 
                                    data={timelineItems} 
                                    tipoLabel={labelType} 
                                    metaDinamica={metaAtual} 
                                />
                            </div>

                            <TabelaDetalhamento 
                                data={data.details} 
                                filterLabel={tabelaLabel}
                            />
                        </>
                    )}
                </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ✅ ÚNICA MODIFICAÇÃO: Usando a classe `dashboard-tab-btn`
function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; }) {
  return (
    <button
      className={`dashboard-tab-btn ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}