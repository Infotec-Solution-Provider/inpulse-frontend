"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import {
  CrmPage,
  CrmToolbar,
  OperationalPanel,
  FilterChipBar,
  OperationalIconButton,
  UiIcon,
  useCrmQueryState,
} from "@/lib/ui-system";

import { useAuthContext } from "@/app/auth-context";
import {
  CRM_CATALOGS,
  catalogDefinitionDraft,
  catalogDefinitionExpected,
  validateCatalogDefinition,
  type CatalogDefinition,
  type CatalogDraft,
  type CatalogRecord,
} from "@/lib/crm-catalogs-form";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";
import {
  UserRole,
  type CrmCatalogName,
  type CrmUnitOption,
  type CrmStateOption,
  type CreateCrmCatalogRequest,
} from "@/lib/sdk-local";
import customersService from "@/lib/services/customers.service";
import type { CrmRequestContext } from "@/lib/sdk-local/crm-request-context";
import { Add, DeleteOutline, EditOutlined, Refresh, Search } from "@mui/icons-material";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Box,
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
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

type Editor = { original?: CatalogRecord; draft: CatalogDraft };
function errorDetails(error: unknown): { message?: string; outcome?: string } {
  let value = error;
  const seen = new Set<object>();
  while (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    const item = value as {
      response?: { data?: { message?: unknown; outcome?: unknown } };
      cause?: unknown;
    };
    if (item.response?.data)
      return {
        message:
          typeof item.response.data.message === "string" ? item.response.data.message : undefined,
        outcome:
          typeof item.response.data.outcome === "string" ? item.response.data.outcome : undefined,
      };
    value = item.cause;
  }
  return {};
}

export interface CatalogManagementApi {
  setAuth(token: string): void;
  list(
    params: {
      page: number;
      perPage: number;
      sortBy: string;
      sortDirection: "asc" | "desc";
      search?: string;
      id?: string;
    },
    context: CrmRequestContext,
  ): Promise<{ data: CatalogRecord[]; page: { totalRows?: number } }>;
  get(id: string | number, context: CrmRequestContext): Promise<{ data: CatalogRecord }>;
  create(data: CatalogRecord, context: CrmRequestContext): Promise<unknown>;
  update(
    id: string | number,
    changes: CatalogRecord,
    expected: CatalogRecord,
    context: CrmRequestContext,
  ): Promise<unknown>;
  remove(
    id: string | number,
    expected: CatalogRecord,
    context: CrmRequestContext,
  ): Promise<unknown>;
  getUnits?(context: CrmRequestContext): Promise<{ data: CrmUnitOption[] }>;
  getStates?(context: CrmRequestContext): Promise<{ data: CrmStateOption[] }>;
  conflictOn409?: boolean;
}
export function GenericCatalogManagement({
  catalog,
  token,
  instance,
  definition,
  api,
  sectionHref = "/crm-catalogs",
  sectionTitle = "Cadastros auxiliares",
  parentHref = "/customers",
  parentTitle = "Clientes",
  extraRowActions,
  extraContent,
}: {
  catalog: string;
  token: string;
  instance: string;
  definition: CatalogDefinition;
  api: CatalogManagementApi;
  sectionHref?: string;
  sectionTitle?: string;
  parentHref?: string;
  parentTitle?: string;
  extraRowActions?: (row: CatalogRecord) => ReactNode;
  extraContent?: ReactNode;
}) {
  const columns =
    catalog === "shifts"
      ? [
          { key: definition.identity, label: "Código" },
          { key: "DESCRICAO", label: "Descrição" },
          ...[1, 2, 3].map((index) => ({
            key: `__INTERVAL_${index}`,
            label: `Intervalo ${index}`,
          })),
        ]
      : [
          { key: definition.identity, label: definition.identity === "UF" ? "UF" : "Código" },
          ...definition.fields.filter(
            (field) =>
              field.key !== "ID_COUNT" && !["ORDEMESTADO", "ORDEMCIDADE"].includes(field.key),
          ),
        ];
  const [rows, setRows] = useState<CatalogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useCrmQueryState(`${catalog}:page`, 0);
  const [perPage, setPerPage] = useCrmQueryState(`${catalog}:perPage`, 20);
  const [sortBy, setSortBy] = useCrmQueryState(`${catalog}:sortBy`, definition.fields[0].key);
  const [sortDirection, setSortDirection] = useCrmQueryState<"asc" | "desc">(
    `${catalog}:sortDirection`,
    "asc",
  );
  const [filters, setFilters] = useCrmQueryState<{ search?: string; id?: string }>(
    `${catalog}:filters`,
    {},
  );
  const [search, setSearch] = useState(filters.search ?? "");
  const [idFilter, setIdFilter] = useState(filters.id ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [units, setUnits] = useState<CrmUnitOption[]>([]);
  const [unitsError, setUnitsError] = useState("");
  const [states, setStates] = useState<CrmStateOption[]>([]);
  const [statesError, setStatesError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadingEditor, setReloadingEditor] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [reconcileRequired, setReconcileRequired] = useState(false);
  const [success, setSuccess] = useState("");
  const [discard, setDiscard] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const alive = useRef(true);
  const currentToken = useRef(token);
  currentToken.current = token;
  const requestSequence = useRef(0);
  const writing = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (writing.current) {
      setUnknown(true);
      setReconcileRequired(true);
      setMutationError(
        "Sua sessão mudou durante a gravação. Confira os dados antes de tentar novamente.",
      );
    }
  }, [token]);
  useEffect(() => {
    const sequence = ++requestSequence.current;
    api.setAuth(token);
    setLoading(true);
    setLoadError("");
    void api
      .list({ page: page + 1, perPage, sortBy, sortDirection, ...filters }, { token, instance })
      .then((response) => {
        if (!alive.current || sequence !== requestSequence.current) return;
        const totalRows = response.page.totalRows ?? 0;
        const last = Math.max(0, Math.ceil(totalRows / perPage) - 1);
        if (page > last) {
          setPage(last);
          return;
        }
        setRows(response.data as unknown as CatalogRecord[]);
        setTotal(totalRows);
      })
      .catch((error: unknown) => {
        if (!alive.current || sequence !== requestSequence.current) return;
        setLoadError(
          getCustomerSegmentsError(error).status === 403
            ? "Você não tem permissão para administrar este catálogo."
            : "Não foi possível carregar os registros. Tente novamente.",
        );
      })
      .finally(() => {
        if (alive.current && sequence === requestSequence.current) setLoading(false);
      });
  }, [api, catalog, token, page, perPage, sortBy, sortDirection, filters, reload]);
  useEffect(() => {
    if (!definition.fields.some((field) => field.kind === "unit") || !api.getUnits) return;
    let active = true;
    api.setAuth(token);
    setUnitsError("");
    void api
      .getUnits({ token, instance })
      .then((response) => {
        if (active) setUnits(response.data);
      })
      .catch(() => {
        if (active) {
          setUnits([]);
          setUnitsError(
            "Não foi possível carregar as unidades. Recarregue a lista para tentar novamente.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [api, definition, token, reload]);
  useEffect(() => {
    if (catalog !== "cities" || !api.getStates) return;
    let active = true;
    api.setAuth(token);
    setStatesError("");
    void api
      .getStates({ token, instance })
      .then((response) => {
        if (active) setStates(response.data);
      })
      .catch(() => {
        if (active) {
          setStates([]);
          setStatesError("Não foi possível carregar os estados cadastrados.");
        }
      });
    return () => {
      active = false;
    };
  }, [api, catalog, token, reload]);

  const validation = editor
    ? validateCatalogDefinition(definition, editor.draft, editor.original)
    : null;
  const dirty =
    editor &&
    (editor.original ? validation?.hasChanges : Object.values(editor.draft).some(Boolean));
  const openEditor = (original?: CatalogRecord) => {
    setEditor({ original, draft: catalogDefinitionDraft(definition, original) });
    setMutationError("");
    setConflict(false);
    setUnknown(false);
    setSuccess("");
  };
  useCrmLeaveGuard(Boolean(dirty), saving, unknown || reconcileRequired);
  const closeEditor = () => {
    if (saving || reloadingEditor) return;
    if (dirty || unknown) setDiscard(true);
    else setEditor(null);
  };
  const changed = () => {
    setReload((value) => value + 1);
    window.dispatchEvent(
      new CustomEvent("inpulse:crm-catalogs-changed", { detail: { instance, catalog } }),
    );
  };
  const handleMutationError = (error: unknown) => {
    const { status, code } = getCustomerSegmentsError(error);
    const details = errorDetails(error);
    const uncertain = details.outcome === "UNKNOWN" || status === undefined || status >= 500;
    setUnknown(uncertain);
    if (uncertain) setReconcileRequired(true);
    setConflict(
      code?.endsWith("_CHANGED") ||
        code?.endsWith("_CONFLICT") ||
        status === 401 ||
        status === 404 ||
        Boolean(api.conflictOn409 && status === 409),
    );
    setMutationError(
      uncertain
        ? "Não foi possível confirmar a gravação. Ela pode ter sido concluída. Confira os dados antes de tentar novamente."
        : (details.message ??
            (status === 404
              ? "Este registro não existe mais. Recarregue os dados."
              : status === 403
                ? "Você não tem permissão para esta operação."
                : "Não foi possível salvar. Revise os dados e tente novamente.")),
    );
  };
  const reloadEditor = async () => {
    if (!editor?.original || saving || reloadingEditor) return;
    const auth = token;
    setReloadingEditor(true);
    api.setAuth(auth);
    try {
      const response = await api.get(editor.original[definition.identity] as string | number, {
        token: auth,
        instance,
      });
      if (!alive.current || currentToken.current !== auth) return;
      openEditor(response.data as unknown as CatalogRecord);
      setReconcileRequired(false);
      changed();
    } catch (error) {
      if (alive.current && currentToken.current === auth)
        setMutationError(
          errorDetails(error).message ??
            "Não foi possível recarregar o registro. Seu rascunho foi preservado.",
        );
    } finally {
      if (alive.current && currentToken.current === auth) setReloadingEditor(false);
    }
  };
  const save = async (event: FormEvent) => {
    event?.preventDefault();
    if (!editor || !validation?.valid || !validation.hasChanges || saving || unknown || conflict)
      return;
    const auth = token;
    writing.current = true;
    setSaving(true);
    setMutationError("");
    api.setAuth(auth);
    try {
      if (editor.original) {
        await api.update(
          editor.original[definition.identity] as number | string,
          validation.changes,
          catalogDefinitionExpected(definition, editor.original),
          { token: auth, instance },
        );
      } else {
        await api.create(validation.changes, { token: auth, instance });
      }
      if (!alive.current || currentToken.current !== auth) return;
      setEditor(null);
      setSuccess("Registro salvo com sucesso.");
      changed();
    } catch (error) {
      if (alive.current && currentToken.current === auth) handleMutationError(error);
    } finally {
      writing.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleteTarget || saving || unknown || conflict) return;
    const auth = token;
    writing.current = true;
    setSaving(true);
    setMutationError("");
    api.setAuth(auth);
    try {
      await api.remove(
        deleteTarget[definition.identity] as number | string,
        catalogDefinitionExpected(definition, deleteTarget),
        { token: auth, instance },
      );
      if (!alive.current || currentToken.current !== auth) return;
      setDeleteTarget(null);
      setSuccess("Registro excluído com sucesso.");
      changed();
    } catch (error) {
      if (alive.current && currentToken.current === auth) handleMutationError(error);
    } finally {
      writing.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    const value = idFilter.trim();
    if (
      value &&
      definition.identity === "CODIGO" &&
      (!/^-?\d+$/.test(value) || Number(value) < -2147483648 || Number(value) > 2147483647)
    ) {
      setFilterError("Informe um código inteiro válido.");
      return;
    }
    if (value && definition.identity === "UF" && value.length > 2) {
      setFilterError("A sigla do estado possui até duas letras.");
      return;
    }
    setFilterError("");
    setPage(0);
    setFiltersOpen(false);
    setFilters({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(value ? { id: value } : {}),
    });
  };
  const display = (record: CatalogRecord, key: string) => {
    if (key.startsWith("__INTERVAL_")) {
      const index = key.slice(-1),
        flag = record[`HORARIO_${index}`];
      if (flag === "NAO") return "Não utilizado";
      return `${flag === "SIM" ? "" : "Não definido · "}${record[`ENTRADA_${index}`] ?? "—"} – ${record[`SAIDA_${index}`] ?? "—"}`;
    }
    const value = record[key];
    if (value === null || value === undefined) return "—";
    const field = definition.fields.find((field) => field.key === key);
    if (field?.kind === "enum")
      return field.options?.find((option) => option.value === value)?.label ?? String(value);
    if (key === "UNIDADE" || key === "COD_UNIDADE") {
      const unit = units.find((unit) => unit.CODIGO === value);
      return unit ? `${unit.DESCRICAO ?? "Sem descrição"} (#${value})` : `#${value}`;
    }
    return String(value) || "(vazio)";
  };

  const renderEditorField = (field: CatalogDefinition["fields"][number]) => {
    const value = editor?.draft[field.key] ?? "";
    const currentUnit =
      field.kind === "unit" && value !== "" && !units.some((unit) => String(unit.CODIGO) === value);
    const stateField = catalog === "cities" && field.key === "UF";
    const historicState = stateField && value !== "" && !states.some((state) => state.UF === value);
    const fieldError = editor?.original || value ? validation?.errors[field.key] : undefined;
    return (
      <TextField
        key={field.key}
        label={field.label}
        required={field.required}
        value={value}
        select={field.kind === "unit" || field.kind === "enum" || stateField}
        disabled={saving || reloadingEditor}
        error={Boolean(fieldError)}
        helperText={fieldError ?? field.help}
        slotProps={{
          htmlInput: field.kind === "integer" ? { inputMode: "numeric" } : undefined,
        }}
        onChange={(event) =>
          setEditor(
            (current) =>
              current && {
                ...current,
                draft: { ...current.draft, [field.key]: event.target.value },
              },
          )
        }
      >
        {field.kind === "unit" && [
          <MenuItem key="empty" value="">
            {field.required ? "Selecione uma unidade" : "Sem unidade"}
          </MenuItem>,
          ...(currentUnit
            ? [
                <MenuItem key="historic" value={value} disabled>
                  Unidade #{value} (referência histórica)
                </MenuItem>,
              ]
            : []),
          ...units
            .filter((unit) => unit.CODIGO > 0)
            .map((unit) => (
              <MenuItem key={unit.CODIGO} value={String(unit.CODIGO)}>
                {unit.DESCRICAO ?? "Sem descrição"} (#{unit.CODIGO})
              </MenuItem>
            )),
        ]}
        {field.kind === "enum" && [
          <MenuItem key="empty" value="">
            Não definido
          </MenuItem>,
          ...(value && !field.options?.some((option) => option.value === value)
            ? [
                <MenuItem key="historic" value={value} disabled>
                  {value} (histórico)
                </MenuItem>,
              ]
            : []),
          ...(field.options ?? []).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          )),
        ]}
        {stateField && [
          <MenuItem key="empty" value="">
            Sem estado
          </MenuItem>,
          ...(historicState
            ? [
                <MenuItem key="historic" value={value} disabled>
                  {value} (referência histórica)
                </MenuItem>,
              ]
            : []),
          ...states.map((state) => (
            <MenuItem key={state.UF} value={state.UF}>
              {state.UF} · {state.NOME ?? "Sem nome"}
            </MenuItem>
          )),
        ]}
      </TextField>
    );
  };
  return (
    <CrmPage
      title={definition.title}
      description={definition.description}
      count={loading ? undefined : total}
      breadcrumbs={[
        {
          label: ["cities", "states", "medias"].includes(catalog) ? "Outros" : parentTitle,
          href: ["cities", "states", "medias"].includes(catalog)
            ? undefined
            : `/${instance}${parentHref}`,
        },
        { label: definition.title },
      ]}
      actions={
        <Button
          variant="contained"
          startIcon={<UiIcon name="add" scale="toolbar" />}
          disabled={reconcileRequired}
          onClick={() => openEditor()}
        >
          {["origins", "brands", "medias", "cities"].includes(catalog) ? "Nova" : "Novo"}{" "}
          {definition.singular}
        </Button>
      }
    >
      <Stack spacing={2}>
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
        <Box component="form" onSubmit={applyFilters}>
          <CrmToolbar>
            <TextField
              label="Buscar por nome ou descrição"
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ flex: "1 1 220px", maxWidth: 480 }}
            />
            <OperationalIconButton label="Buscar" tooltip="Buscar" type="submit">
              <UiIcon name="search" scale="toolbar" />
            </OperationalIconButton>
            <OperationalIconButton
              label="Filtros"
              tooltip="Filtros"
              onClick={() => {
                setIdFilter(filters.id ?? "");
                setFiltersOpen(true);
              }}
            >
              <UiIcon name="filter" scale="toolbar" />
            </OperationalIconButton>
            <OperationalIconButton
              label="Atualizar lista"
              tooltip="Atualizar lista"
              disabled={loading}
              onClick={() => setReload((value) => value + 1)}
            >
              <UiIcon name="refresh" scale="toolbar" />
            </OperationalIconButton>
          </CrmToolbar>
        </Box>
        <FilterChipBar
          items={Object.entries(filters)
            .filter(([, value]) => Boolean(value))
            .map(([key, value]) => ({
              key,
              label: `${key === "search" ? "Busca" : "Código"}: ${value}`,
              onDelete: () => {
                setFilters((old) => {
                  const next = { ...old };
                  delete next[key as keyof typeof next];
                  return next;
                });
                if (key === "search") setSearch("");
                else setIdFilter("");
                setPage(0);
              },
            }))}
          onShowAll={() => setFiltersOpen(true)}
          onClearAll={() => {
            setFilters({});
            setSearch("");
            setIdFilter("");
            setPage(0);
          }}
        />
        <OperationalPanel
          open={filtersOpen}
          title={`Filtros de ${definition.title.toLocaleLowerCase("pt-BR")}`}
          onClose={() => {
            setIdFilter(filters.id ?? "");
            setFiltersOpen(false);
          }}
          footer={
            <>
              <Button
                onClick={() => {
                  setIdFilter(filters.id ?? "");
                  setFiltersOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button variant="contained" onClick={() => applyFilters()}>
                Aplicar filtros
              </Button>
            </>
          }
        >
          <TextField
            fullWidth
            label={definition.identity === "UF" ? "Sigla exata" : "Código exato"}
            value={idFilter}
            onChange={(event) => setIdFilter(event.target.value)}
            error={Boolean(filterError)}
            helperText={filterError}
          />
        </OperationalPanel>
        {unitsError && <Alert severity="warning">{unitsError}</Alert>}
        {statesError && <Alert severity="warning">{statesError}</Alert>}
        {rows.some((row) => Number(row.ID_COUNT ?? 1) > 1) && (
          <Alert severity="warning">
            Há códigos compartilhados por mais de um cadastro legado. A edição e a exclusão desses
            códigos ficam bloqueadas até a identificação ser resolvida no CRM.
          </Alert>
        )}
        {extraContent}
        {loadError && (
          <Alert
            severity="error"
            action={
              <Button onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>
            }
          >
            {loadError}
          </Alert>
        )}
        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {loading && <LinearProgress aria-label="Carregando registros" />}
          <TableContainer className="ip-crud-table">
            <Table size="small" aria-label={definition.title}>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      sortDirection={sortBy === column.key ? sortDirection : false}
                    >
                      <TableSortLabel
                        disabled={
                          definition.sortable === false || column.key.startsWith("__INTERVAL_")
                        }
                        active={sortBy === column.key}
                        direction={sortBy === column.key ? sortDirection : "asc"}
                        onClick={() => {
                          setSortDirection(
                            sortBy === column.key && sortDirection === "asc" ? "desc" : "asc",
                          );
                          setSortBy(column.key);
                          setPage(0);
                        }}
                      >
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loadError &&
                  rows.map((row, rowIndex) => (
                    <TableRow key={`${String(row[definition.identity])}:${rowIndex}`} hover>
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          data-label={column.label}
                          sx={{
                            minWidth: column.key === definition.fields[0].key ? 180 : undefined,
                          }}
                        >
                          {display(row, column.key)}
                        </TableCell>
                      ))}
                      <TableCell data-label="Ações" align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Editar">
                          <span>
                            <IconButton
                              disabled={reconcileRequired || Number(row.ID_COUNT ?? 1) > 1}
                              aria-label={`Editar ${row[definition.identity]}`}
                              onClick={() => openEditor(row)}
                            >
                              <UiIcon name="edit" scale="row" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <span>
                            <IconButton
                              disabled={reconcileRequired || Number(row.ID_COUNT ?? 1) > 1}
                              aria-label={`Excluir ${row[definition.identity]}`}
                              color="error"
                              onClick={() => {
                                setDeleteTarget(row);
                                setMutationError("");
                                setConflict(false);
                                setUnknown(false);
                              }}
                            >
                              <UiIcon name="delete" scale="row" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {extraRowActions?.(row)}
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading && !loadError && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 5 }}>
                      Nenhum registro encontrado.
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
            onPageChange={(_, value) => setPage(value)}
            onRowsPerPageChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="Por página"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            getItemAriaLabel={(type) =>
              type === "next" ? "Próxima página" : type === "previous" ? "Página anterior" : type
            }
          />
        </Box>
      </Stack>

      <Dialog
        open={Boolean(editor)}
        onClose={closeEditor}
        fullWidth
        maxWidth={catalog === "shifts" ? "md" : "sm"}
        slotProps={{ paper: { className: "ip-crud-editor" } }}
        aria-labelledby="catalog-editor-title"
      >
        <Box
          component="form"
          onSubmit={save}
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            maxHeight: "calc(100dvh - 64px)",
          }}
        >
          <DialogTitle id="catalog-editor-title">
            {editor?.original
              ? `Editar ${definition.singular}`
              : `Cadastrar ${definition.singular}`}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {(unitsError || statesError) && (
                <Alert
                  severity="warning"
                  action={
                    <Button onClick={() => setReload((value) => value + 1)}>
                      Recarregar opções
                    </Button>
                  }
                >
                  {unitsError || statesError}
                </Alert>
              )}
              <TextField
                label={definition.identity === "UF" ? "Sigla do estado" : "Código"}
                value={editor?.draft[definition.identity] ?? ""}
                disabled={Boolean(editor?.original) || definition.autoId || saving}
                helperText={
                  validation?.errors[definition.identity] ??
                  (definition.autoId
                    ? "Gerado automaticamente ao cadastrar."
                    : editor?.original
                      ? "A identificação do registro é permanente."
                      : "Use um código disponível no CRM.")
                }
                error={Boolean(validation?.errors[definition.identity])}
                onChange={(event) =>
                  setEditor(
                    (current) =>
                      current && {
                        ...current,
                        draft: { ...current.draft, [definition.identity]: event.target.value },
                      },
                  )
                }
              />
              {[
                ...new Set(
                  definition.fields
                    .filter((field) => !field.readOnly)
                    .map((field) => field.group ?? ""),
                ),
              ].map((group) => {
                const fields = definition.fields.filter(
                  (field) => !field.readOnly && (field.group ?? "") === group,
                );
                const content = (
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: {
                        xs: "minmax(0,1fr)",
                        sm: group.startsWith("Intervalo")
                          ? "repeat(3,minmax(0,1fr))"
                          : "minmax(0,1fr)",
                      },
                    }}
                  >
                    {fields.map(renderEditorField)}
                  </Box>
                );
                return fields.every((field) => field.advanced) ? (
                  <Accordion
                    key={group}
                    expanded={
                      Boolean(openSections[group]) ||
                      fields.some(
                        (field) =>
                          Boolean(validation?.errors[field.key]) &&
                          Boolean(editor?.draft[field.key]),
                      )
                    }
                    onChange={(_, open) => setOpenSections((old) => ({ ...old, [group]: open }))}
                    disableGutters
                    elevation={0}
                    className="ip-crud-advanced"
                  >
                    <AccordionSummary expandIcon={<UiIcon name="chevronDown" scale="metadata" />}>
                      <Typography fontSize={14}>{group}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>{content}</AccordionDetails>
                  </Accordion>
                ) : (
                  <Box key={group}>
                    {group && (
                      <Typography component="h3" fontSize={14} fontWeight={600} mb={1}>
                        {group}
                      </Typography>
                    )}
                    {content}
                  </Box>
                );
              })}
              {mutationError && (
                <Alert severity={unknown || conflict ? "warning" : "error"}>{mutationError}</Alert>
              )}
              {(conflict || unknown) && (
                <Typography variant="body2">
                  Seu rascunho foi preservado.{" "}
                  {editor?.original
                    ? "Recarregue o registro para conferir os valores atuais antes de editar novamente."
                    : "Feche o formulário e confira a listagem antes de cadastrar novamente."}
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
            {editor?.original && (
              <Button
                startIcon={reloadingEditor ? <CircularProgress size={16} /> : <Refresh />}
                disabled={saving || reloadingEditor}
                onClick={() => void reloadEditor()}
              >
                Recarregar registro
              </Button>
            )}
            <Button disabled={saving || reloadingEditor} onClick={closeEditor}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                reloadingEditor ||
                unknown ||
                conflict ||
                !validation?.valid ||
                !validation.hasChanges
              }
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!saving) {
            setDeleteTarget(null);
            if (unknown) changed();
          }
        }}
        aria-labelledby="catalog-delete-title"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="catalog-delete-title">Excluir {definition.singular}?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Registro {String(deleteTarget?.[definition.identity] ?? "")} ·{" "}
              {String(deleteTarget?.[definition.fields[0].key] ?? "Sem descrição")}.
            </Typography>
            <Typography variant="body2">
              A exclusão será recusada se houver vínculos ou se o registro tiver sido alterado. Os
              registros vinculados serão preservados.
            </Typography>
            {mutationError && <Alert severity="warning">{mutationError}</Alert>}
            {(unknown || conflict) && (
              <Typography variant="body2">
                Feche esta confirmação e recarregue a lista para conferir o estado atual.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => {
              setDeleteTarget(null);
              changed();
            }}
          >
            Fechar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving || unknown || conflict}
            onClick={() => void remove()}
          >
            {saving ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={discard}
        onClose={() => setDiscard(false)}
        aria-labelledby="catalog-discard-title"
      >
        <DialogTitle id="catalog-discard-title">
          {unknown ? "Conferir gravação?" : "Descartar alterações?"}
        </DialogTitle>
        <DialogContent>
          {unknown
            ? "A gravação pode ter sido concluída. Confira a listagem antes de repetir o cadastro."
            : "As alterações ainda não foram salvas."}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscard(false)}>Continuar editando</Button>
          <Button
            color="error"
            onClick={() => {
              setDiscard(false);
              setEditor(null);
              if (unknown) changed();
            }}
          >
            Fechar formulário
          </Button>
        </DialogActions>
      </Dialog>
    </CrmPage>
  );
}

export function CatalogManagement({
  catalog,
  token,
  instance,
}: {
  catalog: CrmCatalogName;
  token: string;
  instance: string;
}) {
  const api = useMemo<CatalogManagementApi>(
    () => ({
      setAuth: (value) => customersService.setAuth(value),
      list: (params, context) =>
        customersService
          .listCrmCatalog(catalog, params, context)
          .then((response) => ({ ...response, data: response.data.map((row) => ({ ...row })) })),
      get: (id, context) =>
        customersService
          .getCrmCatalog(catalog, id, context)
          .then((response) => ({ ...response, data: { ...response.data } })),
      create: (data, context) =>
        customersService.createCrmCatalog(
          catalog,
          data as CreateCrmCatalogRequest<CrmCatalogName>,
          context,
        ),
      update: (id, changes, expected, context) =>
        customersService.updateCrmCatalog(catalog, id, { changes, expected }, context),
      remove: (id, expected, context) =>
        customersService.deleteCrmCatalog(catalog, id, expected, context),
      getUnits: (context) => customersService.getCrmCatalogUnits(context),
      getStates: (context) => customersService.getCrmCatalogStates(context),
    }),
    [catalog],
  );
  return (
    <GenericCatalogManagement
      catalog={catalog}
      token={token}
      instance={instance}
      definition={CRM_CATALOGS[catalog]}
      api={api}
    />
  );
}

export default function CrmCatalogManagement({ catalog }: { catalog: CrmCatalogName }) {
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
    <CatalogManagement
      key={`${instance}:${user.CODIGO}:${catalog}`}
      catalog={catalog}
      instance={instance}
      token={token}
    />
  );
}
