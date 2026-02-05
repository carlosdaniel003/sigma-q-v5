import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { ProductionInputRow, DefectInputRow } from "@/core/ppm/ppmInputTypes";

/* ======================================================
   UTILITÁRIOS
====================================================== */
function norm(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function parseData(valor: any): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;

  if (typeof valor === 'number') {
    const date = new Date(Math.round((valor - 25569) * 86400 * 1000));
    date.setHours(date.getHours() + 12); 
    return date;
  }

  if (typeof valor === 'string') {
    const v = valor.trim();
    const matchBr = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchBr) {
      const dia = parseInt(matchBr[1], 10);
      const mes = parseInt(matchBr[2], 10);
      const ano = parseInt(matchBr[3], 10);
      const d = new Date(ano, mes - 1, dia, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getSemanaIso(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function getMonthKey(date: Date) {
  const m = date.getMonth() + 1;
  return `${date.getFullYear()}-${String(m).padStart(2, '0')}`; 
}

/* ======================================================
   CATÁLOGO DE OCORRÊNCIAS
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
  console.warn("⚠️ [TrendEngine] Erro ao carregar catálogo.", err);
}

/* ======================================================
   TIPOS
====================================================== */
export interface TrendItem {
  name: string; 
  label: string; 
  production: number;
  defects: number; 
  ppm: number;
  responsabilidade: Record<string, number>; 
  categoria: Record<string, number>; 
  modelo: Record<string, number>;
  
  abs_responsabilidade: Record<string, number>;
  abs_categoria: Record<string, number>;
  abs_modelo: Record<string, number>;
}

export interface TrendHierarchy {
  monthly: TrendItem[];
  weekly: Record<string, TrendItem[]>; 
  daily: Record<string, TrendItem[]>;  
}

/* ======================================================
   ENGINE
====================================================== */
export function calculateTrendHierarchy(
  producao: ProductionInputRow[], 
  defeitos: DefectInputRow[]
): TrendHierarchy {
  
  const daysMap = new Map<string, any>();

  // 1. Produção
  producao.forEach(p => {
    const row = p as any;
    const rawDate = row.DATA || row.Data || row.data || row.date;
    const data = parseData(rawDate);
    if (!data) return;
    
    const key = formatDateKey(data);
    if (!daysMap.has(key)) daysMap.set(key, createEmptyDay(data));
    const day = daysMap.get(key);
    
    const qtd = Number(row.produzido ?? row.QTY_GERAL ?? row.Qty_Geral ?? row.QUANTIDADE ?? 0);
    if (!isNaN(qtd)) day.production += qtd;
  });

  // 2. Defeitos
  defeitos.forEach(d => {
    const row = d as any;
    
    // Filtro Ocorrências (Catálogo)
    const codigoFornecedor = norm(row["CÓDIGO DO FORNECEDOR"]);
    if (catalogoIgnorarSet.has(codigoFornecedor)) return;

    const rawDate = row.DATA || row.Data || row.data || row.date;
    const data = parseData(rawDate);
    if (!data) return;

    const key = formatDateKey(data);
    if (!daysMap.has(key)) daysMap.set(key, createEmptyDay(data));
    const day = daysMap.get(key);

    const qtd = Number(row.QUANTIDADE ?? row.Quantidade ?? row.defeitos ?? 0);
    
    if (!isNaN(qtd) && qtd > 0) {
        
        // ✅ CORREÇÃO DE CONSISTÊNCIA:
        // Só contabiliza se tiver Responsabilidade E Categoria E Modelo definidos.
        // Isso remove defeitos "fantasmas" (não rotulados) que inflavam o PPM mas não apareciam nos gráficos detalhados.
        
        const rawResp = row.RESPONSABILIDADE || row.Responsabilidade;
        const rawCat = row.CATEGORIA || row.Categoria;
        const rawMod = row.MODELO || row.Modelo;

        // Se algum campo essencial estiver faltando, ignoramos este defeito no cálculo.
        if (!rawResp || !rawCat || !rawMod) {
            return; 
        }

        // Se chegou aqui, o dado é válido ("correspondido")
        day.defects += qtd;

        const resp = norm(rawResp);
        day.abs_responsabilidade[resp] = (day.abs_responsabilidade[resp] || 0) + qtd;

        const cat = norm(rawCat);
        day.abs_categoria[cat] = (day.abs_categoria[cat] || 0) + qtd;

        const mod = norm(rawMod);
        day.abs_modelo[mod] = (day.abs_modelo[mod] || 0) + qtd;
    }
  });

  // 3. Construir Hierarquia
  const hierarchy: TrendHierarchy = { monthly: [], weekly: {}, daily: {} };
  const weeksMap = new Map<string, any>();
  const monthsMap = new Map<string, any>();

  for (const [dayKey, dayData] of daysMap.entries()) {
    const date = dayData.dateObj;
    const weekNum = getSemanaIso(date);
    const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    const monthKey = getMonthKey(date);

    if (!hierarchy.daily[weekKey]) hierarchy.daily[weekKey] = [];
    hierarchy.daily[weekKey].push(finalizeItem(dayKey, dayData.dayLabel, dayData));

    if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, { ...createEmptyDay(date), name: weekKey, parentMonth: monthKey, label: `Semana ${weekNum}` });
    }
    accumulate(weeksMap.get(weekKey), dayData);

    if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, { ...createEmptyDay(date), name: monthKey, label: date.toLocaleString('pt-BR', { month: 'long' }).toUpperCase() });
    }
    accumulate(monthsMap.get(monthKey), dayData);
  }

  // 4. Finalizar
  for (const [weekKey, wData] of weeksMap.entries()) {
      const monthParent = wData.parentMonth;
      if (!hierarchy.weekly[monthParent]) hierarchy.weekly[monthParent] = [];
      hierarchy.weekly[monthParent].push(finalizeItem(weekKey, wData.label, wData));
  }

  for (const [monthKey, mData] of monthsMap.entries()) {
      hierarchy.monthly.push(finalizeItem(monthKey, mData.label, mData));
  }

  // Ordenação
  hierarchy.monthly.sort((a, b) => a.name.localeCompare(b.name));
  Object.keys(hierarchy.weekly).forEach(k => hierarchy.weekly[k].sort((a, b) => a.name.localeCompare(b.name)));
  Object.keys(hierarchy.daily).forEach(k => hierarchy.daily[k].sort((a, b) => a.name.localeCompare(b.name)));

  return hierarchy;
}

// --- Helpers ---

function createEmptyDay(date: Date) {
    return {
        dateObj: date,
        dayLabel: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()+1).padStart(2, '0')}`,
        production: 0,
        defects: 0,
        abs_responsabilidade: {},
        abs_categoria: {},
        abs_modelo: {}
    };
}

function accumulate(target: any, source: any) {
    target.production += source.production;
    target.defects += source.defects;
    
    Object.keys(source.abs_responsabilidade).forEach(k => {
        target.abs_responsabilidade[k] = (target.abs_responsabilidade[k] || 0) + source.abs_responsabilidade[k];
    });
    Object.keys(source.abs_categoria).forEach(k => {
        target.abs_categoria[k] = (target.abs_categoria[k] || 0) + source.abs_categoria[k];
    });
    Object.keys(source.abs_modelo).forEach(k => {
        target.abs_modelo[k] = (target.abs_modelo[k] || 0) + source.abs_modelo[k];
    });
}

function finalizeItem(name: string, label: string, data: any): TrendItem {
    const ppm = data.production > 0 ? (data.defects / data.production) * 1000000 : 0;
    
    const responsabilidadePpm: Record<string, number> = {};
    Object.keys(data.abs_responsabilidade).forEach(k => {
        responsabilidadePpm[k] = data.production > 0 ? (data.abs_responsabilidade[k] / data.production) * 1000000 : 0;
    });

    const categoriaPpm: Record<string, number> = {};
    Object.keys(data.abs_categoria).forEach(k => {
        categoriaPpm[k] = data.production > 0 ? (data.abs_categoria[k] / data.production) * 1000000 : 0;
    });

    const modeloPpm: Record<string, number> = {};
    Object.keys(data.abs_modelo).forEach(k => {
        modeloPpm[k] = data.production > 0 ? (data.abs_modelo[k] / data.production) * 1000000 : 0;
    });

    return {
        name, label, production: data.production, defects: data.defects, ppm,
        responsabilidade: responsabilidadePpm,
        categoria: categoriaPpm,
        modelo: modeloPpm,
        abs_responsabilidade: data.abs_responsabilidade,
        abs_categoria: data.abs_categoria,
        abs_modelo: data.abs_modelo
    };
}