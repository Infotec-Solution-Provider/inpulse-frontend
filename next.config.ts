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

// These routes serve internal conversations and require a JWT in WhatsApp.
// The separate /api/internal/whatsapp namespace serves onlyLocal maintenance.
const authenticatedInternalChatRoutes = [
  "session/chats",
  "chats",
  "chats/:id(\\d+)",
  "chats/:id(\\d+)/messages",
  "chats/:id(\\d+)/finish",
  "groups",
  "groups/:id(\\d+)",
  "groups/:id(\\d+)/image",
  "messages/:id(\\d+)",
  "messages/:id(\\d+)/reaction",
  "messages/:id(\\d+)/whatsapp-retry",
  "chat/:id(\\d+)/mark-as-read",
  "monitor/chats",
  "whatsapp-senders",
  "whatsapp-senders/names",
  "whatsapp-senders/messages",
  "whatsapp-senders/name",
];

const nextConfig: NextConfig = {
  ...(proxyTargets.length > 0 && {
    experimental: { proxyTimeout: 300_000 },
    async rewrites() {
      return {
        beforeFiles: [
          ...proxyTargets.flatMap(([name, target]) =>
            name === "whatsapp"
              ? authenticatedInternalChatRoutes.map((route) => ({
                  source: `/_svc/whatsapp/api/internal/${route}`,
                  destination: `${target.replace(/\/$/, "")}/api/internal/${route}`,
                }))
              : [],
          ),
          // rotas internas (onlyLocal/token) nunca saem pelo proxy
          { source: "/_svc/:svc/api/internal/:path*", destination: "/api/service-proxy-blocked" },
          { source: "/_svc/:svc/api/_internal/:path*", destination: "/api/service-proxy-blocked" },
          ...proxyTargets.map(([name, target]) =>
            // do instances-service só as rotas de geo: as demais não têm autenticação
            name === "instances"
              ? {
                  source: "/_svc/instances/api/instances/geo/:path*",
                  destination: `${target.replace(/\/$/, "")}/api/instances/geo/:path*`,
                }
              : {
                  source: `/_svc/${name}/:path*`,
                  destination: `${target.replace(/\/$/, "")}/:path*`,
                },
          ),
        ],
        afterFiles: [],
        fallback: [],
      };
    },
  }),
};

export default nextConfig;
