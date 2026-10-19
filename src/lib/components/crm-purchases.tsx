"use client";
import {
  CrmPage,
  CrmToolbar,
  OperationalIconButton,
  OperationalPanel,
  UiIcon,
} from "@/lib/ui-system";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { useCrmQueryState } from "@/lib/ui-system/query-state";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { useAuthContext } from "@/app/auth-context";
import CrmPurchasesClient from "@/lib/sdk-local/crm-purchases.client";
import type {
  CrmPurchaseInput,
  CrmPurchaseSnapshot,
  CrmPurchasesFilters,
  CrmPurchasesSchema,
} from "@/lib/sdk-local/types/crm-purchases.types";
import {
  displayPurchaseAmount,
  purchaseDraft,
  purchaseFields,
  validatePurchaseDraft,
  type PurchaseDraft,
  type PurchaseField,
} from "@/lib/crm-purchases-form";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";
import { Add, DeleteOutline, EditOutlined, Refresh } from "@mui/icons-material";
import {
  Alert,
  Box,
  Chip,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import CrmPurchaseLookup from "./crm-purchase-lookup";

function purchaseError(failure: unknown) {
  const detail = getCustomerSegmentsError(failure);
  if (detail.code === "CRM_PURCHASE_REFERENCED" || detail.code === "CRM_PURCHASE_IN_USE")
    return "Este lançamento possui itens, propostas ou outros vínculos. Remova-o somente pelo fluxo permitido para esses registros.";
  if (detail.status === 409)
    return "O lançamento mudou ou possui vínculos que impedem esta operação. Recarregue os dados e confira antes de continuar.";
  if (detail.status === 401)
    return "A sessão expirou. Recarregue os dados com a sessão atual antes de continuar.";
  if (!detail.status || detail.status >= 500 || detail.outcome === "UNKNOWN")
    return "Não foi possível confirmar a operação. Confira a listagem antes de tentar novamente; o lançamento pode ter sido gravado.";
  return "Não foi possível concluir a operação. Confira os campos e as referências selecionadas.";
}
function mustReconcile(failure: unknown) {
  const detail = getCustomerSegmentsError(failure);
  return (
    !detail.status ||
    detail.status === 401 ||
    detail.status === 404 ||
    detail.status === 409 ||
    detail.status >= 500 ||
    detail.outcome === "UNKNOWN"
  );
}
function dateLabel(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join("/")
    : value || "—";
}
export default function CrmPurchasesPage() {
  const { instance, token, user } = useAuthContext();
  const api = useMemo(
    () =>
      token
        ? new CrmPurchasesClient(process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002", {
            instance,
            token,
          })
        : null,
    [instance, token],
  );
  if (user?.NIVEL !== "ADMIN")
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Acesso restrito a administradores.
      </Alert>
    );
  if (!api)
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Aguarde a sessão para acessar os lançamentos.
      </Alert>
    );
  return <PurchasesPanel key={`${instance}:${user.CODIGO}`} api={api} instance={instance} />;
}
function PurchasesPanel({ api, instance }: { api: CrmPurchasesClient; instance: string }) {
  const [filters, setFilters] = useCrmQueryState<CrmPurchasesFilters>("purchases:list", {
    page: 1,
    perPage: 10,
    sortBy: "DATA",
    sortDirection: "desc",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSort, setDraftSort] = useState(filters.sortBy),
    [draftDirection, setDraftDirection] = useState(filters.sortDirection);
  const [search, setSearch] = useState(filters.search ?? ""),
    [customerId, setCustomerId] = useState(""),
    [operatorId, setOperatorId] = useState(""),
    [dateFrom, setDateFrom] = useState(""),
    [dateTo, setDateTo] = useState(""),
    [situation, setSituation] = useState(""),
    [invoiced, setInvoiced] = useState("");
  const [rows, setRows] = useState<CrmPurchaseSnapshot[]>([]),
    [needsReconcile, setNeedsReconcile] = useState(false),
    [totalRows, setTotalRows] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [reload, setReload] = useState(0),
    [editing, setEditing] = useState<{ id?: number } | null>(null),
    [deleting, setDeleting] = useState<CrmPurchaseSnapshot | null>(null),
    [deletingBusy, setDeletingBusy] = useState(false),
    [deleteBlocked, setDeleteBlocked] = useState(false);
  const live = useRef(true),
    write = useRef(false),
    mutationEpoch = useRef(0),
    latestApi = useRef(api);
  latestApi.current = api;
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const readEpoch = mutationEpoch.current;
    setLoading(true);
    setError("");
    void api
      .list(filters)
      .then((response) => {
        if (active) {
          const lastPage = Math.max(
            1,
            Math.ceil(response.page.totalRows / (filters.perPage ?? 10)),
          );
          if ((filters.page ?? 1) > lastPage) setFilters((old) => ({ ...old, page: lastPage }));
          setRows(response.data);
          setTotalRows(response.page.totalRows);
          if (!write.current && readEpoch === mutationEpoch.current) setNeedsReconcile(false);
        }
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setTotalRows(0);
          setError("Não foi possível carregar os lançamentos. Tente recarregar.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, filters, reload]);
  const reloadList = () => {
    setReload((value) => value + 1);
  };
  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("A data inicial deve ser anterior ou igual à data final.");
      return;
    }
    setFiltersOpen(false);
    setError("");
    setFilters((old) => ({
      page: 1,
      perPage: old.perPage,
      sortBy: draftSort,
      sortDirection: draftDirection,
      ...(search ? { search } : {}),
      ...(customerId ? { customerId: Number(customerId) } : {}),
      ...(operatorId ? { operatorId: Number(operatorId) } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(situation ? { situation: situation as "F" | "C" } : {}),
      ...(invoiced ? { invoiced: invoiced as "S" | "N" } : {}),
    }));
  };
  const remove = async () => {
    if (!deleting || write.current || deleteBlocked) return;
    write.current = true;
    mutationEpoch.current += 1;
    setDeletingBusy(true);
    setError("");
    const requestApi = api;
    try {
      await requestApi.remove(deleting.record.CODIGO, { version: deleting.version });
      mutationEpoch.current += 1;
      if (!live.current) return;
      if (requestApi !== latestApi.current) {
        setDeleteBlocked(true);
        setNeedsReconcile(true);
        setError("Sua sessão mudou durante a exclusão. Confira a listagem antes de continuar.");
        return;
      }
      setDeleting(null);
      setSuccess("Lançamento excluído.");
      reloadList();
    } catch (failure) {
      mutationEpoch.current += 1;
      if (live.current) {
        setError(purchaseError(failure));
        setDeleteBlocked(mustReconcile(failure) || requestApi !== latestApi.current);
        if (mustReconcile(failure) || requestApi !== latestApi.current) setNeedsReconcile(true);
      }
    } finally {
      write.current = false;
      if (live.current) setDeletingBusy(false);
    }
  };
  useEffect(() => {
    if (write.current) setDeleteBlocked(true);
  }, [api]);
  useCrmLeaveGuard(false, deletingBusy, needsReconcile || deleteBlocked);
  function openFilters() {
    setCustomerId(filters.customerId == null ? "" : String(filters.customerId));
    setOperatorId(filters.operatorId == null ? "" : String(filters.operatorId));
    setDateFrom(filters.dateFrom ?? "");
    setDateTo(filters.dateTo ?? "");
    setSituation(filters.situation ?? "");
    setInvoiced(filters.invoiced ?? "");
    setDraftSort(filters.sortBy);
    setDraftDirection(filters.sortDirection);
    setFiltersOpen(true);
  }
  return (
    <CrmPage
      title="Lançamentos de vendas"
      count={loading ? undefined : totalRows}
      description="Registros de vendas do CRM. O catálogo define os tipos de venda; os lançamentos registram cada compra."
      breadcrumbs={[{ label: "Usuários" }, { label: "Vendas" }, { label: "Lançamentos" }]}
      actions={
        <Button
          variant="contained"
          startIcon={<UiIcon name="add" />}
          onClick={() => setEditing({})}
          disabled={deletingBusy || loading || needsReconcile}
        >
          Novo lançamento
        </Button>
      }
    >
      <Stack gap={2}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setFilters((old) => ({ ...old, page: 1, search: search || undefined }));
          }}
        >
          <CrmToolbar>
            <TextField
              size="small"
              label="Buscar descrição"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ flex: "1 1 140px", maxWidth: 480, minWidth: 0 }}
            />
            <OperationalIconButton type="submit" label="Buscar lançamentos">
              <UiIcon name="search" />
            </OperationalIconButton>
            <OperationalIconButton label="Filtros de lançamentos" onClick={openFilters}>
              <UiIcon name="filter" />
            </OperationalIconButton>
            <OperationalIconButton
              label="Atualizar lista"
              onClick={reloadList}
              disabled={loading || deletingBusy}
            >
              <UiIcon name="refresh" />
            </OperationalIconButton>
          </CrmToolbar>
        </form>
        <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">
          {(
            [
              "search",
              "customerId",
              "operatorId",
              "dateFrom",
              "dateTo",
              "situation",
              "invoiced",
            ] as const
          )
            .filter((key) => filters[key] != null && filters[key] !== "")
            .map((key) => (
              <Chip
                key={key}
                label={`${{ search: "Descrição", customerId: "Código interno do cliente", operatorId: "Usuário", dateFrom: "Desde", dateTo: "Até", situation: "Situação", invoiced: "Faturado" }[key]}: ${filters[key]}`}
                onDelete={() => {
                  setFilters((old) => ({ ...old, [key]: undefined, page: 1 }));
                  if (key === "search") setSearch("");
                }}
              />
            ))}
        </Stack>
        <OperationalPanel
          open={filtersOpen}
          title="Filtros de lançamentos"
          onClose={() => setFiltersOpen(false)}
          footer={
            <>
              <Button onClick={() => setFiltersOpen(false)}>Cancelar</Button>
              <Button variant="contained" onClick={applyFilters}>
                Aplicar filtros
              </Button>
            </>
          }
        >
          <Box component="form" onSubmit={applyFilters}>
            <Stack gap={2}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" },
                  gap: 2,
                }}
              >
                <CrmPurchaseLookup
                  api={api}
                  kind="customers"
                  label="Filtrar por cliente"
                  value={customerId}
                  onChange={setCustomerId}
                />
                <CrmPurchaseLookup
                  api={api}
                  kind="operators"
                  label="Filtrar por usuário"
                  value={operatorId}
                  onChange={setOperatorId}
                />
                <TextField
                  label="Data inicial"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Data final"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Stack direction="row" gap={1}>
                  <TextField
                    select
                    fullWidth
                    label="Situação"
                    value={situation}
                    onChange={(event) => setSituation(event.target.value)}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    <MenuItem value="F">Fechada</MenuItem>
                    <MenuItem value="C">Cancelada</MenuItem>
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Faturado"
                    value={invoiced}
                    onChange={(event) => setInvoiced(event.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="S">Sim</MenuItem>
                    <MenuItem value="N">Não</MenuItem>
                  </TextField>
                </Stack>
              </Box>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <TextField
                  select
                  size="small"
                  label="Ordenar por"
                  value={draftSort}
                  onChange={(event) =>
                    setDraftSort(event.target.value as CrmPurchasesFilters["sortBy"])
                  }
                >
                  {[
                    ["DATA", "Data"],
                    ["CODIGO", "Código"],
                    ["VALOR", "Valor"],
                    ["DESCRICAO", "Descrição"],
                  ].map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Direção"
                  value={draftDirection}
                  onChange={(event) => setDraftDirection(event.target.value as "asc" | "desc")}
                >
                  <MenuItem value="asc">Crescente</MenuItem>
                  <MenuItem value="desc">Decrescente</MenuItem>
                </TextField>
              </Stack>
            </Stack>
          </Box>
        </OperationalPanel>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {loading && <LinearProgress aria-label="Carregando lançamentos" />}
        <TableContainer className="ip-crud-table" component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Código",
                  "Cliente",
                  "Usuário",
                  "Data",
                  "Descrição",
                  "Valor",
                  "Pagamento",
                  "Ações",
                ].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.record.CODIGO}>
                  <TableCell data-label="Código interno">{item.record.CODIGO}</TableCell>
                  <TableCell data-label="Cliente">
                    {item.customerName ?? `Cliente #${item.record.CLIENTE ?? "—"}`}
                  </TableCell>
                  <TableCell data-label="Usuário">
                    {item.operatorName ??
                      (item.record.OPERADOR == null ? "—" : `Usuário #${item.record.OPERADOR}`)}
                  </TableCell>
                  <TableCell data-label="Data" sx={{ whiteSpace: "nowrap" }}>
                    {dateLabel(item.record.DATA)}
                  </TableCell>
                  <TableCell data-label="Descrição">{item.record.DESCRICAO ?? "—"}</TableCell>
                  <TableCell data-label="Valor" sx={{ whiteSpace: "nowrap" }}>
                    {displayPurchaseAmount(item.record.VALOR)}
                  </TableCell>
                  <TableCell data-label="Pagamento">{item.record.FORMA_PGTO ?? "—"}</TableCell>
                  <TableCell data-label="Ações">
                    <Tooltip
                      title={
                        item.writable
                          ? "Editar lançamento"
                          : "Registro histórico sem identidade editável"
                      }
                    >
                      <span>
                        <OperationalIconButton
                          label={`Editar lançamento ${item.record.CODIGO}`}
                          disabled={!item.writable || deletingBusy || loading || needsReconcile}
                          onClick={() => setEditing({ id: item.record.CODIGO })}
                        >
                          <UiIcon name="edit" scale="row" />
                        </OperationalIconButton>
                      </span>
                    </Tooltip>
                    <OperationalIconButton
                      label={`Excluir lançamento ${item.record.CODIGO}`}
                      disabled={!item.writable || deletingBusy || loading || needsReconcile}
                      onClick={() => {
                        setDeleting(item);
                        setDeleteBlocked(false);
                        setError("");
                      }}
                    >
                      <UiIcon name="delete" scale="row" />
                    </OperationalIconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && !loading && (
                <TableRow>
                  <TableCell colSpan={8}>Nenhum lançamento encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalRows}
          page={(filters.page ?? 1) - 1}
          rowsPerPage={filters.perPage ?? 10}
          labelRowsPerPage="Lançamentos por página"
          getItemAriaLabel={(type) =>
            ({
              first: "Primeira página",
              last: "Última página",
              next: "Próxima página",
              previous: "Página anterior",
            })[type]
          }
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          onPageChange={(_, page) => setFilters((old) => ({ ...old, page: page + 1 }))}
          onRowsPerPageChange={(event) =>
            setFilters((old) => ({ ...old, page: 1, perPage: Number(event.target.value) }))
          }
        />
        {editing && (
          <PurchaseEditor
            key={editing.id ?? "new"}
            id={editing.id}
            api={api}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setSuccess(editing.id ? "Lançamento atualizado." : "Lançamento criado.");
              reloadList();
            }}
            onCheckList={() => {
              setEditing(null);
              mutationEpoch.current += 1;
              setNeedsReconcile(true);
              reloadList();
            }}
          />
        )}
        <Dialog
          open={Boolean(deleting)}
          onClose={() => {
            if (!deletingBusy) {
              setDeleting(null);
              if (deleteBlocked) reloadList();
            }
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Excluir lançamento #{deleting?.record.CODIGO}?</DialogTitle>
          <DialogContent>
            <Typography>
              {deleting?.customerName} · {displayPurchaseAmount(deleting?.record.VALOR ?? null)}
            </Typography>
            <Typography sx={{ mt: 1 }}>
              A exclusão é permanente. Itens, propostas e outros vínculos podem impedir esta ação.
            </Typography>
            {deleteBlocked && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {error} Feche e recarregue a listagem para conferir o estado atual.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              disabled={deletingBusy}
              onClick={() => {
                setDeleting(null);
                if (deleteBlocked) reloadList();
              }}
            >
              Cancelar
            </Button>
            {deleteBlocked ? (
              <Button
                onClick={() => {
                  setDeleting(null);
                  reloadList();
                }}
              >
                Conferir listagem
              </Button>
            ) : (
              <Button color="error" disabled={deletingBusy} onClick={remove}>
                Excluir
              </Button>
            )}
          </DialogActions>
        </Dialog>
        <Button component={Link} href={`/${instance}/reports/sales`}>
          Relatório de vendas e metas
        </Button>
      </Stack>
    </CrmPage>
  );
}
function PurchaseEditor({
  id,
  api,
  onClose,
  onSaved,
  onCheckList,
}: {
  id?: number;
  api: CrmPurchasesClient;
  onClose: () => void;
  onSaved: () => void;
  onCheckList: () => void;
}) {
  const [schema, setSchema] = useState<CrmPurchasesSchema>(),
    [original, setOriginal] = useState<CrmPurchaseSnapshot>(),
    [draft, setDraft] = useState<PurchaseDraft>(purchaseDraft()),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [blocked, setBlocked] = useState(false),
    [discard, setDiscard] = useState<"close" | "reload" | null>(null);
  const alive = useRef(true),
    writing = useRef(false),
    sequence = useRef(0),
    loadedApi = useRef(api),
    currentApi = useRef(api),
    loaded = useRef(false);
  currentApi.current = api;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current += 1;
    };
  }, []);
  const load = useCallback(async () => {
    const request = ++sequence.current,
      readApi = currentApi.current;
    setLoading(true);
    setError("");
    try {
      const [metadata, snapshot] = await Promise.all([
        readApi.schema(),
        id ? readApi.get(id) : Promise.resolve(undefined),
      ]);
      if (!alive.current || request !== sequence.current || readApi !== currentApi.current) return;
      setSchema(metadata);
      setOriginal(snapshot);
      setDraft(purchaseDraft(snapshot?.record));
      loadedApi.current = readApi;
      setBlocked(Boolean(snapshot && !snapshot.writable));
      loaded.current = true;
    } catch (failure) {
      if (alive.current && request === sequence.current) setError(purchaseError(failure));
    } finally {
      if (alive.current && request === sequence.current) setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    if (!loaded.current) void load();
    if (writing.current) {
      setBlocked(true);
      setError("Sua sessão mudou durante a gravação. Confira a listagem antes de continuar.");
    }
  }, [api, load]);
  const validation = schema
    ? validatePurchaseDraft(draft, schema.fields, original?.record, schema.amountMax)
    : null;
  const dirty = original ? Boolean(validation?.hasChanges) : Object.values(draft).some(Boolean);
  useCrmLeaveGuard(dirty, saving, blocked);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (field: PurchaseField, value: string) =>
    setDraft((old) => ({ ...old, [field]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !schema ||
      !validation?.valid ||
      !validation.hasChanges ||
      blocked ||
      writing.current ||
      loading
    )
      return;
    writing.current = true;
    setSaving(true);
    setError("");
    const writeApi = loadedApi.current;
    try {
      const changes = validation.changes as CrmPurchaseInput;
      const result = original
        ? await writeApi.update(original.record.CODIGO, { changes, version: original.version })
        : await writeApi.create(changes);
      if (!alive.current) return;
      if (writeApi !== currentApi.current) {
        setBlocked(true);
        setError("Sua sessão mudou durante a gravação. Confira a listagem antes de continuar.");
        return;
      }
      if (!Number.isInteger(result.record.CODIGO) || result.record.CODIGO < 1)
        throw new Error("Unconfirmed purchase");
      onSaved();
    } catch (failure) {
      if (alive.current) {
        setError(purchaseError(failure));
        if (mustReconcile(failure)) setBlocked(true);
      }
    } finally {
      writing.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const requestClose = () => {
    if (saving) return;
    if (blocked) onCheckList();
    else if (dirty) setDiscard("close");
    else onClose();
  };
  const requestReload = () => {
    if (dirty) setDiscard("reload");
    else void load();
  };
  return (
    <>
      <Dialog
        className="ip-crud-editor"
        open
        onClose={requestClose}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              maxHeight: "calc(100dvh - 48px)",
              m: { xs: 1, sm: 3 },
              width: { xs: "calc(100% - 16px)", sm: "100%" },
            },
          },
        }}
        aria-labelledby="purchase-editor-title"
      >
        <Box
          component="form"
          onSubmit={save}
          sx={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
        >
          <DialogTitle id="purchase-editor-title">
            {id ? `Editar lançamento #${id}` : "Novo lançamento de venda"}
          </DialogTitle>
          <DialogContent sx={{ pt: "12px !important", overflowY: "auto" }}>
            <Stack gap={2}>
              {loading && <LinearProgress aria-label="Carregando lançamento" />}
              {error && <Alert severity="error">{error}</Alert>}
              {original && !original.writable && (
                <Alert severity="warning">
                  Este registro histórico não permite alteração pela sua identidade atual.
                </Alert>
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" },
                  gap: 2,
                }}
              >
                {schema &&
                  [
                    {
                      title: "Participantes",
                      fields: purchaseFields.filter(
                        (name) => name === "CLIENTE" || name === "OPERADOR",
                      ),
                    },
                    {
                      title: "Dados da venda",
                      fields: purchaseFields.filter(
                        (name) => name !== "CLIENTE" && name !== "OPERADOR",
                      ),
                    },
                  ].map((group) => (
                    <Box key={group.title} sx={{ gridColumn: "1/-1" }}>
                      <Typography component="h3" fontSize={14} fontWeight={600} mb={2}>
                        {group.title}
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" },
                          gap: 2,
                        }}
                      >
                        {group.fields.map((name) => {
                          const field = schema.fields.find((field) => field.name === name);
                          if (!field) return null;
                          const disabled =
                            saving ||
                            loading ||
                            blocked ||
                            Boolean(original && field.immutable) ||
                            field.readOnly;
                          if (name === "CLIENTE" || name === "OPERADOR")
                            return (
                              <CrmPurchaseLookup
                                key={name}
                                api={api}
                                kind={name === "CLIENTE" ? "customers" : "operators"}
                                label={field.label}
                                value={draft[name]}
                                currentLabel={
                                  name === "CLIENTE"
                                    ? original?.customerName
                                    : original?.operatorName
                                }
                                onChange={(value) => change(name, value)}
                                disabled={disabled}
                                error={validation?.errors[name]}
                              />
                            );
                          return (
                            <TextField
                              key={name}
                              fullWidth
                              label={name === "VALOR" ? "Valor (R$)" : field.label}
                              type={name === "DATA" ? "date" : "text"}
                              value={draft[name]}
                              onChange={(event) => change(name, event.target.value)}
                              disabled={disabled}
                              error={Boolean(validation?.errors[name])}
                              helperText={
                                validation?.errors[name] ??
                                (name === "VALOR"
                                  ? "Até duas casas decimais. Valores históricos ficam preservados se você não os alterar."
                                  : undefined)
                              }
                              slotProps={{
                                inputLabel: name === "DATA" ? { shrink: true } : undefined,
                                htmlInput: {
                                  maxLength: field.maxLength,
                                  inputMode: name === "VALOR" ? "decimal" : undefined,
                                },
                              }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  ))}
              </Box>
              {!original && (
                <Typography variant="body2" color="text.secondary">
                  Sem selecionar um usuário, o lançamento será atribuído ao usuário conectado. O
                  código será gerado pelo CRM.
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
            <Button disabled={saving} onClick={requestClose}>
              Cancelar
            </Button>
            {blocked && !original ? (
              <Button onClick={onCheckList}>Conferir lançamentos</Button>
            ) : (
              <Button disabled={saving || loading} onClick={requestReload}>
                Recarregar cadastro
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving || loading || blocked || !validation?.valid || !validation.hasChanges
              }
            >
              {saving ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={Boolean(discard)} onClose={() => setDiscard(null)}>
        <DialogTitle>Descartar alterações?</DialogTitle>
        <DialogContent>As alterações ainda não foram salvas.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscard(null)}>Continuar editando</Button>
          <Button
            onClick={() => {
              const action = discard;
              setDiscard(null);
              if (action === "close") onClose();
              else void load();
            }}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
