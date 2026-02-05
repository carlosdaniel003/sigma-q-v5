import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

export interface DefeitoRaw {
  DATA: any;
  MODELO: string;
  CATEGORIA: string;
  RESPONSABILIDADE: string;
  TURNO: string;
  ANALISE: string;
  QUANTIDADE: number;
  "CÓDIGO DA FALHA"?: string;
  "DESCRIÇÃO DA FALHA"?: string;
  
  // ✅ CAMPO PARA OCORRÊNCIAS
  "CÓDIGO DO FORNECEDOR"?: string;

  // ✅ NOVO CAMPO: Posição Mecânica (Exatamente como no Excel)
  "REFERÊNCIA/POSIÇÃO MECÂNICA"?: string;
}

export function loadDefeitos(): DefeitoRaw[] {
  const filePath = path.join(
    process.cwd(),
    "public",
    "defeitos",
    "defeitos_produto_acabado.xlsx"
  );

  const buffer = fs.readFileSync(filePath);
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  return XLSX.utils.sheet_to_json(sheet) as DefeitoRaw[];
}