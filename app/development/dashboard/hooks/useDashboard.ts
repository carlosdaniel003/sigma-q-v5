"use client";

import { useEffect, useState } from "react";
import { useDashboardFilters } from "../store/dashboardFilters";

/* ======================================================
   TIPAGEM (Sincronizada com Backend e Frontend)
====================================================== */

export interface DetailRow {
  rank: number;
  cod: string;
  falha: string;
  peca: string;
  ref: string;
  analise: string;
  responsabilidade: string;
  modelo: string;
  qtd: number;
  ppm: number;
}

// ✅ NOVA ESTRUTURA: Grupo de Responsabilidade
export interface ResponsibilityGroup {
  responsibility: string; // Ex: "PROCESSO", "FORN. IMPORTADO"
  top3: DetailRow[];
}

export interface TurnoStats {
  turno: string;
  producao: number;
  totalDefeitos: number;
  // ✅ MUDANÇA: Em vez de top3 direto, temos uma lista de grupos
  groups: ResponsibilityGroup[]; 
}

// ... (Restante das interfaces TrendItem, ContextItem, etc. permanecem iguais)
export interface ContextItem {
  name: string;
  qty: number;
  percent: number;
}

export interface CauseItem {
  name: string;
  defects: number;
  ppm: number;
  topModel?: ContextItem;
  topFailure?: ContextItem;
  topRef?: ContextItem;
  topAnalysis?: ContextItem; 
}

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

interface PpmMonthlyTrendItem {
  month: string;
  production: number;
  defects: number;
  ppm: number | null;
}

export interface ResponsabilidadeMensalItem {
  month: string;
  production: number;
  totalDefects: number;
  "FORN. IMPORTADO": number;
  "FORN. LOCAL": number;
  "PROCESSO": number;
  "PROJETO": number;
}

export interface CategoriaMensalItem {
  month: string;
  production: number;
  totalDefects: number;
  [categoria: string]: number | string;
}

interface DashboardData {
  meta: {
    totalProduction: number;
    totalDefects: number;
    ppmGeral: number | null;
    aiPrecision: number;
  };
  trendData: TrendHierarchy;
  topCauses: {
    byAnalysis: CauseItem[];
    byFailure: CauseItem[];
    byPosition: CauseItem[]; // Mantido na interface para não quebrar, mesmo se vazio
  };
  details: TurnoStats[]; // ✅ Agora usa a nova estrutura com groups
  ppmMonthlyTrend: PpmMonthlyTrendItem[];
  responsabilidadeMensal: ResponsabilidadeMensalItem[];
  categoriaMensal: CategoriaMensalItem[];
  byCategory: any[];
  byModel: any[];
}

/* ======================================================
   HOOK PRINCIPAL
====================================================== */
export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { appliedFilters } = useDashboardFilters();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        // 1. FILTROS DE TEMPO
        const tipoPeriodo = appliedFilters.periodo.tipo as string;
        const { valor, ano, dia } = appliedFilters.periodo;

        if (tipoPeriodo === "mes" && valor && ano) {
          params.set("mes", valor.toString());
          params.set("ano", ano.toString());
        } 
        
        if (tipoPeriodo === "semana" && valor && ano) {
          params.set("semana", valor.toString());
          params.set("ano", ano.toString());
        }

        if (dia) {
          params.set("dia", dia);
        }

        // 2. FILTROS DE DIMENSÃO
        if (appliedFilters.categoria && appliedFilters.categoria !== "Todos") {
          params.set("categoria", appliedFilters.categoria);
        }
        if (appliedFilters.modelo && appliedFilters.modelo !== "Todos") {
          params.set("modelo", appliedFilters.modelo);
        }
        if (appliedFilters.turno && appliedFilters.turno !== "Todos") {
          params.set("turno", appliedFilters.turno);
        }
        if (appliedFilters.responsabilidade && appliedFilters.responsabilidade !== "Todos") {
          params.set("responsabilidade", appliedFilters.responsabilidade);
        }

        // 3. REQUISIÇÃO AO BACKEND
        const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Erro ao carregar dashboard");
        }

        const json: DashboardData = await res.json();
        setData(json);
      } catch (err: any) {
        console.error("❌ Hook useDashboard Error:", err);
        setError(err?.message ?? "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [appliedFilters]);

  return { data, loading, error };
}