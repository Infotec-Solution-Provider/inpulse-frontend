import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../dist-admin/", import.meta.url));
const api = "/infotec/admin/api";
let revision = 1,
  anonymous = false,
  uncertain = false,
  calls = [],
  operations = new Map(),
  state = "online";
const values = {
  feature_ai_enabled: false,
  timeout: 2,
  label: "Empresa",
  advanced: { retry: 1 },
  mode: "normal",
};
const catalog = [
  {
    key: "feature_ai_enabled",
    label: "Inteligência artificial",
    description: "Disponibiliza os recursos de IA.",
    category: "Recursos",
    type: "boolean",
    canReset: true,
  },
  {
    key: "timeout",
    label: "Tempo de espera",
    description: "Limite em minutos.",
    category: "Atendimento",
    type: "number",
    min: 1,
    max: 30,
  },
  {
    key: "label",
    label: "Nome de exibição",
    description: "Nome público.",
    category: "CRM",
    type: "string",
  },
  {
    key: "mode",
    label: "Modo",
    description: "Modo de operação.",
    category: "CRM",
    type: "enum",
    options: [
      { label: "Normal", value: "normal" },
      { label: "Novo", value: "new" },
    ],
  },
  {
    key: "advanced",
    label: "Configuração avançada",
    description: "Opções JSON.",
    category: "Integrações",
    type: "json",
  },
  {
    key: "api_key",
    label: "Chave do provedor",
    description: "Credencial protegida.",
    category: "Integrações",
    type: "secret",
  },
];
const snapshot = (tenant = "infotec", source = "whatsapp") => ({
  source,
  tenant,
  revision: `r${revision}`,
  catalog,
  values: { ...values, label: `${tenant} · ${values.label}` },
  secrets: { api_key: { configured: true } },
  application: { state: revision > 1 ? "pending" : "applied", revision: `r${revision}` },
});
const session = () => ({
  actor: { instance: "infotec", userId: 42, role: "ADMIN", name: "Admin de teste" },
  csrfToken: "fixture-csrf",
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  environments: ["production", "homolog"],
});
const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};
const read = async (req) => {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://fixture");
      if (url.pathname.startsWith("/__fixture")) {
        const body = await read(req);
        if (url.pathname.endsWith("/reset")) {
          revision = 1;
          values.feature_ai_enabled = false;
          anonymous = !!body.anonymous;
          uncertain = false;
          calls = [];
          operations = new Map();
          state = "online";
        }
        if (url.pathname.endsWith("/advance")) revision++;
        if (url.pathname.endsWith("/uncertain")) uncertain = true;
        return json(res, 200, { calls });
      }
      if (url.pathname.startsWith(api)) {
        const route = url.pathname.slice(api.length);
        if (route === "/session" && req.method === "GET")
          return json(
            res,
            anonymous ? 401 : 200,
            anonymous ? { message: "Sessão expirada." } : session(),
          );
        if (anonymous) return json(res, 401, { message: "Sessão expirada." });
        if (!["GET", "HEAD"].includes(req.method) && req.headers["x-csrf-token"] !== "fixture-csrf")
          return json(res, 403, { message: "CSRF ausente." });
        if (route === "/session/renew") return json(res, 200, session());
        if (route === "/session" && req.method === "DELETE") return json(res, 200, {});
        if (route.endsWith("/tenants"))
          return json(res, 200, {
            tenants: [
              { id: "infotec", name: "Infotec" },
              { id: "cliente", name: "Cliente" },
            ],
          });
        if (route.endsWith("/sources"))
          return json(res, 200, {
            sources: [
              { id: "whatsapp", label: "WhatsApp", category: "Atendimento", available: true },
              { id: "openai", label: "OpenAI", category: "IA", available: true },
              { id: "ai-agent", label: "Agente padrão", category: "IA", available: true },
              {
                id: "channels",
                label: "Canais e provedores",
                category: "WhatsApp",
                available: true,
              },
              { id: "storage", label: "Armazenamento", category: "Integrações", available: true },
            ],
          });
        if (route.includes("/targets/"))
          return json(res, 200, {
            targets: [
              { id: 7, label: "Ana", active: true },
              { id: 8, label: "Bruno", active: false },
            ],
          });
        if (route.startsWith("/operations/")) {
          const operation = operations.get(route.split("/").at(-1));
          return json(
            res,
            operation ? 200 : 404,
            operation || { message: "Operação não localizada." },
          );
        }
        if (route.endsWith("/services"))
          return json(res, 200, {
            services: [
              {
                id: "users",
                name: "homolog-users-service",
                status: state,
                cpu: 2,
                memory: 104857600,
                uptime: 100,
                restarts: 1,
                health: { status: "healthy" },
                configuration: {
                  savedRevision: `r${revision}`,
                  activeRevision: "r1",
                  state: revision > 1 ? "pending" : "applied",
                },
              },
            ],
          });
        if (route.endsWith("/logs"))
          return json(res, 200, {
            entries: [
              {
                id: "log1",
                timestamp: "2026-11-11T12:00:00Z",
                level: "INFO",
                service: "users",
                message:
                  "Processamento concluído <script>alert('x')</script> credential=[REDACTED]",
              },
            ],
          });
        if (route === "/audit")
          return json(res, 200, {
            entries: calls.map((call, index) => ({
              id: String(index),
              operationId: call.body.operationId,
              timestamp: "2026-11-11T12:00:00Z",
              actor: session().actor,
              environment: "homolog",
              tenant: "infotec",
              source: "whatsapp",
              action: call.method,
              state: "COMMITTED",
              changes: call.body.changes?.map((change) => ({
                key: change.key,
                ...(change.key === "api_key"
                  ? { secretAction: "replaced" }
                  : { before: false, after: change.value }),
              })),
            })),
          });
        if (req.method === "GET" && (route.includes("/settings/") || route.endsWith("/config"))) {
          const parts = route.split("/");
          const data = snapshot(parts[4], parts.at(-1));
          if (["channels", "storage"].includes(parts.at(-1))) {
            data.resources = [{ id: 5, label: "Recurso comercial" }];
            if (!url.searchParams.has("resourceId")) {
              data.catalog = [];
              data.values = {};
              data.unavailableReason = "Selecione um registro para consultar.";
            }
          }
          return json(res, 200, data);
        }
        if (["PATCH", "POST"].includes(req.method)) {
          const body = await read(req);
          calls.push({ path: route, method: req.method, body });
          if (body.revision && body.revision !== `r${revision}`)
            return json(res, 409, { message: "A configuração mudou. Recarregue antes de salvar." });
          for (const change of body.changes ?? [])
            if (change.key !== "api_key")
              values[change.key] = change.action === "set" ? change.value : null;
          if (body.changes?.length) revision++;
          if (body.action === "stop") state = "stopped";
          if (["start", "restart"].includes(body.action)) state = "online";
          operations.set(body.operationId, {
            operationId: body.operationId,
            state: "COMMITTED",
            result: { snapshot: snapshot() },
          });
          if (uncertain) {
            uncertain = false;
            return json(res, 503, { message: "Confirmação indisponível." });
          }
          return json(res, 202, { operationId: body.operationId, state: "ACCEPTED" });
        }
        return json(res, 404, { message: "Rota inexistente." });
      }
      if (!url.pathname.startsWith("/infotec/admin/")) {
        res.writeHead(404);
        return res.end("Next.js is intentionally unavailable");
      }
      const relative = url.pathname.slice("/infotec/admin/".length) || "index.html";
      const file = path.resolve(root, relative);
      if (!file.startsWith(root)) {
        res.writeHead(403);
        return res.end();
      }
      const data = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".woff2")
              ? "font/woff2"
              : "text/html",
      });
      res.end(data);
    } catch (error) {
      json(res, 500, { message: String(error) });
    }
  })
  .listen(4194, "127.0.0.1");
