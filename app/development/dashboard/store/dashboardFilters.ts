import { create } from "zustand";

/* ======================================================
   TIPOS
====================================================== */
export interface FilterState {
  periodo: {
    tipo: "semana" | "mes";
    valor: number | null; // Número do Mês ou da Semana
    ano: number | null;
    dia: string | null;   // ✅ NOVO: Data específica "YYYY-MM-DD"
  };
  categoria: string | null;
  modelo: string | null;
  responsabilidade: string | null;
  turno: string | null;
}

interface DashboardFilterStore {
  // Rascunho (O que você seleciona na tela)
  draftFilters: FilterState;
  
  // ✅ Aplicado (O que foi confirmado no botão "Buscar")
  appliedFilters: FilterState;

  // Ações
  setDraftFilter: (key: keyof FilterState, value: any) => void;
  applyFilters: () => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  // ✅ Inicializa dia como null
  periodo: { tipo: "mes", valor: null, ano: null, dia: null }, 
  categoria: null,
  modelo: null,
  responsabilidade: null,
  turno: null,
};

/* ======================================================
   STORE (ZUSTAND)
====================================================== */
export const useDashboardFilters = create<DashboardFilterStore>((set) => ({
  draftFilters: { ...initialState },
  appliedFilters: { ...initialState },

  setDraftFilter: (key, value) =>
    set((state) => ({
      draftFilters: { ...state.draftFilters, [key]: value },
    })),

  // Ao clicar em buscar, movemos o rascunho para o aplicado
  applyFilters: () =>
    set((state) => ({
      appliedFilters: { ...state.draftFilters },
    })),

  resetFilters: () =>
    set(() => ({
      draftFilters: { ...initialState },
      appliedFilters: { ...initialState },
    })),
}));