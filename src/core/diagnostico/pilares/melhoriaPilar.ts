import { InsightCard } from "../../../../app/development/diagnostico/hooks/diagnosticoTypes";
import { fmtPpm } from "./types";

/**
 * Espera-se que o objeto mudancaBrusca contenha:
 * - nome: string
 * - delta: number (diferença absoluta de PPM)
 * - ppmAtual: number
 * - ppmAnterior: number
 * - producaoAtual: number
 * - historico?: number[]
 */
export function calcularPilarMelhoria(mudancaBrusca: any): InsightCard | null {
  if (!mudancaBrusca || mudancaBrusca.delta >= 0) return null; // Só interessa MELHORA (queda de PPM)

  const { nome, delta, ppmAtual, ppmAnterior, producaoAtual, historico } = mudancaBrusca;
  const absDelta = Math.abs(delta);

  // ==========================================
  // PARÂMETROS DE CALIBRAÇÃO DA IA
  // ==========================================
  const MIN_PRODUCAO_RELEVANTE = 500; // Evita "Falsa Melhoria" porque a produção despencou
  const MIN_QUEDA_CRITICA = 30;       // Diferença mínima para não comemorar queda de 2 PPM
  const PERC_QUEDA_RELEVANTE = 40;    // Redução de 40% em relação ao histórico é digna de nota

  // ==========================================
  // FILTRO DE VOLUME / GATEKEEPER (OPÇÃO A)
  // ==========================================
  // Se a produção for muito baixa, a amostra não é confiável. Ignoramos a melhoria para não gerar ruído.
  if (producaoAtual !== undefined && producaoAtual < MIN_PRODUCAO_RELEVANTE) {
    return null; 
  }

  // ==========================================
  // CÁLCULO RELATIVO (OPÇÃO B)
  // ==========================================
  let percQueda = 0;
  if (ppmAnterior > 0) {
    percQueda = (absDelta / ppmAnterior) * 100;
  } else {
    // Se era zero e o delta é negativo, há uma inconsistência matemática. Ignora.
    return null;
  }

  // Verifica se a melhoria é estatisticamente relevante
  // Tem que ter caído 40% E ter uma queda absoluta palpável (ex: mais de 30 PPM)
  // OU ser uma queda absoluta monstruosa (ex: caiu 150 PPM de uma vez, mesmo que seja só 20% do total)
  const isRelevante = (percQueda >= PERC_QUEDA_RELEVANTE && absDelta >= MIN_QUEDA_CRITICA) || (absDelta >= 100);

  if (!isRelevante) {
    return null; // Oscilação natural do processo. Não merece alarde.
  }

  // ==========================================
  // ESTRUTURA DO MINI GRÁFICO & SUSTENTAÇÃO (OPÇÃO C)
  // ==========================================
  const chartData = historico && Array.isArray(historico) && historico.length > 0
    ? historico
    : [ppmAnterior, ppmAtual];

  let isSustentada = false;

  // Se tivermos histórico longo, analisamos se a queda já vem se mantendo
  if (chartData.length >= 3) {
    const t2 = chartData[chartData.length - 3]; // Há 2 períodos atrás
    const t1 = chartData[chartData.length - 2]; // Período anterior
    const atual = chartData[chartData.length - 1]; // Atual

    // Se no período anterior (T-1) já havia caído em relação a T-2, e agora (Atual) continuou baixo...
    if (t1 < t2 && atual <= t1 * 1.15) { 
      isSustentada = true;
    }
  }

  // ==========================================
  // RETORNO FORMATADO COM CHART DATA
  // ==========================================
  const titulo = isSustentada ? "Melhoria Consolidada" : "Potencial de Melhoria";
  const acao = isSustentada 
    ? "Ação validada. Padronize o processo." 
    : "Acompanhe nas próximas semanas para garantir a sustentação.";

  // ✅ TEXTO ATUALIZADO: Mostrando de onde saiu, para onde foi, a diferença absoluta e percentual
  const justificativa = `reduziu de **${fmtPpm(ppmAnterior)}** para **${fmtPpm(ppmAtual)} PPM** (queda de **${fmtPpm(absDelta)} PPM** / -${percQueda.toFixed(1)}%)`;

  return {
    tipo: "MELHORIA",
    titulo: titulo,
    descricao: `O defeito "${nome}" ${justificativa}. ${acao}`,
    score: isSustentada ? 85 : 70, // Melhorias consolidadas ficam mais no topo
    chartData: chartData,
    chartType: "line"
  } as any; // Cast necessário temporariamente caso o TypeScript reclame do chartData no seu ambiente local
}