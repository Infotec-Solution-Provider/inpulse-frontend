"use client";
import { useAuthContext } from "@/app/auth-context";
import CrmImportsClient from "@/lib/sdk-local/crm-imports.client";
import type {
  ImportCapabilities,
  ImportJob,
  ImportState,
} from "@/lib/sdk-local/types/crm-imports.types";
import { importCsvHeaders } from "@/lib/crm-import-file";
import { CrmPage } from "@/lib/ui-system";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

const labels: Record<ImportState, string> = {
  ready: "Pronta",
  invalid: "Inválida",
  duplicate: "Duplicada",
  blocked: "Indisponível",
  succeeded: "Concluída",
  failed: "Falhou",
  unknown: "Conferir cadastro",
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível concluir a operação.";
function ImportWorkspace({ instance, token }: { instance: string; token: string }) {
  const api = useMemo(
    () =>
      new CrmImportsClient(process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002", {
        instance,
        token,
      }),
    [instance, token],
  );
  const mounted = useRef(true),
    request = useRef(0);
  const [capabilities, setCapabilities] = useState<ImportCapabilities | null>(null),
    [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false),
    [recover, setRecover] = useState(false),
    [fileName, setFileName] = useState("");
  const [text, setText] = useState(""),
    [delimiter, setDelimiter] = useState(";"),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<string[]>([]);
  const [mode, setMode] = useState<"create" | "update">("create"),
    [identity, setIdentity] = useState("document"),
    [origin, setOrigin] = useState("");
  const [job, setJob] = useState<ImportJob | null>(null),
    [selected, setSelected] = useState<number[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [page, setPage] = useState(0);
  useEffect(() => {
    mounted.current = true;
    api
      .capabilities()
      .then((value) => {
        if (mounted.current) setCapabilities(value);
      })
      .catch((error) => {
        if (mounted.current) setFailure(message(error));
      });
    return () => {
      mounted.current = false;
      request.current++;
    };
  }, [api]);
  const fields = useMemo(
    () => [
      ...(mode === "update" ? [{ name: "CODIGO", label: "Código CRM", type: "integer" }] : []),
      ...(capabilities?.fields ?? []).filter(
        (field) => mode !== "create" || (field.name !== "ORIGEM" && !field.updateOnly),
      ),
    ],
    [capabilities, mode],
  );
  const ready = job?.rows.filter((row) => row.state === "ready") ?? [];
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);
  const expired = !!job && now >= job.expiresAt;
  async function readFile(file: File | undefined) {
    if (!file || !capabilities) return;
    const sequence = ++request.current;
    setFailure("");
    setBusy(true);
    setText("");
    setHeaders([]);
    setMapping([]);
    setFileName("");
    try {
      if (!/\.csv$/i.test(file.name) || file.size > capabilities.limits.bytes)
        throw new Error("Selecione CSV UTF-8 de até 1 MiB. Exporte planilhas Excel como CSV.");
      let content: string;
      try {
        content = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      } catch {
        throw new Error(
          "O arquivo precisa estar em UTF-8. Exporte o CSV novamente com essa codificação.",
        );
      }
      const columns = importCsvHeaders(content, delimiter);
      if (!mounted.current || sequence !== request.current) return;
      setText(content);
      setFileName(file.name);
      setHeaders(columns);
      setMapping(
        columns.map((column) =>
          fields.some((field) => field.name === column.toUpperCase()) ? column.toUpperCase() : "",
        ),
      );
    } catch (error) {
      if (mounted.current && sequence === request.current) setFailure(message(error));
    } finally {
      if (mounted.current && sequence === request.current) setBusy(false);
    }
  }
  function changeDelimiter(next: string) {
    setDelimiter(next);
    setFailure("");
    if (text)
      try {
        const columns = importCsvHeaders(text, next);
        setHeaders(columns);
        setMapping(
          columns.map((column) =>
            fields.some((field) => field.name === column.toUpperCase()) ? column.toUpperCase() : "",
          ),
        );
      } catch (error) {
        setHeaders([]);
        setMapping([]);
        setFailure(message(error));
      }
  }
  async function preview() {
    setBusy(true);
    setFailure("");
    try {
      const result = await api.preview({
        text,
        delimiter,
        mapping,
        mode,
        identity,
        ...(mode === "create" ? { originId: Number(origin) } : {}),
      });
      if (mounted.current) {
        setJob(result);
        setSelected([]);
        setConfirmed(false);
        setPage(0);
        setNow(Date.now());
      }
    } catch (error) {
      if (mounted.current) setFailure(message(error));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function execute() {
    if (!job || !capabilities || !confirmed || !selected.length || expired || recover) return;
    setBusy(true);
    setFailure("");
    const chosen = [...selected];
    try {
      for (let offset = 0; offset < chosen.length; offset += capabilities.limits.batch) {
        if (!mounted.current) return;
        const result = await api.execute(
          job.id,
          chosen.slice(offset, offset + capabilities.limits.batch),
        );
        if (!mounted.current) return;
        setJob(result);
        setSelected((current) =>
          current.filter((number) =>
            result.rows.some((row) => row.row === number && row.state === "ready"),
          ),
        );
        if (result.counts.unknown) {
          setFailure(
            "Uma gravação precisa ser conferida no cadastro. O processamento foi interrompido.",
          );
          break;
        }
      }
    } catch (error) {
      if (mounted.current) {
        setRecover(true);
        setFailure(`${message(error)} Consulte o resultado antes de continuar.`);
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
        setConfirmed(false);
      }
    }
  }
  async function refresh() {
    if (!job) return;
    setBusy(true);
    setFailure("");
    try {
      const result = await api.result(job.id);
      if (mounted.current) {
        setJob(result);
        setRecover(result.running);
        setSelected([]);
        setConfirmed(false);
      }
    } catch (error) {
      if (mounted.current) setFailure(message(error));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function download() {
    if (!job) return;
    setBusy(true);
    setFailure("");
    try {
      const blob = await api.report(job.id);
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "crm-import-errors.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (mounted.current) setFailure(message(error));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function discard() {
    if (!job) return;
    setBusy(true);
    setFailure("");
    try {
      if (!expired) await api.discard(job.id);
      if (mounted.current) {
        setJob(null);
        setSelected([]);
        setConfirmed(false);
        setRecover(false);
      }
    } catch (error) {
      if (mounted.current) setFailure(message(error));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <CrmPage
      title="Mail List e atualização em lote"
      description="Revise o arquivo, confira as alterações e selecione os registros antes de processar."
    >
      <Stack spacing={3} sx={{ width: "100%", minWidth: 0 }}>
        <Stepper activeStep={job ? 2 : headers.length ? 1 : 0} alternativeLabel>
          {["Arquivo", "Mapeamento", "Prévia e resultado"].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {failure && (
          <Alert severity="error" role="alert">
            {failure}
          </Alert>
        )}
        {busy && <LinearProgress aria-label="Processando arquivo" />}
        {!capabilities && !failure && <CircularProgress aria-label="Carregando recursos" />}
        {capabilities && !job && (
          <>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Typography variant="h6">1. Escolha a operação e o arquivo</Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label="Operação"
                    value={mode}
                    disabled={busy}
                    onChange={(event) => {
                      const next = event.target.value as "create" | "update";
                      setMode(next);
                      setIdentity(next === "create" ? "document" : "CODIGO");
                      setMapping((current) =>
                        current.map((key) =>
                          next === "create" &&
                          (["CODIGO", "ORIGEM"].includes(key) ||
                            capabilities.fields.find((field) => field.name === key)?.updateOnly)
                            ? ""
                            : key,
                        ),
                      );
                    }}
                  >
                    <MenuItem value="create">Mail List · novos clientes</MenuItem>
                    <MenuItem value="update">Atualizar clientes existentes</MenuItem>
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label={
                      mode === "create" ? "Identificar duplicidade por" : "Localizar clientes por"
                    }
                    value={identity}
                    disabled={busy}
                    onChange={(event) => setIdentity(event.target.value)}
                  >
                    {(mode === "create"
                      ? [
                          ["document", "CPF/CNPJ"],
                          ["phone", "DDD e telefone 1"],
                        ]
                      : [
                          ["CODIGO", "Código CRM"],
                          ["COD_ERP", "Código ERP"],
                        ]
                    ).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                {mode === "create" && (
                  <TextField
                    label="Código da origem da lista"
                    type="number"
                    value={origin}
                    onChange={(event) => setOrigin(event.target.value)}
                    disabled={busy}
                    helperText="Use o código de uma origem já cadastrada. Novas origens não são criadas pelo arquivo."
                    inputProps={{ min: 1 }}
                  />
                )}
                {mode === "create" && !capabilities.createEnabled && (
                  <Alert severity="info">
                    A prévia está disponível. A inclusão aguarda: {capabilities.createReason}
                  </Alert>
                )}
                <Alert severity="info">
                  CSV UTF-8 · até 1 MiB · 500 registros · 64 colunas. Células vazias são ignoradas.
                  A atualização altera somente os campos cadastrais mapeados; não inclui compras ou
                  movimentações financeiras.
                </Alert>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                >
                  <TextField
                    select
                    label="Delimitador"
                    value={delimiter}
                    onChange={(event) => changeDelimiter(event.target.value)}
                    disabled={busy}
                    sx={{ minWidth: 200 }}
                  >
                    <MenuItem value=";">Ponto e vírgula</MenuItem>
                    <MenuItem value=",">Vírgula</MenuItem>
                    <MenuItem value={"\t"}>Tabulação</MenuItem>
                  </TextField>
                  <Button variant="outlined" component="label" disabled={busy}>
                    Selecionar arquivo CSV
                    <input
                      hidden
                      type="file"
                      accept=".csv,text/csv"
                      aria-label="Arquivo CSV"
                      onChange={(event) => {
                        void readFile(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </Button>
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                    {fileName || "Nenhum arquivo selecionado"}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
            {headers.length > 0 && (
              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={2}>
                  <Typography variant="h6">2. Relacione as colunas</Typography>
                  <Typography variant="body2">
                    Escolha os campos pelo código do cadastro. Colunas ignoradas e células vazias
                    não alteram o cliente. Datas: AAAA-MM-DD. Saldos e potencial: decimal sem
                    separador de milhares, até 12 dígitos inteiros e 4 casas decimais, respeitando a
                    capacidade do banco.
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                      gap: 2,
                    }}
                  >
                    {headers.map((header, index) => (
                      <TextField
                        key={`${index}:${header}`}
                        select
                        label={`Coluna: ${header}`}
                        value={mapping[index] ?? ""}
                        disabled={busy}
                        onChange={(event) =>
                          setMapping((current) =>
                            current.map((value, position) =>
                              position === index ? event.target.value : value,
                            ),
                          )
                        }
                      >
                        <MenuItem value="">Ignorar coluna</MenuItem>
                        {fields
                          .filter((field) => mode !== "create" || field.name !== "ORIGEM")
                          .map((field) => (
                            <MenuItem key={field.name} value={field.name}>
                              {field.label} ({field.name})
                            </MenuItem>
                          ))}
                      </TextField>
                    ))}
                  </Box>
                  <Box>
                    <Button
                      variant="contained"
                      disabled={busy || !mapping.some(Boolean) || (mode === "create" && !origin)}
                      onClick={() => void preview()}
                    >
                      Validar e gerar prévia
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            )}
          </>
        )}
        {job && (
          <>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {Object.entries(job.counts).map(([state, count]) => (
                <Chip key={state} label={`${labels[state as ImportState]}: ${count}`} />
              ))}
            </Stack>
            <Alert severity={expired || recover || job.counts.unknown ? "warning" : "info"}>
              {expired
                ? "Prévia expirada. Inicie uma nova validação para continuar."
                : recover
                  ? "Consulte o resultado antes de processar outras linhas."
                  : `${capabilities?.retention ?? ""} Exportação inclui registros não concluídos. Linhas duplicadas e inválidas não serão processadas.`}
            </Alert>
            <Typography variant="body2">
              Arquivo: {fileName} · Operação:{" "}
              {job.mode === "create" ? "Incluir novos clientes" : "Atualizar clientes"} · Expira em{" "}
              {new Date(job.expiresAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
            <Paper variant="outlined" sx={{ overflow: "hidden", minWidth: 0 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{ p: 2 }}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
              >
                <FormControlLabel
                  label={`Selecionar todas as ${ready.length} linhas prontas`}
                  control={
                    <Checkbox
                      checked={ready.length > 0 && selected.length === ready.length}
                      indeterminate={selected.length > 0 && selected.length < ready.length}
                      disabled={busy || expired || recover || !ready.length}
                      onChange={(event) => {
                        setSelected(event.target.checked ? ready.map((row) => row.row) : []);
                        setConfirmed(false);
                      }}
                    />
                  }
                />
                <Typography variant="body2">{selected.length} selecionadas</Typography>
              </Stack>
              <TableContainer>
                <Table size="small" aria-label="Prévia da importação" sx={{ minWidth: 630 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Selecionar</TableCell>
                      <TableCell>Linha / cliente</TableCell>
                      <TableCell>Situação</TableCell>
                      <TableCell>Alterações previstas</TableCell>
                      <TableCell>Validação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {job.rows.slice(page * 25, page * 25 + 25).map((row) => (
                      <TableRow key={row.row}>
                        <TableCell>
                          <Checkbox
                            inputProps={{ "aria-label": `Selecionar linha ${row.row}` }}
                            disabled={row.state !== "ready" || busy || expired || recover}
                            checked={selected.includes(row.row)}
                            onChange={(event) => {
                              setSelected((current) =>
                                event.target.checked
                                  ? [...current, row.row]
                                  : current.filter((number) => number !== row.row),
                              );
                              setConfirmed(false);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {row.row}
                          {row.customerId ? ` / #${row.customerId}` : ""}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={labels[row.state]}
                            color={
                              row.state === "succeeded"
                                ? "success"
                                : row.state === "failed" || row.state === "invalid"
                                  ? "error"
                                  : "default"
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 440, overflowWrap: "anywhere" }}>
                          {Object.entries(row.changes).map(([key, value]) => (
                            <Typography key={key} variant="body2">
                              <strong>
                                {capabilities?.fields.find((field) => field.name === key)?.label ??
                                  key}
                              </strong>
                              : {row.before ? `${String(row.before[key] ?? "(vazio)")} → ` : ""}
                              {String(value ?? "(vazio)")}
                            </Typography>
                          ))}
                        </TableCell>
                        <TableCell sx={{ minWidth: 180, maxWidth: 320 }}>
                          {row.errors.join(" ") || "Validada"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="flex-end"
                alignItems="center"
                sx={{ p: 1 }}
              >
                <Button disabled={page === 0 || busy} onClick={() => setPage((value) => value - 1)}>
                  Anterior
                </Button>
                <Typography variant="body2">
                  {page + 1} / {Math.ceil(job.rows.length / 25)}
                </Typography>
                <Button
                  disabled={(page + 1) * 25 >= job.rows.length || busy}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Próxima
                </Button>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <FormControlLabel
                  label={`Conferi a prévia e confirmo ${job.mode === "create" ? "incluir" : "atualizar"} somente as ${selected.length} linhas selecionadas.`}
                  control={
                    <Checkbox
                      checked={confirmed}
                      disabled={busy || !selected.length || expired || recover}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                  }
                />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Button
                    variant="contained"
                    disabled={
                      busy || !selected.length || !confirmed || expired || recover || job.running
                    }
                    onClick={() => void execute()}
                  >
                    Processar seleção ({selected.length})
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={busy || expired}
                    onClick={() => void refresh()}
                  >
                    Consultar resultado
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={busy || expired}
                    onClick={() => void download()}
                  >
                    Exportar erros CSV
                  </Button>
                  <Button disabled={busy || job.running} onClick={() => void discard()}>
                    Fechar prévia e revisar arquivo
                  </Button>
                </Stack>
                <Typography variant="caption">
                  A operação é confirmada por registro. Falhas não desfazem os registros já
                  concluídos. Se houver resultado incerto, confira o cadastro antes de revalidar o
                  arquivo.
                </Typography>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>
    </CrmPage>
  );
}
export default function CrmImportManagement() {
  const { instance, token, user } = useAuthContext();
  if (!instance || !token || !user)
    return <Alert severity="info">Recarregue sua sessão para abrir o assistente.</Alert>;
  if (user.NIVEL !== "ADMIN")
    return <Alert severity="warning">Acesso restrito a administradores.</Alert>;
  return (
    <ImportWorkspace
      key={`${instance}:${user.CODIGO}:${token}`}
      instance={instance}
      token={token}
    />
  );
}
