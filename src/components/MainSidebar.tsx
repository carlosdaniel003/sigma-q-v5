// src\components\MainSidebar.tsx
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
  ShieldCheckIcon,
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
        style={{ width: collapsed ? "80px" : "260px" }}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        <div
          className="glass-sidebar-header"
          style={{
            justifyContent: "center", 
            paddingLeft: 0
          }}
        >
           {collapsed ? (
             <div className="glass-sidebar-logo" style={{ fontSize: "1.2rem", padding: 0 }}>SQ</div>
           ) : (
             <div className="glass-sidebar-logo">SIGMA-Q</div>
           )}
        </div>

        <div className="glass-nav-section">
          <Link href="/dashboard" className={`glass-nav-card ${isActive("/dashboard") ? "glass-is-active" : ""}`}>
            <Squares2X2Icon className="glass-nav-icon" />
            {!collapsed && <span className="glass-nav-text">Dashboard</span>}
          </Link>

          <Link href="/development/diagnostico" className={`glass-nav-card ${isActive("/development/diagnostico") ? "glass-is-active" : ""}`}>
            <CpuChipIcon className="glass-nav-icon" />
            {!collapsed && <span className="glass-nav-text">Diagnóstico IA</span>}
          </Link>

          <Link href="/development/catalogo" className={`glass-nav-card ${isActive("/development/catalogo") ? "glass-is-active" : ""}`}>
            <BookOpenIcon className="glass-nav-icon" />
            {!collapsed && <span className="glass-nav-text">Catálogo Oficial</span>}
          </Link>

          {/* VALIDAÇÃO DE DADOS */}
          <div className="glass-nav-group">
            <div
              className={`glass-nav-card ${isValidacaoActive ? "glass-is-active-parent" : ""} ${hasAnyAlert && !isValidacaoActive ? "glass-pulse-alert" : ""}`}
              onClick={() => {
                setOpenValidacao(!openValidacao);
              }}
            >
              <TableCellsIcon className="glass-nav-icon" />
              {!collapsed && (
                <>
                  <span className="glass-nav-text" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    Validação de Dados
                    {hasAnyAlert && !openValidacao && <span className="glass-pulse-dot" style={{ marginLeft: 8 }}></span>}
                  </span>
                  <ChevronDownIcon className={`glass-chevron-icon ${openValidacao ? "glass-rotate" : ""}`} />
                </>
              )}
              {collapsed && hasAnyAlert && <div style={{ position: "absolute", top: 8, right: 8 }} className="glass-pulse-dot"></div>}
            </div>

            {!collapsed && openValidacao && (
              <div className="glass-submenu-pills">
                <Link href="/development/validacao-dados/defeitos" className={`glass-nav-pill ${isActive("/development/validacao-dados/defeitos") ? "glass-is-active" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span className="glass-nav-dot">•</span> Defeitos</div>
                  {alerts.defeitos && <span className="glass-pulse-dot"></span>}
                </Link>

                <Link href="/development/validacao-dados/producao" className={`glass-nav-pill ${isActive("/development/validacao-dados/producao") ? "glass-is-active" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span className="glass-nav-dot">•</span> Produção</div>
                  {alerts.producao && <span className="glass-pulse-dot"></span>}
                </Link>

                <Link href="/development/validacao-dados/ppm" className={`glass-nav-pill ${isActive("/development/validacao-dados/ppm") ? "glass-is-active" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span className="glass-nav-dot">•</span> PPM</div>
                  {alerts.ppm && <span className="glass-pulse-dot"></span>}
                </Link>

                {/* 🔥 NOVA ABA ADICIONADA AQUI */}
                <Link href="/development/validacao-dados/gestao-lotes" className={`glass-nav-pill ${isActive("/development/validacao-dados/gestao-lotes") ? "glass-is-active" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span className="glass-nav-dot">•</span> Gestão de Lotes</div>
                </Link>
              </div>
            )}
          </div>

          <Link href="/development/acesso" className={`glass-nav-card ${isActive("/development/acesso") ? "glass-is-active" : ""}`}>
            <ShieldCheckIcon className="glass-nav-icon" />
            {!collapsed && <span className="glass-nav-text">Gerenciamento de Acesso</span>}
          </Link>
        </div>

        <div className="glass-sidebar-footer">
          <div className="glass-logout-card" onClick={() => {
              localStorage.removeItem("sigma_user");
              document.cookie = "sigma_auth=; path=/; max-age=0";
              window.location.href = "/login";
            }}>
            <div className="glass-logout-icon-wrapper"><span className="glass-logout-initial">S</span></div>
            {!collapsed && <span className="glass-nav-text">Sair</span>}
          </div>
        </div>
      </aside>
  );
}