import { ProducaoRaw } from "@/core/data/loadProducao";
import { DefeitoFiltrado } from "./diagnosticoFilterEngine";
import { parseDateSafe } from "@/core/ppm/ppmDateUtils";
import { norm } from "./diagnosticoUtils";

export interface TrendAlert {
  agrupamento: string;
  ppmAtual: number;
  
  // ✅ Novos campos para o Diagnóstico de IA detalhado
  ppmInicial: number;
  ppmFinal: number;
  
  // ✅ NOVOS CAMPOS: Quantidades absolutas
  qtdInicial: number;
  qtdFinal: number;

  crescimentoPercentual: number; // Quanto cresceu do mês 1 para o 3
  mesesCrescimento: number; // 3 meses consecutivos
}

export function calcularTendenciaPpm(
  defeitos: DefeitoFiltrado[], // Defeitos já filtrados pelo range histórico
  producaoRaw: ProducaoRaw[],
  agrupamentoAnalise: { ANALISE: string; AGRUPAMENTO: string }[],
  filtrosAtivos: { modelo?: string[]; categoria?: string[] }
): TrendAlert[] {
  console.log("📈 [TREND ENGINE] Calculando tendências de PPM...");

  // 1. Mapeamento de Agrupamento
  const mapAgrupamento = new Map<string, string>();
  agrupamentoAnalise.forEach((r) => {
    mapAgrupamento.set(norm(r.ANALISE), norm(r.AGRUPAMENTO));
  });

  // 2. Preparar Dados por Mês (Chave: "ANO-MES")
  const timeline = new Map<string, { producao: number; defeitos: Map<string, number> }>();

  // Helper para chave de data
  const getKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`;

  // --- PROCESSAR PRODUÇÃO ---
  producaoRaw.forEach((p) => {
    if (filtrosAtivos.modelo && !filtrosAtivos.modelo.includes(norm(p.MODELO))) return;
    if (filtrosAtivos.categoria && !filtrosAtivos.categoria.includes(norm(p.CATEGORIA))) return;

    const date = parseDateSafe(p.DATA);
    if (!date) return;

    const key = getKey(date);
    if (!timeline.has(key)) timeline.set(key, { producao: 0, defeitos: new Map() });
    
    timeline.get(key)!.producao += p.QTY_GERAL;
  });

  // --- PROCESSAR DEFEITOS ---
  defeitos.forEach((d) => {
    const key = getKey(d.DATA);
    if (!timeline.has(key)) timeline.set(key, { producao: 0, defeitos: new Map() });

    const ref = timeline.get(key)!;
    const grupo = mapAgrupamento.get(d.ANALISE) ?? "NÃO CLASSIFICADO";
    
    ref.defeitos.set(grupo, (ref.defeitos.get(grupo) || 0) + d.QUANTIDADE);
  });

  // 3. Identificar os 3 meses mais recentes presentes nos dados
  const chavesOrdenadas = [...timeline.keys()].sort((a, b) => {
    const [yA, mA] = a.split("-").map(Number);
    const [yB, mB] = b.split("-").map(Number);
    return yA - yB || mA - mB;
  });

  if (chavesOrdenadas.length < 3) {
    console.log("   ⚠️ Histórico insuficiente para tendência (min 3 meses).");
    return [];
  }

  const ultimos3Meses = chavesOrdenadas.slice(-3); // Pega os 3 últimos
  const [mes1, mes2, mes3] = ultimos3Meses;

  // 4. Calcular PPM e Verificar Tendência
  const alertas: TrendAlert[] = [];
  const gruposDisponiveis = new Set<string>();
  
  ultimos3Meses.forEach(m => {
      timeline.get(m)?.defeitos.forEach((_, grupo) => gruposDisponiveis.add(grupo));
  });

  gruposDisponiveis.forEach(grupo => {
      const dadosM1 = timeline.get(mes1)!;
      const dadosM2 = timeline.get(mes2)!;
      const dadosM3 = timeline.get(mes3)!;

      // Captura Quantidades Absolutas
      const qtd1 = dadosM1.defeitos.get(grupo) || 0;
      const qtd2 = dadosM2.defeitos.get(grupo) || 0;
      const qtd3 = dadosM3.defeitos.get(grupo) || 0;

      // PPM = (Defeitos / Produção) * 1.000.000
      const ppm1 = dadosM1.producao > 0 ? (qtd1 / dadosM1.producao) * 1000000 : 0;
      const ppm2 = dadosM2.producao > 0 ? (qtd2 / dadosM2.producao) * 1000000 : 0;
      const ppm3 = dadosM3.producao > 0 ? (qtd3 / dadosM3.producao) * 1000000 : 0;

      // 🛑 LÓGICA DE TENDÊNCIA FLEXÍVEL (ZIG-ZAG PERMITIDO)
      // Antes exigíamos: ppm3 > ppm2 && ppm2 > ppm1 (Escadinha perfeita)
      // Agora exigimos:
      // 1. O final (3) deve ser maior que o começo (1) -> Crescimento no período
      // 2. O final (3) deve ser maior que o meio (2) -> Garante que o problema não foi resolvido no fim
      
      const cresceuPontaAPonta = ppm3 > ppm1;
      const cresceuNoFinal = ppm3 > ppm2;

      if (cresceuPontaAPonta && cresceuNoFinal) {
          
          // ✅ 2. Régua de Corte (Filtro de Ruído): PPM Final deve ser relevante (> 100)
          if (ppm3 > 100) {
              
              const crescimentoTotal = ppm1 > 0 
                ? ((ppm3 - ppm1) / ppm1) * 100 
                : 100;

              alertas.push({
                  agrupamento: grupo,
                  ppmAtual: ppm3, 
                  
                  ppmInicial: ppm1,
                  ppmFinal: ppm3,

                  qtdInicial: qtd1,
                  qtdFinal: qtd3,
                  
                  crescimentoPercentual: crescimentoTotal,
                  mesesCrescimento: 3
              });
          }
      }
  });

  // Retorna ordenado pelo MAIOR DELTA ABSOLUTO para priorizar os maiores problemas
  return alertas.sort((a, b) => (b.ppmFinal - b.ppmInicial) - (a.ppmFinal - a.ppmInicial));
}