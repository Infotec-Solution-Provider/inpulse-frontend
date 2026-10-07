import type { NextConfig } from "next";

/**
 * Proxy opcional para ambientes sem nginx por caminho (ex.: homologação).
 * API_PROXY_TARGETS="users=http://127.0.0.1:7101,whatsapp=http://127.0.0.1:7105,..."
 * publica cada serviço em /_svc/<nome>/..., e os NEXT_PUBLIC_*_URL apontam para esse prefixo.
 * Sem a variável, nada muda.
 */
const proxyTargets = (process.env["API_PROXY_TARGETS"] || "")
  .split(",")
  .map((pair) => pair.trim().split("="))
  .filter((pair): pair is [string, string] => pair.length === 2 && !!pair[0] && !!pair[1]);

const nextConfig: NextConfig = {
  ...(proxyTargets.length > 0 && {
    experimental: { proxyTimeout: 300_000 },
    async rewrites() {
      return {
        beforeFiles: [
          // rotas internas (onlyLocal/token) nunca saem pelo proxy
          { source: "/_svc/:svc/api/internal/:path*", destination: "/_svc-blocked" },
          { source: "/_svc/:svc/api/_internal/:path*", destination: "/_svc-blocked" },
          ...proxyTargets.map(([name, target]) =>
            // do instances-service só as rotas de geo: as demais não têm autenticação
            name === "instances"
              ? {
                  source: "/_svc/instances/api/instances/geo/:path*",
                  destination: `${target.replace(/\/$/, "")}/api/instances/geo/:path*`,
                }
              : { source: `/_svc/${name}/:path*`, destination: `${target.replace(/\/$/, "")}/:path*` },
          ),
        ],
        afterFiles: [],
        fallback: [],
      };
    },
  }),
};

export default nextConfig;
