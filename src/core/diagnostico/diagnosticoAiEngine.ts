import {
  DiagnosticoIaTexto,
  DiagnosticoAiInput,
  InsightCard
} from "../../../app/development/diagnostico/hooks/diagnosticoTypes";

import {
  DiagnosticoPilares,
  calcularPilarSpike,
  calcularPilarMelhoria,
  calcularPilarReincidencia,
  calcularPilarRebote,
  calcularPilarTopOfensor,
  fmt,
  fmtPpm
} from "./pilares";

// Extensão do tipo de retorno para incluir os pilares
type DiagnosticoIaOutput = DiagnosticoIaTexto & {
  pilares: DiagnosticoPilares;
};

export function gerarDiagnosticoAutomatico(
  input: DiagnosticoAiInput
): DiagnosticoIaOutput {
  const {
    periodoAtual,
    ppmContext,
    contexto,
    reincidencia,
    analiseSustentacao,
    mudancaBrusca 
  } = input;

  // 👉 DEBUG ADICIONADO AQUI: Permite verificar quais dados o motor está recebendo do banco/backend
  // eslint-disable-next-line no-console
  console.log("🔍 [DEBUG SPIKE] Dados de mudancaBrusca que chegaram na IA:", mudancaBrusca);

  // 1. Gera o Texto de Resumo
  const resumoData = gerarTextoResumo(input);

  // 👉 INJEÇÃO DE DADOS: Adicionamos a produção atual para o pilar de Spike (Gatekeeper de Volume)
  const mudancaBruscaEnriquecida = mudancaBrusca ? {
    ...mudancaBrusca,
    producaoAtual: ppmContext?.producaoAtual || 0
  } : null;

  // 2. Calcula cada Pilar Separadamente chamando os módulos isolados
  const pilares: DiagnosticoPilares = {
    spike: calcularPilarSpike(mudancaBruscaEnriquecida), // ✅ Usamos o objeto enriquecido aqui
    melhoria: calcularPilarMelhoria(mudancaBrusca),
    reincidencia: calcularPilarReincidencia(reincidencia, periodoAtual),
    rebote: calcularPilarRebote(analiseSustentacao),
    topOfensor: calcularPilarTopOfensor(periodoAtual, ppmContext)
  };

  // 3. Monta lista legada de insights (para compatibilidade)
  const insightsLegados = [
    pilares.spike,
    pilares.reincidencia,
    pilares.rebote,
    pilares.melhoria,
    pilares.topOfensor
  ].filter((c): c is InsightCard => c !== null);

  return {
    ...resumoData,
    insights: insightsLegados,
    pilares: pilares 
  };
}

/* ======================================================
   GERADOR DE TEXTO (RESTAURADO COM LÓGICA COMPLETA)
   ====================================================== */
function gerarTextoResumo(input: DiagnosticoAiInput) {
  const { periodoAtual, ppmContext } = input;
  const resumoLines: string[] = [];
  const indicadores: string[] = [];

  // 1. Check de Segurança
  if (ppmContext.producaoAtual === 0) {
    return {
      titulo: "Sem Produção Registrada",
      resumoGeral: `Não identificamos apontamentos de produção para o período (Semana ${periodoAtual.semanaInicio} a ${periodoAtual.semanaFim}). Selecione outro período.`,
      tendencia: "indefinido" as const,
      variacaoPercentual: 0,
      indicadoresChave: []
    };
  }

  // 2. Lógica de Tendência
  let variacaoPpmPercent = 0;
  let diferencaPpmAbsoluta = 0;
  let tendencia: "melhora" | "piora" | "estavel" | "indefinido" = "indefinido";

  if (ppmContext.anterior > 0) {
    diferencaPpmAbsoluta = ppmContext.atual - ppmContext.anterior;
    variacaoPpmPercent = (diferencaPpmAbsoluta / ppmContext.anterior) * 100;

    if (variacaoPpmPercent <= -5) tendencia = "melhora";
    else if (variacaoPpmPercent >= 5) tendencia = "piora";
    else tendencia = "estavel";
  } else if (ppmContext.atual > 0 && ppmContext.anterior === 0) {
    tendencia = "piora";
    variacaoPpmPercent = 100;
    diferencaPpmAbsoluta = ppmContext.atual;
  }

  // 3. Montagem do Texto - Parágrafo 1: Contexto
  resumoLines.push(
    `No período analisado (semanas **${periodoAtual.semanaInicio} a ${periodoAtual.semanaFim}**), ` +
      `o agrupamento **${periodoAtual.principalCausa.nome}** foi o principal ofensor, ` +
      `concentrando **${fmt(periodoAtual.principalCausa.ocorrencias)}** ocorrências.`
  );

  // 4. Montagem do Texto - Parágrafo 2: Análise de Tendência
  if (tendencia !== "indefinido") {
    const sinal = diferencaPpmAbsoluta > 0 ? "+" : "";
    const txtPercent = `${sinal}${variacaoPpmPercent.toFixed(1)}%`;
    const txtAbsoluto = `${sinal}${fmtPpm(diferencaPpmAbsoluta)}`;
    const ppmAtualStr = fmtPpm(ppmContext.atual);
    const ppmAntStr = fmtPpm(ppmContext.anterior);

    if (tendencia === "melhora") {
      resumoLines.push(
        `**Cenário Positivo:** Redução de **${txtAbsoluto} PPM** (${txtPercent}) comparado ao período anterior ` +
        `(${ppmAntStr} ➝ ${ppmAtualStr}). As ações de contenção demonstram efetividade.`
      );
    } else if (tendencia === "piora") {
      resumoLines.push(
        `**Atenção (Degradação):** O processo oscilou negativamente, com aumento de **${txtAbsoluto} PPM** (${txtPercent}) ` +
        `(${ppmAntStr} ➝ ${ppmAtualStr}). Verifique as mudanças recentes no 4M.`
      );
    } else {
      resumoLines.push(
        `**Estabilidade:** O PPM variou apenas **${txtAbsoluto} PPM** (${txtPercent}), mantendo-se no patamar de ${ppmAtualStr}. ` +
        `O processo está estável, mas exige novas ações para melhoria de nível.`
      );
    }
  }

  // 5. Montagem do Texto - Parágrafo 3: Defeito Específico (Ishikawa)
  if (periodoAtual.principalDefeito.nome) {
    resumoLines.push(
      `O defeito específico **${periodoAtual.principalDefeito.nome}** liderou os registros. ` +
      `Foque o Ishikawa prioritariamente neste item.`
    );
  }

  // 6. Indicadores
  indicadores.push(`PPM: ${fmtPpm(ppmContext.atual)}`);
  
  // Título Dinâmico
  const titulos = {
      melhora: "Evolução Positiva de Qualidade",
      piora: "Alerta de Degradação",
      estavel: "Estabilidade de Processo",
      indefinido: "Diagnóstico Inicial"
  };

  return {
    titulo: titulos[tendencia] || "Diagnóstico do SIGMA-Q AI",
    resumoGeral: resumoLines.join("\n\n"),
    tendencia,
    variacaoPercentual: variacaoPpmPercent,
    indicadoresChave: indicadores
  };
}