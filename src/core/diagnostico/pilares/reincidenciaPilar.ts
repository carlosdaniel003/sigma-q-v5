import { InsightCard } from "../../../../app/development/diagnostico/hooks/diagnosticoTypes";

/**
 * O objeto reincidencia agora pode receber:
 * - isReincidente: boolean
 * - periodosConsecutivos: number
 * - principalCausaAnterior: string
 * - principalDefeitoAnterior?: string (Opcional: Desbloqueia análise de DNA da falha)
 */
export function calcularPilarReincidencia(reincidencia: any, periodoAtual: any): InsightCard | null {
  if (!reincidencia || !periodoAtual) return null;

  const causaAtual = periodoAtual?.principalCausa?.nome;
  const defeitoAtual = periodoAtual?.principalDefeito?.nome;

  const causaAnterior = reincidencia.principalCausaAnterior;
  const defeitoAnterior = reincidencia.principalDefeitoAnterior; // Dado que enriquece a análise
  const periodosConsecutivos = reincidencia.periodosConsecutivos || 2;

  // ==========================================
  // NÍVEL 1: DNA DA FALHA (Assinatura Exata)
  // ==========================================
  // A mesma Causa E o mesmo Defeito se repetiram
  if (causaAtual && causaAnterior === causaAtual && defeitoAtual && defeitoAnterior === defeitoAtual) {
    return {
      tipo: "CRITICO",
      titulo: "Vício Crônico de Processo",
      descricao: `A assinatura de falha **[${causaAtual} > ${defeitoAtual}]** se repete como o maior ofensor por ${periodosConsecutivos} períodos. As ações de bloqueio não foram efetivas na causa raiz.`,
      score: 100
    };
  }

  // ==========================================
  // NÍVEL 2: EFEITO GUARDA-CHUVA (Migração de Defeito)
  // ==========================================
  // A Causa é a mesma, mas o Defeito por trás dela mudou
  if (causaAtual && causaAnterior === causaAtual && defeitoAnterior && defeitoAtual !== defeitoAnterior) {
    return {
      tipo: "ALERTA",
      titulo: "Migração de Modo de Falha",
      descricao: `O grupo **"${causaAtual}"** continua liderando as perdas, mas o problema migrou. O defeito mudou de **"${defeitoAnterior}"** para **"${defeitoAtual}"**. A raiz sistêmica do agrupamento não foi sanada.`,
      score: 85
    };
  }

  // ==========================================
  // NÍVEL 3: REINCIDÊNCIA MACRO (Fallback do sistema atual)
  // ==========================================
  // Analisa apenas o nível do agrupamento (Causa)
  if (reincidencia.isReincidente) {
    return {
      tipo: "CRITICO",
      titulo: "Reincidência Sistêmica Macro",
      descricao: `O agrupamento **"${causaAtual}"** lidera o ranking geral de perdas por ${periodosConsecutivos} períodos consecutivos. Exige revisão estrutural baseada no 4M.`,
      score: 90
    };
  }
  
  if (causaAnterior === causaAtual) {
    return {
      tipo: "ALERTA",
      titulo: "Repetição de Ofensor Macro",
      descricao: `O agrupamento **"${causaAtual}"** repetiu a liderança de falhas em relação ao período anterior. Há risco alto de se tornar um problema crônico.`,
      score: 60
    };
  }

  return null;
}