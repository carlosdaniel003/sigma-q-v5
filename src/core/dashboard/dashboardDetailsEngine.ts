import { ProductionInputRow, DefectInputRow } from "@/core/ppm/ppmInputTypes";

export interface DetailRow {
  rank: number;
  cod: string;
  falha: string;
  peca: string;
  ref: string;
  analise: string;
  responsabilidade: string;
  modelo: string;
  qtd: number;
  ppm: number;
}

// ✅ Nova interface para o Backend também
export interface ResponsibilityGroup {
  responsibility: string;
  top3: DetailRow[];
}

export interface TurnoStats {
  turno: string;
  producao: number;
  totalDefeitos: number;
  groups: ResponsibilityGroup[]; // ✅ Lista de grupos em vez de top3 plano
}

function norm(val: any) {
  return String(val ?? "").trim().toUpperCase();
}

function normalizeTurno(val: any) {
    const s = String(val ?? "").trim().toUpperCase();
    if (!s || s === "UNDEFINED" || s === "NULL" || s === "") return "GERAL";
    if (s === "C" || s.startsWith("COM") || s.includes("COMERCIAL")) return "COMERCIAL";
    if (s.startsWith("1") || s === "PRIMEIRO") return "1º TURNO";
    if (s.startsWith("2") || s === "SEGUNDO") return "2º TURNO";
    if (s.startsWith("3") || s === "TERCEIRO") return "3º TURNO";
    if (s.includes("ADM")) return "ADM";
    return s;
}

export function calculateDetailsRanking(
  production: ProductionInputRow[],
  defects: DefectInputRow[]
): TurnoStats[] {
  
  // 1. Produção Unificada (para cálculo de PPM)
  let totalPeriodProduction = 0;
  production.forEach(p => {
    const qtd = Number(p.QTY_GERAL ?? (p as any).produzido ?? 0);
    if (!isNaN(qtd)) totalPeriodProduction += qtd;
  });

  // 2. Agrupar Defeitos por Turno -> Assinatura Única
  const turnoDefectMap = new Map<string, Map<string, any>>();
  const turnoTotalDefects = new Map<string, number>();

  defects.forEach(d => {
    const row = d as any;
    const turno = normalizeTurno(row.TURNO || row.Turno);
    if (turno === "GERAL") return;

    const qtd = Number(row.QUANTIDADE ?? 0);
    if (isNaN(qtd) || qtd <= 0) return;

    turnoTotalDefects.set(turno, (turnoTotalDefects.get(turno) || 0) + qtd);

    const cod = norm(row["CÓDIGO DO FORNECEDOR"] || row.CODIGO || "");
    const falha = norm(row["DESCRIÇÃO DA FALHA"] || row.DESCRICAO_DA_FALHA || "");
    const peca = norm(row["PEÇA/PLACA"] || row.PECA_PLACA || "");
    const ref = norm(row["REFERÊNCIA/POSIÇÃO MECÂNICA"] || row.REFERENCIA || "");
    const analise = norm(row.ANALISE || row["ANÁLISE"] || "");
    const resp = norm(row.RESPONSABILIDADE || "OUTROS"); // Garante que tenha algo
    const modelo = norm(row.MODELO || ""); 

    const signature = `${cod}|${falha}|${peca}|${ref}|${analise}|${resp}|${modelo}`;

    if (!turnoDefectMap.has(turno)) {
      turnoDefectMap.set(turno, new Map());
    }

    const groups = turnoDefectMap.get(turno)!;
    if (!groups.has(signature)) {
      groups.set(signature, {
        cod, falha, peca, ref, analise, responsabilidade: resp, modelo, qtd: 0
      });
    }
    groups.get(signature)!.qtd += qtd;
  });

  // 3. Montar Resultado Final com Grupos de Responsabilidade
  const result: TurnoStats[] = [];
  const turnosSorted = Array.from(turnoDefectMap.keys()).sort();

  turnosSorted.forEach(turno => {
    const prod = totalPeriodProduction;
    const totalDef = turnoTotalDefects.get(turno) || 0;
    
    // Objeto temporário para separar por Responsabilidade
    const byResp = new Map<string, any[]>();
    const items = Array.from(turnoDefectMap.get(turno)!.values());

    items.forEach(item => {
        if (!byResp.has(item.responsabilidade)) {
            byResp.set(item.responsabilidade, []);
        }
        byResp.get(item.responsabilidade)!.push(item);
    });

    const groups: ResponsibilityGroup[] = [];

    // Ordena as responsabilidades alfabeticamente ou por volume (aqui alfabética)
    const respSorted = Array.from(byResp.keys()).sort();

    respSorted.forEach(respName => {
        const rows = byResp.get(respName)!;
        
        // Ordena por Quantidade dentro da responsabilidade
        rows.sort((a, b) => b.qtd - a.qtd);

        // Pega Top 3
        const top3: DetailRow[] = rows.slice(0, 3).map((item, index) => ({
            rank: index + 1,
            cod: item.cod,
            falha: item.falha,
            peca: item.peca,
            ref: item.ref,
            analise: item.analise,
            responsabilidade: item.responsabilidade,
            modelo: item.modelo,
            qtd: item.qtd,
            ppm: prod > 0 ? (item.qtd / prod) * 1_000_000 : 0
        }));

        groups.push({
            responsibility: respName,
            top3
        });
    });

    result.push({
        turno,
        producao: prod,
        totalDefeitos: totalDef,
        groups // ✅ Retorna os grupos em vez de lista plana
    });
  });

  return result;
}