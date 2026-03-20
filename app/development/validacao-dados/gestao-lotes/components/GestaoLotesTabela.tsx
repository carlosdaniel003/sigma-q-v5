// app/development/validacao-dados/gestao-lotes/components/GestaoLotesTabela.tsx
import React, { useState, useMemo, useCallback } from "react";
import { EyeOff, RotateCcw, Filter } from "lucide-react";
import BotaoExportarExcel from "./BotaoExportarExcel"; 
import { LoteItem } from "../page"; 
import "./GestaoLotesTabela.css"; 

// 🔥 CORREÇÃO: Trouxemos a função para cá para evitar o erro de arquivo ausente ('./utils')
export const formatarDataBR = (dataStr: string | null | undefined): string => {
  if (!dataStr) return "";
  const date = new Date(dataStr);
  if (isNaN(date.getTime())) return String(dataStr);
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

interface GestaoLotesTabelaProps {
  baseData: LoteItem[];
  displayData: LoteItem[];
  loading: boolean;
  activeTab: string;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  onShowModal: () => void;
  onRestaurar: () => void;
  columnFilters: Record<string, string[]>;
  setColumnFilters: (filters: Record<string, string[]>) => void;
  // 🔥 Props da Paginação
  totalFiltered: number;
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
}

const ColHeader = React.memo(({ 
  label, 
  colKey, 
  baseData, 
  columnFilters, 
  setColumnFilters, 
  openFilterMenu, 
  setOpenFilterMenu 
}: { 
  label: string; 
  colKey: string; 
  baseData: LoteItem[];
  columnFilters: Record<string, string[]>;
  setColumnFilters: (f: Record<string, string[]>) => void;
  openFilterMenu: string | null;
  setOpenFilterMenu: (k: string | null) => void;
}) => {
  const isActive = columnFilters[colKey] && columnFilters[colKey].length > 0;
  
  const uniqueOptions = useMemo(() => {
    let options: string[] = [];
    if (colKey === 'DATA') {
      const dataObjects = baseData
        .filter(item => item.DATA)
        .map(item => ({
          rawTime: new Date(item.DATA!).getTime(),
          formatted: formatarDataBR(item.DATA)
        }))
        .filter(obj => !isNaN(obj.rawTime));

      dataObjects.sort((a, b) => a.rawTime - b.rawTime);
      options = Array.from(new Set<string>(dataObjects.map(obj => String(obj.formatted))));
    } else {
      options = Array.from(new Set<string>(baseData.map(item => String(item[colKey] || "--")))).sort();
    }
    return options;
  }, [baseData, colKey]);

  const handleToggleOption = (val: string) => {
    const current = columnFilters[colKey] || [];
    const updated = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
    setColumnFilters({ ...columnFilters, [colKey]: updated });
  };

  const clearColFilter = () => {
    const newFilters = { ...columnFilters };
    delete newFilters[colKey];
    setColumnFilters(newFilters);
    setOpenFilterMenu(null);
  };

  return (
    <div className="gl-th-wrapper">
      <div className="gl-th-content" onClick={() => setOpenFilterMenu(openFilterMenu === colKey ? null : colKey)}>
        {label}
        <Filter size={14} className={`gl-filter-icon ${isActive ? "is-active" : ""}`} />
      </div>

      {openFilterMenu === colKey && (
        <div className="gl-filter-popover">
          <div className="gl-popover-header">
            <span>Filtrar {label}</span>
            {isActive && <button onClick={clearColFilter} className="gl-popover-clear">Limpar</button>}
          </div>
          <div className="gl-popover-list">
            {uniqueOptions.map((opt, i) => (
              <label key={i} className="gl-popover-item">
                <input 
                  type="checkbox" className="gl-checkbox gl-checkbox-small"
                  checked={(columnFilters[colKey] || []).includes(opt)}
                  onChange={() => handleToggleOption(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default function GestaoLotesTabela({
  baseData, displayData, loading, activeTab, selectedIds, 
  toggleSelect, toggleSelectAll, onShowModal, onRestaurar,
  columnFilters, setColumnFilters,
  totalFiltered, currentPage, itemsPerPage, setCurrentPage, setItemsPerPage
}: GestaoLotesTabelaProps) {
  
  const hasSelection = selectedIds.length > 0;
  const [openFilterMenu, setOpenFilterMenu] = useState<string | null>(null);

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Cálculos de Paginação
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalFiltered);

  return (
    <section className="gl-table-panel">
      
      {openFilterMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpenFilterMenu(null)} />
      )}

      {/* BARRA DE AÇÃO */}
      <div className="gl-action-bar">
        <span className={`gl-selection-count ${hasSelection ? "active" : "inactive"}`}>
          {selectedIds.length} itens selecionados na página
        </span>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <BotaoExportarExcel baseData={baseData} activeTab={activeTab} />

          {hasSelection && (
            activeTab === "ativos" ? (
              <button onClick={onShowModal} className="gl-btn gl-btn-danger"><EyeOff size={18} /> Ocultar Selecionados</button>
            ) : (
              <button onClick={onRestaurar} className="gl-btn gl-btn-success"><RotateCcw size={18} /> Restaurar Lotes</button>
            )
          )}
        </div>
      </div>

      {/* CABEÇALHO DA TABELA */}
      <div className="gl-grid-layout gl-table-header" style={{ position: "relative", zIndex: 50 }}>
        <div style={{ textAlign: "center" }}>
           <input type="checkbox" className="gl-checkbox" checked={hasSelection && selectedIds.length === displayData.length && displayData.length > 0} onChange={toggleSelectAll} />
        </div>
        <ColHeader label="ID SQL" colKey="id" baseData={baseData} columnFilters={columnFilters} setColumnFilters={setColumnFilters} openFilterMenu={openFilterMenu} setOpenFilterMenu={setOpenFilterMenu} />
        <ColHeader label="Data/Hora" colKey="DATA" baseData={baseData} columnFilters={columnFilters} setColumnFilters={setColumnFilters} openFilterMenu={openFilterMenu} setOpenFilterMenu={setOpenFilterMenu} />
        <ColHeader label="Modelo (MAKTX)" colKey="MAKTX" baseData={baseData} columnFilters={columnFilters} setColumnFilters={setColumnFilters} openFilterMenu={openFilterMenu} setOpenFilterMenu={setOpenFilterMenu} />
        <ColHeader label="Categoria" colKey="CATEGORIA_INFERIDA" baseData={baseData} columnFilters={columnFilters} setColumnFilters={setColumnFilters} openFilterMenu={openFilterMenu} setOpenFilterMenu={setOpenFilterMenu} />
        <ColHeader label="Tipo Prod." colKey="TIPO_PROD" baseData={baseData} columnFilters={columnFilters} setColumnFilters={setColumnFilters} openFilterMenu={openFilterMenu} setOpenFilterMenu={setOpenFilterMenu} />
        <ColHeader label="Fábrica" colKey="FABRICA" baseData={baseData} columnFilters={columnFilters} setColumnFilters={setColumnFilters} openFilterMenu={openFilterMenu} setOpenFilterMenu={setOpenFilterMenu} />
        <ColHeader label="Tipo Mov." colKey="TIPO_MOV" baseData={baseData} columnFilters={columnFilters} setColumnFilters={setColumnFilters} openFilterMenu={openFilterMenu} setOpenFilterMenu={setOpenFilterMenu} />
        <div style={{ textAlign: "right" }}>Quantidade</div>
        <div style={{ textAlign: "center" }}>Status</div>
      </div>

      {/* DADOS DA TABELA */}
      {loading ? (
        <div className="gl-empty-state">Carregando dados do servidor...</div>
      ) : displayData.length === 0 ? (
        <div className="gl-empty-state">Nenhum lote corresponde aos filtros selecionados.</div>
      ) : (
        <div className="gl-table-scroll-area">
          {displayData.map((item, idx) => {
            const isSelected = selectedIdsSet.has(String(item.id));
            
            return (
              <div key={item.id || idx} className={`gl-grid-layout gl-table-row ${isSelected ? "selected" : ""}`}>
                <div style={{ textAlign: "center" }}>
                  <input type="checkbox" className="gl-checkbox" checked={isSelected} onChange={() => toggleSelect(String(item.id))} />
                </div>
                <div className="gl-id-text">{item.id}</div>
                <div className="gl-date-text">
                  {formatarDataBR(item.DATA) || "--"} <br/>
                  <span className="gl-time-text">{item.HORA || ""}</span>
                </div>
                <div>
                  <div className="gl-model-text" title={item.MAKTX}>{item.MAKTX || "Desconhecido"}</div>
                  <div className="gl-matnr-text">{item.MATNR || "--"}</div>
                </div>
                <div className="gl-category-text">{item.CATEGORIA_INFERIDA || "--"}</div>
                <div className="gl-default-text">{item.TIPO_PROD || "--"}</div>
                <div className="gl-default-text">{item.FABRICA || "--"}</div>
                <div className={item.TIPO_MOV === "FORNECIDO" ? "gl-mov-success" : "gl-mov-default"}>{item.TIPO_MOV || "--"}</div>
                <div className="gl-qty-text">
                  {(() => {
                    if (!item.QUANTIDADE) return "0 und.";
                    const realQty = parseFloat(String(item.QUANTIDADE).replace(",", "."));
                    return !isNaN(realQty) ? `${realQty.toLocaleString('pt-BR')} und.` : "0 und.";
                  })()}
                </div>
                <div className="gl-badge-wrapper">
                  {activeTab === "ativos" ? (
                      <span className="gl-badge ativo">ATIVO</span>
                  ) : (
                      <div className="gl-badge-col-stacked">
                        <span className="gl-badge oculto">OCULTO</span>
                        <span className="gl-badge-reason" title={item.motivo_ignorado}>{item.motivo_ignorado}</span>
                      </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔥 RODAPÉ DE PAGINAÇÃO GLASSMORPHISM */}
      {!loading && totalFiltered > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '16px 24px', background: 'rgba(0,0,0,0.15)', 
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          
          {/* Seletor de Quantidade por Página */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>Itens por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // Volta pra primeira página ao alterar quantidade
              }}
              style={{ 
                background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '6px 10px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontWeight: 600
              }}
            >
              <option value={25} style={{ background: '#1e293b' }}>25</option>
              <option value={50} style={{ background: '#1e293b' }}>50</option>
              <option value={100} style={{ background: '#1e293b' }}>100</option>
              <option value={500} style={{ background: '#1e293b' }}>500</option>
            </select>
          </div>

          {/* Indicador de Status */}
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
            Mostrando <strong style={{ color: '#fff' }}>{startItem}</strong> a <strong style={{ color: '#fff' }}>{endItem}</strong> de <strong style={{ color: '#fff' }}>{totalFiltered}</strong> registros
          </div>

          {/* Botões de Navegação */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ 
                background: currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.05)', 
                color: currentPage === 1 ? '#475569' : '#fff', 
                border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '8px', 
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontWeight: 600
              }}
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ 
                background: currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)', 
                color: currentPage === totalPages ? '#475569' : '#fff', 
                border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '8px', 
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontWeight: 600
              }}
            >
              Próxima
            </button>
          </div>

        </div>
      )}
    </section>
  );
}