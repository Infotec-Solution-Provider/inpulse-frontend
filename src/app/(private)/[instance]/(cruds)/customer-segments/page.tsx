"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import {
  CrmPage,
  OperationalPanel,
  FilterChipBar,
  UiIcon,
  useCrmQueryState,
} from "@/lib/ui-system";

import { useAuthContext } from "@/app/auth-context";
import { createCacheScope } from "@/lib/cache/cache-scope";
import { hybridCache } from "@/lib/cache/hybrid-cache";
import { publishCustomerSegmentsChanged } from "@/lib/customer-segments-events";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";
import {
  createSegmentPayload,
  segmentDraft,
  segmentDraftValidation,
  updateSegmentPayload,
  type SegmentDraft,
} from "@/lib/customer-segments-form";
import {
  UserRole,
  type Segment,
  type SegmentListParams,
  type CrmUnitOption,
} from "@/lib/sdk-local";
import customersService from "@/lib/services/customers.service";
import {
  Add,
  DeleteOutline,
  EditOutlined,
  Refresh,
  Search,
  Segment as SegmentIcon,
} from "@mui/icons-material";
import {
  Alert,
  Breadcrumbs,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type SortColumn = "CODIGO" | "NOME" | "ordem" | "COD_UNIDADE";
type SortDirection = "asc" | "desc";
type Editor = { original?: Segment; draft: SegmentDraft };

function errorStatus(error: unknown): number | undefined {
  return getCustomerSegmentsError(error).status;
}

function errorCode(error: unknown): string | undefined {
  return getCustomerSegmentsError(error).code;
}

function SegmentManagement({
  token,
  instance,
  userId,
}: {
  token: string;
  instance: string;
  userId: number;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [units, setUnits] = useState<CrmUnitOption[]>([]);
  const [unitsError, setUnitsError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useCrmQueryState("segments:page", 0);
  const [perPage, setPerPage] = useCrmQueryState("segments:perPage", 20);
  const [sortBy, setSortBy] = useCrmQueryState<SortColumn>("segments:sort", "NOME");
  const [sortDirection, setSortDirection] = useCrmQueryState<SortDirection>(
    "segments:direction",
    "asc",
  );
  const [filters, setFilters] = useCrmQueryState<{ NOME?: string; CODIGO?: number }>(
    "segments:filters",
    {},
  );
  const [nameFilter, setNameFilter] = useState(filters.NOME ?? "");
  const [codeFilter, setCodeFilter] = useState(String(filters.CODIGO ?? ""));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [missing, setMissing] = useState(false);
  const [writeUnknown, setWriteUnknown] = useState(false);
  const [reconcileRequired, setReconcileRequired] = useState(false);
  const [reloadingEditor, setReloadingEditor] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  const currentToken = useRef(token);
  currentToken.current = token;
  const pendingWrite = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (pendingWrite.current) {
      setWriteUnknown(true);
      setReconcileRequired(true);
      setSaveError(
        "Sua sessão mudou durante a gravação. Confira os dados antes de tentar novamente.",
      );
    }
  }, [token]);
  useEffect(() => {
    let active = true;
    customersService.setAuth(token);
    setUnitsError("");
    void customersService
      .getCrmCatalogUnits({ token, instance })
      .then((response) => {
        if (active) setUnits(response.data);
      })
      .catch(() => {
        if (active)
          setUnitsError(
            "Não foi possível carregar as unidades. Recarregue a lista para tentar novamente.",
          );
      });
    return () => {
      active = false;
    };
  }, [token, reload]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    customersService.setAuth(token);
    setLoading(true);
    setLoadError("");
    const params: SegmentListParams = {
      page: page + 1,
      perPage,
      sortBy,
      sortDirection,
      ...filters,
    };
    void customersService
      .listSegments(params, { token, instance })
      .then((response) => {
        if (!mounted.current || sequence !== requestSequence.current) return;
        const totalRows = response.page.totalRows ?? 0;
        const lastPage = Math.max(0, Math.ceil(totalRows / perPage) - 1);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setSegments(response.data);
        setTotal(totalRows);
      })
      .catch((error: unknown) => {
        if (!mounted.current || sequence !== requestSequence.current) return;
        setLoadError(
          errorStatus(error) === 403
            ? "Você não tem permissão para administrar segmentos."
            : "Não foi possível carregar os segmentos. Tente novamente.",
        );
      })
      .finally(() => {
        if (mounted.current && sequence === requestSequence.current) setLoading(false);
      });
  }, [token, page, perPage, sortBy, sortDirection, filters, reload]);

  const openEditor = (segment?: Segment) => {
    setEditor({ original: segment, draft: segmentDraft(segment) });
    setSaveError("");
    setConflict(false);
    setMissing(false);
    setWriteUnknown(false);
    setSuccess("");
  };

  const validation = editor ? segmentDraftValidation(editor.draft, editor.original) : null;
  const isDirty =
    editor &&
    (editor.original
      ? validation?.hasChanges
      : editor.draft.name !== "" || editor.draft.order !== "" || Boolean(editor.draft.unit));

  useCrmLeaveGuard(Boolean(isDirty), saving, writeUnknown || reconcileRequired);
  const closeEditor = useCallback(() => {
    if (saving || reloadingEditor) return;
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    setEditor(null);
  }, [isDirty, saving, reloadingEditor]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event?.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    const code = codeFilter.trim();
    if (
      code &&
      (!/^-?\d+$/.test(code) ||
        !Number.isSafeInteger(Number(code)) ||
        Number(code) < -2147483648 ||
        Number(code) > 2147483647)
    ) {
      setFilterError("Informe um código inteiro entre -2147483648 e 2147483647.");
      return;
    }
    setFilterError("");
    setPage(0);
    setFiltersOpen(false);
    setFilters({
      ...(nameFilter.trim() ? { NOME: nameFilter.trim() } : {}),
      ...(code ? { CODIGO: Number(code) } : {}),
    });
  };

  const sort = (column: SortColumn) => {
    setPage(0);
    setSortBy(column);
    setSortDirection(sortBy === column && sortDirection === "asc" ? "desc" : "asc");
  };

  const save = async (event: FormEvent) => {
    event?.preventDefault();
    if (
      !editor ||
      !validation ||
      validation.nameError ||
      validation.orderError ||
      validation.unitError ||
      !validation.hasChanges ||
      saving ||
      conflict ||
      missing ||
      writeUnknown
    )
      return;
    setSaving(true);
    pendingWrite.current = true;
    const requestToken = token;
    setSaveError("");
    try {
      customersService.setAuth(token);
      const response = editor.original
        ? await customersService.updateSegment(
            editor.original.CODIGO,
            updateSegmentPayload(editor.draft, editor.original),
            { token: requestToken, instance },
          )
        : await customersService.createSegment(createSegmentPayload(editor.draft), {
            token: requestToken,
            instance,
          });
      if (!mounted.current || currentToken.current !== requestToken) return;
      void hybridCache.invalidateResource(createCacheScope(instance, userId), "customer-page");
      publishCustomerSegmentsChanged(instance);
      setEditor(null);
      setSuccess(
        `Segmento #${response.data.CODIGO} ${editor.original ? "atualizado" : "cadastrado"} com sucesso.`,
      );
      setReload((value) => value + 1);
    } catch (error) {
      if (!mounted.current || currentToken.current !== requestToken) return;
      const status = errorStatus(error);
      const code = errorCode(error);
      if (
        getCustomerSegmentsError(error).outcome === "UNKNOWN" ||
        code === "SEGMENT_WRITE_UNKNOWN" ||
        status === undefined ||
        status >= 500
      ) {
        setWriteUnknown(true);
        setReconcileRequired(true);
        setSaveError(
          "Não foi possível confirmar se a gravação foi concluída. Seu rascunho foi mantido. Confira os dados atuais antes de tentar uma nova alteração.",
        );
      } else if (status === 409 && code !== "SEGMENT_DUPLICATE_NAME") {
        setConflict(true);
        setSaveError(
          "Este segmento foi alterado por outra pessoa. Seu rascunho foi mantido. Recarregue os dados atuais antes de salvar novamente.",
        );
      } else if (status === 409) {
        setSaveError(
          "Já existe um segmento com esse nome. Escolha outro nome; seu rascunho foi mantido.",
        );
      } else if (status === 404) {
        setMissing(true);
        setSaveError("Este segmento não está mais disponível. Seu rascunho foi mantido.");
      } else {
        setSaveError(
          status === 403
            ? "Você não tem permissão para salvar este segmento. Seu rascunho foi mantido."
            : status === 400
              ? "Não foi possível salvar os valores informados. Confira o nome e a ordem; seu rascunho foi mantido."
              : "Não foi possível salvar o segmento. Seu rascunho foi mantido. Tente novamente.",
        );
      }
    } finally {
      pendingWrite.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const reloadEditor = async () => {
    if (!editor?.original || saving || reloadingEditor) return;
    setReloadingEditor(true);
    const requestToken = token;
    try {
      customersService.setAuth(token);
      const { data } = await customersService.getSegment(editor.original.CODIGO, {
        token: requestToken,
        instance,
      });
      if (!mounted.current || currentToken.current !== requestToken) return;
      setEditor({ original: data, draft: segmentDraft(data) });
      setConflict(false);
      setMissing(false);
      setWriteUnknown(false);
      setReconcileRequired(false);
      setSaveError("");
      setReload((value) => value + 1);
    } catch (error) {
      if (mounted.current && currentToken.current === requestToken)
        setSaveError(
          errorStatus(error) === 404
            ? "Este segmento não está mais disponível. Seu rascunho foi mantido."
            : "Não foi possível recarregar os dados. Seu rascunho foi mantido.",
        );
    } finally {
      if (mounted.current) setReloadingEditor(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || saving || writeUnknown || conflict) return;
    const requestToken = token;
    pendingWrite.current = true;
    setSaving(true);
    setSaveError("");
    customersService.setAuth(token);
    try {
      await customersService.deleteSegment(
        deleteTarget.CODIGO,
        {
          NOME: deleteTarget.NOME,
          ordem: deleteTarget.ordem,
          COD_UNIDADE: deleteTarget.COD_UNIDADE,
        },
        { token: requestToken, instance },
      );
      if (!mounted.current || currentToken.current !== requestToken) return;
      setDeleteTarget(null);
      setSuccess("Segmento excluído com sucesso.");
      publishCustomerSegmentsChanged(instance);
      void hybridCache.invalidateResource(createCacheScope(instance, userId), "customer-page");
      setReload((value) => value + 1);
    } catch (error) {
      if (!mounted.current || currentToken.current !== requestToken) return;
      const details = getCustomerSegmentsError(error);
      setWriteUnknown(
        details.outcome === "UNKNOWN" || details.status === undefined || details.status >= 500,
      );
      if (details.outcome === "UNKNOWN" || details.status === undefined || details.status >= 500)
        setReconcileRequired(true);
      setConflict(details.code === "SEGMENT_CONFLICT" || details.code === "CATALOG_CHANGED");
      setSaveError(
        details.code === "CATALOG_IN_USE"
          ? "Este segmento possui vínculos e não pode ser excluído."
          : details.outcome === "UNKNOWN" || details.status === undefined || details.status >= 500
            ? "Não foi possível confirmar a exclusão. Confira a lista antes de tentar novamente."
            : "Não foi possível excluir o segmento. Ele pode estar em uso ou ter sido alterado. Recarregue os dados.",
      );
    } finally {
      pendingWrite.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <CrmPage
      title="Segmentos"
      description="Organize a classificação dos seus clientes."
      count={loading ? undefined : total}
      breadcrumbs={[{ label: "Clientes", href: `/${instance}/customers` }, { label: "Segmentos" }]}
      actions={
        <Button
          startIcon={<UiIcon name="add" scale="toolbar" />}
          variant="contained"
          disabled={reconcileRequired}
          onClick={() => openEditor()}
        >
          Novo segmento
        </Button>
      }
    >
      <div className="grid min-w-0 gap-4">
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}
        {reconcileRequired && !editor && !deleteTarget && (
          <Alert
            severity="warning"
            action={
              <Button
                disabled={loading || Boolean(loadError)}
                onClick={() => setReconcileRequired(false)}
              >
                Conferi os dados
              </Button>
            }
          >
            Uma gravação teve resultado desconhecido. Confira a lista atual antes de iniciar outra
            alteração.
          </Alert>
        )}

        <section aria-label="Consulta de segmentos" className="ip-crud-table min-w-0">
          <form
            onSubmit={applyFilters}
            className="flex flex-wrap items-start gap-3 border-b border-slate-200 p-4 dark:border-slate-700"
          >
            <TextField
              label="Buscar por nome"
              size="small"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              sx={{ flex: "1 1 220px" }}
            />
            <Button
              onClick={() => {
                setCodeFilter(String(filters.CODIGO ?? ""));
                setFiltersOpen(true);
              }}
              startIcon={<UiIcon name="filter" scale="toolbar" />}
            >
              Filtros
            </Button>
            <Button type="submit" startIcon={<Search />} variant="outlined" sx={{ minHeight: 40 }}>
              Buscar
            </Button>
            <Tooltip title="Atualizar lista">
              <span>
                <IconButton
                  aria-label="Atualizar lista"
                  onClick={() => setReload((value) => value + 1)}
                  disabled={loading}
                >
                  <UiIcon name="refresh" scale="toolbar" />
                </IconButton>
              </span>
            </Tooltip>
            {(filters.NOME !== undefined || filters.CODIGO !== undefined) && (
              <Button
                onClick={() => {
                  setNameFilter("");
                  setCodeFilter("");
                  setFilterError("");
                  setPage(0);
                  setFilters({});
                }}
              >
                Limpar filtros
              </Button>
            )}
          </form>
          <FilterChipBar
            items={Object.entries(filters).map(([key, value]) => ({
              key,
              label: `${key === "NOME" ? "Nome" : "Código"}: ${value}`,
              onDelete: () => {
                setFilters((old) => {
                  const next = { ...old };
                  delete next[key as keyof typeof next];
                  return next;
                });
                if (key === "NOME") setNameFilter("");
                else setCodeFilter("");
                setPage(0);
              },
            }))}
            onShowAll={() => setFiltersOpen(true)}
          />
          <OperationalPanel
            open={filtersOpen}
            title="Filtros de segmentos"
            onClose={() => setFiltersOpen(false)}
            footer={
              <>
                <Button onClick={() => setFiltersOpen(false)}>Cancelar</Button>
                <Button variant="contained" onClick={() => applyFilters()}>
                  Aplicar filtros
                </Button>
              </>
            }
          >
            <TextField
              label="Código"
              size="small"
              value={codeFilter}
              onChange={(event) => {
                setCodeFilter(event.target.value);
                setFilterError("");
              }}
              error={Boolean(filterError)}
              helperText={filterError}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              sx={{ flex: "0 1 130px" }}
            />
          </OperationalPanel>

          {loading && <LinearProgress aria-label="Carregando segmentos" />}
          {loadError ? (
            <Alert
              severity="error"
              sx={{ m: 2 }}
              action={
                <Button color="inherit" onClick={() => setReload((value) => value + 1)}>
                  Tentar novamente
                </Button>
              }
            >
              {loadError}
            </Alert>
          ) : (
            <>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table
                  size="small"
                  aria-label="Segmentos de clientes"
                  sx={{ minWidth: 650 }}
                  aria-busy={loading}
                >
                  <TableHead className="bg-slate-200 dark:bg-slate-800">
                    <TableRow>
                      {(
                        [
                          ["CODIGO", "Código"],
                          ["NOME", "Nome"],
                          ["ordem", "Ordem"],
                          ["COD_UNIDADE", "Unidade"],
                        ] as const
                      ).map(([column, label]) => (
                        <TableCell
                          key={column}
                          sortDirection={sortBy === column ? sortDirection : false}
                          sx={{ py: 2, fontWeight: 600 }}
                        >
                          <TableSortLabel
                            active={sortBy === column}
                            direction={sortBy === column ? sortDirection : "asc"}
                            onClick={() => sort(column)}
                          >
                            {label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Ações
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {segments.map((segment) => (
                      <TableRow key={segment.CODIGO} hover>
                        <TableCell data-label="Código">{segment.CODIGO}</TableCell>
                        <TableCell data-label="Nome">
                          {segment.NOME ?? <span className="text-slate-500">Sem nome</span>}
                        </TableCell>
                        <TableCell data-label="Ordem">{segment.ordem ?? "—"}</TableCell>
                        <TableCell data-label="Unidade">
                          {segment.COD_UNIDADE === null ? "—" : `Código ${segment.COD_UNIDADE}`}
                        </TableCell>
                        <TableCell data-label="Ações" align="right">
                          <Tooltip title="Editar segmento">
                            <span>
                              <IconButton
                                aria-label={`Editar segmento ${segment.NOME ?? `#${segment.CODIGO}`}`}
                                onClick={() => openEditor(segment)}
                                disabled={loading || reconcileRequired}
                              >
                                <UiIcon name="edit" scale="row" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Excluir segmento">
                            <span>
                              <IconButton
                                color="error"
                                aria-label={`Excluir segmento ${segment.NOME ?? `#${segment.CODIGO}`}`}
                                disabled={loading || reconcileRequired}
                                onClick={() => {
                                  setDeleteTarget(segment);
                                  setSaveError("");
                                  setWriteUnknown(false);
                                  setConflict(false);
                                }}
                              >
                                <UiIcon name="delete" scale="row" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && segments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          sx={{ py: 5, textAlign: "center", color: "text.secondary" }}
                        >
                          {filters.NOME !== undefined || filters.CODIGO !== undefined
                            ? "Nenhum segmento encontrado para esses filtros."
                            : "Nenhum segmento cadastrado."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={perPage}
                rowsPerPageOptions={[10, 20, 50, 100]}
                onPageChange={(_, next) => setPage(next)}
                onRowsPerPageChange={(event) => {
                  setPerPage(Number(event.target.value));
                  setPage(0);
                }}
                labelRowsPerPage="Por página"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                getItemAriaLabel={(type) =>
                  ({
                    first: "Primeira página",
                    last: "Última página",
                    next: "Próxima página",
                    previous: "Página anterior",
                  })[type]
                }
                sx={{
                  ".MuiTablePagination-toolbar": {
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    px: 1,
                  },
                  ".MuiTablePagination-spacer": { flex: "1 1 0" },
                }}
              />
            </>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(editor)}
        onClose={closeEditor}
        fullWidth
        maxWidth="sm"
        aria-labelledby="segment-editor-title"
        slotProps={{
          paper: {
            className:
              "rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
            sx: {
              m: { xs: 1.5, sm: 4 },
              width: "100%",
              backgroundImage: "none",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#0f172a" : "#fff"),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"),
            },
          },
        }}
      >
        <form onSubmit={save}>
          <DialogTitle id="segment-editor-title">
            {editor?.original ? "Editar segmento" : "Novo segmento"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {saveError && <Alert severity={conflict ? "warning" : "error"}>{saveError}</Alert>}
              {unitsError && (
                <Alert
                  severity="warning"
                  action={
                    <Button onClick={() => setReload((value) => value + 1)}>
                      Recarregar opções
                    </Button>
                  }
                >
                  {unitsError}
                </Alert>
              )}
              {editor?.original && (
                <Typography variant="body2" color="text.secondary">
                  Código: {editor.original.CODIGO}
                </Typography>
              )}
              <TextField
                autoFocus
                label="Nome"
                fullWidth
                value={editor?.draft.name ?? ""}
                onChange={(event) =>
                  setEditor(
                    (current) =>
                      current && {
                        ...current,
                        draft: { ...current.draft, name: event.target.value },
                      },
                  )
                }
                error={Boolean(validation?.nameError)}
                helperText={
                  validation?.nameError ||
                  (editor?.original?.NOME === null
                    ? "Este cadastro ainda não possui nome."
                    : "Até 50 caracteres.")
                }
                slotProps={{ htmlInput: { maxLength: 50 } }}
                disabled={saving || reloadingEditor}
              />
              <div className="grid gap-4 rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
                <Typography variant="subtitle2">Dados adicionais</Typography>
                <TextField
                  label="Ordem"
                  fullWidth
                  value={editor?.draft.order ?? ""}
                  onChange={(event) =>
                    setEditor(
                      (current) =>
                        current && {
                          ...current,
                          draft: { ...current.draft, order: event.target.value },
                        },
                    )
                  }
                  error={Boolean(validation?.orderError)}
                  helperText={
                    validation?.orderError ||
                    (editor?.original
                      ? "Deixe em branco para ficar sem ordem."
                      : "Opcional. Em branco, usa a ordem padrão do cadastro.")
                  }
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                  disabled={saving || reloadingEditor}
                />
                <TextField
                  label="Unidade"
                  fullWidth
                  select
                  value={editor?.draft.unit ?? ""}
                  onChange={(event) =>
                    setEditor(
                      (current) =>
                        current && {
                          ...current,
                          draft: { ...current.draft, unit: event.target.value },
                        },
                    )
                  }
                  disabled={saving || reloadingEditor}
                  error={Boolean(validation?.unitError)}
                  helperText={
                    validation?.unitError ||
                    "Selecione uma unidade cadastrada ou deixe sem unidade."
                  }
                >
                  <MenuItem value="">Sem unidade</MenuItem>
                  {editor?.draft.unit &&
                    !units.some((unit) => String(unit.CODIGO) === editor.draft.unit) && (
                      <MenuItem value={editor.draft.unit} disabled>
                        Unidade #{editor.draft.unit} (referência histórica)
                      </MenuItem>
                    )}
                  {units
                    .filter((unit) => unit.CODIGO > 0)
                    .map((unit) => (
                      <MenuItem key={unit.CODIGO} value={String(unit.CODIGO)}>
                        {unit.DESCRICAO ?? "Sem descrição"} (#{unit.CODIGO})
                      </MenuItem>
                    ))}
                </TextField>
              </div>
              {(conflict || writeUnknown) && editor?.original && (
                <Button
                  variant="outlined"
                  onClick={() => void reloadEditor()}
                  disabled={reloadingEditor}
                  startIcon={
                    reloadingEditor ? (
                      <CircularProgress size={16} />
                    ) : (
                      <UiIcon name="refresh" scale="toolbar" />
                    )
                  }
                >
                  Descartar rascunho e recarregar dados atuais
                </Button>
              )}
              {writeUnknown && !editor?.original && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setReload((value) => value + 1);
                    setDiscardOpen(true);
                  }}
                  startIcon={<UiIcon name="refresh" scale="toolbar" />}
                >
                  Conferir lista de segmentos
                </Button>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeEditor} disabled={saving || reloadingEditor}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                reloadingEditor ||
                conflict ||
                missing ||
                writeUnknown ||
                !validation?.hasChanges ||
                Boolean(validation?.nameError || validation?.orderError || validation?.unitError)
              }
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!saving) {
            setDeleteTarget(null);
            setReload((value) => value + 1);
          }
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="segment-delete-title"
      >
        <DialogTitle id="segment-delete-title">Excluir segmento?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              {deleteTarget?.NOME ?? "Sem nome"} (#{deleteTarget?.CODIGO})
            </Typography>
            <Typography variant="body2">
              A exclusão será recusada se houver vínculos ou se o cadastro tiver sido alterado.
              Clientes e exceções serão preservados.
            </Typography>
            {saveError && <Alert severity="warning">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => {
              setDeleteTarget(null);
              setReload((value) => value + 1);
            }}
          >
            Fechar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving || writeUnknown || conflict}
            onClick={() => void remove()}
          >
            {saving ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        aria-labelledby="segment-discard-title"
        slotProps={{
          paper: {
            sx: {
              backgroundImage: "none",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#0f172a" : "#fff"),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"),
            },
          },
        }}
      >
        <DialogTitle id="segment-discard-title">
          {writeUnknown ? "Conferir gravação?" : "Descartar alterações?"}
        </DialogTitle>
        <DialogContent>
          {writeUnknown
            ? "A gravação pode ter sido concluída. Feche este formulário e confira a lista antes de cadastrar novamente."
            : "As alterações deste segmento ainda não foram salvas."}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)}>Continuar editando</Button>
          <Button
            color="error"
            onClick={() => {
              setDiscardOpen(false);
              setEditor(null);
              if (writeUnknown) setReload((value) => value + 1);
            }}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </CrmPage>
  );
}

export default function CustomerSegmentsPage() {
  const { instance, user, token } = useAuthContext();
  if (user?.NIVEL !== UserRole.ADMIN)
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Acesso restrito a administradores.
      </Alert>
    );
  if (!token)
    return (
      <Alert severity="info" sx={{ m: 3 }}>
        Carregando sua sessão…
      </Alert>
    );
  return (
    <SegmentManagement
      key={`${instance}:${user.CODIGO}`}
      instance={instance}
      userId={user.CODIGO}
      token={token}
    />
  );
}
