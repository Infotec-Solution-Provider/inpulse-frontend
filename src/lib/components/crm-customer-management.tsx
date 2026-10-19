"use client";
import { useAuthContext } from "@/app/auth-context";
import CustomerCrmClient from "@/lib/sdk-local/customer-crm.client";
import type {
  CustomerCrmBrandLink,
  CustomerCrmField,
  CustomerCrmFormOptions,
  CustomerCrmLookupOption,
  CustomerCrmRecord,
  CustomerCrmSnapshot,
  CustomerCrmValue,
} from "@/lib/sdk-local/types/customer-crm.types";
import {
  CRM_FIELD_GROUPS,
  crmErrorDetails,
  crmFormPayload,
  type CustomerCrmDraft,
} from "@/lib/crm-customer-form";
import { hybridCache } from "@/lib/cache/hybrid-cache";
import { createCacheScope } from "@/lib/cache/cache-scope";
import {
  Add,
  ArrowBack,
  DeleteOutline,
  EditOutlined,
  ExpandMore,
  Refresh,
  SaveOutlined,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface LookupOption extends CustomerCrmLookupOption {
  historical?: boolean;
}
const lookupKinds = {
  "customer-groups": "groups",
  positions: "positions",
  origins: "origins",
  medias: "medias",
  brands: "brands",
  units: "units",
  states: "states",
} as const;
function CrmLookup({
  api,
  kind,
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  api: CustomerCrmClient;
  kind: string;
  label: string;
  value: CustomerCrmValue | undefined;
  onChange: (value: CustomerCrmValue) => void;
  disabled: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [options, setOptions] = useState<LookupOption[]>([]),
    [loading, setLoading] = useState(false),
    [failed, setFailed] = useState(false),
    [hasMore, setHasMore] = useState(false);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    if (!open || disabled) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        let rows: CustomerCrmLookupOption[];
        let more = false;
        if (kind in lookupKinds) {
          const response = await api.registrationLookup(
            lookupKinds[kind as keyof typeof lookupKinds],
            search,
          );
          rows = response.data;
          more = response.page.hasNext;
        } else {
          const existing =
            kind === "segments"
              ? await api.getSegments()
              : kind === "operators"
                ? await api.getOperators()
                : await api.getCampaigns();
          const filtered = existing.filter(
            (row) =>
              !search ||
              (row.NOME ?? "")
                .toLocaleLowerCase("pt-BR")
                .includes(search.toLocaleLowerCase("pt-BR")),
          );
          rows = filtered.slice(0, 100).map((row) => ({ id: String(row.CODIGO), label: row.NOME }));
          more = filtered.length > 100;
        }
        if (request !== sequence.current) return;
        setOptions(rows.filter((row) => kind === "states" || Number(row.id) > 0));
        setHasMore(more);
      } catch {
        if (request === sequence.current) {
          setFailed(true);
          setOptions([]);
        }
      } finally {
        if (request === sequence.current) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      sequence.current += 1;
    };
  }, [api, disabled, kind, open, search]);
  const selected =
    value === undefined || value === null || value === ""
      ? null
      : (options.find((item) => item.id === String(value)) ?? {
          id: String(value),
          label: `Código ${value} (atual)`,
          historical: true,
        });
  return (
    <Autocomplete<LookupOption>
      fullWidth
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={selected}
      options={selected?.historical ? [selected, ...options] : options}
      disabled={disabled}
      loading={loading}
      filterOptions={(rows) => rows}
      getOptionLabel={(option) => option.label ?? `Código ${option.id}`}
      getOptionDisabled={(option) => Boolean(option.historical)}
      isOptionEqualToValue={(option, item) => option.id === item.id}
      onInputChange={(_, text, reason) => {
        if (reason === "input") setSearch(text);
      }}
      onChange={(_, option) =>
        onChange(option ? (kind === "states" ? option.id : Number(option.id)) : null)
      }
      noOptionsText={failed ? "Não foi possível buscar as opções" : "Nenhum cadastro encontrado"}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={Boolean(error)}
          helperText={
            error ||
            (failed
              ? "Tente abrir a lista novamente."
              : hasMore
                ? "Digite para refinar a busca."
                : undefined)
          }
        />
      )}
    />
  );
}
function CrmFields({
  api,
  fields,
  draft,
  setDraft,
  errors,
  disabled,
  manualCode,
  original,
}: {
  api: CustomerCrmClient;
  fields: CustomerCrmField[];
  draft: CustomerCrmDraft;
  setDraft: (draft: CustomerCrmDraft) => void;
  errors: Record<string, string>;
  disabled: boolean;
  manualCode?: boolean;
  original?: CustomerCrmRecord;
}) {
  const [expanded, setExpanded] = useState<string[]>(["identification"]);
  useEffect(() => {
    const first = fields.find((field) => errors[field.name]);
    if (first)
      setExpanded((current) =>
        current.includes(first.group) ? current : [...current, first.group],
      );
  }, [errors, fields]);
  const change = (name: string, value: CustomerCrmValue) => setDraft({ ...draft, [name]: value });
  const render = (field: CustomerCrmField) => {
    const value = draft[field.name],
      label = `${field.label}${field.required ? " *" : ""}`;
    if (field.lookup || field.name === "ESTADO")
      return (
        <CrmLookup
          key={field.name}
          api={api}
          kind={field.lookup ?? "states"}
          label={label}
          value={value}
          onChange={(next) => change(field.name, next)}
          disabled={disabled}
          error={errors[field.name]}
        />
      );
    if (field.type === "enum")
      return (
        <TextField
          key={field.name}
          select
          label={label}
          fullWidth
          value={value === undefined ? "__DEFAULT__" : value === null ? "__EMPTY__" : value}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value === "__DEFAULT__")
              setDraft({ ...draft, [field.name]: undefined });
            else change(field.name, event.target.value === "__EMPTY__" ? null : event.target.value);
          }}
          error={Boolean(errors[field.name])}
          helperText={errors[field.name]}
        >
          {!original && <MenuItem value="__DEFAULT__">Usar padrão do cadastro</MenuItem>}
          {field.nullable && <MenuItem value="__EMPTY__">Não informado</MenuItem>}
          {field.options?.map((option) => (
            <MenuItem key={option} value={option}>
              {(
                {
                  SIM: "Sim",
                  NAO: "Não",
                  FIS: "Pessoa física",
                  JUR: "Pessoa jurídica",
                  M: "Masculino",
                  F: "Feminino",
                } as Record<string, string>
              )[option] ?? option}
            </MenuItem>
          ))}
        </TextField>
      );
    const multiline = field.name.startsWith("OBS_");
    return (
      <TextField
        key={field.name}
        label={label}
        fullWidth
        disabled={disabled}
        value={value ?? ""}
        type={field.type === "integer" ? "number" : field.type === "date" ? "date" : "text"}
        multiline={multiline}
        minRows={multiline ? 3 : undefined}
        onChange={(event) => {
          const text = event.target.value;
          change(
            field.name,
            text === "" && field.nullable ? null : field.type === "integer" ? Number(text) : text,
          );
        }}
        error={Boolean(errors[field.name])}
        helperText={
          errors[field.name] || (field.maxLength ? `Até ${field.maxLength} caracteres` : undefined)
        }
        slotProps={{
          inputLabel: field.type === "date" ? { shrink: true } : {},
          htmlInput: {
            maxLength: field.maxLength,
            ...(field.type === "integer" ? { min: 0, step: 1 } : {}),
          },
        }}
      />
    );
  };
  return (
    <Stack spacing={1}>
      {manualCode && !original && (
        <TextField
          label="Código do contato *"
          type="number"
          value={draft.CODIGO ?? ""}
          onChange={(event) => setDraft({ ...draft, CODIGO: Number(event.target.value) })}
          disabled={disabled}
          error={Boolean(errors.CODIGO)}
          helperText={errors.CODIGO || "Use um código positivo ainda não utilizado."}
        />
      )}
      {CRM_FIELD_GROUPS.map((group) => {
        const groupFields = fields.filter((field) => field.group === group.id);
        if (!groupFields.length) return null;
        return (
          <Accordion
            key={group.id}
            disableGutters
            expanded={expanded.includes(group.id)}
            onChange={(_, checked) =>
              setExpanded((current) =>
                checked ? [...current, group.id] : current.filter((item) => item !== group.id),
              )
            }
            variant="outlined"
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography fontWeight={600}>{group.label}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" },
                  gap: 2,
                }}
              >
                {groupFields.map(render)}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}
type Gate = { state: "pending" | "unknown"; at: number } | null;
function readGate(key: string): Gate {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as Gate;
    return value?.state === "pending" && Date.now() - value.at > 70_000
      ? { state: "unknown", at: value.at }
      : value;
  } catch {
    return null;
  }
}
function storeGate(key: string, gate: Gate) {
  try {
    if (gate) sessionStorage.setItem(key, JSON.stringify(gate));
    else sessionStorage.removeItem(key);
  } catch {
    /* The current component still keeps its gate if storage is unavailable. */
  }
  window.dispatchEvent(new Event("crm-registration-gate"));
}
export function CustomerCrmEditor({
  instance,
  userId,
  token,
  customerId,
}: {
  instance: string;
  userId: number;
  token: string;
  customerId?: number;
}) {
  const router = useRouter(),
    api = useMemo(
      () => new CustomerCrmClient(process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002"),
      [],
    );
  const storageKey = `crm-registration:${instance}:${userId}:${customerId ?? "new"}`;
  const [gate, setGate] = useState<Gate>(() => readGate(storageKey)),
    [reconcile, setReconcile] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<CustomerCrmFormOptions | null>(null),
    [snapshot, setSnapshot] = useState<CustomerCrmSnapshot | null>(null),
    [draft, setDraft] = useState<CustomerCrmDraft>({}),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<CustomerCrmSnapshot[]>([]),
    [brands, setBrands] = useState<CustomerCrmBrandLink[]>([]),
    [tab, setTab] = useState(0),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState("");
  const [contact, setContact] = useState<{
      original?: CustomerCrmSnapshot;
      draft: CustomerCrmDraft;
    } | null>(null),
    [contactErrors, setContactErrors] = useState<Record<string, string>>({}),
    [brand, setBrand] = useState<CustomerCrmValue | undefined>(null),
    [deleteTarget, setDeleteTarget] = useState<{
      kind: "contact" | "brand";
      record: CustomerCrmSnapshot | CustomerCrmBrandLink;
    } | null>(null);
  const [discardAction, setDiscardAction] = useState<"reload" | "contact" | "leave" | "new" | null>(
    null,
  );
  const current = useRef({ token, customerId, instance }),
    alive = useRef(true),
    request = useRef(0),
    writing = useRef(false);
  current.current = { token, customerId, instance };
  const contextKey = `${instance}:${customerId ?? "new"}:${token}`;
  const active = (key: string) =>
    alive.current &&
    key ===
      `${current.current.instance}:${current.current.customerId ?? "new"}:${current.current.token}`;
  const fields = snapshot?.fields ?? options?.customer.fields ?? [],
    parsed = crmFormPayload(fields, draft, snapshot?.record),
    dirty = Boolean(options && parsed.hasChanges && Object.keys(draft).length);
  const blocked = loading || saving || Boolean(gate) || reconcile || snapshot?.writable === false;
  const load = async (confer = false) => {
    const sequence = ++request.current,
      context = contextKey;
    api.setRegistrationContext(instance, token);
    setLoading(true);
    setMessage("");
    try {
      const [formOptions, loaded, loadedContacts, loadedBrands] = await Promise.all([
        api.getRegistrationOptions(),
        customerId !== undefined ? api.getRegistration(customerId) : null,
        customerId && customerId > 0 ? api.listRegistrationContacts(customerId) : [],
        customerId && customerId > 0 ? api.listRegistrationBrands(customerId) : [],
      ]);
      if (!active(context) || sequence !== request.current) return;
      setOptions(formOptions);
      setSnapshot(loaded);
      setDraft(loaded ? { ...loaded.record } : {});
      setContacts(loadedContacts);
      setBrands(loadedBrands);
      setErrors({});
      if (confer) {
        storeGate(storageKey, null);
        setGate(null);
        setReconcile(false);
        setContact(null);
        setDeleteTarget(null);
        setSuccess("Dados conferidos e atualizados.");
      }
    } catch (error) {
      if (active(context) && sequence === request.current)
        setMessage(crmErrorDetails(error).message);
    } finally {
      if (active(context) && sequence === request.current) setLoading(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current += 1;
    };
  }, []);
  useEffect(() => {
    if (writing.current || dirty || contact) {
      setReconcile(true);
      setMessage("Sua sessão mudou. O rascunho foi preservado; confira os dados para continuar.");
    } else void load();
  }, [token]); // A session renewal must never replace an unsaved draft or replay an in-flight write.
  useEffect(() => {
    const refresh = () => setGate(readGate(storageKey));
    window.addEventListener("crm-registration-gate", refresh);
    return () => window.removeEventListener("crm-registration-gate", refresh);
  }, [storageKey]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty || saving || contact) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [contact, dirty, saving]);
  const invalidate = () => {
    void hybridCache
      .invalidateResource(createCacheScope(instance, userId), "customer-page")
      .catch(() => {});
  };
  const mutate = async (work: () => Promise<void>) => {
    if (blocked || writing.current) return;
    const context = contextKey;
    api.setRegistrationContext(instance, token);
    writing.current = true;
    setSaving(true);
    setMessage("");
    setSuccess("");
    storeGate(storageKey, { state: "pending", at: Date.now() });
    try {
      await work();
      storeGate(storageKey, null);
      invalidate();
    } catch (error) {
      const detail = crmErrorDetails(error),
        unknown =
          detail.outcome === "UNKNOWN" || detail.status === undefined || detail.status >= 500;
      storeGate(storageKey, unknown ? { state: "unknown", at: Date.now() } : null);
      if (active(context)) {
        setMessage(detail.message);
        if (unknown || detail.code?.endsWith("_CHANGED")) setReconcile(true);
      }
    } finally {
      writing.current = false;
      if (active(context)) setSaving(false);
      else if (alive.current) {
        setSaving(false);
        setReconcile(true);
      }
    }
  };
  const save = async () => {
    setErrors(parsed.errors);
    if (!parsed.valid || !parsed.hasChanges) return;
    const context = contextKey;
    await mutate(async () => {
      const next =
        customerId === undefined
          ? await api.createRegistration(parsed.values)
          : await api.updateRegistration(customerId, {
              changes: parsed.values,
              version: snapshot!.version,
            });
      if (!active(context)) return;
      setSnapshot(next);
      setDraft({ ...next.record });
      setErrors({});
      setSuccess("Cadastro salvo.");
      if (customerId === undefined)
        router.replace(`/${instance}/crm-customers/${next.record.CODIGO}`);
    });
  };
  const saveContact = async () => {
    if (!contact || !customerId || !options) return;
    const result = crmFormPayload(
      contact.original?.fields ?? options.contact.fields,
      contact.draft,
      contact.original?.record,
      options.contact.manualCode,
    );
    setContactErrors(result.errors);
    if (!result.valid || !result.hasChanges) return;
    const context = contextKey;
    await mutate(async () => {
      if (contact.original)
        await api.updateRegistrationContact(customerId, Number(contact.original.record.CODIGO), {
          changes: result.values,
          version: contact.original.version,
        });
      else await api.createRegistrationContact(customerId, result.values);
      const next = await api.listRegistrationContacts(customerId);
      if (active(context)) {
        setContacts(next);
        setContact(null);
        setContactErrors({});
        setSuccess("Contato salvo.");
      }
    });
  };
  const remove = async () => {
    if (!deleteTarget || !customerId) return;
    const context = contextKey;
    await mutate(async () => {
      if (deleteTarget.kind === "contact") {
        await api.deleteRegistrationContact(
          customerId,
          Number(deleteTarget.record.record.CODIGO),
          deleteTarget.record.version,
        );
        const next = await api.listRegistrationContacts(customerId);
        if (active(context)) setContacts(next);
      } else {
        await api.deleteRegistrationBrand(
          customerId,
          Number(deleteTarget.record.record.CODIGO),
          deleteTarget.record.version,
        );
        const next = await api.listRegistrationBrands(customerId);
        if (active(context)) setBrands(next);
      }
      if (active(context)) {
        setDeleteTarget(null);
        setSuccess("Vínculo removido.");
      }
    });
  };
  const confer = () => {
    if (dirty || contact) setDiscardAction("reload");
    else void load(true);
  };
  const confirmDiscard = () => {
    const action = discardAction;
    setDiscardAction(null);
    if (action === "reload") void load(true);
    else if (action === "contact") setContact(null);
    else if (action === "leave") router.push(`/${instance}/customers`);
    else if (action === "new") {
      storeGate(storageKey, null);
      setGate(null);
      setReconcile(false);
      setMessage("");
      setSnapshot(null);
      setDraft({});
    }
  };
  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        width: "100%",
        minWidth: 0,
        maxWidth: 1440,
        mx: "auto",
        color: "text.primary",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Box>
          <Button
            size="small"
            startIcon={<ArrowBack />}
            onClick={() =>
              dirty ? setDiscardAction("leave") : router.push(`/${instance}/customers`)
            }
            disabled={saving}
          >
            Clientes
          </Button>
          <Typography variant="h5" component="h1" fontWeight={700}>
            {customerId === undefined
              ? "Novo cadastro de cliente"
              : snapshot?.record.RAZAO || "Cadastro do cliente"}
          </Typography>
          {customerId !== undefined && (
            <Typography variant="body2" color="text.secondary">
              Código {customerId}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<Refresh />}
            onClick={confer}
            disabled={
              saving ||
              gate?.state === "pending" ||
              loading ||
              (customerId === undefined && Boolean(gate))
            }
          >
            Conferir dados
          </Button>
          {tab === 0 && (
            <Button
              variant="contained"
              startIcon={<SaveOutlined />}
              onClick={() => void save()}
              disabled={blocked || loading || !parsed.hasChanges}
            >
              Salvar cadastro
            </Button>
          )}
        </Stack>
      </Stack>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {message && (
        <Alert severity={reconcile || gate ? "warning" : "error"} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      {(gate || reconcile) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {gate?.state === "pending"
            ? "Aguardando a confirmação da gravação."
            : customerId === undefined
              ? "Confira a lista de clientes antes de iniciar outro cadastro, pois a gravação pode ter sido concluída."
              : "Confira os dados atuais antes de salvar novamente. Seu rascunho foi preservado."}
          {customerId === undefined && gate?.state !== "pending" && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
              <Button onClick={() => router.push(`/${instance}/customers`)}>
                Abrir lista de clientes
              </Button>
              <Button onClick={() => setDiscardAction("new")}>Já conferi a lista</Button>
            </Stack>
          )}
        </Alert>
      )}
      {snapshot?.writable === false && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Este cadastro do sistema está disponível somente para consulta.
        </Alert>
      )}
      {!options && !loading ? (
        <Button onClick={() => void load()}>Tentar carregar novamente</Button>
      ) : (
        options && (
          <>
            {customerId !== undefined && customerId > 0 && (
              <Tabs
                value={tab}
                onChange={(_, next) => setTab(next)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                <Tab label="Cadastro" />
                <Tab label={`Contatos (${contacts.length})`} />
                <Tab label={`Marcas (${brands.length})`} />
              </Tabs>
            )}
            {tab === 0 && (
              <CrmFields
                api={api}
                fields={fields}
                draft={draft}
                setDraft={setDraft}
                errors={errors}
                disabled={saving || snapshot?.writable === false}
                original={snapshot?.record}
              />
            )}
            {tab === 1 && (
              <Stack spacing={2}>
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    disabled={blocked}
                    onClick={() => {
                      setContact({ draft: {} });
                      setContactErrors({});
                      setMessage("");
                    }}
                  >
                    Adicionar contato
                  </Button>
                </Box>
                <TableContainer sx={{ maxWidth: "100%" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>E-mail</TableCell>
                        <TableCell>Telefone</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contacts.map((item) => (
                        <TableRow key={String(item.record.CODIGO)}>
                          <TableCell>{item.record.NOME}</TableCell>
                          <TableCell sx={{ overflowWrap: "anywhere" }}>
                            {item.record.EMAIL || "—"}
                          </TableCell>
                          <TableCell>
                            {item.record.CELULAR || item.record.FONE_DIRETO || "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar contato">
                              <span>
                                <IconButton
                                  aria-label={`Editar contato ${item.record.NOME}`}
                                  disabled={blocked || !item.writable}
                                  onClick={() => {
                                    setContact({ original: item, draft: { ...item.record } });
                                    setContactErrors({});
                                    setMessage("");
                                  }}
                                >
                                  <EditOutlined />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Excluir contato">
                              <span>
                                <IconButton
                                  aria-label={`Excluir contato ${item.record.NOME}`}
                                  disabled={blocked || !item.writable}
                                  onClick={() => setDeleteTarget({ kind: "contact", record: item })}
                                >
                                  <DeleteOutline />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!contacts.length && (
                        <TableRow>
                          <TableCell colSpan={4}>Nenhum contato cadastrado.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
            {tab === 2 && (
              <Stack spacing={2}>
                <Alert severity="info">
                  Vínculos com histórico de compra são preservados. Cada vínculo é exibido
                  separadamente.
                </Alert>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Box sx={{ flex: 1 }}>
                    <CrmLookup
                      api={api}
                      kind="brands"
                      label="Marca"
                      value={brand}
                      onChange={setBrand}
                      disabled={blocked}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    disabled={blocked || typeof brand !== "number" || brand < 1}
                    onClick={() => {
                      if (!customerId || typeof brand !== "number") return;
                      const context = contextKey;
                      void mutate(async () => {
                        await api.createRegistrationBrand(customerId, brand);
                        const next = await api.listRegistrationBrands(customerId);
                        if (active(context)) {
                          setBrands(next);
                          setBrand(null);
                          setSuccess("Marca vinculada.");
                        }
                      });
                    }}
                  >
                    Vincular marca
                  </Button>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Marca</TableCell>
                        <TableCell>Última compra</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {brands.map((item) => (
                        <TableRow key={String(item.record.CODIGO)}>
                          <TableCell>
                            {item.brandName || `Marca ${item.record.MARCA}`}{" "}
                            <Chip size="small" label={`Vínculo ${item.record.CODIGO}`} />
                          </TableCell>
                          <TableCell>
                            {item.record.DATA_ULTIMA_COMPRA
                              ? String(item.record.DATA_ULTIMA_COMPRA)
                              : "Sem compra registrada"}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<DeleteOutline />}
                              disabled={blocked || !item.removable}
                              onClick={() => setDeleteTarget({ kind: "brand", record: item })}
                            >
                              {item.removable ? "Remover" : "Histórico preservado"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!brands.length && (
                        <TableRow>
                          <TableCell colSpan={3}>Nenhuma marca vinculada.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
          </>
        )
      )}
      <Dialog
        open={Boolean(contact)}
        fullWidth
        maxWidth="md"
        onClose={() => {
          if (!saving) setDiscardAction("contact");
        }}
      >
        <DialogTitle>{contact?.original ? "Editar contato" : "Adicionar contato"}</DialogTitle>
        <DialogContent>
          {message && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}
          {(gate || reconcile) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Confira os dados atuais antes de salvar novamente. O rascunho foi preservado.
            </Alert>
          )}
          {contact && options && (
            <CrmFields
              api={api}
              fields={contact.original?.fields ?? options.contact.fields}
              draft={contact.draft}
              setDraft={(next) => setContact({ ...contact, draft: next })}
              errors={contactErrors}
              disabled={saving}
              manualCode={options.contact.manualCode}
              original={contact.original?.record}
            />
          )}
        </DialogContent>
        <DialogActions>
          {(gate || reconcile) && (
            <Button onClick={confer} disabled={saving || gate?.state === "pending"}>
              Conferir dados
            </Button>
          )}
          <Button disabled={saving} onClick={() => setDiscardAction("contact")}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={blocked} onClick={() => void saveContact()}>
            Salvar contato
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!saving) setDeleteTarget(null);
        }}
      >
        <DialogTitle>
          {deleteTarget?.kind === "brand" ? "Remover vínculo da marca?" : "Excluir contato?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget?.kind === "brand"
              ? "O histórico de compras será preservado."
              : "O contato será excluído deste cliente."}
          </Typography>
          {message && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
          {(gate || reconcile) && (
            <Button onClick={confer} disabled={saving || gate?.state === "pending"}>
              Conferir dados
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button color="error" disabled={blocked} onClick={() => void remove()}>
            Confirmar exclusão
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(discardAction)} onClose={() => setDiscardAction(null)}>
        <DialogTitle>
          {discardAction === "new" ? "Iniciar outro cadastro?" : "Descartar o rascunho?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {discardAction === "new"
              ? "Continue somente após conferir na lista se o cliente já foi cadastrado."
              : "As alterações que ainda não foram salvas serão descartadas."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardAction(null)}>Voltar</Button>
          <Button onClick={confirmDiscard}>
            {discardAction === "new" ? "Iniciar novo cadastro" : "Descartar e continuar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
export default function CustomerCrmManagement({ customerId }: { customerId?: number }) {
  const { instance, user, token } = useAuthContext();
  if (user?.NIVEL !== "ADMIN")
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Acesso restrito a administradores.
      </Alert>
    );
  if (!token)
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  return (
    <CustomerCrmEditor
      key={`${instance}:${user.CODIGO}:${customerId ?? "new"}`}
      instance={instance}
      userId={user.CODIGO}
      token={token}
      customerId={customerId}
    />
  );
}
