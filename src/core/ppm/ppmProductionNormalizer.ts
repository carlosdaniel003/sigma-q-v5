import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

import { ProductionInputRow } from "./ppmInputTypes";
import { NormalizedProduction } from "./ppmNormalizedTypes";

/* ======================================================
   Utils
====================================================== */
function norm(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function buildGroupKey(row: ProductionInputRow): string {
  const categoria = norm(row.CATEGORIA);
  const modelo = norm(row.MODELO);
  if (!categoria || !modelo) return "";
  return `${categoria}::${modelo}`;
}

/* ======================================================
   🔥 PARSER ROBUSTO DE DATA
====================================================== */
function parseExcelDate(value: any): Date | null {
  if (!value) return null;

  let date: Date | null = null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    date = new Date(value.getTime());
  }
  else if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    date = new Date(excelEpoch.getTime() + value * 86400000);
  }
  else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/[\/\-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      date = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
  }

  if (!date || isNaN(date.getTime())) return null;
  date.setHours(12, 0, 0, 0);
  return date;
}

/* ======================================================
   🔥 LOAD RAW — PRODUÇÃO (Agora com Mapeamento Seguro)
====================================================== */
export function loadProductionRaw(): ProductionInputRow[] {
  const filePath = path.join(
    process.cwd(),
    "public",
    "productions",
    "producao.xlsx"
  );

  if (!fs.existsSync(filePath)) {
    throw new Error("Arquivo producao.xlsx não encontrado");
  }

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows = XLSX.utils.sheet_to_json<any>(sheet);

  // ✅ MAPEAR COLUNAS PARA O PADRÃO DO SISTEMA
  // Procura por variações de nomes comuns no Excel
  return rawRows.map(r => {
      // Tenta achar a quantidade em várias colunas possíveis
      const rawQtd = r.QTY_GERAL ?? r.Qty_Geral ?? r.QUANTIDADE ?? r.Quantidade ?? r.PRODUZIDO ?? r.Produzido ?? 0;
      
      // Tenta achar o turno
      const rawTurno = r.TURNO ?? r.Turno ?? "Geral";

      return {
          DATA: r.DATA || r.Data || r.Date,
          // Normaliza Categoria e Modelo para evitar falhas de case
          MODELO: norm(r.MODELO || r.Modelo),
          CATEGORIA: norm(r.CATEGORIA || r.Categoria),
          TURNO: String(rawTurno).toUpperCase(),
          QTY_GERAL: Number(rawQtd)
      };
  });
}

/* ======================================================
   NORMALIZA PRODUÇÃO (Mantido igual, mas agora recebe dados limpos)
====================================================== */
export function normalizeProductionForPpm(
  rows: ProductionInputRow[]
): NormalizedProduction[] {
  const map = new Map<string, NormalizedProduction>();

  for (const r of rows) {
    const produzido = Number(r.QTY_GERAL) || 0;
    if (produzido <= 0) continue;

    const groupKey = buildGroupKey(r);
    if (!groupKey) continue;

    const dataProducao = parseExcelDate(r.DATA);

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        groupKey,
        categoria: norm(r.CATEGORIA),
        modelo: norm(r.MODELO),
        produzido: 0,
        datasProducao: [],
      });
    }

    const item = map.get(groupKey)!;
    item.produzido += produzido;

    if (dataProducao) {
      item.datasProducao!.push(dataProducao);
    }
  }

  return Array.from(map.values());
}