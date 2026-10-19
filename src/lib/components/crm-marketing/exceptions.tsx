"use client";
import { crmError } from "@/lib/crm-marketing-form";
import type {
  CrmExceptionKind,
  CrmExceptionRecord,
} from "@/lib/sdk-local/types/crm-marketing.types";
import { Add, DeleteOutline, EditOutlined, Refresh, Search } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CrmLookup, CrmMarketingFrame, useCrmMutation, useCrmSession } from "./shared";
const definitions: Record<
  CrmExceptionKind,
  { title: string; field: string; label: string; max: number; help: string }
> = {
  cities: {
    title: "Cidades",
    field: "CIDADE",
    label: "Nome da cidade",
    max: 255,
    help: "A exceção usa o nome da cidade e vale para todas as UFs com esse nome.",
  },
  states: {
    title: "Estados",
    field: "ESTADO",
    label: "Estado / UF",
    max: 100,
    help: "Use o valor do estado registrado no cadastro dos clientes, por exemplo RS.",
  },
  customers: {
    title: "Clientes",
    field: "COD_ERP",
    label: "Código ERP do cliente",
    max: 15,
    help: "Informe o código ERP. Zeros à esquerda são preservados.",
  },
  segments: {
    title: "Segmentos",
    field: "SEGMENTO",
    label: "Segmento",
    max: 11,
    help: "A exceção usa o segmento do CRM associado ao cliente.",
  },
};
export default function CrmExceptionsPage() {
  return (
    <CrmMarketingFrame title="Exceções">
      <ExceptionsWorkspace />
    </CrmMarketingFrame>
  );
}
function ExceptionsWorkspace() {
  const search = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const requested = search?.get("kind") ?? "cities";
  const kind: CrmExceptionKind = Object.hasOwn(definitions, requested)
    ? (requested as CrmExceptionKind)
    : "cities";
  return (
    <Stack gap={2}>
      <Typography color="text.secondary">
        As exceções são compartilhadas pelas campanhas desta instância e excluem clientes do público
        elegível.
      </Typography>
      <Tabs
        value={kind}
        onChange={(_event, value) => router.push(`${pathname}?kind=${value}`, { scroll: false })}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {(Object.keys(definitions) as CrmExceptionKind[]).map((value) => (
          <Tab key={value} value={value} label={definitions[value].title} />
        ))}
      </Tabs>
      {(Object.keys(definitions) as CrmExceptionKind[]).map((value) => (
        <Box key={value} hidden={value !== kind}>
          <ExceptionPanel kind={value} />
        </Box>
      ))}
    </Stack>
  );
}
export function ExceptionPanel({ kind }: { kind: CrmExceptionKind }) {
  const spec = definitions[kind],
    { client } = useCrmSession(),
    current = useRef(client),
    mutation = useCrmMutation();
  current.current = client;
  const [rows, setRows] = useState<CrmExceptionRecord[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(0),
    [perPage, setPerPage] = useState(20),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [reload, setReload] = useState(0),
    [editor, setEditor] = useState<{ original?: CrmExceptionRecord; value: string | null } | null>(
      null,
    ),
    [deleting, setDeleting] = useState<CrmExceptionRecord | null>(null),
    [reading, setReading] = useState(false),
    [discard, setDiscard] = useState(false);
  const lastTarget = useRef<CrmExceptionRecord | null>(null),
    alive = useRef(true),
    sequence = useRef(0);
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
    void client
      .exceptions(kind, { page: page + 1, perPage, search: filter })
      .then((result) => {
        if (!active) return;
        const last = Math.max(0, Math.ceil(result.page.totalRows / perPage) - 1);
        if (page > last) {
          setPage(last);
          return;
        }
        setRows(result.data);
        setTotal(result.page.totalRows);
      })
      .catch(() => {
        if (active) setLoadError("Não foi possível carregar as exceções.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, kind, page, perPage, filter, reload]);
  function expected(row: CrmExceptionRecord): CrmExceptionRecord {
    return {
      [spec.field]: row[spec.field],
      ...(kind === "segments" ? { CODIGO: row["CODIGO"] } : {}),
    };
  }
  async function reconcile() {
    const started = client,
      version = ++sequence.current;
    setReading(true);
    try {
      if (lastTarget.current) {
        const matches = await client.inspectException(kind, lastTarget.current);
        if (!alive.current || current.current !== started || version !== sequence.current) return;
        if (matches.length === 1)
          setEditor({
            original: matches[0],
            value: matches[0][spec.field] === null ? null : String(matches[0][spec.field]),
          });
        else setEditor(null);
        setDeleting(null);
      }
      if (!alive.current || current.current !== started || version !== sequence.current) return;
      mutation.reconcile();
      mutation.setSuccess("Dados conferidos. Revise a exceção antes de continuar.");
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
    const raw = editor.value,
      value = kind === "segments" ? Number(raw) : raw?.trim();
    if (
      raw === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "string" &&
        ([...value].length > spec.max || /[^\u0020-\u007e\u00a0-\u00ff]/.test(value))) ||
      (kind === "segments" &&
        (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 2147483647))
    ) {
      mutation.setError("Informe um valor válido para a exceção.");
      return;
    }
    if (editor.original && editor.original[spec.field] === value) {
      mutation.setError("Nenhum valor foi alterado.");
      return;
    }
    const changes = { [spec.field]: value };
    lastTarget.current = changes;
    const result = await mutation.write(() =>
      editor.original
        ? client.patchException(kind, changes, expected(editor.original))
        : client.createException(kind, changes),
    );
    if (result) {
      setEditor(null);
      setReload((value) => value + 1);
      mutation.setSuccess("Exceção salva.");
    }
  }
  async function remove() {
    if (!deleting) return;
    lastTarget.current = { [spec.field]: deleting[spec.field] };
    const result = await mutation.write(() => client.removeException(kind, expected(deleting)));
    if (result) {
      setDeleting(null);
      setReload((value) => value + 1);
      mutation.setSuccess("Exceção excluída.");
    }
  }
  function close() {
    if (mutation.busy || !editor) return;
    const original = editor.original
      ? editor.original[spec.field] === null
        ? null
        : String(editor.original[spec.field])
      : "";
    if (editor.value !== original) setDiscard(true);
    else setEditor(null);
  }
  const disabled = mutation.busy || mutation.gate || reading;
  return (
    <Stack gap={2}>
      <Typography variant="body2" color="text.secondary">
        {spec.help}
      </Typography>
      {loadError && <Alert severity="error">{loadError}</Alert>}
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
        direction={{ xs: "column", sm: "row" }}
        gap={1}
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setFilter(search);
        }}
      >
        <TextField
          size="small"
          label={`Buscar em ${spec.title.toLocaleLowerCase("pt-BR")}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" startIcon={<Search />}>
          Buscar
        </Button>
        <Button
          startIcon={<Refresh />}
          disabled={mutation.busy}
          onClick={() => (mutation.gate ? void reconcile() : setReload((value) => value + 1))}
        >
          Recarregar
        </Button>
        <Button
          startIcon={<Add />}
          variant="contained"
          disabled={disabled}
          onClick={() => {
            mutation.setError("");
            setEditor({ value: "" });
          }}
        >
          Nova exceção
        </Button>
      </Stack>
      {loading && <LinearProgress aria-label={`Carregando ${spec.title}`} />}
      <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{spec.label}</TableCell>
              {kind === "segments" && <TableCell>Nome do segmento</TableCell>}
              <TableCell>Situação</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row[spec.field]}:${row["CODIGO"] ?? index}`}>
                <TableCell>
                  {row[spec.field] === null ? "Sem valor (histórico)" : String(row[spec.field])}
                </TableCell>
                {kind === "segments" && (
                  <TableCell>{row["SEGMENTO_NOME"] ?? "Não localizado"}</TableCell>
                )}
                <TableCell>
                  {Number(row["occurrences"]) > 1 ? "Duplicidade histórica" : "Ativa"}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton
                    aria-label={`Editar exceção ${row[spec.field] ?? "sem valor"}`}
                    disabled={disabled || Number(row["occurrences"]) > 1}
                    onClick={() => {
                      mutation.setError("");
                      setEditor({
                        original: row,
                        value: row[spec.field] === null ? null : String(row[spec.field]),
                      });
                    }}
                  >
                    <EditOutlined />
                  </IconButton>
                  <IconButton
                    aria-label={`Excluir exceção ${row[spec.field] ?? "sem valor"}`}
                    disabled={disabled || Number(row["occurrences"]) > 1}
                    onClick={() => {
                      mutation.setError("");
                      setDeleting(row);
                    }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !rows.length && (
              <TableRow>
                <TableCell colSpan={kind === "segments" ? 4 : 3} align="center">
                  Nenhuma exceção cadastrada.
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
        onPageChange={(_event, value) => setPage(value)}
        rowsPerPageOptions={[10, 20, 50, 100]}
        onRowsPerPageChange={(event) => {
          setPerPage(Number(event.target.value));
          setPage(0);
        }}
        labelRowsPerPage="Por página"
      />
      <Dialog fullWidth maxWidth="sm" open={!!editor} onClose={close}>
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
          <DialogTitle>
            {editor?.original ? "Editar exceção" : "Nova exceção"} · {spec.title}
          </DialogTitle>
          <DialogContent dividers>
            <Stack gap={2}>
              {mutation.error && <Alert severity="error">{mutation.error}</Alert>}
              {editor &&
                (kind === "segments" ? (
                  <CrmLookup
                    kind="segments"
                    label="Segmento"
                    value={editor.value}
                    disabled={disabled}
                    onChange={(value) =>
                      setEditor({ ...editor, value: typeof value === "string" ? value : null })
                    }
                  />
                ) : (
                  <TextField
                    fullWidth
                    label={spec.label}
                    value={editor.value ?? ""}
                    disabled={disabled}
                    onChange={(event) => setEditor({ ...editor, value: event.target.value })}
                    inputProps={{ maxLength: spec.max }}
                    helperText={spec.help}
                  />
                ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={mutation.busy} onClick={close}>
              Cancelar
            </Button>
            {mutation.gate && (
              <Button disabled={reading} onClick={() => void reconcile()}>
                Conferir dados
              </Button>
            )}
            <Button type="submit" variant="contained" disabled={disabled}>
              Salvar
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
        <DialogTitle>Excluir exceção?</DialogTitle>
        <DialogContent>
          <Typography>Remover a exceção “{deleting?.[spec.field] ?? "sem valor"}”?</Typography>
          {mutation.error && <Alert severity="error">{mutation.error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.busy} onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          {mutation.gate && <Button onClick={() => void reconcile()}>Conferir dados</Button>}
          <Button color="error" disabled={disabled} onClick={() => void remove()}>
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
            }}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
