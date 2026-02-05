import {
  DiagnosticoIaTexto,
  DiagnosticoAiInput,
  InsightCard
} from ".../../app/development/diagnostico/hooks/diagnosticoTypes"; 

export function gerarDiagnosticoAutomatico(
  input: DiagnosticoAiInput
): DiagnosticoIaTexto {
  const {
    periodoAtual,
    ppmContext,
    contexto,
    reincidencia,
    analiseSustentacao,
    mudancaBrusca 
  } = input;

  const resumoLines: string[] = []; // Texto da esquerda
  const insights: InsightCard[] = []; // Cards da direita
  const indicadores: string[] = [];

  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const fmtPpm = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ======================================================
     🚨 0. CHECK DE SEGURANÇA
  ====================================================== */
  if (ppmContext.producaoAtual === 0) {
    return {
      titulo: "Sem Produção Registrada",
      resumoGeral: `Não identificamos apontamentos de produção para o período (Semana ${periodoAtual.semanaInicio} a ${periodoAtual.semanaFim}). Selecione outro período.`,
      insights: [],
      tendencia: "indefinido",
      variacaoPercentual: 0,
      indicadoresChave: []
    };
  }

  if (ppmContext.atual === 0 && ppmContext.producaoAtual > 0) {
    return {
      titulo: "Excelência em Qualidade",
      resumoGeral: `Parabéns! Houve produção de **${fmt(ppmContext.producaoAtual)} peças** sem nenhum registro de falha. O processo demonstra robustez total.`,
      insights: [{
          tipo: "MELHORIA",
          titulo: "Zero Defeitos",
          descricao: "Nenhum apontamento de não conformidade no período.",
          score: 100
      }],
      tendencia: "melhora",
      variacaoPercentual: -100,
      indicadoresChave: ["Zero Defeitos"]
    };
  }

  /* ======================================================
     1️⃣ CÁLCULO DE TENDÊNCIA
  ====================================================== */
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

  /* ======================================================
     2️⃣ RESUMO GERAL (Coluna da Esquerda)
  ====================================================== */
  resumoLines.push(
    `No período analisado (semanas **${periodoAtual.semanaInicio} a ${periodoAtual.semanaFim}**), ` +
      `o agrupamento **${periodoAtual.principalCausa.nome}** foi o principal ofensor, ` +
      `concentrando **${fmt(periodoAtual.principalCausa.ocorrencias)}** ocorrências.`
  );

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

  if (periodoAtual.principalDefeito.nome) {
    resumoLines.push(
      `O defeito específico **${periodoAtual.principalDefeito.nome}** liderou os registros. ` +
      `Foque o Ishikawa prioritariamente neste item.`
    );
  }

  indicadores.push(`PPM: ${fmtPpm(ppmContext.atual)}`);

  /* ======================================================
     3️⃣ GERAÇÃO DE CARDS DE INSIGHTS (Coluna da Direita)
  ====================================================== */

  // --- A. REINCIDÊNCIA (CRÍTICO) ---
  if (reincidencia) {
      if (reincidencia.isReincidente) {
          insights.push({
              tipo: "CRITICO",
              titulo: "Reincidência Sistêmica",
              descricao: `O grupo "${periodoAtual.principalCausa.nome}" lidera o ranking por ${reincidencia.periodosConsecutivos} períodos consecutivos. Necessário abertura de RNC.`,
              score: 100 // Topo absoluto
          });
      } 
      else if (reincidencia.principalCausaAnterior === periodoAtual.principalCausa.nome) {
          insights.push({
              tipo: "ALERTA",
              titulo: "Repetição de Ofensor",
              descricao: `O grupo "${periodoAtual.principalCausa.nome}" repetiu a liderança do período anterior. Risco de se tornar crônico.`,
              score: 60
          });
      }
  }

  // --- B. MUDANÇA BRUSCA / SPIKE ---
  if (mudancaBrusca) {
      const delta = mudancaBrusca.delta;
      const absDelta = Math.abs(delta);
      const txtDelta = fmtPpm(delta);
      const nome = mudancaBrusca.nome;

      if (delta > 0) {
          // Piora
          if (absDelta > 100) {
              insights.push({
                  tipo: "CRITICO",
                  titulo: "Spike Negativo (Piora)",
                  descricao: `O defeito "${nome}" saltou +${txtDelta} PPM subitamente. Indica quebra de processo ou lote defeituoso.`,
                  score: 90
              });
          } else {
              insights.push({
                  tipo: "ALERTA",
                  titulo: "Oscilação de Processo",
                  descricao: `O defeito "${nome}" variou +${txtDelta} PPM. Monitore para evitar escalada.`,
                  score: 50
              });
          }
      } else {
          // Melhoria
          if (absDelta > 100) {
              insights.push({
                  tipo: "MELHORIA",
                  titulo: "Melhoria Expressiva",
                  descricao: `O defeito "${nome}" reduziu ${txtDelta} PPM. Padronize a ação realizada.`,
                  score: 80
              });
          }
      }
  }

  // --- C. EFEITO REBOTE (V-CURVE) - ATUALIZADO COM NOMES REAIS ---
  if (analiseSustentacao) {
      const { nome, ppmT, ppmT1, ppmT2, labelT1, labelT2 } = analiseSustentacao;
      
      // ✅ Usa os labels se existirem, senão usa o genérico "T-1"
      const nomePeriodoAnterior = labelT1 || "T-1";
      const nomePeriodoRetrasado = labelT2 || "T-2";

      insights.push({
          tipo: "ALERTA",
          titulo: "Efeito Rebote (Sustentação)",
          descricao: `"${nome}" caiu em ${nomePeriodoAnterior} (${fmtPpm(ppmT1)} PPM) mas voltou a subir agora (${fmtPpm(ppmT)} PPM). A ação corretiva perdeu eficácia.`,
          score: 75
      });
  }

  // --- D. TENDÊNCIA DE AUMENTO (GROWTH WATCH) ---
  if (contexto?.tendenciasAlertas && contexto.tendenciasAlertas.length > 0) {
      const tendenciasRelevantes = contexto.tendenciasAlertas.filter(t => t.crescimento > 0 && t.ppmFinal > 100);

      tendenciasRelevantes.forEach(t => {
          const ppmIni = t.ppmInicial || 0;
          const ppmFim = t.ppmFinal || 0;
          
          let growthPct = 0;
          if (ppmIni > 0) {
              growthPct = ((ppmFim - ppmIni) / ppmIni) * 100;
          } else if (ppmFim > 0) {
              growthPct = 100; 
          }

          if (ppmFim > 1000 || growthPct > 50) {
              insights.push({
                  tipo: "CRITICO",
                  titulo: "Tendência Acentuada",
                  descricao: `Risco de Escalada: O defeito "${t.agrupamento}" cresceu rapidamente (+${growthPct.toFixed(0)}%) e atingiu ${fmtPpm(ppmFim)} PPM.`,
                  score: 85
              });
          } else {
              insights.push({
                  tipo: "ALERTA",
                  titulo: "Tendência de Aumento",
                  descricao: `Atenção: O defeito "${t.agrupamento}" iniciou uma curva de subida constante (de ${fmtPpm(ppmIni)} para ${fmtPpm(ppmFim)} PPM).`,
                  score: 65
              });
          }
      });
  }

  // --- E. CONTEXTO OPERACIONAL (INFO) ---
  if (contexto?.turnoMaisAfetado) {
      insights.push({
          tipo: "INFO",
          titulo: "Foco no Turno",
          descricao: `Maior concentração (${contexto.turnoMaisAfetado}). Recomendado auditoria escalonada neste horário.`,
          score: 10
      });
  }
  
  if (contexto?.modeloMaisAfetado) {
      insights.push({
          tipo: "INFO",
          titulo: "Sensibilidade de Modelo",
          descricao: `O modelo ${contexto.modeloMaisAfetado} foi desproporcionalmente afetado neste período.`,
          score: 5
      });
  }

  // ORDENAÇÃO DOS INSIGHTS (Score Decrescente)
  insights.sort((a, b) => b.score - a.score);

  /* ======================================================
     4️⃣ SAÍDA FINAL
  ====================================================== */
  return {
    titulo: "Diagnóstico do SIGMA-Q AI",
    resumoGeral: resumoLines.join("\n\n"),
    insights,
    tendencia,
    variacaoPercentual: variacaoPpmPercent,
    indicadoresChave: indicadores,
  };
}