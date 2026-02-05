"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDashboardFilters } from "../store/dashboardFilters";

interface FiltroOptions {
  semanas: { semana: number; ano: number }[];
  meses: { mes: number; ano: number }[];
  modelos: string[];
  categorias: string[];
  responsabilidades: string[];
  turnos: string[];
  modeloCategoriaMap: Record<string, string>;
}

export default function SidebarDashboard() {
  const {
    draftFilters,
    setDraftFilter,
    applyFilters,
    resetFilters,
  } = useDashboardFilters();

  const [options, setOptions] = useState<FiltroOptions | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega opções do backend
  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true);
        const res = await fetch("/api/diagnostico/filtros");
        if (!res.ok) return;
        const json: FiltroOptions = await res.json();
        setOptions(json);
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  // Filtra modelos baseado na categoria selecionada
  const modelosFiltrados = useMemo(() => {
    if (!options) return [];
    if (!draftFilters.categoria) return options.modelos;
    return options.modelos.filter(
      (modelo) =>
        options.modeloCategoriaMap[modelo] === draftFilters.categoria
    );
  }, [options, draftFilters.categoria]);

  // Filtra responsabilidades inválidas/internas
  const responsabilidadesFiltradas = useMemo(() => {
    if (!options) return [];
    return options.responsabilidades.filter(
      (resp) => 
        !resp.includes("NÃO MOSTRAR") && 
        !resp.includes("NAO MOSTRAR")
    );
  }, [options]);

  // Auto-seleciona categoria ao escolher modelo
  useEffect(() => {
    if (!options || !draftFilters.modelo) return;
    const categoriaVinculada = options.modeloCategoriaMap[draftFilters.modelo];
    if (categoriaVinculada && draftFilters.categoria !== categoriaVinculada) {
      setDraftFilter("categoria", categoriaVinculada);
    }
  }, [draftFilters.modelo, options, setDraftFilter]);

  // Validação do botão buscar
  const periodoValido = useMemo(() => {
      const { tipo } = draftFilters.periodo;
      // Se tiver um tipo selecionado (mes ou semana), já é válido.
      return !!tipo;
  }, [draftFilters.periodo]);

  // ✅ NOVO: Calcula os dias da semana selecionada
  const diasDaSemana = useMemo(() => {
      if (draftFilters.periodo.tipo !== "semana" || !draftFilters.periodo.valor || !draftFilters.periodo.ano) {
          return [];
      }
      return getDaysOfWeek(draftFilters.periodo.valor, draftFilters.periodo.ano);
  }, [draftFilters.periodo]);

  if (!options || loading) {
    return (
      <div style={containerStyle}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>Carregando filtros...</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Filtros Gerais
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", width: "100%" }}>
        
        {/* 1. TIPO DE PERÍODO */}
        <Select
          label="Visualizar por"
          value={draftFilters.periodo.tipo}
          onChange={(v: any) =>
            setDraftFilter("periodo", { tipo: v, valor: null, ano: null, dia: null })
          }
          options={["mes", "semana"]}
          renderOption={(v: any) => (v === "semana" ? "Semanal" : "Mensal")}
          width="110px"
          hideAllOption={true}
        />

        {/* 2A. SEMANA ESPECÍFICA */}
        {draftFilters.periodo.tipo === "semana" && (
          <Select
            label="Semana Específica"
            value={
              draftFilters.periodo.valor && draftFilters.periodo.ano
                ? `${draftFilters.periodo.valor}-${draftFilters.periodo.ano}`
                : ""
            }
            onChange={(v: string) => {
              if (!v) {
                  setDraftFilter("periodo", { ...draftFilters.periodo, valor: null, ano: null, dia: null });
                  return;
              }
              const [semana, ano] = v.split("-").map(Number);
              setDraftFilter("periodo", { ...draftFilters.periodo, valor: semana, ano, dia: null }); // Reseta dia ao mudar semana
            }}
            options={options.semanas.map((s) => `${s.semana}-${s.ano}`)}
            renderOption={(v: string) => {
              const [semana, ano] = v.split("-");
              return `Sem ${semana}/${ano}`;
            }}
            width="140px"
          />
        )}

        {/* 2B. MÊS ESPECÍFICO */}
        {draftFilters.periodo.tipo === "mes" && (
          <Select
            label="Mês Específico"
            value={
              draftFilters.periodo.valor && draftFilters.periodo.ano
                ? `${draftFilters.periodo.valor}-${draftFilters.periodo.ano}`
                : ""
            }
            onChange={(v: string) => {
                if (!v) {
                    setDraftFilter("periodo", { ...draftFilters.periodo, valor: null, ano: null });
                    return;
                }
                const [mes, ano] = v.split("-").map(Number);
                setDraftFilter("periodo", { ...draftFilters.periodo, valor: mes, ano });
            }}
            options={options.meses.map((m) => `${m.mes}-${m.ano}`)}
            renderOption={(v: string) => {
              const [mes, ano] = v.split("-");
              const data = new Date(Number(ano), Number(mes) - 1, 1);
              const nomeMes = data.toLocaleString("pt-BR", { month: "short" });
              return `${nomeMes.toUpperCase()}/${ano}`;
            }}
            width="140px"
          />
        )}

        {/* ✅ 3. DIA ESPECÍFICO (Só aparece se semana estiver selecionada) */}
        {draftFilters.periodo.tipo === "semana" && draftFilters.periodo.valor && (
            <Select
                label="Dia Específico"
                value={draftFilters.periodo.dia || ""}
                onChange={(v: string) => setDraftFilter("periodo", { ...draftFilters.periodo, dia: v || null })}
                options={diasDaSemana.map(d => d.value)}
                renderOption={(v: string) => {
                    const d = diasDaSemana.find(day => day.value === v);
                    return d ? d.label : v;
                }}
                width="140px"
            />
        )}

        <Select
          label="Categoria"
          value={draftFilters.categoria ?? ""}
          onChange={(v: string) => setDraftFilter("categoria", v || null)}
          options={options.categorias}
          width="140px"
        />

        <Select
          label="Modelo"
          value={draftFilters.modelo ?? ""}
          onChange={(v: string) => setDraftFilter("modelo", v || null)}
          options={modelosFiltrados}
          disabled={modelosFiltrados.length === 0}
          width="140px"
        />

        <Select
          label="Responsabilidade"
          value={draftFilters.responsabilidade ?? ""}
          onChange={(v: string) => setDraftFilter("responsabilidade", v || null)}
          options={responsabilidadesFiltradas}
          width="140px"
        />

        <Select
          label="Turno"
          value={draftFilters.turno ?? ""}
          onChange={(v: string) => setDraftFilter("turno", v || null)}
          options={options.turnos}
          width="110px"
        />

        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <button
                onClick={applyFilters}
                disabled={!periodoValido}
                style={{
                ...buttonStyle,
                background: periodoValido ? "#3b82f6" : "#334155",
                boxShadow: periodoValido ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none",
                cursor: periodoValido ? "pointer" : "not-allowed",
                opacity: periodoValido ? 1 : 0.6,
                }}
            >
                Buscar
            </button>

            <button onClick={resetFilters} style={{...buttonStyle, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)"}}>
                Limpar
            </button>
        </div>

      </div>
    </div>
  );
}

// ✅ Função auxiliar para gerar dias da semana ISO
function getDaysOfWeek(week: number, year: number) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(ISOweekStart);
        d.setDate(d.getDate() + i);
        const value = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const label = d.toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: '2-digit' });
        // Ex: "seg., 15/12"
        days.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return days;
}

function Select({ label, value, onChange, options, disabled = false, renderOption, width = "auto", hideAllOption = false }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: width, flex: "1 1 auto" }}>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          ...inputStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {!hideAllOption && <option value="">Todos</option>}
        {options.map((o: string) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", 
  border: "1px solid rgba(255,255,255,0.08)", 
  borderRadius: 16, 
  padding: 24, 
  marginBottom: 24,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#94a3b8", fontWeight: 600 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0 12px",
  borderRadius: 10, 
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 13,
  height: "42px", 
  outline: "none",
  transition: "border-color 0.2s",
};

const buttonStyle: React.CSSProperties = {
  padding: "0 24px",
  height: "42px", 
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
};