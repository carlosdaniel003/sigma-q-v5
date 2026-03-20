// app/api/importar-massa/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // 1. Caminhos dinâmicos baseados na raiz do projeto atual (V4)
    const excelPath = path.join(process.cwd(), "public", "suporte", "lotes_ignorados.xlsx");
    const jsonPath = path.join(process.cwd(), "lotes_ignorados.json");

    // 2. Verifica se o arquivo Excel realmente existe
    if (!fs.existsSync(excelPath)) {
      return NextResponse.json(
        { erro: `Arquivo não encontrado no caminho: ${excelPath}` },
        { status: 404 }
      );
    }

    // 🔥 O SEGREDO AQUI: Lemos o arquivo como Buffer pelo Node.js primeiro
    // Isso evita o erro "Cannot access file" da biblioteca XLSX no Windows
    const fileBuffer = fs.readFileSync(excelPath);
    
    // Passamos o buffer para a biblioteca XLSX processar
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; 
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 3. Extrai os IDs (Atenção ao nome exato da coluna: "ID SQL")
    const novosIgnorados = rawData
      .filter((row: any) => row["ID SQL"] != null)
      .map((row: any) => ({
        id: String(row["ID SQL"]).trim(),
        motivo: "Importação em massa (Excel Suporte)",
        usuario: "Admin"
      }));

    if (novosIgnorados.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum dado encontrado. A coluna se chama exatamente 'ID SQL' na primeira linha do Excel?" },
        { status: 400 }
      );
    }

    // 4. Puxa os ignorados atuais do JSON (para não deletar o que já foi ignorado manualmente)
    let listaAtual: any[] = [];
    if (fs.existsSync(jsonPath)) {
      const fileData = fs.readFileSync(jsonPath, "utf-8");
      if (fileData.trim() !== "") {
        listaAtual = JSON.parse(fileData);
      }
    }

    // 5. Mescla os dados ignorando duplicatas (para evitar um arquivo gigante)
    const mapaAtual = new Map(listaAtual.map((item) => [String(item.id), item]));
    
    let adicionados = 0;
    novosIgnorados.forEach((novoItem) => {
      if (!mapaAtual.has(novoItem.id)) {
        mapaAtual.set(novoItem.id, novoItem);
        adicionados++;
      }
    });

    const listaFinal = Array.from(mapaAtual.values());

    // 6. Salva a nova lista fundida de volta no arquivo json
    fs.writeFileSync(jsonPath, JSON.stringify(listaFinal, null, 2), "utf-8");

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: "Importação concluída com sucesso! 🚀",
      novos_adicionados: adicionados,
      total_geral_ignorados: listaFinal.length 
    });

  } catch (error: any) {
    console.error("Erro na importação:", error);
    return NextResponse.json({ erro: "Falha catastrófica", detalhes: error.message }, { status: 500 });
  }
}