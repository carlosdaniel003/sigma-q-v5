// app/development/validacao-dados/gestao-lotes/components/BotaoExportarExcel.tsx
import React from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface BotaoExportarExcelProps {
  baseData: any[]; // Recebe todos os dados da produção
  activeTab: string;
}

export default function BotaoExportarExcel({ baseData, activeTab }: BotaoExportarExcelProps) {
  const isDisabled = !baseData || baseData.length === 0;

  const handleExportXLSX = () => {
    if (isDisabled) return;

    // 1. Mapeamos os dados usando baseData para pegar toda a informação
    const dataToExport = baseData.map((item: any) => {
      // 🔥 TRATAMENTO DE DATA PARA O EXCEL:
      // Converte para objeto Date real para que o Excel habilite o filtro cronológico.
      let dataExcel: any = "";
      if (item.DATA) {
        const d = new Date(item.DATA);
        if (!isNaN(d.getTime())) {
          // Ajustamos para o meio-dia (UTC) para evitar que o fuso horário (ex: Brasil -3h) 
          // jogue a data para o dia anterior acidentalmente no Excel.
          dataExcel = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
        } else {
          dataExcel = item.DATA;
        }
      }

      return {
        "ID SQL": item.id || "",
        "Data": dataExcel, // Enviando o objeto Date puro
        "Hora": item.HORA || "",
        "Quantidade": parseFloat(String(item.QUANTIDADE || "0").replace(",", ".")),
        "Modelo (MAKTX)": item.MAKTX || "",
        "MATNR": item.MATNR || "",
        "Categoria": item.CATEGORIA_INFERIDA || "",
        "Tipo Prod.": item.TIPO_PROD || "",
        "Fábrica": item.FABRICA || "",
        "Tipo Mov.": item.TIPO_MOV || "",
        "Status": activeTab === "ativos" ? "ATIVO" : "OCULTO",
        "Motivo (se oculto)": item.motivo_ignorado || ""
      };
    });

    // 2. Cria a folha de cálculo informando à biblioteca que temos Datas Nativas
    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { cellDates: true, dateNF: "dd/mm/yyyy" });

    // 🔥 FORÇAR MÁSCARA BRASILEIRA NO EXCEL
    // Percorremos a coluna B (índice 1 -> c: 1) que é a nossa coluna "Data" 
    // e garantimos que o Excel exiba no formato brasileiro.
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ c: 1, r: R }); // Coluna 1 = B
        const cell = worksheet[cellAddress];
        if (cell && (cell.t === 'd' || cell.t === 'n')) {
          cell.z = "dd/mm/yyyy";
        }
      }
    }

    // 3. Ajustar largura das colunas na ordem correta
    const wscols = [
      { wch: 10 }, // ID SQL
      { wch: 12 }, // Data
      { wch: 10 }, // Hora
      { wch: 12 }, // Quantidade
      { wch: 45 }, // Modelo
      { wch: 15 }, // MATNR
      { wch: 15 }, // Categoria
      { wch: 15 }, // Tipo Prod
      { wch: 10 }, // Fábrica
      { wch: 15 }, // Tipo Mov
      { wch: 12 }, // Status
      { wch: 30 }, // Motivo
    ];
    worksheet["!cols"] = wscols;

    // 4. Cria o Livro (Workbook) e anexa a folha
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gestão de Lotes");

    // 5. Exporta para o ficheiro final com a data de hoje
    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `SIGMA_Lotes_${activeTab}_${dataAtual}.xlsx`);
  };

  return (
    <button 
      onClick={handleExportXLSX} 
      className="gl-btn gl-btn-export" 
      disabled={isDisabled}
      style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? "not-allowed" : "pointer" }}
      title="Exportar dados para Excel (.xlsx)"
    >
      <Download size={18} /> Exportar Excel
    </button>
  );
}