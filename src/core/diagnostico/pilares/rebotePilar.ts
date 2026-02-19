import { InsightCard } from "../../../../app/development/diagnostico/hooks/diagnosticoTypes";
import { fmtPpm } from "./types";

/**
 * Espera-se que o objeto analiseSustentacao contenha:
 * - nome: string
 * - ppmT (Atual), ppmT1 (Anterior), ppmT2 (2 períodos atrás)
 * - qtdT, qtdT1, qtdT2 (Volumes de produção)
 * - labelT1, labelT2 (Opcional: Nomes dos períodos para o texto)
 */
export function calcularPilarRebote(analiseSustentacao: any): InsightCard | null {
  if (!analiseSustentacao) return null;

  const { 
    nome, 
    ppmT, ppmT1, ppmT2, 
    qtdT, 
    labelT1, labelT2 
  } = analiseSustentacao;

  // Se não temos os 3 pontos do tempo, é impossível calcular a "Curva em V" do rebote.
  if (ppmT === undefined || ppmT1 === undefined || ppmT2 === undefined) return null;

  // ==========================================
  // PARÂMETROS DE CALIBRAÇÃO DA IA
  // ==========================================
  const MIN_PRODUCAO_RELEVANTE = 500; // Produção mínima para a métrica ser confiável
  const MIN_QUEDA_INICIAL = 30;       // A melhoria original precisava ser de pelo menos 30 PPM
  const MIN_SUBIDA_REBOTE = 20;       // A recaída precisa ser de pelo menos 20 PPM
  const PERC_REBOTE_MINIMO = 30;      // O defeito precisa ter "devolvido" pelo menos 30% da melhoria

  // ==========================================
  // 1. IDENTIFICAÇÃO DA "CURVA EM V"
  // ==========================================
  // Para ser rebote, TEM que ter caído em T-1 e subido agora em T
  const isCurvaV = ppmT2 > ppmT1 && ppmT > ppmT1;
  
  if (!isCurvaV) return null; // Se não formou o "V", não é rebote.

  const quedaOriginal = ppmT2 - ppmT1;
  const subidaAtual = ppmT - ppmT1;

  // ==========================================
  // 2. FILTROS DE RUÍDO E VOLUME
  // ==========================================
  if (qtdT !== undefined && qtdT < MIN_PRODUCAO_RELEVANTE) return null;
  if (quedaOriginal < MIN_QUEDA_INICIAL || subidaAtual < MIN_SUBIDA_REBOTE) return null;

  // ==========================================
  // 3. CÁLCULO DE PROPORÇÃO (GRAVIDADE)
  // ==========================================
  // Quanto da melhoria foi "perdida"? (Ex: Caiu 100, subiu 50 = Perdeu 50%)
  const percPerda = (subidaAtual / quedaOriginal) * 100;

  if (percPerda < PERC_REBOTE_MINIMO) return null; // Foi só uma oscilação leve, ação continua válida.

  // É Rebote Crítico se devolveu 90% ou mais (ou se ficou pior do que era no início)
  const isReboteCritico = percPerda >= 90 || ppmT >= ppmT2;

  // ==========================================
  // 4. RETORNO FORMATADO COM CHART DATA
  // ==========================================
  const nomeT2 = labelT2 || "períodos anteriores";
  const nomeT1 = labelT1 || "período anterior";
  const chartData = [ppmT2, ppmT1, ppmT];

  // TEXTO PARA REBOTE TOTAL (CRÍTICO)
  if (isReboteCritico) {
    const statusPiora = ppmT > ppmT2 ? "ficando ainda pior do que no início" : `perdendo **${percPerda.toFixed(0)}%** da melhoria conquistada`;
    
    return {
      tipo: "CRITICO",
      titulo: "Rebote Crítico (Falha Sistêmica)",
      descricao: `A falha "${nome}" havia caído de **${fmtPpm(ppmT2)}** para **${fmtPpm(ppmT1)} PPM**, mas agora disparou para **${fmtPpm(ppmT)} PPM**, ${statusPiora}. A ação corretiva original falhou.`,
      score: 95,
      chartData: chartData,
      chartType: "line"
    } as any;
  }

  // TEXTO PARA REBOTE PARCIAL (ALERTA)
  return {
    tipo: "ALERTA",
    titulo: "Alerta de Degradação (Rebote Parcial)",
    descricao: `A falha "${nome}" havia caído de **${fmtPpm(ppmT2)}** para **${fmtPpm(ppmT1)} PPM**, mas voltou a subir para **${fmtPpm(ppmT)} PPM**. A contenção perdeu **${percPerda.toFixed(0)}%** de sua eficiência, mas ainda é melhor que no início.`,
    score: 65,
    chartData: chartData,
    chartType: "line"
  } as any;
}