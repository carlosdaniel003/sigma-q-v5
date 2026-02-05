import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { ProductionInputRow, DefectInputRow } from "@/core/ppm/ppmInputTypes";

// ✅ NOVA ESTRUTURA: Detalhes do "Campeão"
export interface ContextItem {
  name: string;
  qty: number;
  percent: number; // Ex: 0.55 (55%)
}

// ✅ ESTRUTURA FLEXÍVEL: Suporta qualquer tipo de agrupamento
export interface CauseItem {
  name: string;
  defects: number;
  ppm: number;
  
  // Contextos Dinâmicos (Preenchidos conforme a visão)
  topModel?: ContextItem;    // Sempre útil
  topFailure?: ContextItem;  // Útil para Análise e Posição
  topRef?: ContextItem;      // Útil para Análise e Falha
  topAnalysis?: ContextItem; // ✅ Novo: Útil para Falha e Posição
}

// ✅ RETORNO COMPLETO: As 3 visões prontas
export interface CausesRankingResult {
    byAnalysis: CauseItem[];
    byFailure: CauseItem[];
    byPosition: CauseItem[];
}

function norm(val: any) {
  return String(val ?? "").trim().toUpperCase();
}

/* ======================================================
   CARREGAMENTO DO CATÁLOGO DE EXCLUSÃO (BLACKLIST)
====================================================== */
let catalogoIgnorarSet = new Set<string>();

try {
  const catalogoPath = path.join(
    process.cwd(),
    "app", "development", "catalogo", "data", "catalogo_nao_mostrar_indice.xlsx"
  );

  if (fs.existsSync(catalogoPath)) {
    const buffer = fs.readFileSync(catalogoPath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    catalogoIgnorarSet = new Set(
      rows.map((r) => norm(r["CÓDIGO"] || r["CODIGO"])).filter(Boolean)
    );
  }
} catch (err) {
  console.warn("⚠️ [CausesEngine] Erro ao carregar catálogo.", err);
}

/* ======================================================
   HELPER: Encontrar o "Campeão" de um Mapa
====================================================== */
function getChampion(map: Map<string, number>, totalDefects: number): ContextItem | undefined {
  if (map.size === 0) return undefined;

  let bestName = "";
  let bestQty = 0;

  for (const [name, qty] of map.entries()) {
    if (qty > bestQty) {
      bestQty = qty;
      bestName = name;
    }
  }

  if (bestQty === 0) return undefined;

  return {
    name: bestName,
    qty: bestQty,
    percent: totalDefects > 0 ? (bestQty / totalDefects) : 0
  };
}

/* ======================================================
   CLASSE AUXILIAR PARA ESTATÍSTICAS
   Ajuda a limpar o código do loop principal
====================================================== */
class StatBucket {
    total = 0;
    models = new Map<string, number>();
    failures = new Map<string, number>();
    refs = new Map<string, number>();
    analyses = new Map<string, number>(); // ✅ Novo contexto

    add(qty: number, model: string, failure: string, ref: string, analysis: string) {
        this.total += qty;
        if (model) this.models.set(model, (this.models.get(model) || 0) + qty);
        if (failure) this.failures.set(failure, (this.failures.get(failure) || 0) + qty);
        if (ref) this.refs.set(ref, (this.refs.get(ref) || 0) + qty);
        if (analysis) this.analyses.set(analysis, (this.analyses.get(analysis) || 0) + qty);
    }
}

/* ======================================================
   ENGINE PRINCIPAL
====================================================== */
export function calculateCausesRanking(
  production: ProductionInputRow[],
  defects: DefectInputRow[]
): CausesRankingResult { // ✅ Retorno alterado
  
  // 1. Calcular Produção Total
  let totalProduction = 0;
  production.forEach(p => {
    const qtd = Number(p.QTY_GERAL ?? (p as any).produzido ?? (p as any).QUANTIDADE ?? 0);
    if (!isNaN(qtd)) totalProduction += qtd;
  });

  // Retorno padrão vazio
  const emptyResult = { byAnalysis: [], byFailure: [], byPosition: [] };
  if (totalProduction === 0) return emptyResult;

  // 2. Inicializar os 3 Baldes (Mapas)
  const mapByAnalysis = new Map<string, StatBucket>();
  const mapByFailure = new Map<string, StatBucket>();
  const mapByPosition = new Map<string, StatBucket>();

  // Helper para obter ou criar bucket
  const getBucket = (map: Map<string, StatBucket>, key: string) => {
      if (!map.has(key)) map.set(key, new StatBucket());
      return map.get(key)!;
  };

  // 3. Loop Único (Performance)
  defects.forEach(d => {
    // A. Filtro Catálogo
    const codigo = norm((d as any)["CÓDIGO DO FORNECEDOR"] || d.CODIGO || (d as any).Codigo);
    if (catalogoIgnorarSet.has(codigo)) return;

    const qtd = Number(d.QUANTIDADE ?? 0);
    if (isNaN(qtd) || qtd <= 0) return;

    // B. Extrair TODAS as dimensões (Normalizadas)
    // Análise
    const rawCause = d.ANALISE || (d as any)["ANÁLISE"] || (d as any).Analise || (d as any).analise;
    let analise = rawCause ? norm(rawCause) : "SEM ANÁLISE";
    if (analise === "OK" || analise === "SEM DEFEITO") return; // Ignora OK

    // Modelo
    const modelo = norm(d.MODELO || (d as any)["MODELO"]);

    // Descrição da Falha
    const rawDesc = (d as any)["DESCRIÇÃO DA FALHA"] || d.DESCRICAO_DA_FALHA || (d as any)["DESCRICAO DA FALHA"];
    const falha = norm(rawDesc);

    // Posição Mecânica
    const rawRef = (d as any)["REFERÊNCIA/POSIÇÃO MECÂNICA"] || d.REFERENCIA_POSICAO_MECANICA || (d as any)["REFERENCIA/POSICAO MECANICA"] || (d as any)["REFERENCIA"];
    const posicao = norm(rawRef);

    // C. Preencher os 3 Baldes
    
    // 1. Visão por ANÁLISE (Agrupa por 'analise', guarda falha e posição)
    getBucket(mapByAnalysis, analise).add(qtd, modelo, falha, posicao, ""); // Não precisa guardar analise dentro de analise

    // 2. Visão por FALHA (Agrupa por 'falha', guarda analise e posição)
    if (falha && falha !== "") {
        getBucket(mapByFailure, falha).add(qtd, modelo, "", posicao, analise); 
    }

    // 3. Visão por POSIÇÃO (Agrupa por 'posicao', guarda analise e falha)
    if (posicao && posicao !== "") {
        getBucket(mapByPosition, posicao).add(qtd, modelo, falha, "", analise);
    }
  });

  // 4. Transformar Mapas em Arrays Ordenados
  const buildResult = (map: Map<string, StatBucket>): CauseItem[] => {
      const items: CauseItem[] = [];
      for (const [name, bucket] of map.entries()) {
          items.push({
              name: name,
              defects: bucket.total,
              ppm: (bucket.total / totalProduction) * 1_000_000,
              
              // Estatísticas Cruzadas
              topModel: getChampion(bucket.models, bucket.total),
              topFailure: getChampion(bucket.failures, bucket.total),
              topRef: getChampion(bucket.refs, bucket.total),
              topAnalysis: getChampion(bucket.analyses, bucket.total)
          });
      }
      return items.sort((a, b) => b.ppm - a.ppm).slice(0, 12); // Top 12
  };

  return {
      byAnalysis: buildResult(mapByAnalysis),
      byFailure: buildResult(mapByFailure),
      byPosition: buildResult(mapByPosition)
  };
}