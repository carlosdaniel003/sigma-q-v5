// app/development/validacao-dados/gestao-lotes/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import { inferirCategoria } from "./utils/inferirCategoria";

import GestaoLotesHeader from "./components/GestaoLotesHeader";
import GestaoLotesFiltros from "./components/GestaoLotesFiltros";
import GestaoLotesTabela from "./components/GestaoLotesTabela";
import JustificativaModal from "./components/JustificativaModal";

const PHP_API_URL = "http://10.110.100.227/qualitycontrol/SIGMA/teste_integracao/uploads/sigma_producao_api.php";

export interface LoteItem {
  id: string | number;
  MAKTX?: string;
  MATNR?: string;
  TIPO_PROD?: string;
  CATEGORIA_INFERIDA?: string;
  DATA?: string;
  HORA?: string;
  FABRICA?: string;
  TIPO_MOV?: string;
  QUANTIDADE?: string | number;
  motivo_ignorado?: string;
  [key: string]: any;
}

export default function GestaoLotesPage() {
  const [activeTab, setActiveTab] = useState<"ativos" | "ignorados">("ativos");
  const [producaoBruta, setProducaoBruta] = useState<LoteItem[]>([]);
  const [listaIgnorados, setListaIgnorados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  
  const [showModal, setShowModal] = useState(false);
  const [motivo, setMotivo] = useState("");

  // 🔥 Novos Estados para Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resProd = await fetch(PHP_API_URL);
      const prodData = resProd.ok ? await resProd.json() : [];
      
      const resIgnorados = await fetch("/api/validacao/gestao-lotes");
      const ignoradosData = resIgnorados.ok ? await resIgnorados.json() : { ignorados: [] };

      setProducaoBruta(Array.isArray(prodData) ? prodData : []);
      setListaIgnorados(ignoradosData.ignorados || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
      setSelectedIds([]); 
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { ativosList, ignoradosList } = useMemo(() => {
    const ignoradosMap = new Map<string, string>();
    listaIgnorados.forEach(item => {
      ignoradosMap.set(String(item.id), item.motivo || "Sem motivo");
    });

    const ativos: LoteItem[] = [];
    const ignorados: LoteItem[] = [];

    producaoBruta.forEach(item => {
      const categoriaInferida = inferirCategoria(item.MAKTX || "", "");
      const itemMapeado = { ...item, CATEGORIA_INFERIDA: categoriaInferida };
      const idStr = String(item.id);

      if (ignoradosMap.has(idStr)) {
        ignorados.push({ ...itemMapeado, motivo_ignorado: ignoradosMap.get(idStr) });
      } else {
        ativos.push(itemMapeado);
      }
    });

    return { ativosList: ativos, ignoradosList: ignorados };
  }, [producaoBruta, listaIgnorados]);

  const baseData = activeTab === "ativos" ? ativosList : ignoradosList;

  // 🔥 Otimização: Separamos a Lista Filtrada Total da Lista Exibida na Tela
  const filteredData = useMemo(() => {
    let filtrado = [...baseData];

    const activeFilters = Object.entries(columnFilters).filter(([_, values]) => values.length > 0);
    
    if (activeFilters.length > 0) {
      const filtersAsSets = activeFilters.map(([key, values]) => ({
        key,
        valueSet: new Set(values)
      }));

      filtrado = filtrado.filter(item => {
        return filtersAsSets.every(({ key, valueSet }) => {
          let val = String(item[key] || "--");
          if (key === 'DATA' && item.DATA) {
            val = new Date(item.DATA).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
          }
          return valueSet.has(val);
        });
      });
    }

    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
      filtrado = filtrado.filter(item => 
        (item.MAKTX && item.MAKTX.toLowerCase().includes(term)) ||
        (item.id && String(item.id).includes(term)) ||
        (item.MATNR && item.MATNR.toLowerCase().includes(term)) ||
        (item.TIPO_PROD && item.TIPO_PROD.toLowerCase().includes(term)) ||
        (item.CATEGORIA_INFERIDA && item.CATEGORIA_INFERIDA.toLowerCase().includes(term))
      );
    }
    
    return filtrado;
  }, [baseData, deferredSearchTerm, columnFilters]);

  // Reseta para a página 1 sempre que os filtros ou aba mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, columnFilters, activeTab]);

  // 🔥 Paginação Dinâmica
  const displayData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(selectedIds.length === displayData.length && displayData.length > 0 ? [] : displayData.map(item => String(item.id)));
  }, [selectedIds.length, displayData]);

  const handleTabChange = useCallback((tab: "ativos" | "ignorados") => {
    setActiveTab(tab);
    setSelectedIds([]);
    setColumnFilters({});
  }, []);

  const handleOcultar = async () => {
    if (selectedIds.length === 0 || !motivo.trim()) return;
    try {
      const res = await fetch("/api/validacao/gestao-lotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds, motivo: motivo, usuario: "Admin" }) });
      if (res.ok) { setShowModal(false); setMotivo(""); fetchData(); }
    } catch (e) { console.error("Erro ao ocultar", e); }
  };

  const handleRestaurar = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/validacao/gestao-lotes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds }) });
      if (res.ok) fetchData(); 
    } catch (e) { console.error("Erro ao restaurar", e); }
  };

  return (
    <div style={{ color: "#fff", minHeight: "100vh", padding: "24px 32px", position: "relative" }}>
      
      <JustificativaModal 
        show={showModal} onClose={() => setShowModal(false)} onConfirm={handleOcultar} 
        motivo={motivo} setMotivo={setMotivo} selectedCount={selectedIds.length} 
      />

      <GestaoLotesHeader />

      <GestaoLotesFiltros 
        activeTab={activeTab} setActiveTab={handleTabChange} 
        ativosCount={ativosList.length} ignoradosCount={ignoradosList.length} 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        onTabChange={() => {}} 
      />

      <GestaoLotesTabela 
        baseData={baseData} 
        displayData={displayData} 
        loading={loading} activeTab={activeTab} 
        selectedIds={selectedIds} toggleSelect={toggleSelect} toggleSelectAll={toggleSelectAll} 
        onShowModal={() => setShowModal(true)} onRestaurar={handleRestaurar}
        columnFilters={columnFilters} setColumnFilters={setColumnFilters} 
        // 🔥 Novas Props de Paginação
        totalFiltered={filteredData.length}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        setCurrentPage={setCurrentPage}
        setItemsPerPage={setItemsPerPage}
      />
      
    </div>
  );
}