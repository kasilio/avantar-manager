import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Acesso ao dev server pela rede local (ex. celular, outro PC) — sem isso o
  // Next bloqueia o HMR por segurança e o navegador remoto nunca recebe live-reload.
  allowedDevOrigins: ["192.168.100.180", "192.168.15.6"],
  experimental: {
    serverActions: {
      // Importação de repasses envia vários PDFs de uma vez pra mesma Server
      // Action — acima do limite padrão de 1MB.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
