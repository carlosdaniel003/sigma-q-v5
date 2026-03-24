// src/components/MainSidebar.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isGuestUser } from "@/core/session/userSession";

// Hook Inteligente (que lê do Contexto)
import { useValidation } from "@/contexts/ValidationContext";

// CSS Premium Glassmorphism com nomes 100% blindados
import "./MainSidebar-glass.css";

import {
  BookOpenIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ChevronDownIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export function MainSidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [guest, setGuest] = useState(true);
  const [openValidacao, setOpenValidacao] = useState(false);
  
  // Lemos os alertas da memória em tempo real!
  const { alerts } = useValidation();

  const hasAnyAlert = alerts.defeitos || alerts.producao || alerts.ppm;

  useEffect(() => {
    setGuest(isGuestUser());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname.includes("/development/validacao-dados")) {
      setOpenValidacao(true);
    }
  }, [pathname]);

  if (!mounted || guest) return null;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path);
  const isValidacaoActive = isActive("/development/validacao-dados");

  return (
      <aside 
        className={`glass-sidebar-wrapper ${collapsed ? "collapsed" : ""}`} 
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        <div className="glass-sidebar-header">
           {/* 🔥 Mantemos ambos no DOM e o CSS intercala a opacidade */}
           <div className="glass-sidebar-logo full">SIGMA-Q</div>
           <div className="glass-sidebar-logo mini">SQ</div>
        </div>

        <div className="glass-nav-section">
          <Link href="/dashboard" className={`glass-nav-card ${isActive("/dashboard") ? "glass-is-active" : ""}`}>
            <Squares2X2Icon className="glass-nav-icon" />
            <span className="glass-nav-text">Dashboard</span>
          </Link>

          <Link href="/development/diagnostico" className={`glass-nav-card ${isActive("/development/diagnostico") ? "glass-is-active" : ""}`}>
            <CpuChipIcon className="glass-nav-icon" />
            <span className="glass-nav-text">Diagnóstico IA</span>
          </Link>

          <Link href="/development/catalogo" className={`glass-nav-card ${isActive("/development/catalogo") ? "glass-is-active" : ""}`}>
            <BookOpenIcon className="glass-nav-icon" />
            <span className="glass-nav-text">Catálogo Oficial</span>
          </Link>

          {/* VALIDAÇÃO DE DADOS */}
          <div className="glass-nav-group">
            <div
              className={`glass-nav-card ${isValidacaoActive ? "glass-is-active-parent" : ""} ${hasAnyAlert && !isValidacaoActive ? "glass-pulse-alert" : ""}`}
              onClick={() => setOpenValidacao(!openValidacao)}
            >
              <TableCellsIcon className="glass-nav-icon" />
              
              <span className="glass-nav-text glass-flex-between">
                Validação de Dados
                {hasAnyAlert && !openValidacao && <span className="glass-pulse-dot"></span>}
                <ChevronDownIcon className={`glass-chevron-icon ${openValidacao ? "glass-rotate" : ""}`} />
              </span>

              {/* Bolinha vermelha para quando o menu estiver fechado/colapsado */}
              {collapsed && hasAnyAlert && <div className="glass-pulse-dot collapsed-alert"></div>}
            </div>

            {/* O Submenu só renderiza se aberto e NÃO colapsado */}
            <div className={`glass-submenu-wrapper ${openValidacao && !collapsed ? "open" : ""}`}>
              <div className="glass-submenu-pills">
                <Link href="/development/validacao-dados/defeitos" className={`glass-nav-pill ${isActive("/development/validacao-dados/defeitos") ? "glass-is-active" : ""}`}>
                  <div><span className="glass-nav-dot">•</span> Defeitos</div>
                  {alerts.defeitos && <span className="glass-pulse-dot"></span>}
                </Link>

                <Link href="/development/validacao-dados/producao" className={`glass-nav-pill ${isActive("/development/validacao-dados/producao") ? "glass-is-active" : ""}`}>
                  <div><span className="glass-nav-dot">•</span> Produção</div>
                  {alerts.producao && <span className="glass-pulse-dot"></span>}
                </Link>

                <Link href="/development/validacao-dados/ppm" className={`glass-nav-pill ${isActive("/development/validacao-dados/ppm") ? "glass-is-active" : ""}`}>
                  <div><span className="glass-nav-dot">•</span> PPM</div>
                  {alerts.ppm && <span className="glass-pulse-dot"></span>}
                </Link>

                <Link href="/development/validacao-dados/gestao-lotes" className={`glass-nav-pill ${isActive("/development/validacao-dados/gestao-lotes") ? "glass-is-active" : ""}`}>
                  <div><span className="glass-nav-dot">•</span> Gestão de Lotes</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </aside>
  );
}