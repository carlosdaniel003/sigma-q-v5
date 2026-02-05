"use client";

import { useState, useEffect } from "react";

export default function DashboardLoading() {
  const [messageIndex, setMessageIndex] = useState(0);

  // ✅ MENSAGENS ATUALIZADAS PARA O CONTEXTO DE DASHBOARD
  const messages = [
    "Consultando volumes de produção...",
    "Calculando PPM Global e Metas...",
    "Agrupando defeitos por categoria...",
    "Gerando gráficos de tendência...",
    "Finalizando visualização gerencial...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500); 

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "400px",
        width: "100%",
        color: "#ffffff",
        gap: 24,
      }}
    >
      {/* --- ROBOT SVG ANIMADO (Igual ao da IA) --- */}
      <div className="relative">
        <div 
          className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse" 
          style={{ transform: "scale(1.5)" }}
        />
        
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 animate-bounce-slow"
          style={{ animationDuration: "3s" }}
        >
          <rect x="3" y="6" width="18" height="14" rx="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.5" />
          <circle cx="8.5" cy="11.5" r="1.5" fill="#3b82f6" className="animate-pulse" />
          <circle cx="15.5" cy="11.5" r="1.5" fill="#3b82f6" className="animate-pulse" />
          <path d="M9 16C9 16 10 17 12 17C14 17 15 16 15 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 2V6" stroke="#60a5fa" strokeWidth="1.5" />
          <circle cx="12" cy="2" r="1.5" fill="#60a5fa" className="animate-ping" style={{ animationDuration: '2s' }} />
          <path d="M1 10V14" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
          <path d="M23 10V14" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* --- TEXTOS (Título Alterado) --- */}
      <div style={{ textAlign: "center" }}>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#e2e8f0",
            marginBottom: 8,
          }}
        >
          Atualizando Indicadores
        </h3>
        
        <p
          key={messageIndex}
          style={{
            fontSize: 14,
            color: "#94a3b8",
            minHeight: "20px",
            animation: "fadeIn 0.5s ease-in-out"
          }}
        >
          {messages[messageIndex]}
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 3s infinite;
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}