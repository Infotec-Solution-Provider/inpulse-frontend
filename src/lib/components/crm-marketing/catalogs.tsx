"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { CrmToolbar, OperationalPanel, OperationalIconButton, UiIcon } from "@/lib/ui-system";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { useCrmQueryState } from "@/lib/ui-system/query-state";
import {
  crmDraft,
  crmError,
  crmExpected,
  crmLabels,
  crmPayload,
  type CrmDraft,
} from "@/lib/crm-marketing-form";
import type {
  CrmMarketingCatalog,
  CrmMarketingField,
  CrmMarketingRecord,
} from "@/lib/sdk-local/types/crm-marketing.types";
import {
  Add,
  DeleteOutline,
  EditOutlined,
  ExpandMore,
  Refresh,
  Search,
  SettingsOutlined,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  MenuItem,
  IconButton,
  LinearProgress,
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
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CrmActionField,
  CrmMarketingFrame,
  NullableCrmField,
  useCrmMutation,
  useCrmSession,
} from "./shared";
type Editor = { original?: CrmMarketingRecord; draft: CrmDraft };
export default function CrmCatalogPage({ catalog }: { catalog: CrmMarketingCatalog }) {
  return (
    <CrmMarketingFrame title={catalog === "campaigns" ? "Campanhas" : "Resultados"}>
      <CatalogPanel catalog={catalog} />
    </CrmMarketingFrame>
  );
}
export function CatalogPanel({ catalog }: { catalog: CrmMarketingCatalog }) {
  const { client, instance } = useCrmSession(),
    currentClient = useRef(client),
    mutation = useCrmMutation();
  currentClient.current = client;
  const [idFilter, setIdFilter] = useCrmQueryState(`marketing:${catalog}:code`, ""),
    [typeFilter, setTypeFilter] = useCrmQueryState(`marketing:${catalog}:type`, ""),
    [filterPanel, setFilterPanel] = useState(false),
    [draftCode, setDraftCode] = useState(""),
    [draftType, setDraftType] = useState("");
  const [fields, setFields] = useState<CrmMarketingField[]>([]),
    [rows, setRows] = useState<CrmMarketingRecord[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useCrmQueryState(`marketing:${catalog}` + ":page", 0),
    [perPage, setPerPage] = useCrmQueryState(`marketing:${catalog}` + ":perPage", 20),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useCrmQueryState(`marketing:${catalog}` + ":filter", ""),
    [sortBy, setSortBy] = useCrmQueryState(`marketing:${catalog}` + ":sortBy", "NOME"),
    [direction, setDirection] = useCrmQueryState<"asc" | "desc">(
      `marketing:${catalog}` + ":direction",
      "asc",
    ),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [reload, setReload] = useState(0),
    [editor, setEditor] = useState<Editor | null>(null),
    [deleting, setDeleting] = useState<CrmMarketingRecord | null>(null),
    [discard, setDiscard] = useState(false),
    [reading, setReading] = useState(false);
  useEffect(() => {
    setSearch(filter);
  }, [filter]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  useEffect(() => {
    setFieldErrors({});
    setAdvancedOpen(false);
  }, [editor?.original?.CODIGO, Boolean(editor)]);
  const lastCode = useRef<number | null>(null),
    sequence = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    void Promise.all([
      client.schema(catalog),
      client.list(catalog, {
        page: page + 1,
        perPage,
        NOME: filter,
        ...(idFilter ? { CODIGO: idFilter } : {}),
        ...(typeFilter ? { TIPO: typeFilter } : {}),
        sortBy,
        sortDirection: direction,
      }),
    ])
      .then(([schema, result]) => {
        if (!active) return;
        const last = Math.max(0, Math.ceil(result.page.totalRows / perPage) - 1);
        if (page > last) {
          setPage(last);
          return;
        }
        setFields(schema.fields);
        setRows(result.data);
        setTotal(result.page.totalRows);
      })
      .catch(() => {
        if (active)
          setLoadError("Não foi possível carregar os cadastros. Recarregue para tentar novamente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, catalog, page, perPage, filter, idFilter, typeFilter, sortBy, direction, reload]);
  async function edit(row: CrmMarketingRecord) {
    const version = ++sequence.current,
      started = client;
    setReading(true);
    mutation.setError("");
    try {
      const detail = await client.detail(catalog, row.CODIGO);
      if (alive.current && version === sequence.current && started === currentClient.current)
        setEditor({ original: detail, draft: crmDraft(fields, detail) });
    } catch (error) {
      if (alive.current && version === sequence.current) mutation.setError(crmError(error).message);
    } finally {
      if (alive.current && version === sequence.current) setReading(false);
    }
  }
  async function reconcile() {
    const version = ++sequence.current,
      started = client;
    setReading(true);
    try {
      if (lastCode.current !== null) {
        try {
          const detail = await client.detail(catalog, lastCode.current);
          if (!alive.current || version !== sequence.current || started !== currentClient.current)
            return;
          setEditor({ original: detail, draft: crmDraft(fields, detail) });
          setDeleting(null);
        } catch (error) {
          if (crmError(error).status !== 404) throw error;
          if (!alive.current || started !== currentClient.current) return;
          setEditor(null);
          setDeleting(null);
        }
      }
      if (!alive.current || version !== sequence.current || started !== currentClient.current)
        return;
      mutation.reconcile();
      mutation.setSuccess("Dados conferidos. Revise o cadastro antes de continuar.");
      setReload((value) => value + 1);
    } catch (error) {
      if (alive.current) mutation.setError(crmError(error).message);
    } finally {
      if (alive.current && version === sequence.current) setReading(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const errors: Record<string, string> = {};
    try {
      crmPayload([], editor.draft, editor.original);
    } catch (error) {
      errors.CODIGO = (error as Error).message;
    }
    for (const field of fields.filter((value) => !value.readOnly)) {
      try {
        crmPayload([field], { ...editor.draft, CODIGO: "1" }, editor.original);
      } catch (error) {
        errors[field.key] = (error as Error).message;
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setAdvancedOpen(true);
      mutation.setError("Confira os campos indicados.");
      return;
    }
    let payload;
    try {
      payload = crmPayload(fields, editor.draft, editor.original);
      if (editor.original && !Object.keys(payload).length) {
        mutation.setError("Nenhum valor foi alterado.");
        return;
      }
    } catch (error) {
      mutation.setError(error instanceof Error ? error.message : "Confira os campos.");
      return;
    }
    lastCode.current = editor.original?.CODIGO ?? Number(payload["CODIGO"]);
    const result = await mutation.write(() =>
      editor.original
        ? client.patch(catalog, editor.original.CODIGO, {
            changes: payload,
            expected: crmExpected(fields, editor.original),
          })
        : client.create(catalog, payload),
    );
    if (result) {
      setEditor(null);
      setReload((value) => value + 1);
      mutation.setSuccess("Cadastro salvo.");
    }
  }
  async function remove() {
    if (!deleting) return;
    lastCode.current = deleting.CODIGO;
    const result = await mutation.write(() =>
      client.remove(catalog, deleting.CODIGO, crmExpected(fields, deleting)),
    );
    if (result) {
      setDeleting(null);
      setReload((value) => value + 1);
      mutation.setSuccess("Cadastro excluído.");
    }
  }
  function close() {
    if (!editor || mutation.busy) return;
    const initial = crmDraft(fields, editor.original);
    if (JSON.stringify(editor.draft) !== JSON.stringify(initial)) setDiscard(true);
    else {
      setEditor(null);
      sequence.current++;
    }
  }
  useCrmLeaveGuard(
    Boolean(
      editor && JSON.stringify(editor.draft) !== JSON.stringify(crmDraft(fields, editor.original)),
    ),
    mutation.busy,
    mutation.gate,
  );
  const locked = mutation.busy || mutation.gate || reading,
    displayFields =
      catalog === "campaigns"
        ? ["NOME", "TIPO", "PAUSADA", "PRIORIDADE"]
        : ["NOME", "TIPO", "ECONTATO", "EVENDA", "COD_ACAO"],
    basic = [
      "NOME",
      "TIPO",
      "DATA_INI",
      "MAX_RESPOSTA",
      "DESCRICAO",
      "PRIORIDADE",
      "PAUSADA",
      "PAUSAR_AG_PUBLICA",
      "UNIDADE",
      "OPERADOR",
      "COD_ACAO",
      "NOME_ACAO",
    ];
  function fieldInput(field: CrmMarketingField) {
    if (!editor) return null;
    const value = editor.draft[field.key] ?? null,
      change = (next: string | null) =>
        setEditor((current) =>
          current ? { ...current, draft: { ...current.draft, [field.key]: next } } : null,
        );
    return (
      <Box key={field.key} sx={{ gridColumn: field.key === "DESCRICAO" ? "1/-1" : undefined }}>
        {field.key === "COD_ACAO" ? (
          <CrmActionField value={value} onChange={change} disabled={locked} />
        ) : (
          <NullableCrmField
            field={field}
            value={value}
            onChange={change}
            disabled={locked}
            label={crmLabels[field.key] ?? field.key}
            error={fieldErrors[field.key]}
            required={!editor.original && field.key === "NOME"}
          />
        )}
      </Box>
    );
  }
  return (
    <Stack gap={2}>
      {catalog === "results" && (
        <Alert severity="info">
          Os resultados definem ações de finalização e classificações usadas nos relatórios. A
          exclusão de itens em uso é bloqueada.
        </Alert>
      )}
      {loadError && (
        <Alert
          severity="error"
          action={<Button onClick={() => setReload((value) => value + 1)}>Recarregar</Button>}
        >
          {loadError}
        </Alert>
      )}
      {mutation.error && (
        <Alert
          severity="error"
          action={
            mutation.gate ? (
              <Button disabled={reading || mutation.busy} onClick={() => void reconcile()}>
                Conferir dados
              </Button>
            ) : undefined
          }
        >
          {mutation.error}
        </Alert>
      )}
      {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
      <Stack
        component="form"
        direction="row"
        useFlexGap
        flexWrap="wrap"
        gap={1}
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setFilter(search);
        }}
      >
        <TextField
          label="Buscar por nome"
          sx={{ flex: "1 1 140px", maxWidth: 480, minWidth: 0 }}
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          inputProps={{ maxLength: catalog === "campaigns" ? 150 : 50 }}
        />
        <OperationalIconButton type="submit" label="Buscar">
          <UiIcon name="search" />
        </OperationalIconButton>
        <OperationalIconButton
          label="Filtros de campanhas e resultados"
          onClick={() => {
            setDraftCode(idFilter);
            setDraftType(typeFilter);
            setFilterPanel(true);
          }}
        >
          <UiIcon name="filter" />
        </OperationalIconButton>
        <OperationalIconButton
          label="Atualizar lista"
          disabled={mutation.busy}
          onClick={() => (mutation.gate ? void reconcile() : setReload((value) => value + 1))}
        >
          <UiIcon name="refresh" />
        </OperationalIconButton>
        <Button
          variant="contained"
          startIcon={<UiIcon name="add" scale="row" />}
          disabled={locked || !fields.length}
          onClick={() => {
            mutation.setError("");
            setEditor({ draft: crmDraft(fields) });
          }}
        >
          {catalog === "campaigns" ? "Nova campanha" : "Novo resultado"}
        </Button>
      </Stack>
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
        {filter && (
          <Chip
            label={`Nome: ${filter}`}
            onDelete={() => {
              setFilter("");
              setPage(0);
            }}
          />
        )}
        {idFilter && (
          <Chip
            label={`Código: ${idFilter}`}
            onDelete={() => {
              setIdFilter("");
              setPage(0);
            }}
          />
        )}
        {typeFilter && (
          <Chip
            label={`Tipo: ${typeFilter}`}
            onDelete={() => {
              setTypeFilter("");
              setPage(0);
            }}
          />
        )}
      </Stack>
      <OperationalPanel
        open={filterPanel}
        title="Filtros de campanhas e resultados"
        onClose={() => setFilterPanel(false)}
        footer={
          <>
            <Button onClick={() => setFilterPanel(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={() => {
                setIdFilter(draftCode.trim());
                setTypeFilter(draftType);
                setPage(0);
                setFilterPanel(false);
              }}
            >
              Aplicar filtros
            </Button>
          </>
        }
      >
        <Stack gap={2}>
          <TextField
            label="Código exato"
            value={draftCode}
            onChange={(event) => setDraftCode(event.target.value)}
          />
          <TextField
            select
            label="Tipo"
            value={draftType}
            onChange={(event) => setDraftType(event.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {(fields.find((field) => field.key === "TIPO")?.values ?? []).map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </OperationalPanel>
      {!loading && !loadError && (
        <Typography variant="caption" color="text.secondary">
          {total.toLocaleString("pt-BR")} {total === 1 ? "registro" : "registros"}
        </Typography>
      )}
      {loading && <LinearProgress aria-label="Carregando cadastros" />}
      <TableContainer
        className="ip-crud-table"
        sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {["CODIGO", ...displayFields].map((key) => (
                <TableCell key={key}>
                  <TableSortLabel
                    active={sortBy === key}
                    direction={sortBy === key ? direction : "asc"}
                    onClick={() => {
                      setPage(0);
                      setSortBy(key);
                      setDirection(sortBy === key && direction === "asc" ? "desc" : "asc");
                    }}
                  >
                    {crmLabels[key]}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.CODIGO} hover>
                <TableCell data-label="Código">{row.CODIGO}</TableCell>
                {displayFields.map((key) => (
                  <TableCell key={key} data-label={crmLabels[key]}>
                    {row[key] === null || row[key] === undefined ? "—" : String(row[key])}
                  </TableCell>
                ))}
                <TableCell data-label="Ações" align="right" sx={{ whiteSpace: "nowrap" }}>
                  {catalog === "campaigns" && (
                    <Tooltip title="Configurar público">
                      <IconButton
                        component={Link}
                        href={`/${instance}/crm-campaigns/${row.CODIGO}/configure`}
                        aria-label={`Configurar ${row.NOME ?? row.CODIGO}`}
                        disabled={locked}
                      >
                        <UiIcon name="filter" scale="row" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <OperationalIconButton
                    label={`Editar ${row.NOME ?? row.CODIGO}`}
                    disabled={locked}
                    onClick={() => void edit(row)}
                  >
                    <UiIcon name="edit" scale="row" />
                  </OperationalIconButton>
                  <OperationalIconButton
                    label={`Excluir ${row.NOME ?? row.CODIGO}`}
                    disabled={locked}
                    onClick={() => {
                      mutation.setError("");
                      setDeleting(row);
                    }}
                  >
                    <UiIcon name="delete" scale="row" />
                  </OperationalIconButton>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !rows.length && (
              <TableRow>
                <TableCell colSpan={displayFields.length + 2} align="center">
                  Nenhum cadastro encontrado.
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
        onPageChange={(_event, value) => setPage(value)}
        onRowsPerPageChange={(event) => {
          setPerPage(Number(event.target.value));
          setPage(0);
        }}
        labelRowsPerPage="Por página"
      />
      <Dialog className="ip-crud-editor" open={!!editor} onClose={close} fullWidth maxWidth="md">
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
          <DialogTitle>{editor?.original ? "Editar cadastro" : "Novo cadastro"}</DialogTitle>
          <DialogContent dividers>
            {mutation.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {mutation.error}
              </Alert>
            )}
            {editor && (
              <Stack gap={2}>
                <TextField
                  label="Código"
                  required={!editor?.original}
                  error={Boolean(fieldErrors.CODIGO)}
                  value={editor.draft["CODIGO"]}
                  disabled={!!editor.original || locked}
                  onChange={(event) =>
                    setEditor({ ...editor, draft: { ...editor.draft, CODIGO: event.target.value } })
                  }
                  helperText={
                    fieldErrors.CODIGO ||
                    (editor.original
                      ? "Identificação do cadastro"
                      : "Informe um código livre do CRM.")
                  }
                />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  {fields
                    .filter((field) => !field.readOnly && basic.includes(field.key))
                    .map(fieldInput)}
                </Box>
                {fields.some((field) => !field.readOnly && !basic.includes(field.key)) && (
                  <Accordion
                    expanded={advancedOpen}
                    onChange={(_, value) => setAdvancedOpen(value)}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Efeitos e opções do resultado</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                          gap: 2,
                        }}
                      >
                        {fields
                          .filter((field) => !field.readOnly && !basic.includes(field.key))
                          .map(fieldInput)}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}
                {editor.original && catalog === "campaigns" && (
                  <Alert severity="info">
                    A seleção de clientes e a situação da lista são administradas em Configurar
                    público.
                  </Alert>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap" }}>
            <Button disabled={mutation.busy} onClick={close}>
              Cancelar
            </Button>
            {mutation.gate && (
              <Button disabled={mutation.busy || reading} onClick={() => void reconcile()}>
                Conferir dados
              </Button>
            )}
            <Button type="submit" variant="contained" disabled={locked}>
              {mutation.busy ? "Salvando…" : "Salvar"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={!!deleting}
        onClose={() => {
          if (!mutation.busy) setDeleting(null);
        }}
      >
        <DialogTitle>Excluir cadastro?</DialogTitle>
        <DialogContent>
          <Typography>
            Excluir “{deleting?.NOME ?? deleting?.CODIGO}”? O CRM bloqueia a exclusão de registros
            em uso.
          </Typography>
          {mutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {mutation.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.busy} onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          {mutation.gate && (
            <Button onClick={() => void reconcile()} disabled={reading}>
              Conferir dados
            </Button>
          )}
          <Button color="error" disabled={locked} onClick={() => void remove()}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={discard} onClose={() => setDiscard(false)}>
        <DialogTitle>Descartar alterações?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDiscard(false)}>Continuar editando</Button>
          <Button
            color="error"
            onClick={() => {
              setDiscard(false);
              setEditor(null);
              sequence.current++;
            }}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
