"use client";

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
import { UserRole, type Segment, type SegmentListParams } from "@/lib/sdk-local";
import customersService from "@/lib/services/customers.service";
import { Add, EditOutlined, Refresh, Search, Segment as SegmentIcon } from "@mui/icons-material";
import {
  Alert,
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [sortBy, setSortBy] = useState<SortColumn>("NOME");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [nameFilter, setNameFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [filters, setFilters] = useState<{ NOME?: string; CODIGO?: number }>({});
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
  const [reloadingEditor, setReloadingEditor] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const requestSequence = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

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
      .listSegments(params)
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
      : editor.draft.name !== "" || editor.draft.order !== "");

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
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
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
    event.preventDefault();
    if (
      !editor ||
      !validation ||
      validation.nameError ||
      validation.orderError ||
      !validation.hasChanges ||
      saving ||
      conflict ||
      missing ||
      writeUnknown
    )
      return;
    setSaving(true);
    setSaveError("");
    try {
      customersService.setAuth(token);
      const response = editor.original
        ? await customersService.updateSegment(
            editor.original.CODIGO,
            updateSegmentPayload(editor.draft, editor.original),
          )
        : await customersService.createSegment(createSegmentPayload(editor.draft));
      if (!mounted.current) return;
      void hybridCache.invalidateResource(createCacheScope(instance, userId), "customer-page");
      publishCustomerSegmentsChanged(instance);
      setEditor(null);
      setSuccess(
        `Segmento #${response.data.CODIGO} ${editor.original ? "atualizado" : "cadastrado"} com sucesso.`,
      );
      setReload((value) => value + 1);
    } catch (error) {
      if (!mounted.current) return;
      const status = errorStatus(error);
      const code = errorCode(error);
      if (code === "SEGMENT_WRITE_UNKNOWN" || status === undefined || status >= 500) {
        setWriteUnknown(true);
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
      if (mounted.current) setSaving(false);
    }
  };

  const reloadEditor = async () => {
    if (!editor?.original || saving || reloadingEditor) return;
    setReloadingEditor(true);
    try {
      customersService.setAuth(token);
      const { data } = await customersService.getSegment(editor.original.CODIGO);
      if (!mounted.current) return;
      setEditor({ original: data, draft: segmentDraft(data) });
      setConflict(false);
      setMissing(false);
      setWriteUnknown(false);
      setSaveError("");
      setReload((value) => value + 1);
    } catch (error) {
      if (mounted.current)
        setSaveError(
          errorStatus(error) === 404
            ? "Este segmento não está mais disponível. Seu rascunho foi mantido."
            : "Não foi possível recarregar os dados. Seu rascunho foi mantido.",
        );
    } finally {
      if (mounted.current) setReloadingEditor(false);
    }
  };

  return (
    <div className="box-border h-full w-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <div className="mx-auto grid w-full max-w-[1480px] gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Breadcrumbs aria-label="Navegação" sx={{ mb: 1, fontSize: 14 }}>
              <Link
                component={NextLink}
                href={`/${instance}/customers`}
                underline="hover"
                color="inherit"
              >
                Clientes
              </Link>
              <Typography component="span" variant="body2" color="text.secondary">
                Cadastros auxiliares
              </Typography>
              <Typography component="span" variant="body2">
                Segmentos
              </Typography>
            </Breadcrumbs>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-slate-100 p-2 dark:bg-slate-800">
                <SegmentIcon />
              </span>
              <Typography variant="h4" component="h1" fontWeight={700}>
                Segmentos
              </Typography>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Organize a classificação dos seus clientes.
            </p>
          </div>
          <Button startIcon={<Add />} variant="contained" onClick={() => openEditor()}>
            Novo segmento
          </Button>
        </header>

        {success && (
          <Alert severity="success" onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <section
          aria-label="Consulta de segmentos"
          className="min-w-0 rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
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
                  <Refresh />
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
                        <TableCell>{segment.CODIGO}</TableCell>
                        <TableCell>
                          {segment.NOME ?? <span className="text-slate-500">Sem nome</span>}
                        </TableCell>
                        <TableCell>{segment.ordem ?? "—"}</TableCell>
                        <TableCell>
                          {segment.COD_UNIDADE === null ? "—" : `Código ${segment.COD_UNIDADE}`}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Editar segmento">
                            <span>
                              <IconButton
                                aria-label={`Editar segmento ${segment.NOME ?? `#${segment.CODIGO}`}`}
                                onClick={() => openEditor(segment)}
                                disabled={loading}
                              >
                                <EditOutlined fontSize="small" />
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
                  value={
                    editor?.original?.COD_UNIDADE === null ||
                    editor?.original?.COD_UNIDADE === undefined
                      ? "—"
                      : `Código ${editor.original.COD_UNIDADE}`
                  }
                  helperText="Unidade atual do cadastro."
                  slotProps={{ input: { readOnly: true } }}
                />
              </div>
              {(conflict || writeUnknown) && editor?.original && (
                <Button
                  variant="outlined"
                  onClick={() => void reloadEditor()}
                  disabled={reloadingEditor}
                  startIcon={reloadingEditor ? <CircularProgress size={16} /> : <Refresh />}
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
                  startIcon={<Refresh />}
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
                Boolean(validation?.nameError || validation?.orderError)
              }
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogActions>
        </form>
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
            }}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
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
