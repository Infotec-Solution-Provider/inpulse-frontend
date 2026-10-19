"use client";

import { useAuthContext } from "@/app/auth-context";
import {
  CRM_CATALOGS,
  catalogDraft,
  catalogExpected,
  validateCatalogDraft,
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
import { Add, DeleteOutline, EditOutlined, Refresh, Search } from "@mui/icons-material";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
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
import { useEffect, useRef, useState, type FormEvent } from "react";

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

export function CatalogManagement({
  catalog,
  token,
  instance,
}: {
  catalog: CrmCatalogName;
  token: string;
  instance: string;
}) {
  const definition = CRM_CATALOGS[catalog];
  const columns = [
    { key: definition.identity, label: definition.identity === "UF" ? "UF" : "Código" },
    ...definition.fields,
  ];
  const [rows, setRows] = useState<CatalogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [sortBy, setSortBy] = useState(definition.fields[0].key);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [filters, setFilters] = useState<{ search?: string; id?: string }>({});
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
    customersService.setAuth(token);
    setLoading(true);
    setLoadError("");
    void customersService
      .listCrmCatalog(catalog, { page: page + 1, perPage, sortBy, sortDirection, ...filters })
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
  }, [catalog, token, page, perPage, sortBy, sortDirection, filters, reload]);
  useEffect(() => {
    if (!definition.fields.some((field) => field.kind === "unit")) return;
    let active = true;
    customersService.setAuth(token);
    setUnitsError("");
    void customersService
      .getCrmCatalogUnits()
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
  }, [definition, token, reload]);
  useEffect(() => {
    if (catalog !== "cities") return;
    let active = true;
    customersService.setAuth(token);
    setStatesError("");
    void customersService
      .getCrmCatalogStates()
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
  }, [catalog, token, reload]);

  const validation = editor ? validateCatalogDraft(catalog, editor.draft, editor.original) : null;
  const dirty =
    editor &&
    (editor.original ? validation?.hasChanges : Object.values(editor.draft).some(Boolean));
  const openEditor = (original?: CatalogRecord) => {
    setEditor({ original, draft: catalogDraft(catalog, original) });
    setMutationError("");
    setConflict(false);
    setUnknown(false);
    setSuccess("");
  };
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
    setConflict(code === "CATALOG_CHANGED" || status === 404);
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
    customersService.setAuth(auth);
    try {
      const response = await customersService.getCrmCatalog(
        catalog,
        editor.original[definition.identity] as string | number,
      );
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
    event.preventDefault();
    if (!editor || !validation?.valid || !validation.hasChanges || saving || unknown || conflict)
      return;
    const auth = token;
    writing.current = true;
    setSaving(true);
    setMutationError("");
    customersService.setAuth(auth);
    try {
      if (editor.original) {
        await customersService.updateCrmCatalog(
          catalog,
          editor.original[definition.identity] as number | string,
          { changes: validation.changes, expected: catalogExpected(catalog, editor.original) },
        );
      } else {
        await customersService.createCrmCatalog(
          catalog,
          validation.changes as CreateCrmCatalogRequest<CrmCatalogName>,
        );
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
    customersService.setAuth(auth);
    try {
      await customersService.deleteCrmCatalog(
        catalog,
        deleteTarget[definition.identity] as number | string,
        catalogExpected(catalog, deleteTarget),
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
  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
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
    setFilters({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(value ? { id: value } : {}),
    });
  };
  const display = (record: CatalogRecord, key: string) => {
    const value = record[key];
    if (value === null || value === undefined) return "—";
    if (key === "UNIDADE" || key === "COD_UNIDADE") {
      const unit = units.find((unit) => unit.CODIGO === value);
      return unit ? `${unit.DESCRICAO ?? "Sem descrição"} (#${value})` : `#${value}`;
    }
    return String(value) || "(vazio)";
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: "100%", overflow: "auto" }}>
      <Stack spacing={2}>
        <Breadcrumbs>
          <Link component={NextLink} href={`/${instance}/customers`}>
            Clientes
          </Link>
          <Link component={NextLink} href={`/${instance}/crm-catalogs`}>
            Cadastros auxiliares
          </Link>
          <Typography color="text.primary">{definition.title}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h5" component="h1">
              {definition.title}
            </Typography>
            <Typography color="text.secondary">{definition.description}</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            disabled={reconcileRequired}
            onClick={() => openEditor()}
          >
            Cadastrar {definition.singular}
          </Button>
        </Stack>
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
        <Stack
          component="form"
          onSubmit={applyFilters}
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "flex-start" }}
        >
          <TextField
            label="Buscar por nome ou descrição"
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label={definition.identity === "UF" ? "Sigla exata" : "Código exato"}
            size="small"
            value={idFilter}
            onChange={(event) => setIdFilter(event.target.value)}
            error={Boolean(filterError)}
            helperText={filterError}
            sx={{ width: { sm: 170 } }}
          />
          <Button type="submit" variant="outlined" startIcon={<Search />}>
            Buscar
          </Button>
          <Button
            startIcon={<Refresh />}
            disabled={loading}
            onClick={() => setReload((value) => value + 1)}
          >
            Recarregar
          </Button>
        </Stack>
        {unitsError && <Alert severity="warning">{unitsError}</Alert>}
        {statesError && <Alert severity="warning">{statesError}</Alert>}
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
          <TableContainer>
            <Table size="small" aria-label={definition.title}>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      sortDirection={sortBy === column.key ? sortDirection : false}
                    >
                      <TableSortLabel
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
                  rows.map((row) => (
                    <TableRow key={String(row[definition.identity])} hover>
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          sx={{
                            minWidth: column.key === definition.fields[0].key ? 180 : undefined,
                          }}
                        >
                          {display(row, column.key)}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Editar">
                          <span>
                            <IconButton
                              disabled={reconcileRequired}
                              aria-label={`Editar ${row[definition.identity]}`}
                              onClick={() => openEditor(row)}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <span>
                            <IconButton
                              disabled={reconcileRequired}
                              aria-label={`Excluir ${row[definition.identity]}`}
                              color="error"
                              onClick={() => {
                                setDeleteTarget(row);
                                setMutationError("");
                                setConflict(false);
                                setUnknown(false);
                              }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
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
        maxWidth="sm"
        aria-labelledby="catalog-editor-title"
      >
        <Box component="form" onSubmit={save}>
          <DialogTitle id="catalog-editor-title">
            {editor?.original
              ? `Editar ${definition.singular}`
              : `Cadastrar ${definition.singular}`}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {(unitsError || statesError) && <Alert severity="warning" action={<Button onClick={() => setReload(value => value + 1)}>Recarregar opções</Button>}>{unitsError || statesError}</Alert>}
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
              {definition.fields.map((field) => {
                const value = editor?.draft[field.key] ?? "";
                const currentUnit =
                  field.kind === "unit" &&
                  value !== "" &&
                  !units.some((unit) => String(unit.CODIGO) === value);
                const stateField = catalog === "cities" && field.key === "UF";
                const historicState =
                  stateField && value !== "" && !states.some((state) => state.UF === value);
                return (
                  <TextField
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    value={value}
                    select={field.kind === "unit" || stateField}
                    disabled={saving || reloadingEditor}
                    error={Boolean(validation?.errors[field.key])}
                    helperText={validation?.errors[field.key] ?? field.help}
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
    </Box>
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
