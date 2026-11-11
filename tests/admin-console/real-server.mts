import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const source = process.env.ADMIN_SERVICE_SOURCE!;
const require = createRequire(join(source, "package.json"));
const load = async (file: string) => require(join(source, file));
const [
  { createApp },
  { OperationManager },
  { SecretBox },
  { MemoryStore, actor },
  { AdminProtocolError },
  { AdapterUncertainError },
] = await Promise.all([
  load("src/app.ts"),
  load("src/operations.ts"),
  load("src/security.ts"),
  load("tests/helpers.ts"),
  load("protocol/admin-protocol.ts"),
  load("src/adapters.ts"),
]);

// Fake only owning services and storage; HTTP, session/CSRF, routing and operation state
// machines are the actual admin-service implementations.
class BrowserMemoryStore extends MemoryStore {
  async audit(filter: Record<string, unknown>) {
    const events = this.events.filter(
      (event: any) =>
        (!filter.environment || event.environment === filter.environment) &&
        (!filter.tenant || event.tenant === filter.tenant) &&
        (!filter.source || event.source === filter.source),
    );
    return {
      entries: events
        .slice(-Number(filter.limit))
        .reverse()
        .map((event: any) => ({
          id: event.id,
          operationId: event.operationId,
          timestamp: event.createdAt,
          actor: event.actor,
          environment: event.environment,
          tenant: event.tenant,
          source: event.source,
          resource: event.target,
          action: event.action,
          state: event.state,
          changes: event.result?.changes,
          message: event.message,
        })),
    };
  }
}
let revision = 1,
  authOnline = true,
  uncertain = false,
  calls: any[] = [],
  status = "online";
const receipts = new Map<string, any>();
const values: Record<string, any> = {
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
    description: "Recursos de IA",
    category: "Recursos",
    type: "boolean",
  },
  {
    key: "timeout",
    label: "Tempo de espera",
    description: "Em minutos",
    category: "Atendimento",
    type: "number",
    min: 1,
    max: 30,
  },
  {
    key: "label",
    label: "Nome de exibição",
    description: "Nome público",
    category: "CRM",
    type: "string",
  },
  {
    key: "mode",
    label: "Modo",
    description: "Modo de operação",
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
    description: "Opções JSON",
    category: "Integrações",
    type: "json",
  },
  {
    key: "api_key",
    label: "Chave do provedor",
    description: "Credencial protegida",
    category: "Integrações",
    type: "secret",
  },
];
function snapshot(command: any) {
  const tenant = command.tenant ?? "infotec",
    source = command.source ?? "whatsapp";
  const resources = ["channels", "storage"].includes(source)
    ? [{ id: 5, label: "Recurso comercial" }]
    : undefined;
  const missingResource = resources && command.target?.resourceId === undefined;
  return {
    source,
    tenant,
    target: command.target,
    revision: `r${revision}`,
    catalog: missingResource ? [] : catalog,
    values: missingResource ? {} : { ...values, label: `${tenant} · Empresa` },
    secrets: { api_key: { configured: true } },
    resources,
    unavailableReason: missingResource ? "Selecione um registro para consultar." : undefined,
    application: { state: revision > 1 ? "pending" : "applied", revision: `r${revision}` },
  };
}
const store = new BrowserMemoryStore();
const adapters = {
  async authorize(bearer: string) {
    if (!authOnline) throw new AdminProtocolError(503, "Users indisponível");
    if (bearer !== "Bearer fixture-admin") throw new AdminProtocolError(403, "Somente infotec");
    return actor;
  },
  async execute(command: any) {
    if (command.action === "authorizeActor") {
      if (!authOnline) throw new AdminProtocolError(503, "Users indisponível");
      return { actor };
    }
    if (command.action === "listTenants")
      return {
        tenants: [
          { id: "infotec", name: "Infotec" },
          { id: "cliente", name: "Cliente" },
        ],
      };
    if (command.action === "getTargets")
      return {
        targets: [
          { id: 7, label: "Ana", active: true },
          { id: 8, label: "Bruno", active: false },
        ],
      };
    if (command.action === "getSettings") return snapshot(command);
    if (command.action === "getReceipt")
      return receipts.get(command.operationId) ?? { found: false };
    if (command.action === "getLogs")
      return { entries: [{ id: "processing1", message: "Processamento redigido" }] };
    calls.push({ path: command.source, method: command.action, body: command });
    if (command.revision !== `r${revision}`)
      throw new AdminProtocolError(409, "A configuração mudou. Recarregue antes de salvar.");
    const changes = (command.changes ?? []).map((change: any) =>
      change.key === "api_key"
        ? { key: change.key, secretAction: "replaced" }
        : { key: change.key, before: values[change.key], after: change.value },
    );
    for (const change of command.changes ?? [])
      if (change.key !== "api_key")
        values[change.key] = change.action === "set" ? change.value : null;
    if (command.changes?.length) revision++;
    const result = {
      operationId: command.operationId,
      state: "COMMITTED",
      snapshot: snapshot(command),
      changes,
    };
    receipts.set(command.operationId, result);
    if (uncertain) {
      uncertain = false;
      throw new AdapterUncertainError();
    }
    return result;
  },
};
const server = {
  async list(environment: string) {
    return {
      services: [
        {
          id: "users",
          name: environment === "homolog" ? "homolog-users-service" : "users-service",
          status,
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
    };
  },
  service(environment: string, id: string) {
    return { environment, id };
  },
  configurations: {
    async snapshot(service: any) {
      return snapshot({ source: "server", tenant: "", target: { resourceId: service.id } });
    },
  },
  async execute(payload: any, _actor: unknown, operationId: string) {
    if (payload.action === "stop") {
      status = "stopped";
      authOnline = false;
    }
    if (["start", "restart"].includes(payload.action)) {
      status = "online";
      authOnline = true;
    }
    const result = {
      operationId,
      state: "COMMITTED",
      changes: [],
      application: { state: "unknown" },
    };
    receipts.set(operationId, result);
    return result;
  },
  async receipt(id: string) {
    return receipts.get(id);
  },
};
const operations = new OperationManager(
  store,
  adapters,
  server,
  new SecretBox(randomBytes(32).toString("base64")),
  "fixture-revision-key".repeat(4),
);
const config = {
  environment: "production",
  environments: ["production", "homolog"],
  origin: "http://127.0.0.1:4194",
  secureCookie: false,
  webDirectory: fileURLToPath(new URL("../../dist-admin/", import.meta.url)),
};
const app = createApp({
  config,
  store,
  adapters,
  operations,
  server,
  logs: {
    async read() {
      return {
        entries: [
          {
            id: "log1",
            timestamp: "2026-11-11T12:00:00Z",
            level: "INFO",
            service: "users",
            message: "Processamento concluído <script>alert('x')</script> credential=[REDACTED]",
          },
        ],
      };
    },
  },
});
// Fixture controls live outside the public admin prefix and are never part of deployment.
app.use("/__fixture", async (req: any, res: any) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const data = body ? JSON.parse(body) : {};
  if (req.path === "/reset") {
    revision = 1;
    authOnline = !data.anonymous;
    uncertain = false;
    calls = [];
    status = "online";
    values.feature_ai_enabled = false;
    values.timeout = 2;
    store.sessions.clear();
    store.operations.clear();
    store.events = [];
    receipts.clear();
  }
  if (req.path === "/advance") revision++;
  if (req.path === "/uncertain") uncertain = true;
  if (req.path === "/reconcile") await operations.recover();
  res.json({ calls });
});
app.listen(4194, "127.0.0.1");
