import { InsightCard } from "../../../../app/development/diagnostico/hooks/diagnosticoTypes";

export interface DiagnosticoPilares {
  spike: InsightCard | null;
  melhoria: InsightCard | null;
  reincidencia: InsightCard | null;
  rebote: InsightCard | null;
  topOfensor: InsightCard | null;
}

// Helpers globais de formatação para os pilares
export const fmt = (n: number) => n.toLocaleString("pt-BR");
export const fmtPpm = (n: number) => 
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });