// app/dashboard/page.tsx
"use client";

import React, { useEffect } from "react";

export default function DashboardPage() {
  // Já que removemos a validação, esta página atua apenas como uma ponte.
  // Joga o usuário instantaneamente para o dashboard oficial.
  useEffect(() => {
    window.location.replace("/development/dashboard");
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        textAlign: "center",
        color: "var(--text-primary, #fff)",
        padding: "24px",
      }}
    >
      {/* TÍTULO */}
      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "12px",
        }}
      >
        Bem-vindo!
      </h1>

      {/* SUBTEXTO */}
      <p
        style={{
          opacity: 0.75,
          fontSize: "1.05rem",
          maxWidth: "520px",
          marginBottom: "28px",
        }}
      >
        Redirecionando para o painel principal...
      </p>
    </div>
  );
}