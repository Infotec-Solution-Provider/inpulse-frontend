import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Switch,
  TextField,
} from "@mui/material";
import { Save, RotateCcw, RefreshCw, KeyRound, Check, Play } from "lucide-react";
import { api, AdminError } from "./client";
import { compileChanges, displayValue, searchableField, type Draft } from "./model";
import type { Change, Operation, Setting, Snapshot } from "./types";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível concluir a operação.";
const applicationLabels = {
  applied: "Em execução",
  pending: "Aplicação pendente",
  build_required: "Build necessário",
  unknown: "Execução a conferir",
};
const effectLabels = {
  dynamic: "Efeito imediato ao salvar",
  reload: "Próximo carregamento",
  restart: "Requer aplicação / reinício",
  build: "Requer novo build",
};

export interface EditorProps {
  identity: string;
  label: string;
  load: (signal?: AbortSignal) => Promise<Snapshot>;
  save: (operationId: string, revision: string, changes: Change[]) => Promise<Operation>;
  apply: (operationId: string, revision: string) => Promise<Operation>;
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
  onResources?: (resources: NonNullable<Snapshot["resources"]>) => void;
}

export function ConfigEditor(props: EditorProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [operation, setOperation] = useState<Operation | null>(null);
  const [confirmation, setConfirmation] = useState<"save" | "apply" | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState("all");
  const [conflicted, setConflicted] = useState(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const pendingKey = `inpulse-admin-operation:${props.identity}`;
  const compiled = snapshot ? compileChanges(snapshot, drafts) : { changes: [], errors: {} };
  const dirty = compiled.changes.length > 0 || Object.keys(compiled.errors).length > 0;
  const unresolved =
    operation !== null && !["COMMITTED", "NOT_COMMITTED"].includes(operation.state);
  const busy = loading || sending || unresolved;
  useEffect(() => {
    props.onDirty(dirty);
  }, [dirty]);
  useEffect(() => {
    // Reads can be cancelled when changing target; writes need a receipt first.
    props.onBusy(sending || unresolved);
  }, [sending, unresolved]);

  const accept = (next: Snapshot) => {
    setSnapshot(next);
    setDrafts({});
    setError("");
    setConflicted(false);
    props.onResources?.(next.resources ?? []);
  };
  const load = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await props.load(controller.signal);
      if (mounted.current && !controller.signal.aborted) accept(data);
    } catch (err) {
      if (mounted.current && !controller.signal.aborted) setError(errorMessage(err));
    } finally {
      if (mounted.current && !controller.signal.aborted) setLoading(false);
    }
  };
  useEffect(() => {
    mounted.current = true;
    void load();
    try {
      const id = sessionStorage.getItem(pendingKey);
      if (id) setOperation({ operationId: id, state: "UNKNOWN" });
    } catch {
      /* Optional operation receipt bookmark. */
    }
    return () => {
      mounted.current = false;
      request.current?.abort();
      props.onDirty(false);
      props.onBusy(false);
    };
  }, [props.identity]);

  const finish = async (next: Operation) => {
    if (!mounted.current) return;
    setOperation(next);
    if (next.state === "COMMITTED") {
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* Optional storage. */
      }
      // Clear every secret draft once the receipt confirms persistence.
      setDrafts({});
      setNotice(
        next.result?.message || next.message || "Operação confirmada. Configuração atualizada.",
      );
      if (next.result?.snapshot) accept(next.result.snapshot);
      else await load();
      if (mounted.current) setOperation(null);
    } else if (next.state === "NOT_COMMITTED") {
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* Optional storage. */
      }
      setError(next.message || "A operação não foi gravada. Revise e tente novamente.");
    }
  };
  const reconcile = async () => {
    if (!operation || sending) return;
    setSending(true);
    try {
      await finish(await api.operation(operation.operationId));
    } catch (err) {
      if (mounted.current)
        setError(`${errorMessage(err)} Confira o histórico antes de repetir a alteração.`);
    } finally {
      if (mounted.current) setSending(false);
    }
  };
  useEffect(() => {
    if (!operation || !["ACCEPTED", "RUNNING"].includes(operation.state)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .operation(operation.operationId)
        .then((next) => {
          if (!cancelled) void finish(next);
        })
        .catch((err) => {
          if (!cancelled) {
            setOperation({ ...operation, state: "UNKNOWN" });
            setError(errorMessage(err));
          }
        });
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [operation]);

  const execute = async () => {
    if (!snapshot || !confirmation || busy) return;
    const action = confirmation;
    setConfirmation(null);
    setSending(true);
    setError("");
    setNotice("");
    const id = crypto.randomUUID();
    try {
      sessionStorage.setItem(pendingKey, id);
    } catch {
      /* The server audit remains authoritative. */
    }
    setOperation({ operationId: id, state: "RUNNING" });
    try {
      const next =
        action === "save"
          ? await props.save(id, snapshot.revision, compiled.changes)
          : await props.apply(id, snapshot.revision);
      if (mounted.current) await finish({ ...next, operationId: id });
    } catch (err) {
      if (!mounted.current) return;
      if (err instanceof AdminError && [400, 403, 409, 422].includes(err.status)) {
        if (err.status === 409) setConflicted(true);
        setOperation(null);
        try {
          sessionStorage.removeItem(pendingKey);
        } catch {
          /* Optional storage. */
        }
        setError(
          `${errorMessage(err)}${err.status === 409 ? " Descarte o rascunho e recarregue os valores antes de salvar." : ""}`,
        );
      } else {
        setOperation({ operationId: id, state: "UNKNOWN" });
        setError(
          `${errorMessage(err)} O resultado ainda precisa ser conferido. A operação não será reenviada automaticamente.`,
        );
      }
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  const visible =
    snapshot?.catalog.filter(
      (field) =>
        searchableField(field, search) &&
        (!category || field.category === category) &&
        (filter === "all" ||
          (filter === "changed" && drafts[field.key]) ||
          (filter === "flags" && field.type === "boolean") ||
          (filter === "secrets" && field.type === "secret")),
    ) ?? [];
  const categories = [...new Set(visible.map((field) => field.category))];
  const changeDraft = (key: string, draft: Draft | null) =>
    setDrafts((current) => {
      const next = { ...current };
      if (draft) next[key] = draft;
      else delete next[key];
      return next;
    });

  return (
    <div className="admin-stack">
      {error && <Alert severity="error">{error}</Alert>}
      {notice && (
        <Alert severity="success" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}
      {unresolved && (
        <Alert
          severity={operation.state === "UNKNOWN" ? "warning" : "info"}
          action={
            <Button disabled={sending} color="inherit" onClick={() => void reconcile()}>
              Conferir resultado
            </Button>
          }
        >
          {operation.state === "UNKNOWN" ? "Resultado a conferir" : "Operação em andamento"} ·{" "}
          <code>{operation.operationId}</code>. Aguarde a confirmação antes de outra alteração.
        </Alert>
      )}
      {loading ? (
        <div className="admin-empty">
          <CircularProgress size={26} aria-label="Carregando parâmetros" />
        </div>
      ) : !snapshot ? (
        <div className="admin-empty">
          <Button onClick={() => void load()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          {snapshot.unavailableReason && (
            <Alert severity="warning">{snapshot.unavailableReason}</Alert>
          )}
          <div className="admin-toolbar">
            <TextField
              className="admin-search"
              label="Buscar parâmetro, chave ou descrição"
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TextField
              select
              label="Categoria"
              size="small"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {[...new Set(snapshot.catalog.map((field) => field.category))].map((group) => (
                <MenuItem key={group} value={group}>
                  {group}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Exibir"
              size="small"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="flags">Feature flags</MenuItem>
              <MenuItem value="secrets">Credenciais</MenuItem>
              <MenuItem value="changed">Alterados</MenuItem>
            </TextField>
            <Button
              startIcon={<RefreshCw size={16} />}
              disabled={busy || dirty}
              onClick={() => void load()}
            >
              Recarregar
            </Button>
          </div>
          {snapshot.application && (
            <Alert
              severity={snapshot.application.state === "applied" ? "success" : "info"}
              icon={snapshot.application.state === "applied" ? <Check size={18} /> : undefined}
            >
              {applicationLabels[snapshot.application.state]}
              {snapshot.application.message ? ` · ${snapshot.application.message}` : ""}
            </Alert>
          )}
          {categories.map((group) => (
            <section key={group} className="admin-card">
              <h2 className="admin-card-title">
                {group}{" "}
                <span className="admin-metadata">
                  · {visible.filter((field) => field.category === group).length}
                </span>
              </h2>
              {visible
                .filter((field) => field.category === group)
                .map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    snapshot={snapshot}
                    draft={drafts[field.key]}
                    disabled={busy || !!snapshot.unavailableReason}
                    error={compiled.errors[field.key]}
                    onChange={(draft) => changeDraft(field.key, draft)}
                  />
                ))}
            </section>
          ))}
          {!visible.length && (
            <div className="admin-card admin-empty">
              {snapshot.catalog.length
                ? "Nenhum parâmetro corresponde aos filtros."
                : "Selecione um registro, quando disponível, para consultar as configurações."}
            </div>
          )}
          <div className="admin-savebar">
            <span role="status">
              {dirty
                ? `${compiled.changes.length} alteração(ões) pendente(s)`
                : "Nenhuma alteração pendente"}
            </span>
            <div className="admin-actions">
              <Button
                disabled={busy || !dirty}
                onClick={() => {
                  setDrafts({});
                  setError("");
                }}
              >
                Descartar
              </Button>
              <Button
                variant="contained"
                startIcon={
                  sending ? <CircularProgress size={15} color="inherit" /> : <Save size={16} />
                }
                disabled={
                  busy ||
                  conflicted ||
                  !compiled.changes.length ||
                  Object.keys(compiled.errors).length > 0
                }
                onClick={() => setConfirmation("save")}
              >
                Salvar alterações
              </Button>
              {snapshot.application &&
                ["pending", "unknown"].includes(snapshot.application.state) && (
                  <Button
                    variant="outlined"
                    startIcon={<Play size={16} />}
                    disabled={busy || dirty || conflicted}
                    onClick={() => setConfirmation("apply")}
                  >
                    Aplicar versão salva
                  </Button>
                )}
            </div>
          </div>
        </>
      )}
      <Dialog open={!!confirmation} onClose={() => setConfirmation(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {confirmation === "save" ? "Salvar alterações?" : "Aplicar versão salva?"}
        </DialogTitle>
        <DialogContent>
          <p>{props.label}</p>
          {confirmation === "save" ? (
            <ul className="admin-diff">
              {compiled.changes.map((change) => (
                <li key={change.key}>
                  <code>{change.key}</code> ·{" "}
                  {change.action === "remove"
                    ? "remover"
                    : change.action === "reset"
                      ? "restaurar padrão / herança"
                      : snapshot?.catalog.find((field) => field.key === change.key)?.type ===
                          "secret"
                        ? "substituir credencial"
                        : `${JSON.stringify(snapshot?.values[change.key]) ?? "Não definido"} → ${JSON.stringify(change.value)?.slice(0, 200) ?? "Não definido"}`}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              A versão salva será aplicada a este destino. Essa ação pode reconectar integrações ou
              reiniciar o processo indicado. O rascunho não será aplicado.
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmation(null)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void execute()}>
            Confirmar {confirmation === "save" ? "salvamento" : "aplicação"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function Field({
  field,
  snapshot,
  draft,
  disabled,
  error,
  onChange,
}: {
  field: Setting;
  snapshot: Snapshot;
  draft?: Draft;
  disabled: boolean;
  error?: string;
  onChange: (draft: Draft | null) => void;
}) {
  const inherited = snapshot.inherited?.[field.key];
  const raw =
    draft?.action === "reset"
      ? (inherited?.value ?? field.defaultValue)
      : (snapshot.values[field.key] ?? inherited?.value ?? field.defaultValue);
  const isSecret = field.type === "secret";
  const value =
    draft?.action === "set"
      ? draft.input
      : isSecret || draft?.action === "remove"
        ? ""
        : field.type === "enum"
          ? JSON.stringify(raw ?? null)
          : displayValue(field, raw);
  const blocked = disabled || field.readOnly || !!field.unavailableReason;
  const set = (input: string) => onChange({ action: "set", input });
  return (
    <div className="admin-setting" data-testid={`setting-${field.key}`}>
      <div>
        <div className="admin-setting-heading">
          {isSecret && <KeyRound size={15} />}
          {field.label}
          {draft && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={
                draft.action === "reset"
                  ? "Restaurar ao salvar"
                  : draft.action === "remove"
                    ? "Remover ao salvar"
                    : "Alterado"
              }
            />
          )}
          {field.readOnly && <Chip size="small" label="Somente leitura" />}
        </div>
        <code>{field.key}</code>
        <p>{field.description}</p>
        {field.applyMode && <p>{effectLabels[field.applyMode]}</p>}
        {inherited && (
          <p>
            Herdado de {inherited.source}
            {isSecret ? "" : ` · ${displayValue(field, inherited.value) || "Não definido"}`}
          </p>
        )}
        {field.unavailableReason && <p>{field.unavailableReason}</p>}
      </div>
      <div className="admin-setting-input">
        {isSecret && (
          <div className="admin-metadata">
            {snapshot.secrets?.[field.key]?.configured
              ? "Credencial configurada · valor protegido"
              : "Nenhuma credencial configurada"}
          </div>
        )}
        {field.type === "boolean" ? (
          <div className="admin-setting-actions">
            <span className="admin-metadata">{value === "true" ? "Ativado" : "Desativado"}</span>
            <Switch
              checked={value === "true"}
              disabled={blocked}
              slotProps={{ input: { "aria-label": field.label } }}
              onChange={(_, checked) => set(String(checked))}
            />
          </div>
        ) : field.type === "enum" ? (
          <TextField
            select
            label={field.label}
            size="small"
            fullWidth
            value={
              field.options?.some((option) => JSON.stringify(option.value) === value) ? value : ""
            }
            disabled={blocked}
            onChange={(event) => set(event.target.value)}
          >
            {field.options?.map((option) => (
              <MenuItem key={JSON.stringify(option.value)} value={JSON.stringify(option.value)}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            label={isSecret ? "Nova credencial (vazio preserva)" : field.unit || field.label}
            size="small"
            fullWidth
            multiline={field.type === "json"}
            minRows={field.type === "json" ? 4 : undefined}
            type={isSecret ? "password" : field.type === "number" ? "number" : "text"}
            value={value}
            autoComplete={isSecret ? "new-password" : "off"}
            disabled={blocked}
            error={!!error}
            helperText={error}
            slotProps={{
              htmlInput: {
                "aria-label": field.label,
                min: field.min,
                max: field.max,
                step: field.step ?? 1,
                spellCheck: false,
              },
            }}
            onChange={(event) => set(event.target.value)}
          />
        )}
        <div className="admin-setting-actions">
          {draft && (
            <Button size="small" disabled={disabled} onClick={() => onChange(null)}>
              Desfazer
            </Button>
          )}
          {!isSecret && field.canReset !== false && !field.readOnly && (
            <Button
              size="small"
              startIcon={<RotateCcw size={13} />}
              disabled={blocked || draft?.action === "reset"}
              onClick={() => onChange({ action: "reset", input: "" })}
            >
              Usar padrão
            </Button>
          )}
          {isSecret && snapshot.secrets?.[field.key]?.configured && !field.readOnly && (
            <Button
              size="small"
              color="error"
              disabled={blocked || draft?.action === "remove"}
              onClick={() => onChange({ action: "remove", input: "" })}
            >
              Remover credencial
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
