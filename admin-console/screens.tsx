import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { RefreshCw, Settings2, Play, Square, RotateCw, ArrowLeft } from "lucide-react";
import { api, AdminError } from "./client";
import { ConfigEditor } from "./config-editor";
import type {
  AuditEntry,
  Environment,
  LogEntry,
  Operation,
  Service,
  Source,
  Target,
  TargetOption,
  Tenant,
} from "./types";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível carregar os dados.";
const environmentName = (env: Environment) => (env === "production" ? "Produção" : "Homologação");
const date = (value?: string) => (value ? new Date(value).toLocaleString("pt-BR") : "—");
const bytes = (value: number) => `${Math.round(value / 1024 / 1024)} MB`;

export function useRead<T>(read: (signal: AbortSignal) => Promise<T>, dependencies: unknown[]) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    Promise.resolve()
      .then(() => read(controller.signal))
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(message(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [...dependencies, reload]);
  return { data, error, loading, reload: () => setReload((value) => value + 1) };
}
export interface ScreenProps {
  environment: Environment;
  actorId: number;
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
  canLeave: () => boolean;
}

export function TenantScreen({
  environment: env,
  actorId,
  onDirty,
  onBusy,
  canLeave,
}: ScreenProps) {
  const tenants = useRead((signal) => api.tenants(env, signal), [env]);
  const sources = useRead((signal) => api.sources(env, signal), [env]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [scope, setScope] = useState<"INSTANCE" | "SECTOR" | "USER">("INSTANCE");
  const [targetOption, setTargetOption] = useState<TargetOption | null>(null);
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState<TargetOption | null>(null);
  const [resources, setResources] = useState<TargetOption[]>([]);
  const receiveResources = useCallback((items: TargetOption[]) => {
    if (items.length) setResources(items);
  }, []);
  useEffect(() => {
    const list = tenants.data?.tenants;
    if (list) setTenant((current) => current ?? list.find((item) => item.id === "infotec") ?? null);
  }, [tenants.data]);
  useEffect(() => {
    const list = sources.data?.sources;
    if (list)
      setSource(
        (current) =>
          current ??
          list.find((item) => item.id === "whatsapp" && item.available) ??
          list.find((item) => item.available) ??
          null,
      );
  }, [sources.data]);
  const canScope = !!source && ["whatsapp", "smtp"].includes(source.id);
  const effectiveScope = source?.id === "sip-user" ? "USER" : scope;
  const options = useRead(
    async (signal) => {
      if (!tenant || !source || effectiveScope === "INSTANCE")
        return { targets: [] as TargetOption[] };
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return api.targets(env, tenant.id, source.id, effectiveScope, search, signal);
    },
    [env, tenant?.id, source?.id, effectiveScope, search],
  );
  const target: Target = {
    scope: effectiveScope,
    ...(effectiveScope === "USER" && targetOption ? { userId: Number(targetOption.id) } : {}),
    ...(effectiveScope === "SECTOR" && targetOption ? { sectorId: Number(targetOption.id) } : {}),
    ...(resource ? { resourceId: resource.id } : {}),
  };
  const ready = tenant && source?.available && (effectiveScope === "INSTANCE" || targetOption);
  const clearTarget = () => {
    setScope("INSTANCE");
    setTargetOption(null);
    setResource(null);
    setResources([]);
    setSearch("");
  };
  const identity = `${actorId}:${env}:${tenant?.id}:${source?.id}:${JSON.stringify(target)}`;
  const load = useCallback(
    (signal?: AbortSignal) => api.settings(env, tenant!.id, source!.id, target, signal),
    [identity],
  );
  const save = useCallback(
    (operationId: string, revision: string, changes: Parameters<typeof api.save>[3]["changes"]) =>
      api.save(env, tenant!.id, source!.id, { operationId, revision, target, changes }),
    [identity],
  );
  const apply = useCallback(
    (operationId: string, revision: string) =>
      api.apply(env, tenant!.id, source!.id, { operationId, revision, target }),
    [identity],
  );
  return (
    <div className="admin-stack">
      <Title
        title="Parâmetros dos tenants"
        description="Consulte os recursos, credenciais e integrações de cada empresa. O tenant autenticado permanece infotec."
      />
      {(tenants.error || sources.error) && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => {
                tenants.reload();
                sources.reload();
              }}
            >
              Tentar novamente
            </Button>
          }
        >
          {tenants.error || sources.error}
        </Alert>
      )}
      <div className="admin-toolbar">
        <Autocomplete
          options={tenants.data?.tenants ?? []}
          value={tenant}
          loading={tenants.loading}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(item) => `${item.name} (${item.id})`}
          sx={{ flex: 1, minWidth: 250 }}
          onChange={(_, item) => {
            if (canLeave()) {
              setTenant(item);
              clearTarget();
            }
          }}
          renderInput={(params) => <TextField {...params} label="Tenant de destino" size="small" />}
        />
        <TextField
          select
          label="Configurações"
          size="small"
          value={source?.id ?? ""}
          sx={{ flex: 1, minWidth: 200 }}
          disabled={sources.loading}
          onChange={(event) => {
            if (canLeave()) {
              setSource(
                sources.data?.sources.find((item) => item.id === event.target.value) ?? null,
              );
              clearTarget();
            }
          }}
        >
          {sources.data?.sources.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.label}
              {!item.available ? " · indisponível" : ""}
            </MenuItem>
          ))}
        </TextField>
        {canScope && (
          <TextField
            select
            label="Escopo"
            size="small"
            value={scope}
            onChange={(event) => {
              if (canLeave()) {
                setScope(event.target.value as typeof scope);
                setTargetOption(null);
                setSearch("");
              }
            }}
          >
            <MenuItem value="INSTANCE">Instância</MenuItem>
            {source?.id === "whatsapp" && <MenuItem value="SECTOR">Setor</MenuItem>}
            <MenuItem value="USER">Usuário</MenuItem>
          </TextField>
        )}
        {tenant && source && effectiveScope !== "INSTANCE" && (
          <Autocomplete
            sx={{ flex: 1, minWidth: 230 }}
            options={options.data?.targets ?? []}
            value={targetOption}
            loading={options.loading}
            filterOptions={(items) => items}
            getOptionLabel={(item) => `${item.label}${item.active === false ? " · Inativo" : ""}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onInputChange={(_, value, reason) => {
              if (reason === "input") setSearch(value);
            }}
            onChange={(_, item) => {
              if (canLeave()) {
                setTargetOption(item);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={effectiveScope === "USER" ? "Usuário" : "Setor"}
                size="small"
              />
            )}
          />
        )}
        {resources.length > 0 && (
          <Autocomplete
            sx={{ flex: 1, minWidth: 230 }}
            options={resources}
            value={resource}
            getOptionLabel={(item) => item.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, item) => {
              if (canLeave()) setResource(item);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Registro"
                size="small"
                helperText="Vazio: configurações gerais da fonte"
              />
            )}
          />
        )}
      </div>
      {options.error && (
        <Alert severity="error" action={<Button onClick={options.reload}>Tentar novamente</Button>}>
          {options.error}
        </Alert>
      )}
      {source && !source.available && (
        <Alert severity="warning">
          {source.message || "Esta fonte ainda não está disponível no ambiente selecionado."}
        </Alert>
      )}
      {ready ? (
        <ConfigEditor
          key={identity}
          identity={identity}
          label={`${environmentName(env)} · ${tenant.name} (${tenant.id}) · ${source.label}${targetOption ? ` · ${targetOption.label}` : ""}${resource ? ` · ${resource.label}` : ""}`}
          load={load}
          save={save}
          apply={apply}
          onDirty={onDirty}
          onBusy={onBusy}
          onResources={receiveResources}
        />
      ) : (
        <div className="admin-card admin-empty">
          Selecione o tenant e o destino das configurações para continuar.
        </div>
      )}
    </div>
  );
}

export function ServerScreen({
  environment: env,
  actorId,
  onDirty,
  onBusy,
  canLeave,
}: ScreenProps) {
  const services = useRead((signal) => api.services(env, signal), [env]);
  const [selected, setSelected] = useState<Service | null>(null);
  const [confirm, setConfirm] = useState<{
    service: Service;
    action: "start" | "stop" | "restart" | "apply";
  } | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const pendingKey = `inpulse-admin-server-operation:${actorId}:${env}`;
  useEffect(() => {
    try {
      const id = sessionStorage.getItem(pendingKey);
      if (id) setOperation({ operationId: id, state: "UNKNOWN" });
    } catch {
      /* Optional receipt bookmark. */
    }
  }, [pendingKey]);
  const active = operation && !["COMMITTED", "NOT_COMMITTED"].includes(operation.state);
  useEffect(() => {
    onBusy(!!active || sending);
    return () => onBusy(false);
  }, [!!active, sending]);
  const finish = (next: Operation) => {
    setOperation(next);
    if (["COMMITTED", "NOT_COMMITTED"].includes(next.state)) {
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* Optional receipt bookmark. */
      }
    }
    if (next.state === "COMMITTED") {
      services.reload();
      setError("");
    }
    if (next.state === "NOT_COMMITTED") setError(next.message || "Operação não aplicada.");
  };
  useEffect(() => {
    if (!operation || !["ACCEPTED", "RUNNING"].includes(operation.state)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .operation(operation.operationId)
        .then((next) => {
          if (!cancelled) finish(next);
        })
        .catch((err) => {
          if (!cancelled) {
            setOperation({ ...operation, state: "UNKNOWN" });
            setError(message(err));
          }
        });
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [operation]);
  const execute = async () => {
    if (!confirm || sending || active) return;
    const command = confirm;
    setConfirm(null);
    setSending(true);
    setError("");
    const id = crypto.randomUUID();
    try {
      sessionStorage.setItem(pendingKey, id);
    } catch {
      /* The server audit remains authoritative. */
    }
    setOperation({ operationId: id, state: "RUNNING" });
    try {
      finish(
        await api.serviceAction(env, command.service.id, {
          operationId: id,
          action: command.action,
          ...(command.action === "apply"
            ? { revision: command.service.configuration.savedRevision }
            : {}),
        }),
      );
    } catch (err) {
      if (err instanceof AdminError && [400, 403, 409, 422].includes(err.status)) {
        finish({ operationId: id, state: "NOT_COMMITTED", message: message(err) });
      } else {
        setOperation({ operationId: id, state: "UNKNOWN" });
        setError(`${message(err)} Confira o resultado antes de repetir.`);
      }
    } finally {
      setSending(false);
    }
  };
  const identity = `${actorId}:${env}:server:${selected?.id}`;
  const load = useCallback(
    (signal?: AbortSignal) => api.serviceConfig(env, selected!.id, signal),
    [identity],
  );
  const save = useCallback(
    (
      operationId: string,
      revision: string,
      changes: Parameters<typeof api.saveService>[2]["changes"],
    ) => api.saveService(env, selected!.id, { operationId, revision, changes }),
    [identity],
  );
  const apply = useCallback(
    (operationId: string, revision: string) =>
      api.serviceAction(env, selected!.id, { operationId, action: "apply", revision }),
    [identity],
  );
  return (
    <div className="admin-stack">
      <Title
        title={selected ? `Configuração · ${selected.name}` : "Servidor"}
        description="Acompanhe os processos existentes, edite configurações e aplique mudanças em uma ação separada."
        actions={
          selected ? (
            <Button
              startIcon={<ArrowLeft size={16} />}
              onClick={() => {
                if (canLeave()) setSelected(null);
              }}
            >
              Voltar aos processos
            </Button>
          ) : (
            <Button
              startIcon={<RefreshCw size={16} />}
              disabled={services.loading || !!active}
              onClick={services.reload}
            >
              Atualizar
            </Button>
          )
        }
      />
      {selected ? (
        <ConfigEditor
          key={identity}
          identity={identity}
          label={`${environmentName(env)} · servidor · ${selected.name}`}
          load={load}
          save={save}
          apply={apply}
          onDirty={onDirty}
          onBusy={onBusy}
        />
      ) : (
        <>
          {(services.error || error) && <Alert severity="error">{services.error || error}</Alert>}
          {operation && (
            <Alert
              severity={operation.state === "COMMITTED" ? "success" : "warning"}
              action={
                active ? (
                  <div className="admin-actions">
                    <Button
                      disabled={sending}
                      onClick={() => {
                        setSending(true);
                        api
                          .operation(operation.operationId)
                          .then(finish)
                          .catch((err) => setError(message(err)))
                          .finally(() => setSending(false));
                      }}
                    >
                      Conferir resultado
                    </Button>
                    {operation.state === "UNKNOWN" && (
                      <Button disabled={sending} onClick={() => setConfirmRelease(true)}>
                        Encerrar acompanhamento
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            >
              Operação {operation.state} · <code>{operation.operationId}</code>
              {operation.message ? ` · ${operation.message}` : ""}
            </Alert>
          )}
          <div className="admin-card admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Processo</th>
                  <th>Estado</th>
                  <th>Uso</th>
                  <th>Saúde</th>
                  <th>Configuração</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {services.data?.services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div className="admin-process-name">{service.name}</div>
                      <code>{service.id}</code>
                      <div className="admin-metadata">{service.restarts} reinício(s)</div>
                    </td>
                    <td>
                      <Chip
                        size="small"
                        label={service.status}
                        color={service.status === "online" ? "success" : "default"}
                      />
                    </td>
                    <td>
                      {service.cpu}% CPU
                      <br />
                      {bytes(service.memory)}
                    </td>
                    <td>
                      {service.health.status}
                      <div className="admin-metadata">{service.health.message}</div>
                    </td>
                    <td>{service.configuration.state}</td>
                    <td>
                      <div className="admin-actions">
                        <Button
                          size="small"
                          disabled={!!active || sending}
                          startIcon={<Settings2 size={14} />}
                          onClick={() => setSelected(service)}
                        >
                          Configurar
                        </Button>
                        <Button
                          size="small"
                          disabled={!!active || sending || service.status === "online"}
                          aria-label={`Iniciar ${service.name}`}
                          onClick={() => setConfirm({ service, action: "start" })}
                        >
                          <Play size={15} />
                        </Button>
                        <Button
                          size="small"
                          disabled={!!active || sending || service.status !== "online"}
                          aria-label={`Parar ${service.name}`}
                          onClick={() => setConfirm({ service, action: "stop" })}
                        >
                          <Square size={14} />
                        </Button>
                        <Button
                          size="small"
                          disabled={!!active || sending}
                          aria-label={`Reiniciar ${service.name}`}
                          onClick={() => setConfirm({ service, action: "restart" })}
                        >
                          <RotateCw size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {services.loading && (
              <div className="admin-empty">
                <CircularProgress size={24} aria-label="Carregando processos" />
              </div>
            )}
            {!services.loading && !services.error && !services.data?.services.length && (
              <div className="admin-empty">Nenhum processo cadastrado neste ambiente.</div>
            )}
          </div>
        </>
      )}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar ação no servidor</DialogTitle>
        <DialogContent>
          <p>
            <strong>
              {environmentName(env)} · {confirm?.service.name}
            </strong>
          </p>
          <p>
            {confirm?.action === "stop"
              ? "Parar"
              : confirm?.action === "start"
                ? "Iniciar"
                : confirm?.action === "apply"
                  ? "Aplicar configuração e reiniciar"
                  : "Reiniciar"}{" "}
            este processo? A disponibilidade dos recursos atendidos por ele pode ser afetada.
          </p>
          <p>
            A central permanece disponível. Se a sessão expirar com o serviço de autenticação
            parado, o acesso de recuperação será por SSH.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirm?.action === "stop" ? "error" : "primary"}
            onClick={() => void execute()}
          >
            Confirmar ação
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmRelease}
        onClose={() => setConfirmRelease(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Encerrar acompanhamento?</DialogTitle>
        <DialogContent>
          <p>
            O resultado da operação continua indeterminado no histórico. Apenas o acompanhamento
            local será encerrado. Nenhuma ação será reenviada. Confira o estado atualizado dos
            processos antes de outro comando.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRelease(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={sending}
            onClick={() => {
              if (operation?.state !== "UNKNOWN") return;
              try {
                sessionStorage.removeItem(pendingKey);
              } catch {
                /* Local bookmark only. */
              }
              setConfirmRelease(false);
              setOperation(null);
              setError("");
              services.reload();
            }}
          >
            Encerrar acompanhamento
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export function LogsScreen({ environment: env }: { environment: Environment }) {
  const [filters, setFilters] = useState({
    source: "pm2",
    service: "",
    stream: "out",
    tenant: "",
    from: "",
    to: "",
    level: "",
    identifier: "",
    search: "",
  });
  const [applied, setApplied] = useState(filters),
    [cursor, setCursor] = useState<string | undefined>(),
    [follow, setFollow] = useState(false);
  const data = useRead(
    (signal) =>
      applied.source === "pm2" && !applied.service
        ? Promise.resolve({ entries: [] as LogEntry[], nextCursor: undefined, truncated: false })
        : api.logs(
            env,
            {
              ...applied,
              from: applied.from ? new Date(applied.from).toISOString() : "",
              to: applied.to ? new Date(applied.to).toISOString() : "",
              cursor,
              limit: 200,
            },
            signal,
          ),
    [env, applied, cursor],
  );
  const services = useRead((signal) => api.services(env, signal), [env]);
  const pre = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (!follow) return;
    const timer = setInterval(data.reload, 5000);
    return () => clearInterval(timer);
  }, [follow]);
  useEffect(() => {
    if (follow && pre.current) pre.current.scrollTop = pre.current.scrollHeight;
  }, [data.data, follow]);
  const field = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  return (
    <div className="admin-stack">
      <Title
        title="Logs"
        description="Consulte logs PM2 e registros de processamento. Os resultados são limitados e os valores sensíveis são protegidos no servidor."
      />
      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setCursor(undefined);
          setApplied({ ...filters });
        }}
      >
        <TextField
          select
          label="Origem dos logs"
          size="small"
          value={filters.source}
          onChange={(event) => field("source", event.target.value)}
        >
          <MenuItem value="pm2">PM2</MenuItem>
          <MenuItem value="processing">Processamento</MenuItem>
        </TextField>
        {filters.source === "pm2" ? (
          <>
            <TextField
              select
              label="Processo"
              size="small"
              value={filters.service}
              onChange={(event) => field("service", event.target.value)}
            >
              <MenuItem value="">Selecione</MenuItem>
              {services.data?.services.map((service) => (
                <MenuItem key={service.id} value={service.id}>
                  {service.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Saída"
              size="small"
              value={filters.stream}
              onChange={(event) => field("stream", event.target.value)}
            >
              <MenuItem value="out">Saída padrão</MenuItem>
              <MenuItem value="error">Erros</MenuItem>
            </TextField>
          </>
        ) : (
          <>
            <TextField
              label="Tenant"
              size="small"
              value={filters.tenant}
              onChange={(event) => field("tenant", event.target.value)}
            />
            <TextField
              label="Identificador"
              size="small"
              value={filters.identifier}
              onChange={(event) => field("identifier", event.target.value)}
            />
            <TextField
              label="Nível"
              size="small"
              value={filters.level}
              onChange={(event) => field("level", event.target.value)}
            />
          </>
        )}
        <TextField
          label="Início"
          type="datetime-local"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.from}
          onChange={(event) => field("from", event.target.value)}
        />
        <TextField
          label="Fim"
          type="datetime-local"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.to}
          onChange={(event) => field("to", event.target.value)}
        />
        <TextField
          className="admin-search"
          label="Busca literal"
          size="small"
          value={filters.search}
          onChange={(event) => field("search", event.target.value)}
        />
        <Button type="submit" variant="contained">
          Consultar logs
        </Button>
      </form>
      {data.error && <Alert severity="error">{data.error}</Alert>}
      <div className="admin-toolbar">
        <Button startIcon={<RefreshCw size={16} />} disabled={data.loading} onClick={data.reload}>
          Atualizar
        </Button>
        <Button
          variant={follow ? "contained" : "outlined"}
          onClick={() => {
            setFollow((value) => !value);
            setCursor(undefined);
          }}
        >
          {follow ? "Pausar acompanhamento" : "Acompanhar logs"}
        </Button>
        <span className="admin-metadata">
          {data.data?.entries.length ?? 0} registro(s)
          {data.data?.truncated ? " · resultados limitados" : ""}
        </span>
        {data.data?.nextCursor && (
          <Button
            onClick={() => {
              setCursor(data.data!.nextCursor);
              setFollow(false);
            }}
          >
            Próxima página
          </Button>
        )}
      </div>
      <section className="admin-card" aria-label="Conteúdo dos logs">
        <pre ref={pre} className="admin-log" aria-busy={data.loading}>
          {data.loading
            ? "Carregando logs…"
            : data.data?.entries
                .map(
                  (entry: LogEntry) =>
                    `${entry.timestamp ? date(entry.timestamp) + " " : ""}${entry.level ? `[${entry.level}] ` : ""}${entry.service ? entry.service + " · " : ""}${entry.message}`,
                )
                .join("\n") || "Nenhum registro para os filtros selecionados."}
        </pre>
      </section>
    </div>
  );
}

export function AuditScreen({ environment: env }: { environment: Environment }) {
  const [tenant, setTenant] = useState(""),
    [source, setSource] = useState(""),
    [filters, setFilters] = useState({ tenant: "", source: "" }),
    [cursor, setCursor] = useState<string | undefined>();
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const data = useRead(
    (signal) => api.audit({ environment: env, ...filters, cursor, limit: 100 }, signal),
    [env, filters, cursor],
  );
  return (
    <div className="admin-stack">
      <Title
        title="Histórico de alterações"
        description="Rastreie quem alterou cada configuração, o destino e a confirmação da operação. Credenciais aparecem somente como definidas, substituídas ou removidas."
      />
      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setCursor(undefined);
          setFilters({ tenant, source });
        }}
      >
        <TextField
          label="Tenant"
          size="small"
          value={tenant}
          onChange={(event) => setTenant(event.target.value)}
        />
        <TextField
          label="Fonte"
          size="small"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
        <Button type="submit" variant="contained">
          Filtrar histórico
        </Button>
        <Button startIcon={<RefreshCw size={16} />} onClick={data.reload} disabled={data.loading}>
          Atualizar
        </Button>
      </form>
      {data.error && <Alert severity="error">{data.error}</Alert>}
      <div className="admin-card admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data e ator</th>
              <th>Destino</th>
              <th>Ação</th>
              <th>Resultado</th>
              <th>Operação</th>
            </tr>
          </thead>
          <tbody>
            {data.data?.entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  {date(entry.timestamp)}
                  <div className="admin-metadata">
                    {entry.actor.name} · #{entry.actor.userId}
                  </div>
                </td>
                <td>
                  {entry.tenant || "Servidor"}
                  <div className="admin-metadata">
                    {entry.source}
                    {entry.resource
                      ? ` · ${typeof entry.resource === "string" ? entry.resource : JSON.stringify(entry.resource)}`
                      : ""}
                  </div>
                </td>
                <td>
                  {entry.action}
                  <div className="admin-metadata">{entry.changes?.length ?? 0} campo(s)</div>
                </td>
                <td>
                  <Chip
                    size="small"
                    label={entry.state}
                    color={entry.state === "COMMITTED" ? "success" : "default"}
                  />
                </td>
                <td>
                  <Button size="small" onClick={() => setSelected(entry)}>
                    Ver detalhes
                  </Button>
                  <br />
                  <code>{entry.operationId}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.loading && (
          <div className="admin-empty">
            <CircularProgress size={24} />
          </div>
        )}
        {!data.loading && !data.data?.entries.length && (
          <div className="admin-empty">Nenhuma operação encontrada.</div>
        )}
      </div>
      {data.data?.nextCursor && (
        <Button onClick={() => setCursor(data.data!.nextCursor)}>Próxima página</Button>
      )}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes da operação</DialogTitle>
        <DialogContent>
          {selected && (
            <>
              <p>
                {environmentName(selected.environment)} · {selected.tenant || "Servidor"} ·{" "}
                {selected.source}
              </p>
              <p>
                <code>{selected.operationId}</code>
              </p>
              <p>{selected.message}</p>
              <ul className="admin-diff">
                {selected.changes?.map((change) => (
                  <li key={change.key}>
                    <code>{change.key}</code> ·{" "}
                    {change.secretAction
                      ? {
                          defined: "Credencial definida",
                          replaced: "Credencial substituída",
                          removed: "Credencial removida",
                        }[change.secretAction]
                      : `${JSON.stringify(change.before) ?? "Não definido"} → ${JSON.stringify(change.after) ?? "Não definido"}`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function Title({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions}
    </div>
  );
}
