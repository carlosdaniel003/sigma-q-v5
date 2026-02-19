"use client";

import { useState } from "react";
import SidebarFiltros from "./components/SidebarFiltros";
import KpiPrincipalCausa from "./components/KpiPrincipalCausa"; 
import KpiPrincipalDefeito from "./components/KpiPrincipalDefeito"; 
import KpiDefeitoCritico from "./components/KpiDefeitoCritico";
import KpiStatusGeral from "./components/KpiStatusGeral"; 
import DefeitosCriticosNpr from "./components/DefeitosCriticosNpr";
import PrincipaisCausas from "./components/PrincipaisCausas";
import DiagnosticoIaTexto from "./components/DiagnosticoIaTexto";
import DiagnosticoLoading from "./components/DiagnosticoLoading";
import DefectDetailsDrawer from "./components/DefectDetailsDrawer";

import { useDiagnosticoIa } from "./hooks/useDiagnosticoIa";
import { useDiagnosticoFilters } from "./store/diagnosticoFilters"; 

// Importando ícones elegantes para substituir os emojis
import { BarChart3, Award, Lightbulb } from "lucide-react"; 

/* ======================================================
   MÓDULO: MENSAGEM DE "SEM PRODUÇÃO"
====================================================== */
function EmptyProductionState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 24,
        textAlign: "center",
        marginTop: 20,
      }}
    >
      <div style={{ marginBottom: 16, opacity: 0.8 }}>
        <BarChart3 size={48} color="#94a3b8" strokeWidth={1.5} />
      </div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>
        Não houve produção neste período
      </h2>
      <p style={{ maxWidth: 500, color: "#94a3b8", lineHeight: 1.6 }}>
        O sistema não encontrou registros de produção para os filtros selecionados (Categoria/Modelo/Data). 
        Sem produção, não é possível calcular indicadores de qualidade (PPM) ou risco.
      </p>
      <div 
        style={{ 
          marginTop: 24, 
          padding: "8px 16px", 
          background: "rgba(59, 130, 246, 0.1)", 
          color: "#60a5fa", 
          borderRadius: 8, 
          fontSize: "0.9rem",
          fontWeight: 500,
          border: "1px solid rgba(59, 130, 246, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
      >
        <Lightbulb size={16} /> Dica: Tente selecionar um período anterior ou outro modelo.
      </div>
    </div>
  );
}

/* ======================================================
   MÓDULO: MENSAGEM DE "EXCELÊNCIA (ZERO DEFEITOS)"
====================================================== */
function ExcellenceState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)",
        border: "1px solid rgba(16, 185, 129, 0.15)",
        borderRadius: 24,
        textAlign: "center",
        marginTop: 20,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Award size={56} color="#34d399" strokeWidth={1.5} />
      </div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#34d399", marginBottom: 12 }}>
        Excelência em Qualidade
      </h2>
      <div style={{ fontSize: "1.1rem", color: "#e2e8f0", marginBottom: 8 }}>
        Zero Defeitos Registrados
      </div>
      <p style={{ maxWidth: 600, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
        Parabéns! Houve produção registrada para este período, mas <strong>nenhuma falha</strong> foi apontada. 
        O processo demonstrou robustez total nos filtros selecionados.
      </p>
      <div 
        style={{ 
          padding: "6px 16px", 
          background: "rgba(16, 185, 129, 0.15)", 
          color: "#34d399", 
          borderRadius: 20, 
          fontSize: "0.9rem",
          fontWeight: 700, 
          border: "1px solid rgba(16, 185, 129, 0.3)",
          letterSpacing: 0.5
        }}
      >
        PPM 0,00
      </div>
    </div>
  );
}


/* ======================================================
   COMPONENTE PRINCIPAL
====================================================== */
export default function DiagnosticoIaPage() {
  const { data, loading, error } = useDiagnosticoIa();
  const { filters } = useDiagnosticoFilters(); 

  // ✅ ESTADOS DO DRAWER DE DETALHES
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerRows, setDrawerRows] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");

  /* ======================================================
     ✅ LÓGICA DE CLICK ATUALIZADA (3 PARÂMETROS)
  ====================================================== */
  const handleSelectPosition = async (analise: string, modelo: string, posicao: string) => {
    setIsDrawerOpen(true);
    // Título da Gaveta mais rico e claro para o usuário
    setDrawerTitle(`Causa: ${analise} | Mod: ${modelo} | Pos: ${posicao}`);
    setDrawerLoading(true);
    setDrawerRows([]); 

    try {
        const params = new URLSearchParams();
        
        // 1. Filtros de Tempo (respeitando o que o usuário selecionou na sidebar)
        if (filters.periodo.tipo && filters.periodo.valor && filters.periodo.ano) {
            params.set("periodoTipo", filters.periodo.tipo);
            params.set("periodoValor", String(filters.periodo.valor));
            params.set("ano", String(filters.periodo.ano));
        }
        
        // 2. Filtros de Dimensão
        if (filters.turno && filters.turno !== "Todos") params.set("turno", filters.turno);
        if (filters.categoria && filters.categoria !== "Todos") params.set("categoria", filters.categoria);
        
        // 3. Filtros Específicos do Drill-down (Os 3 cliques)
        params.set("analise", analise); // A API agora vai buscar por essa causa exata
        params.set("modelo", modelo);
        params.set("posicao", posicao); 

        // 4. Chamada à API de detalhes
        const res = await fetch(`/api/diagnostico/detalhes?${params.toString()}`);
        
        if (res.ok) {
            const json = await res.json();
            setDrawerRows(json.rows || []);
        } else {
            console.error("❌ Erro ao buscar detalhes técnicos do SQL");
        }
    } catch (err) {
        console.error("❌ Erro no fetch de detalhes:", err);
    } finally {
        setDrawerLoading(false);
    }
  };

  /* ======================================================
      LÓGICA DE ESTADOS ESPECIAIS (IA)
  ====================================================== */
  const tituloIa = data?.diagnosticoIa?.titulo;
  
  const isSemProducao = tituloIa === "Sem Produção Registrada";
  const isZeroDefeitos = tituloIa === "Excelência em Qualidade";

  /* ======================================================
      LAYOUT BASE (COM SIDEBAR)
  ====================================================== */
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 24,
        color: "#fff",
        minHeight: "100vh",
        alignItems: "start",
      }}
    >
      {/* ✅ COMPONENTE DRAWER */}
      <DefectDetailsDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerTitle}
        loading={drawerLoading}
        rows={drawerRows}
      />

      {/* SIDEBAR FIXA A ESQUERDA */}
      <SidebarFiltros />

      {/* ÁREA DE CONTEÚDO */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* CABEÇALHO */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Diagnóstico de IA</h1>
          <p style={{ opacity: 0.7, fontSize: "0.9rem" }}>
            Análise inteligente de falhas e riscos baseada em FMEA e histórico.
          </p>
        </div>

        {/* ESTADOS DE CARREGAMENTO / ERRO / VAZIO */}
        
        {loading && (
            <div style={{ marginTop: 40 }}>
                <DiagnosticoLoading />
            </div>
        )}
        
        {error && <div style={{ padding: 20, color: "#ef4444" }}>Erro: {error}</div>}

        {!loading && !error && !data && (
          <div
            style={{
              padding: 40,
              border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: 16,
              textAlign: "center",
              color: "#94a3b8",
              marginTop: 20
            }}
          >
            Selecione os filtros na barra lateral para gerar o diagnóstico.
          </div>
        )}

        {/* DASHBOARD RENDERIZADO */}
        {!loading && data && (
          <>
            {/* 1️⃣ CENÁRIO: SEM PRODUÇÃO */}
            {isSemProducao ? (
                <EmptyProductionState />
            ) : isZeroDefeitos ? (
                /* 2️⃣ CENÁRIO: EXCELÊNCIA (ZERO DEFEITOS) */
                <ExcellenceState />
            ) : (
                /* 3️⃣ CENÁRIO: PADRÃO (COM DADOS) */
                <>
                    {/* LINHA 1: KPIS SUPERIORES */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 16,
                      }}
                    >
                      <KpiDefeitoCritico data={data.defeitoCritico} />
                      <KpiPrincipalCausa data={data.principalCausa} />
                      <KpiPrincipalDefeito data={data.principalDefeito} />
                      <KpiStatusGeral data={data.statusGeral} />
                    </div>

                    {/* LINHA 2: BLOCOS CENTRAIS (Listas) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 24,
                      }}
                    >
                      <DefeitosCriticosNpr data={data.defeitosCriticos} />
                      
                      <PrincipaisCausas 
                        data={data.principaisCausas} 
                        onSelectPosition={handleSelectPosition}
                      />
                    </div>

                    {/* LINHA 3: DIAGNÓSTICO IA (Texto) */}
                    <div style={{ paddingBottom: 40 }}>
                        <DiagnosticoIaTexto data={data.diagnosticoIa} />
                    </div>
                </>
            )}
          </>
        )}
      </div>
    </div>
  );
}