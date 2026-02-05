import { norm } from "./diagnosticoUtils";
import { DefeitoFiltrado } from "./diagnosticoFilterEngine";

/* ======================================================
   TIPOS DE SAÍDA (Expandidos para 4 Níveis)
====================================================== */
export interface PrincipalCausaResult {
  nome: string;
  ocorrencias: number;
}

export interface PrincipalDefeitoResult {
  nome: string;
  ocorrencias: number;
}

export interface DefeitoCriticoNprResult {
  codigo: string;
  descricao: string;
  severidade: number;
  ocorrencia: number;
  deteccao: number;
  npr: number;
}

export interface TopCausasAgrupamentoResult {
  nome: string;
  ocorrencias: number;
  scoreRisco: number;
  nprMedio: number;
  // ✅ NÍVEL 2: Análise
  detalhes: {
    nome: string;
    ocorrencias: number;
    // ✅ NÍVEL 3: Modelo
    modelos: {
        nome: string;
        ocorrencias: number;
        // ✅ NÍVEL 4: Posição Mecânica
        posicoes: {
            nome: string;
            ocorrencias: number;
        }[];
    }[]; 
  }[];
}

/* ======================================================
   MOTOR DE AGREGAÇÃO — HIERARQUIA DE 4 NÍVEIS
====================================================== */
export function agruparDiagnostico(
  defeitos: DefeitoFiltrado[],
  agrupamentoAnalise: { ANALISE: string; AGRUPAMENTO: string }[],
  fmea: {
    CÓDIGO: string;
    DESCRIÇÃO: string;
    SEVERIDADE: number;
    OCORRÊNCIA: number;
    DETECÇÃO: number;
    NPR: number;
  }[]
) {
  console.log("🟦 [AGREGAÇÃO] INICIANDO CRUZAMENTO HIERÁRQUICO (4 NÍVEIS)...");

  /* ==============================
      1. MAPAS (Agrupamento e FMEA)
  ================================ */
  const mapAgrupamento = new Map<string, string>();
  agrupamentoAnalise.forEach((r) => {
    const key = norm(r.ANALISE);
    const value = norm(r.AGRUPAMENTO);
    if (key) mapAgrupamento.set(key, value);
  });

  const mapFmea = new Map<string, any>();
  fmea.forEach((r) => {
    if (r.CÓDIGO) mapFmea.set(norm(r.CÓDIGO), r);
    if (r.DESCRIÇÃO) mapFmea.set(norm(r.DESCRIÇÃO), r);
  });

  /* ==============================
      2. CONTAGEM E CLASSIFICAÇÃO
  ================================ */
  const agrupamentoCount = new Map<string, number>();
  const defeitoCount = new Map<string, number>();
  
  // ✅ ESTRUTURA PROFUNDA (4 Níveis):
  // Agrupamento -> Map<Analise, Map<Modelo, Map<Posicao, Qtd>>>
  const hierarquia = new Map<string, Map<string, Map<string, Map<string, number>>>>();

  const defeitosCriticosMap = new Map<string, DefeitoCriticoNprResult>();
  const riscoPorAgrupamento = new Map<string, { ocorrencias: number; scoreRisco: number }>();

  let totalSomado = 0;

  defeitos.forEach((d) => {
    // A. Agrupamento
    const chaveAnalise = d.ANALISE; 
    let agrupamento = mapAgrupamento.get(chaveAnalise);

    if (!agrupamento) {
      agrupamento = "NÃO CLASSIFICADO";
    }

    // B. Extração de Dimensões
    const qtd = d.QUANTIDADE;
    const modelo = d.MODELO || "GERAL"; // Nível 3
    
    // ✅ Nível 4: Posição Mecânica (Corrigido com 'as any' para evitar erro TS 2339)
    const rawRef = (d as any)["REFERÊNCIA/POSIÇÃO MECÂNICA"] || (d as any).REFERENCIA_POSICAO_MECANICA || (d as any)["REFERENCIA/POSICAO MECANICA"] || (d as any)["REFERENCIA"];
    const posicao = rawRef ? norm(rawRef) : "N/A"; 

    totalSomado += qtd;

    // Soma por Grupo (TOTAL REAL)
    agrupamentoCount.set(
      agrupamento,
      (agrupamentoCount.get(agrupamento) || 0) + qtd
    );

    // Soma por Análise (Item Específico)
    defeitoCount.set(
      chaveAnalise,
      (defeitoCount.get(chaveAnalise) || 0) + qtd
    );

    /* -----------------------------------------------------------
       ✅ C. POPULA A ÁRVORE HIERÁRQUICA (Agrup -> Analise -> Modelo -> Posicao)
    ----------------------------------------------------------- */
    if (!hierarquia.has(agrupamento)) {
        hierarquia.set(agrupamento, new Map());
    }
    const nivelAnalise = hierarquia.get(agrupamento)!;

    if (!nivelAnalise.has(chaveAnalise)) {
        nivelAnalise.set(chaveAnalise, new Map());
    }
    const nivelModelo = nivelAnalise.get(chaveAnalise)!;

    if (!nivelModelo.has(modelo)) {
        nivelModelo.set(modelo, new Map());
    }
    const nivelPosicao = nivelModelo.get(modelo)!;

    // Soma a quantidade na folha da árvore (Posição)
    nivelPosicao.set(posicao, (nivelPosicao.get(posicao) || 0) + qtd);


    // D. FMEA Match (Score e Críticos)
    const fmeaItem = mapFmea.get(d.CODIGO_FALHA) || mapFmea.get(d.DESCRICAO_FALHA);

    if (fmeaItem && fmeaItem.NPR > 0) {
        const key = `${fmeaItem.CÓDIGO}|${fmeaItem.DESCRIÇÃO}`;
        
        if (!defeitosCriticosMap.has(key)) {
          defeitosCriticosMap.set(key, {
            codigo: fmeaItem.CÓDIGO,
            descricao: fmeaItem.DESCRIÇÃO,
            severidade: fmeaItem.SEVERIDADE,
            ocorrencia: fmeaItem.OCORRÊNCIA,
            deteccao: fmeaItem.DETECÇÃO,
            npr: fmeaItem.NPR,
          });
        }

        if (!riscoPorAgrupamento.has(agrupamento)) {
            riscoPorAgrupamento.set(agrupamento, { ocorrencias: 0, scoreRisco: 0 });
        }
        const ref = riscoPorAgrupamento.get(agrupamento)!;
        ref.ocorrencias += qtd;
        ref.scoreRisco += qtd * fmeaItem.NPR;
    }
  });

  /* ==============================
      3. MONTAGEM DOS RESULTADOS
  ================================ */
  
  // Defaults
  const emptyCausa = { nome: "-", ocorrencias: 0 };
  const emptyDefeito = { nome: "-", ocorrencias: 0 };
  const emptyCritico = { codigo: "-", descricao: "-", npr: 0, severidade: 0, ocorrencia: 0, deteccao: 0 };

  const gruposOrdenados = [...agrupamentoCount.entries()].sort((a, b) => b[1] - a[1]);

  // Principal Causa
  const principalCausa: PrincipalCausaResult = gruposOrdenados.length > 0 
    ? { nome: gruposOrdenados[0][0], ocorrencias: gruposOrdenados[0][1] }
    : emptyCausa;

  // Principal Defeito
  const defeitosDoAgrupamento = defeitos.filter((d) => {
      const grupo = mapAgrupamento.get(d.ANALISE) ?? "NÃO CLASSIFICADO";
      return grupo === principalCausa.nome;
  });
  
  const countDefeitosGrupo = new Map<string, number>();
  defeitosDoAgrupamento.forEach(d => {
      countDefeitosGrupo.set(d.ANALISE, (countDefeitosGrupo.get(d.ANALISE) || 0) + d.QUANTIDADE);
  });

  const sortedDefeitosGrupo = [...countDefeitosGrupo.entries()].sort((a, b) => b[1] - a[1]);

  const principalDefeito: PrincipalDefeitoResult = sortedDefeitosGrupo.length > 0 
      ? { nome: sortedDefeitosGrupo[0][0], ocorrencias: sortedDefeitosGrupo[0][1] }
      : emptyDefeito;

  // Defeitos Críticos (TOP 5)
  const defeitosCriticos = [...defeitosCriticosMap.values()]
    .sort((a, b) => b.npr - a.npr)
    .slice(0, 5); 

  const defeitoCritico = defeitosCriticos.length > 0 ? defeitosCriticos[0] : emptyCritico;

  // ✅ TOP CAUSAS (COM ÁRVORE PROFUNDA)
  const topCausas: TopCausasAgrupamentoResult[] = [...riscoPorAgrupamento.entries()]
    .map(([nome, v]) => {
      const totalRealDoGrupo = agrupamentoCount.get(nome) || 0;

      // Recupera a árvore de detalhes deste Agrupamento
      const mapAnalises = hierarquia.get(nome);

      // Converte Map<Analise> -> Array
      const listaAnalises = mapAnalises 
        ? [...mapAnalises.entries()].map(([nomeAnalise, mapModelos]) => {
            
            // Soma total da análise para ordenar
            let totalAnalise = 0;
            
            // Converte Map<Modelo> -> Array
            const listaModelos = [...mapModelos.entries()].map(([nomeModelo, mapPosicoes]) => {
                
                // Soma total do modelo
                let totalModelo = 0;

                // Converte Map<Posicao> -> Array
                const listaPosicoes = [...mapPosicoes.entries()].map(([nomePos, qtdPos]) => {
                    totalModelo += qtdPos;
                    return { nome: nomePos, ocorrencias: qtdPos };
                }).sort((a, b) => b.ocorrencias - a.ocorrencias); // Ordena Posições

                totalAnalise += totalModelo;

                return {
                    nome: nomeModelo,
                    ocorrencias: totalModelo,
                    posicoes: listaPosicoes
                };
            }).sort((a, b) => b.ocorrencias - a.ocorrencias); // Ordena Modelos

            return {
                nome: nomeAnalise,
                ocorrencias: totalAnalise,
                modelos: listaModelos
            };
        }).sort((a, b) => b.ocorrencias - a.ocorrencias) // Ordena Análises
        : [];

      return {
        nome,
        ocorrencias: totalRealDoGrupo, 
        scoreRisco: v.scoreRisco,
        nprMedio: totalRealDoGrupo > 0 ? Number((v.scoreRisco / totalRealDoGrupo).toFixed(1)) : 0,
        detalhes: listaAnalises // ✅ Agora contém a árvore completa
      };
    })
    .sort((a, b) => b.scoreRisco - a.scoreRisco)
    .slice(0, 3); 

  return {
    principalCausa,
    principalDefeito,
    defeitoCritico,
    defeitosCriticos,
    topCausas,
  };
}