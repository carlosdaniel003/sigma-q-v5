// src/core/data/loadProducao.ts
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export interface ProducaoRaw {
  ID_SQL: string; // ✅ Adicionamos o ID para rastreabilidade
  DATA: any;
  MODELO: string;
  CATEGORIA: string;
  TURNO: string; 
  QTY_GERAL: number;
  TIPO_MOV: string;
  FABRICA: string;
  TIPO_PROD: string;
  MATNR: string;
}

const API_PRODUCAO_URL = "http://10.110.100.227/qualitycontrol/SIGMA/teste_integracao/uploads/sigma_producao_api.php";

// Cache global em memória para não sobrecarregar o banco de dados
let CACHE_PRODUCAO: ProducaoRaw[] | null = null;
let ULTIMA_BUSCA = 0;
const TEMPO_CACHE_MS = 0; // 0 para leitura em tempo real sempre

/* ======================================================
   🧠 INFERÊNCIA INTELIGENTE DE CATEGORIA
====================================================== */
function inferirCategoria(modelo: string, fallbackCategoriaBruta: string): string {
  const m = String(modelo).toUpperCase();

  if (m.includes("TM-1200")) return "TM";
  if (m.includes("AWS-BBS") || m.includes("BBS-01") || m.includes("BOOMBOX")) return "BBS";
  if (m.includes("CM-1000") || m.includes("CM-300") || m.includes("CM-650") || m.includes("CAIXA AMPLIFICADA CM")) return "CM";
  if (m.includes("MO-01") || m.includes("MO-02") || m.includes("MICRO-ONDAS") || m.includes("MICRO ONDAS")) return "MWO";
  if (m.includes("AWS-T2W") || m.includes("T2W-02") || m.includes("AWS-T1W") || m.includes("T1W-02") || m.includes("TORRE DE SOM AWS-T")) return "TW";

  if (m.includes("TV") || m.includes("TELEVISOR")) return "TV";
  if (m.includes("AR CONDICIONADO") || m.includes("SPLIT") || m.includes("CONDENSADOR") || m.includes("EVAPORADOR")) return "ARCON";
  if (m.includes("PLACA") || m.includes("PCI") || m.includes("PCBA")) return "HW";

  return String(fallbackCategoriaBruta || "").trim().toUpperCase();
}

/* ======================================================
   ⏰ INFERÊNCIA INTELIGENTE DE TURNO (COM MINUTOS)
====================================================== */
function inferirTurno(horaStr: string): string {
  if (!horaStr || horaStr === "00:00:00" || horaStr.trim() === "") {
     return "C"; 
  }

  const partes = horaStr.split(":");
  const horas = parseInt(partes[0], 10);
  const minutos = parseInt(partes[1], 10);

  if (isNaN(horas) || isNaN(minutos)) return "C";

  const minutoDoDia = (horas * 60) + minutos;

  const INICIO_COMERCIAL = 405; // 06:45
  const FIM_COMERCIAL = 1005;   // 16:45

  if (minutoDoDia >= INICIO_COMERCIAL && minutoDoDia < FIM_COMERCIAL) {
      return "C"; 
  } else {
      return "2"; 
  }
}

/* ======================================================
   🔥 LER LISTA NEGRA (Lotes Ignorados)
====================================================== */
function getIgnoredIds(): Set<string> {
  const ignoradosIds = new Set<string>();
  try {
    // Tenta ler o arquivo local apenas se estiver a rodar no servidor
    if (typeof window === "undefined") {
      const filePath = path.join(process.cwd(), "lotes_ignorados.json");
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, "utf-8");
        const ignoradosList = JSON.parse(fileData);
        ignoradosList.forEach((i: any) => ignoradosIds.add(String(i.id)));
      }
    }
  } catch (e) {
    console.error("Erro ao ler lotes_ignorados.json no loadProducao:", e);
  }
  return ignoradosIds;
}

export async function loadProducao(): Promise<ProducaoRaw[]> {
  const agora = Date.now();
  
  if (CACHE_PRODUCAO && (agora - ULTIMA_BUSCA < TEMPO_CACHE_MS)) {
      return CACHE_PRODUCAO;
  }

  try {
    const urlComBuster = `${API_PRODUCAO_URL}?t=${agora}`;
    const response = await fetch(urlComBuster, {
        cache: "no-store",
        next: { revalidate: 0 },
        headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
        }
    });

    if (!response.ok) {
        throw new Error(`Erro na API PHP de Produção: ${response.status}`);
    }

    const rawData: any[] = await response.json();

    if (!Array.isArray(rawData)) {
        console.error("❌ Resposta da API de produção não é um array:", rawData);
        return [];
    }

    // 🚀 Carrega os IDs que devem ser banidos do sistema
    const ignoradosIds = getIgnoredIds();

    // 🛡️ FILTRO: REMOVE IGNORADOS + FILTRA ANO 2026 E DATA + APENAS FAB1
    const filteredData = rawData.filter((r) => {
      // 1. O Filtro Mágico: Se estiver na lista negra, ignora e não entra na conta!
      if (ignoradosIds.has(String(r.id))) return false;

      // 🔥 2. NOVO FILTRO: Garante que apenas FAB1 seja processada
      if (String(r.FABRICA || "").trim().toUpperCase() !== "FAB1") return false;

      // 3. Filtro normal de Data / 2026
      let dataObj: Date | null = null;
      if (r.DATA) {
         const dateStr = String(r.DATA).trim().split(" ")[0];
         dataObj = new Date(`${dateStr}T12:00:00`); 
      }

      if (!dataObj || isNaN(dataObj.getTime())) return false;
      return dataObj.getFullYear() === 2026;
    });

    const discarded = rawData.length - filteredData.length;
    if (discarded > 0) {
        // eslint-disable-next-line no-console
        console.log(`🧹 [LoadProducao] ${discarded} registros filtrados (Data, Ignorados ou FAB2). Mantidos: ${filteredData.length}`);
    }

    // ======================================================
    // 🧠 DE-PARA: COLUNAS SQL (SAP) -> CONTRATO SIGMA-Q
    // ======================================================
    const dadosMapeados: ProducaoRaw[] = filteredData.map((r) => {
      
      let rawQtd = String(r.QUANTIDADE || "0").trim();
      if (rawQtd.includes(",")) {
          rawQtd = rawQtd.replace(/\./g, "").replace(",", ".");
      }
      let qtdReal = Number(rawQtd);
      if (isNaN(qtdReal)) qtdReal = 0;

      const modeloNome = String(r.MAKTX || "").trim().toUpperCase();
      const dateStr = String(r.DATA).trim().split(" ")[0];
      const horaStr = String(r.HORA || "").trim();
      
      const turnoCalculado = inferirTurno(horaStr);

      return {
        ID_SQL: String(r.id || ""), // ✅ Guardando o ID original
        DATA: new Date(`${dateStr}T12:00:00`), 
        MODELO: modeloNome,
        CATEGORIA: inferirCategoria(modeloNome, r.CATEGORIA), 
        TURNO: turnoCalculado, 
        QTY_GERAL: qtdReal,
        TIPO_MOV: String(r.TIPO_MOV || "").trim(),
        FABRICA: String(r.FABRICA || "").trim(),
        TIPO_PROD: String(r.TIPO_PROD || "").trim(),
        MATNR: String(r.MATNR || "").trim(),
      };
    });

    CACHE_PRODUCAO = dadosMapeados;
    ULTIMA_BUSCA = Date.now();

    return dadosMapeados;

  } catch (error) {
    console.error("❌ Erro ao carregar produção do SQL:", error);
    if (CACHE_PRODUCAO) return CACHE_PRODUCAO; 
    return [];
  }
}