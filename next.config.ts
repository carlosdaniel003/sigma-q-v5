import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ativa a geração da pasta enxuta que contém apenas o necessário para rodar
  output: 'standalone', 
  
  experimental: {
    optimizeCss: true,
    // cacheComponents substitui a lógica de cache tradicional em versões recentes
    // Mantendo conforme sua estrutura original do SIGMA-Q V3
  },
};

export default nextConfig;