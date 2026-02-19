import { InsightCard } from "../../../../app/development/diagnostico/hooks/diagnosticoTypes";
import { fmt } from "./types"; 

export function calcularPilarTopOfensor(periodoAtual: any, ppmContext: any): InsightCard | null {
  if (!periodoAtual?.principalDefeito || !periodoAtual?.principalCausa || !ppmContext) return null;

  const defeito = periodoAtual.principalDefeito;
  const causa = periodoAtual.principalCausa;

  // ==========================================
  // 1. CÁLCULO DE PARETO (O TAMANHO DO ESTRAGO)
  // ==========================================
  // Recuperamos o total de defeitos gerais do período através da engenharia reversa do PPM
  const totalDefeitosGerais = Math.round((ppmContext.atual * ppmContext.producaoAtual) / 1000000);
  
  // Filtro de Ruído: Se teve pouquíssimos defeitos na fábrica toda, não gera o card de Ação Imediata
  if (totalDefeitosGerais <= 0 || defeito.ocorrencias < 3) return null; 

  const paretoPerc = (defeito.ocorrencias / totalDefeitosGerais) * 100;

  // Filtro de Gatilho: O Top 1 só ganha o card de prescrição se representar uma fatia considerável do problema
  if (paretoPerc < 15) return null; 

  // ==========================================
  // 2. ROTEAMENTO DE RESPONSABILIDADE (REAL VS HEURÍSTICA)
  // ==========================================
  let dono = "Liderança de Produção / Qualidade";
  
  // ✅ Usa a responsabilidade predominante extraída do Banco de Dados (API)
  if (defeito.responsabilidade && defeito.responsabilidade !== "Desconhecida" && defeito.responsabilidade !== "Indefinida") {
    dono = defeito.responsabilidade;
  } else {
    // Plano B (Heurística): Deduz a área dona do problema com base nos termos mais comuns de manufatura
    const nomeAvaliador = `${causa.nome} ${defeito.nome}`.toUpperCase();
    if (nomeAvaliador.includes("FORN") || nomeAvaliador.includes("MATERIAL") || nomeAvaliador.includes("COMPONENTE")) {
      dono = "Qualidade Fornecedor";
    } else if (nomeAvaliador.includes("SOLDA") || nomeAvaliador.includes("SMT") || nomeAvaliador.includes("PTH") || nomeAvaliador.includes("CURTO")) {
      dono = "Engenharia de Processos";
    } else if (nomeAvaliador.includes("TESTE") || nomeAvaliador.includes("ICT") || nomeAvaliador.includes("FCT") || nomeAvaliador.includes("FALHA")) {
      dono = "Engenharia de Testes";
    }
  }

  // ==========================================
  // 3. MATRIZ DE AÇÃO E PRAZO (BASEADO NO DONO)
  // ==========================================
  const isPiorando = ppmContext.atual > ppmContext.anterior && ppmContext.anterior > 0;
  const donoUpper = dono.toUpperCase();
  
  let acao = "";
  let prazo = "";

  if (donoUpper.includes("IMPORTADO") || donoUpper.includes("EXTERNO") || donoUpper.includes("CHINA")) {
    acao = "Emitir **SCAR** (Notificação) via IQC/Compras e bloquear/segregar lotes em trânsito.";
    prazo = "Notificação em 24h | Plano 8D em 7 a 14 dias.";
  } 
  else if (donoUpper.includes("NACIONAL") || donoUpper.includes("LOCAL")) {
    acao = "Acionar **Qualidade Fornecedor (CQF)** para triagem conjunta e devolução de lote.";
    prazo = "Resposta e contenção em 48h.";
  } 
  else if (donoUpper.includes("FORNECEDOR")) {
    acao = "Notificar fornecedor com evidências (fotos/laudos) e solicitar contenção nos próximos envios.";
    prazo = "Contenção em 48h.";
  } 
  else {
    // Escopo Interno (Processo / Manufatura / Liderança)
    acao = isPiorando 
      ? "Abertura de **Relatório 8D** imediato para contenção (Problema em ascensão)." 
      : "Revisão do **FMEA de Processo** e Padrão de Trabalho (Falha crônica).";
    prazo = "Contenção no turno atual (Máx. 24h).";
  }

  // ==========================================
  // 4. ÍCONES SVG INLINE
  // ==========================================
  const svgStyle = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px; color: #94a3b8;"';
  
  const iconTarget = `<svg xmlns="http://www.w3.org/2000/svg" ${svgStyle}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
  const iconTool = `<svg xmlns="http://www.w3.org/2000/svg" ${svgStyle}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  const iconClock = `<svg xmlns="http://www.w3.org/2000/svg" ${svgStyle}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  // ==========================================
  // 5. RETORNO DO CARD RESTRUTURADO
  // ==========================================
  // Usamos formatação contínua com bold para destacar os campos-chave no React sem quebrar o layout
  const descricao = `O defeito "${defeito.nome}" sozinho representou **${paretoPerc.toFixed(1)}%** de todas as perdas do período (${fmt(defeito.ocorrencias)} peças).<br/><br/>` +
                    `${iconTarget} **Dono Sugerido:** ${dono}<br/>` +
                    `${iconTool} **Ação:** ${acao}<br/>` +
                    `${iconClock} **Prazo Sugerido:** ${prazo}`;

  return {
    tipo: "CRITICO",
    titulo: "Ação Imediata (Top Ofensor)",
    descricao: descricao,
    score: 90 
  };
}