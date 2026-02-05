import { NextRequest, NextResponse } from "next/server";

import { loadProductionRaw } from "@/core/ppm/ppmProductionNormalizer";
import { loadDefectsRaw } from "@/core/ppm/ppmDefectsNormalizer";

import { runPpmEngine } from "@/core/ppm/ppmEngine";
import { calculatePpmMonthlyTrend } from "@/core/ppm/ppmMonthlyTrend";
import { calculateResponsabilidadeMensal } from "@/core/ppm/ppmResponsabilidadeMensal";
import { calculateCategoriaMensal } from "@/core/ppm/ppmCategoriaMensal";

// ENGINE DE TENDÊNCIA HIERÁRQUICA
import { calculateTrendHierarchy } from "@/core/dashboard/dashboardTrendEngine";

// ENGINE DE CAUSAS (RANKING)
import { calculateCausesRanking } from "@/core/dashboard/dashboardCausesEngine";

// ✅ ENGINE DE DETALHAMENTO (TOP 3 POR TURNO)
import { calculateDetailsRanking } from "@/core/dashboard/dashboardDetailsEngine";

function norm(val: any) {
  return String(val ?? "").trim().toUpperCase();
}

function extractDateIso(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000) + (12 * 3600 * 1000));
        return date.toISOString().split('T')[0];
    }
    
    if (typeof val === 'string') {
        const matchBr = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (matchBr) {
             const d = new Date(parseInt(matchBr[3]), parseInt(matchBr[2])-1, parseInt(matchBr[1]), 12, 0, 0);
             return d.toISOString().split('T')[0];
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
}

function parseDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        return new Date(Math.round((val - 25569) * 86400 * 1000) + (12 * 3600 * 1000));
    }
    if (typeof val === 'string') {
        const matchBr = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (matchBr) {
             return new Date(parseInt(matchBr[3]), parseInt(matchBr[2])-1, parseInt(matchBr[1]), 12, 0, 0);
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

function getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}

const VALID_RESP = new Set(["FORN. IMPORTADO", "FORN. LOCAL", "PROCESSO", "PROJETO"]);
const VALID_CAT = new Set(["BBS", "CM", "TV", "MWO", "TW", "TM", "ARCON", "NBX"]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const getMultiFilter = (key: string) => {
        const allValues = searchParams.getAll(key);
        if (!allValues || allValues.length === 0) return null;
        const flatValues = allValues.flatMap(v => v.split(','));
        const cleanValues = flatValues.map(v => norm(v)).filter(v => v && v !== "TODOS");
        return cleanValues.length > 0 ? cleanValues : null;
    };

    const filterCategoria = getMultiFilter("categoria");
    const filterModelo = getMultiFilter("modelo");
    const filterResponsabilidade = getMultiFilter("responsabilidade");
    const filterTurno = getMultiFilter("turno");
    const filterDia = searchParams.get("dia");
    
    const filterMes = searchParams.get("mes") ? parseInt(searchParams.get("mes")!) : null;
    const filterAno = searchParams.get("ano") ? parseInt(searchParams.get("ano")!) : null;
    const filterSemana = searchParams.get("semana") ? parseInt(searchParams.get("semana")!) : null;

    let productionRaw = loadProductionRaw();
    let defectsRaw = loadDefectsRaw();

    // SANITIZAÇÃO
    defectsRaw = defectsRaw.filter((row: any) => {
        const resp = norm(row.RESPONSABILIDADE || row.Responsabilidade);
        const cat = norm(row.CATEGORIA || row.Categoria);
        const mod = row.MODELO || row.Modelo; 
        if (!resp || !cat || !mod) return false;
        if (!VALID_RESP.has(resp)) return false;
        if (!VALID_CAT.has(cat)) return false;
        return true;
    });

    // ✅ FUNÇÃO DE FILTRO EVOLUÍDA
    // isStrictDay: Se verdadeiro, filtra o dia exato. Se falso, ignora o filtro de dia (para tendência).
    const applyFilters = (data: any[], isDefect: boolean, applyTime: boolean, isStrictDay: boolean = true) => {
        return data.filter(row => {
            const r = row as any;
            const cat = norm(r.CATEGORIA || r.Categoria);
            const mod = norm(r.MODELO || r.Modelo);
            const turno = r.TURNO || r.Turno || r.turno ? norm(r.TURNO || r.Turno || r.turno) : null;
            const resp = isDefect ? norm(r.RESPONSABILIDADE || r.Responsabilidade) : null;
            const dataRow = r.DATA || r.Data || r.data || r.date;
            const dataObj = parseDate(dataRow);

            if (filterCategoria && !filterCategoria.includes(cat)) return false;
            if (filterModelo && !filterModelo.includes(mod)) return false;
            if (filterTurno && turno && !filterTurno.includes(turno)) return false;
            
            if (isDefect && filterResponsabilidade && resp) {
                 if (!filterResponsabilidade.includes(resp)) return false;
            }

            // ✅ Lógica de Dia: Só bloqueia se isStrictDay for true
            if (isStrictDay && filterDia) {
                const isoRow = extractDateIso(dataRow);
                if (isoRow !== filterDia) return false;
            }

            if (applyTime) {
                if (dataObj) {
                    const anoObj = dataObj.getFullYear();
                    const mesObj = dataObj.getMonth() + 1;
                    
                    if (filterAno && anoObj !== filterAno) return false;
                    // Se for semana, ignoramos o filtro de mês para não quebrar semanas que cruzam meses
                    if (filterMes && mesObj !== filterMes && !filterSemana) return false;
                    
                    if (filterSemana) {
                        const semObj = getWeekNumber(dataObj);
                        if (semObj !== filterSemana) return false;
                    }
                } else {
                    if (filterAno || filterMes || filterSemana) return false;
                }
            }

            return true;
        });
    };

    // 1. Dados Recortados (KPIs, Ranking e Detalhes) - Filtra DIA exato
    const productionCut = applyFilters(productionRaw, false, true, true);
    const defectsCut = applyFilters(defectsRaw, true, true, true);

    // 2. Dados Históricos (Gráficos e Tendência) - NÃO filtra dia, para permitir comparação
    const productionFull = applyFilters(productionRaw, false, true, false);
    const defectsFull = applyFilters(defectsRaw, true, true, false);

    /* ======================================================
        MOTORES
    ====================================================== */
    
    // KPIs principais e Ranking baseados no corte rígido (dia selecionado)
    const ppmResult = runPpmEngine(productionCut, defectsCut);
    const { meta, byCategory, allRows } = ppmResult;
    const topCauses = calculateCausesRanking(productionCut, defectsCut);

    // ✅ Detalhamento Top 3 (Baseado no corte rígido para respeitar filtros)
    const details = calculateDetailsRanking(productionCut, defectsCut);

    // Tendência baseada no contexto amplo (semana/mês completo)
    const ppmMonthlyTrend = calculatePpmMonthlyTrend(productionFull, defectsFull);
    const responsabilidadeMensal = calculateResponsabilidadeMensal(productionFull, defectsFull);
    const categoriaMensal = calculateCategoriaMensal(productionFull, defectsFull);
    const trendData = calculateTrendHierarchy(productionFull, defectsFull);

    return NextResponse.json({
      meta: {
        totalProduction: meta.totalProduction,
        totalDefects: meta.totalDefects,
        ppmGeral: meta.ppmGeral,
        aiPrecision: meta.aiPrecision,
      },
      trendData, 
      topCauses,
      details, // ✅ Adicionado
      ppmMonthlyTrend, responsabilidadeMensal, categoriaMensal,
      byCategory: Object.entries(byCategory).map(([categoria, v]) => ({
          categoria, produzido: v.production, defeitos: v.defects, ppm: v.ppm, aiPrecision: v.aiPrecision, status: v.status,
      })),
      byModel: allRows.map((r) => ({
        categoria: r.categoria, modelo: r.modelo, produzido: r.produzido, defeitos: r.defeitos, ppm: r.ppm, status: r.validationStatus,
      })),
    });

  } catch (err: any) {
    console.error("❌ Dashboard summary error:", err);
    return NextResponse.json({ error: "Erro ao gerar dashboard", details: err?.message }, { status: 500 });
  }
}