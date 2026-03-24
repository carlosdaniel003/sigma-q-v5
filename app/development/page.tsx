// app/development/page.tsx
"use client";

import { useEffect } from "react";

export default function DevArea() {

  // 🔥 Acesso livre total! Sem validação de login ou de cargo (role).
  // Redireciona o usuário imediatamente para o dashboard.
  useEffect(() => {
    window.location.replace("/development/dashboard");
  }, []);

  return (
    <div className="p-6" style={{ textAlign: "center", marginTop: "20vh", color: "#f8fafc" }}>
      <h1 className="text-xl font-bold" style={{ fontSize: "1.5rem", marginBottom: "12px" }}>
        Área de Desenvolvimento
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>
        Acesso livre. Redirecionando para o painel principal...
      </p>

      {/* Mantive os links originais apenas por precaução, caso o redirecionamento demore 1 milissegundo a mais */}
      <ul className="mt-8 list-none" style={{ display: "none" }}>
        <li><a href="/development/catalogo">Catálogo Oficial SIGMA-Q</a></li>
        <li><a href="/development/defeitos">Validação de Defeitos</a></li>
        <li><a href="/development/producao">Validação de Produção</a></li>
        <li><a href="/development/geral">Validação Geral</a></li>
        <li><a href="/development/ppm">PPM Engine</a></li>
      </ul>
    </div>
  );
}