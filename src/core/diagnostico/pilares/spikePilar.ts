import { InsightCard } from "../../../../app/development/diagnostico/hooks/diagnosticoTypes";
import { fmtPpm } from "./types";

/**
 * Espera-se que o objeto mudancaBrusca agora contenha:
 * - nome: string
 * - delta: number (diferença absoluta de PPM)
 * - ppmAtual: number
 * - ppmAnterior: number
 * - producaoAtual: number
 * - historico?: number[] (Opcional: Array com a série histórica para o mini gráfico)
 */
export function calcularPilarSpike(mudancaBrusca: any): InsightCard | null {
  if (!mudancaBrusca || mudancaBrusca.delta <= 0) return null; // Só interessa PIORA

  const { nome, delta, ppmAtual, ppmAnterior, producaoAtual, historico } = mudancaBrusca;
  const txtDelta = fmtPpm(delta);

  // ==========================================
  // ESTRUTURA DO MINI GRÁFICO (SPARKLINE)
  // ==========================================
  // Se o backend enviar uma série histórica, usamos. 
  // Se não, criamos uma linha de 2 pontos (Anterior -> Atual) para garantir que o gráfico renderize.
  const chartData = historico && Array.isArray(historico) && historico.length > 0 
    ? historico 
    : [ppmAnterior, ppmAtual];

  // ==========================================
  // PARÂMETROS DE CALIBRAÇÃO DA IA
  // ==========================================
  const MIN_PRODUCAO_RELEVANTE = 500; // Abaixo disso, qualquer defeito explode o PPM (Falso Positivo)
  const MIN_DELTA_CRITICO = 30;       // Diferença mínima absoluta para não dar alarme falso por 2 PPM
  const PERC_AUMENTO_CRITICO = 50;    // +50% de piora em relação ao histórico é crítico

  // ==========================================
  // CÁLCULO RELATIVO (OPÇÃO B)
  // ==========================================
  let percAumento = 0;
  if (ppmAnterior > 0) {
    percAumento = (delta / ppmAnterior) * 100;
  } else {
    // Se não havia defeito antes (0 PPM) e agora tem, consideramos 100% de piora base
    percAumento = 100; 
  }

  let isCritico = false;
  let justificativa = "";

  // Avalia se é um Spike Crítico real (aumentou muito percentualmente E tem um delta absoluto relevante)
  if (percAumento >= PERC_AUMENTO_CRITICO && delta >= MIN_DELTA_CRITICO) {
    isCritico = true;
    if (ppmAnterior === 0) {
      // ✅ TEXTO ATUALIZADO: Inclui o delta absoluto e percentual mesmo vindo do zero
      justificativa = `saltou de 0 para **${fmtPpm(ppmAtual)} PPM** subitamente (+**${txtDelta} PPM** / +100%)`;
    } else {
      // ✅ TEXTO ATUALIZADO: Mostra Origem, Destino, Delta Absoluto e Percentual
      justificativa = `saltou de **${fmtPpm(ppmAnterior)}** para **${fmtPpm(ppmAtual)} PPM** (aumento de **${txtDelta} PPM** / +${percAumento.toFixed(1)}%)`;
    }
  } else {
    // ✅ TEXTO ATUALIZADO: Mostra Origem, Destino, Delta Absoluto e Percentual
    justificativa = `subiu de **${fmtPpm(ppmAnterior)}** para **${fmtPpm(ppmAtual)} PPM** (aumento de **${txtDelta} PPM** / +${percAumento.toFixed(1)}%)`;
  }

  // ==========================================
  // FILTRO DE VOLUME / GATEKEEPER (OPÇÃO A)
  // ==========================================
  const volumeBaixo = producaoAtual !== undefined && producaoAtual < MIN_PRODUCAO_RELEVANTE;

  if (isCritico && volumeBaixo) {
    // Rebaixa a severidade porque a amostra não é confiável
    isCritico = false;
    justificativa += `. No entanto, o volume de lote baixo (${producaoAtual} peças) distorce a precisão da métrica`;
  }

  // Ignora ruído natural (Delta pequeno + Sem criticidade relativa)
  if (!isCritico && delta < 20) {
      return null;
  }

  // ==========================================
  // RETORNO FORMATADO COM CHART DATA
  // Usamos "as any" temporariamente caso sua interface InsightCard ainda não tenha as propriedades do gráfico mapeadas
  // ==========================================
  if (isCritico) {
    return {
      tipo: "CRITICO",
      titulo: "Spike Negativo (Piora Acentuada)",
      descricao: `O defeito "${nome}" ${justificativa}. Indica provável quebra de processo ou lote defeituoso.`,
      score: 95,
      chartData: chartData,
      chartType: "line"
    } as any; 
  }

  return {
    tipo: "ALERTA",
    titulo: "Oscilação de Processo",
    descricao: `O defeito "${nome}" ${justificativa}. Monitore para evitar escalada.`,
    score: volumeBaixo ? 40 : 60,
    chartData: chartData,
    chartType: "line"
  } as any;
}