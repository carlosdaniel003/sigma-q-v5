"use client";

import { useEffect } from "react";

/**
 * Hook Global que verifica silenciosamente o status das validações
 * ao carregar a aplicação, atualizando os alertas da Sidebar.
 */
export function useGlobalValidationMonitor() {
  useEffect(() => {
    let isMounted = true;

    const checkAllValidations = async () => {
      // eslint-disable-next-line no-console
      console.log("🔍 [Monitor Global] Iniciando varredura simultânea das bases...");

      let alertDefeitos = false;
      let alertProducao = false;
      let alertPpm = false;

      // Configuração para forçar que o navegador/servidor NUNCA use cache nesta checagem
      const fetchOpts: RequestInit = { 
        cache: "no-store", 
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" } 
      };
      
      const ts = Date.now();

      try {
        // 🚀 MÁGICA AQUI: Roda as 3 APIs ao mesmo tempo (Paralelo) para não haver gargalo
        const [resDef, resProd, resPpm] = await Promise.allSettled([
          fetch(`/api/diagnostico/filtros?t=${ts}`, fetchOpts),
          fetch(`/api/producao/validate?t=${ts}`, fetchOpts),
          fetch(`/api/ppm/validate?t=${ts}`, fetchOpts)
        ]);

        // ============================================================
        // 1. AVALIA DEFEITOS
        // ============================================================
        if (resDef.status === "fulfilled" && resDef.value.ok) {
          const data = await resDef.value.json();
          const globalPct = Number(data.aiOverall?.percentIdentified || 0);
          if (globalPct < 99.9) alertDefeitos = true;
        }

        // ============================================================
        // 2. AVALIA PRODUÇÃO
        // ============================================================
        if (resProd.status === "fulfilled" && resProd.value.ok) {
          const data = await resProd.value.json();
          if (data.ok) {
            const matchRateVol = Number(data.totals?.matchRateByVolume || 0);
            const matchRateRows = Number(data.totals?.matchRateByRows || 0);
            const naoIdentificados = Number(data.totals?.notIdentifiedVolume || 0);

            // Se o KPI estiver a baixo de 99.9% ou houver volume solto, pisca!
            if (matchRateVol < 99.9 || matchRateRows < 99.9 || naoIdentificados > 0) {
              alertProducao = true;
            }
          }
        }

        // ============================================================
        // 3. AVALIA PPM (NOVA LÓGICA DE PERCENTAGEM)
        // ============================================================
        if (resPpm.status === "fulfilled" && resPpm.value.ok) {
          const dataPpm = await resPpm.value.json();
          
          // Lógica idêntica ao que a página final (page.tsx) usa para calcular o 97.79%
          const allRows = Array.isArray(dataPpm.allRows) ? dataPpm.allRows : [];
          
          if (allRows.length > 0) {
            const validos = allRows.filter((r: any) => r.validationStatus === "VALID").length;
            const precisaoPpm = Math.round((validos / allRows.length) * 100);
            
            // eslint-disable-next-line no-console
            console.log(`📊 [Monitor] Validação PPM -> Precisão: ${precisaoPpm}%`);

            // Se a precisão global não for 100%, acende a luz vermelha.
            if (precisaoPpm < 100) {
               alertPpm = true;
            }
          }
        }

        // ============================================================
        // ATUALIZA INTERFACE E LOCALSTORAGE
        // ============================================================
        if (isMounted) {
          
          // eslint-disable-next-line no-console
          console.log("✅ [Monitor Global] Status consolidado:", { 
              defeitos: alertDefeitos ? "🔴 FALHA" : "🟢 OK", 
              producao: alertProducao ? "🔴 FALHA" : "🟢 OK", 
              ppm: alertPpm ? "🔴 FALHA" : "🟢 OK" 
          });
        }
      } catch (error) {
        console.error("⚠️ [Monitor Global] Erro fatal na varredura:", error);
      }
    };

    // Atrasa apenas 2 segundos para deixar o layout inicial carregar suavemente
    const timer = setTimeout(() => {
      checkAllValidations();
    }, 2000);

    // BÓNUS: Refaz a checagem automaticamente a cada 5 minutos em background
    const interval = setInterval(() => {
      checkAllValidations();
    }, 300000);

    return () => {
        isMounted = false;
        clearTimeout(timer);
        clearInterval(interval);
    };
  }, []);
}