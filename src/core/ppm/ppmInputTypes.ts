/* ======================================================
   PPM — Tipos de Entrada (RAW)
====================================================== */

export interface ProductionInputRow {
  DATA: any;
  QTY_GERAL: number;
  MODELO: string;
  CATEGORIA: string;
  TURNO?: string; // ✅ Adicionado para suportar a quebra por turno
}

export interface DefectInputRow {
  DATA: any;
  MES?: string;
  SEMANA?: number;
  TURNO?: string;

  CODIGO?: string;
  MODELO: string;
  CATEGORIA: string;

  DESCRICAO_DA_FALHA?: string;
  PECA_PLACA?: string;
  REFERENCIA_POSICAO_MECANICA?: string;
  ANALISE?: string;

  QUANTIDADE: number;

  CLASSIFICACAO_FORNECEDOR?: string;
  RESPONSABILIDADE?: string;
}