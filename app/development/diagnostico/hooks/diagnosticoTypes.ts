/* ======================================================
   TIPOS OFICIAIS — DIAGNÓSTICO DE IA
   (CONTRATO ÚNICO DO SISTEMA)
====================================================== */

/* =========================
   PRINCIPAL CAUSA
========================= */
export interface PrincipalCausa {
  nome: string;
  ocorrencias: number;
}

/* =========================
   PRINCIPAL DEFEITO
========================= */
export interface PrincipalDefeito {
  nome: string;
  ocorrencias: number;
  // ✅ ADICIONADO: Responsabilidade deduzida do banco para prescrição inteligente
  responsabilidade?: string; 
}

/* =========================
   DEFEITO CRÍTICO (NPR)
========================= */
export interface DefeitoCritico {
  codigo: string;
  descricao: string;
  npr: number;
}

/* =========================
   STATUS GERAL
========================= */
export interface StatusGeral {
  nivel: "ok" | "alerta" | "critico";
  mensagem: string;
  nprReferencia: number;
}

/* =========================
   DEFEITOS CRÍTICOS (TOP 5)
========================= */
export interface DefeitoCriticoDetalhado {
  codigo: string;
  descricao: string;
  severidade: number;
  ocorrencia: number;
  deteccao: number;
  npr: number;
}

/* =========================
   PRINCIPAIS CAUSAS (TOP 3)
========================= */
export interface CausaCritica {
  nome: string;
  ocorrencias: number;
  detalhes?: {
    nome: string;
    ocorrencias: number;
    modelos?: {
        nome: string;
        ocorrencias: number;
    }[];
  }[];
}

/* =========================
   INPUT DO MOTOR DE IA
========================= */
export interface DiagnosticoAiInput {
  periodoAtual: {
    semanaInicio: number;
    semanaFim: number;
    principalCausa: PrincipalCausa;
    principalDefeito: PrincipalDefeito;
    defeitoCritico: DefeitoCritico;
  };
  
  ppmContext: {
    atual: number;    
    anterior: number; 
    producaoAtual: number;
  };

  analiseSustentacao?: {
      nome: string;   
      ppmT: number;   
      ppmT1: number;  
      ppmT2: number; 
      qtdT: number;   
      qtdT1: number;  
      qtdT2: number;
      // ✅ NOVOS CAMPOS: Labels para texto humanizado (ex: "Fevereiro", "Semana 41")
      labelT1?: string; 
      labelT2?: string;  
  };

  mudancaBrusca?: {
      nome: string;
      ppmAtual: number;
      ppmAnterior: number;
      delta: number;
      // ✅ ADICIONADO: Histórico de dados em array para suportar gráficos nos cards
      historico?: number[]; 
  } | null;

  reincidencia?: {
    isReincidente: boolean;         
    periodosConsecutivos: number;   
    principalCausaAnterior: string; 
    // ✅ ADICIONADO: Suporte para detecção de migração de falha (DNA do defeito)
    principalDefeitoAnterior?: string; 
  };

  contexto?: {
    turnoMaisAfetado?: string;
    modeloMaisAfetado?: string;
    tendenciasAlertas?: {
        agrupamento: string;
        crescimento: number;
        ppmInicial: number;
        ppmFinal: number;
        qtdInicial: number;
        qtdFinal: number;
    }[];
  };
}

/* =========================
   ✅ NOVO: CARD DE INSIGHT
========================= */
export type InsightTipo = "CRITICO" | "ALERTA" | "MELHORIA" | "INFO";

export interface InsightCard {
    tipo: InsightTipo;
    titulo: string;
    descricao: string;
    score: number; // Para ordenação (Quanto maior, mais no topo)
    
    // ✅ ADICIONADO: Propriedades visuais do mini gráfico (Sparkline)
    chartData?: number[];
    chartType?: "line" | "bar";
}

/* =========================
   SAÍDA DE TEXTO DA IA (ATUALIZADA)
========================= */
export interface DiagnosticoIaTexto {
  titulo: string;
  
  // ✅ Agora temos um resumo narrativo separado dos cards
  resumoGeral: string; 
  
  // ✅ Lista estruturada de cards
  insights: InsightCard[];

  tendencia?: "melhora" | "piora" | "estavel" | "indefinido";
  variacaoPercentual?: number;
  indicadoresChave: string[];
}

/* =========================
   RESPONSE FINAL DA API
========================= */
export interface DiagnosticoIaResponse {
  principalCausa: PrincipalCausa;
  principalDefeito: PrincipalDefeito;
  defeitoCritico: DefeitoCritico;
  statusGeral: StatusGeral;

  defeitosCriticos: DefeitoCriticoDetalhado[];
  principaisCausas: CausaCritica[];

  diagnosticoIa: DiagnosticoIaTexto;
}