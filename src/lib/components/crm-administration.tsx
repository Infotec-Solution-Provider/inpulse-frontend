"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import { CrmPage } from "@/lib/ui-system";
import { CrmDialog } from "@/lib/ui-system/crm-dialog";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import Client, {
  type AdminOption,
  type AdminCustomer,
  type BlockRequest,
  type AdminPreview,
  type AdminRow,
} from "@/lib/sdk-local/crm-administration.client";
import axios from "axios";
import AdministrationHistory from "./crm-administration-history";
type Mode = "transfer" | "release" | "blocks";
const title = {
  transfer: "Transferência",
  release: "Desfidelização",
  blocks: "Clientes a bloquear",
};
const errorText = (error: unknown) =>
  axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Não foi possível concluir a consulta. Tente novamente.";
function Lookup({
  api,
  kind,
  label,
  value,
  onChange,
  disabled,
  activeOnly = false,
}: {
  api: Client;
  kind: "operators" | "campaigns";
  label: string;
  value: AdminOption | null;
  onChange: (value: AdminOption | null) => void;
  disabled: boolean;
  activeOnly?: boolean;
}) {
  const [search, setSearch] = useState(""),
    [options, setOptions] = useState<AdminOption[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .options(kind, search, activeOnly)
        .then((page) => {
          if (alive) setOptions(page.items);
        })
        .catch((error) => {
          if (alive) setError(errorText(error));
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [api, kind, search, activeOnly]);
  return (
    <Autocomplete
      sx={{ minWidth: 220, flex: 1 }}
      disabled={disabled}
      options={options}
      value={value}
      loading={loading}
      filterOptions={(rows) => rows}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(option) => `${option.name} (#${option.id})`}
      onInputChange={(_event, text, reason) => {
        if (reason === "input") setSearch(text);
      }}
      onChange={(_event, row) => onChange(row)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={!!error}
          helperText={error || "Digite para localizar pelo nome"}
        />
      )}
    />
  );
}
function LinksTable({
  label,
  rows,
  names,
}: {
  label: string;
  rows: AdminRow[];
  names: Map<string, string>;
}) {
  if (!rows.length) return <Typography>{label}: nenhum vínculo.</Typography>;
  return (
    <Box>
      <Typography component="h3" variant="subtitle1">
        {label} ({rows.length})
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small" aria-label={label}>
          <TableHead>
            <TableRow>
              {[
                "Registro",
                "Cliente",
                "Campanha / agenda de origem",
                "Operador",
                "Fidelização / agenda",
              ].map((label) => (
                <TableCell key={label}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={String(row.CODIGO)}>
                <TableCell>{row.CODIGO}</TableCell>
                <TableCell>
                  {names.get(String(row.CLIENTE ?? row.CODIGO)) ?? row.CLIENTE ?? row.CODIGO}
                </TableCell>
                <TableCell>
                  {row.CC_CODIGO != null
                    ? `Agenda #${row.CC_CODIGO}`
                    : (row.CAMPANHA ?? row.COD_CAMPANHA ?? "—")}
                </TableCell>
                <TableCell>{row.OPERADOR ?? row.OPERADOR_CRIACAO ?? "—"}</TableCell>
                <TableCell>
                  {row.DT_AGENDAMENTO ?? row.QTDE_FIDELIZAR ?? "—"}
                  {row.FIDELIZA ? ` · ${row.FIDELIZA}` : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
export function AdministrationWorkspace({ api, storageKey }: { api: Client; storageKey: string }) {
  const [mode, setMode] = useState<Mode>("transfer"),
    [source, setSource] = useState<AdminOption | null>(null),
    [destination, setDestination] = useState<AdminOption | null>(null),
    [campaign, setCampaign] = useState<AdminOption | null>(null),
    [search, setSearch] = useState(""),
    [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<AdminCustomer[]>([]),
    [blocks, setBlocks] = useState<BlockRequest[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [nextAfter, setNextAfter] = useState<number | null>(null),
    [loaded, setLoaded] = useState(false),
    [preview, setPreview] = useState<AdminPreview | null>(null),
    [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState<string | null>(null),
    alive = useRef(true),
    locked = useRef(false),
    sequence = useRef(0);
  useCrmLeaveGuard(selected.length > 0, busy, !!pending);
  useEffect(() => {
    alive.current = true;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setPending(saved);
    } catch {}
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, [storageKey]);
  function invalidate() {
    sequence.current++;
    setPreview(null);
    setSelected([]);
    setCustomers([]);
    setBlocks([]);
    setNextAfter(null);
    setLoaded(false);
    setSuccess("");
    setError("");
  }
  async function run(work: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (error) {
      if (alive.current) setError(errorText(error));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function searchRows(after?: number) {
    const revision = sequence.current;
    void run(async () => {
      const filters: Record<string, string | number> = {
        search,
        ...(campaign ? { campaignId: campaign.id } : {}),
        ...(after ? { after } : {}),
      };
      if (mode !== "blocks") {
        if (source) filters.operatorId = source.id;
        if (customerId) {
          const id = Number(customerId);
          if (!Number.isInteger(id) || id < 1) throw new Error("Código de cliente inválido.");
          filters.customerId = id;
        }
      }
      const page = mode === "blocks" ? await api.blocks(filters) : await api.customers(filters);
      if (!alive.current || revision !== sequence.current) return;
      if (mode === "blocks")
        setBlocks((current) =>
          after ? [...current, ...(page.items as BlockRequest[])] : (page.items as BlockRequest[]),
        );
      else
        setCustomers((current) =>
          after
            ? [...current, ...(page.items as AdminCustomer[])]
            : (page.items as AdminCustomer[]),
        );
      setNextAfter(page.nextAfter);
      setLoaded(true);
      if (!after) {
        setSelected([]);
        setPreview(null);
      }
    });
  }
  const toggle = (id: number) => {
    setPreview(null);
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };
  function prepare() {
    const revision = sequence.current;
    void run(async () => {
      const value =
        mode === "blocks"
          ? await api.blockPreview(selected, decision)
          : await api.preview(mode, {
              customerIds: selected,
              ...(mode === "transfer" && source && destination
                ? { source: source.id, destination: destination.id }
                : {}),
            });
      if (alive.current && revision === sequence.current) {
        setPreview(value);
        setSuccess("");
      }
    });
  }
  async function apply() {
    if (locked.current || !preview?.version || !source || !destination || pending) return;
    setConfirm(false);
    const operationId = crypto.randomUUID();
    try {
      sessionStorage.setItem(storageKey, operationId);
    } catch {
      setError(
        "Não foi possível guardar o identificador da operação. Habilite o armazenamento desta aba antes de transferir.",
      );
      return;
    }
    setPending(operationId);
    await run(async () => {
      try {
        const receipt = await api.transfer({
          operationId,
          version: preview.version!,
          source: source.id,
          destination: destination.id,
          customerIds: selected,
        });
        if (!alive.current) return;
        sessionStorage.removeItem(storageKey);
        setPending(null);
        setSuccess(`Transferência #${receipt.transferId} concluída. Operação ${operationId}.`);
        setPreview(null);
        setSelected([]);
        setCustomers([]);
        setLoaded(false);
      } catch (error) {
        if (!alive.current) return;
        const outcome = axios.isAxiosError(error) ? error.response?.data?.outcome : undefined,
          status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (outcome === "NOT_COMMITTED" || (status && status >= 400 && status < 500)) {
          sessionStorage.removeItem(storageKey);
          setPending(null);
          setPreview(null);
          setError(errorText(error));
        } else {
          setError(
            "A transferência ficou sem confirmação. Consulte o comprovante antes de continuar.",
          );
        }
      }
    });
  }
  function checkReceipt() {
    if (!pending) return;
    void run(async () => {
      const receipt = await api.receipt(pending);
      if (!alive.current) return;
      if (receipt.status === "applied") {
        sessionStorage.removeItem(storageKey);
        setPending(null);
        invalidate();
        setSuccess(
          `Transferência #${receipt.transferId} confirmada. Operação ${receipt.operationId}.`,
        );
      } else
        setError(
          receipt.message ||
            "Comprovante ainda não encontrado. Aguarde antes de consultar novamente.",
        );
    });
  }
  const rows = mode === "blocks" ? blocks : customers,
    disabled = busy || !!pending,
    names = new Map(
      preview?.snapshot?.customers.map((row) => [String(row.CODIGO), String(row.RAZAO)]),
    );
  return (
    <Stack spacing={2}>
      <Tabs
        value={mode}
        variant="scrollable"
        allowScrollButtonsMobile
        onChange={(_event, value: Mode) => {
          invalidate();
          setMode(value);
        }}
        aria-label="Administração de clientes"
      >
        <Tab disabled={disabled} value="transfer" label="Transferência" />
        <Tab disabled={disabled} value="release" label="Desfidelização" />
        <Tab disabled={disabled} value="blocks" label="Clientes a bloquear" />
      </Tabs>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {pending && (
        <Alert severity="warning">
          <Typography>
            Operação {pending} aguardando confirmação. Consulte o comprovante para liberar novas
            transferências.
          </Typography>
          <Button disabled={busy} onClick={checkReceipt}>
            Consultar comprovante
          </Button>
        </Alert>
      )}
      {mode !== "transfer" && (
        <Alert severity="info">
          Consulta e prévia disponíveis. A execução de{" "}
          {mode === "release" ? "desfidelização" : "aprovar ou reprovar"} aguarda definição das
          regras de negócio.
        </Alert>
      )}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {mode !== "blocks" && (
          <Lookup
            api={api}
            kind="operators"
            label={mode === "transfer" ? "Operador de origem" : "Operador (opcional)"}
            value={source}
            onChange={(value) => {
              invalidate();
              setSource(value);
            }}
            disabled={disabled}
          />
        )}
        {mode === "transfer" && (
          <Lookup
            api={api}
            kind="operators"
            label="Operador de destino"
            value={destination}
            onChange={(value) => {
              setPreview(null);
              setDestination(value);
            }}
            disabled={disabled}
            activeOnly
          />
        )}
        <Lookup
          api={api}
          kind="campaigns"
          label="Campanha (opcional)"
          value={campaign}
          onChange={(value) => {
            invalidate();
            setCampaign(value);
          }}
          disabled={disabled}
        />
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          fullWidth
          label="Nome do cliente"
          value={search}
          disabled={disabled}
          onChange={(event) => {
            invalidate();
            setSearch(event.target.value);
          }}
        />
        {mode !== "blocks" && (
          <TextField
            label="Código do cliente (opcional)"
            value={customerId}
            inputProps={{ inputMode: "numeric" }}
            disabled={disabled}
            onChange={(event) => {
              invalidate();
              setCustomerId(event.target.value);
            }}
          />
        )}
        <Button
          variant="contained"
          disabled={disabled || (mode === "transfer" && !source)}
          onClick={() => searchRows()}
        >
          Consultar
        </Button>
      </Stack>
      {busy && <LinearProgress aria-label="Processando administração" />}
      {loaded && (
        <>
          <Typography>
            {rows.length} registros consultados · {selected.length} selecionados (máximo 100).
          </Typography>
          <FormControlLabel
            label="Selecionar registros exibidos"
            control={
              <Checkbox
                disabled={disabled || rows.length > 100}
                checked={!!rows.length && rows.every((row) => selected.includes(row.id))}
                onChange={(_event, checked) => {
                  setPreview(null);
                  setSelected(checked ? rows.map((row) => row.id) : []);
                }}
              />
            }
          />
          <TableContainer component={Paper}>
            <Table size="small" aria-label={title[mode]}>
              <TableHead>
                <TableRow>
                  <TableCell>Selecionar</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Campanha</TableCell>
                  <TableCell>
                    {mode === "blocks" ? "Situação / solicitação" : "Responsável"}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        inputProps={{
                          "aria-label": `Selecionar ${"customerName" in row ? row.customerName : row.name}`,
                        }}
                        disabled={
                          disabled || (!selected.includes(row.id) && selected.length >= 100)
                        }
                        checked={selected.includes(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {"customerName" in row
                        ? `${row.customerName} (#${row.customerId})`
                        : `${row.name} (#${row.id})`}
                    </TableCell>
                    <TableCell>
                      {"campaignName" in row
                        ? `${row.campaignName ?? "Campanha"} (#${row.campaignId})`
                        : (row.campaignId ?? "—")}
                    </TableCell>
                    <TableCell>
                      {"blocked" in row
                        ? `Pendente · #${row.id} · ${row.createdAt}`
                        : (row.operatorId ?? "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!rows.length && <Typography>Nenhum registro encontrado.</Typography>}
          {nextAfter && (
            <Button disabled={disabled} onClick={() => searchRows(nextAfter)}>
              Carregar mais
            </Button>
          )}
        </>
      )}
      {mode === "blocks" && (
        <Stack direction="row" spacing={1}>
          <Button
            disabled={disabled}
            variant={decision === "approve" ? "contained" : "outlined"}
            onClick={() => {
              setPreview(null);
              setDecision("approve");
            }}
          >
            Prévia de aprovação
          </Button>
          <Button
            disabled={disabled}
            variant={decision === "reject" ? "contained" : "outlined"}
            onClick={() => {
              setPreview(null);
              setDecision("reject");
            }}
          >
            Prévia de reprovação
          </Button>
        </Stack>
      )}
      <Button
        variant="outlined"
        disabled={
          disabled ||
          !selected.length ||
          (mode === "transfer" && (!destination || source?.id === destination.id))
        }
        onClick={prepare}
      >
        Revisar {selected.length} selecionados
      </Button>
      {preview && (
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">
            Prévia · {title[mode]}
          </Typography>
          {preview.blockedReason && <Alert severity="warning">{preview.blockedReason}</Alert>}
          {preview.scope && <Alert severity="info">{preview.scope}</Alert>}
          {mode === "transfer" && (
            <Typography>
              Origem: {source?.name} (#{source?.id}) → destino: {destination?.name} (#
              {destination?.id}). Apenas vínculos da origem serão transferidos.
            </Typography>
          )}
          {preview.snapshot && (
            <>
              <LinksTable
                label="Responsáveis dos clientes"
                rows={
                  mode === "transfer"
                    ? (preview.effects.customers as AdminRow[])
                    : preview.snapshot.customers
                }
                names={names}
              />
              <LinksTable
                label="Agendamentos pendentes"
                rows={
                  mode === "transfer"
                    ? (preview.effects.schedules as AdminRow[])
                    : preview.snapshot.schedules
                }
                names={names}
              />
              <LinksTable
                label="Fidelizações"
                rows={
                  mode === "transfer"
                    ? (preview.effects.loyalties as AdminRow[])
                    : preview.snapshot.loyalties
                }
                names={names}
              />
            </>
          )}
          {preview.items && (
            <Typography>
              {preview.items.length} solicitações revisadas para{" "}
              {preview.decision === "approve" ? "aprovação" : "reprovação"}. A marca de bloqueio e o
              resultado da campanha permanecem sem alteração.
            </Typography>
          )}
          <Typography>
            {mode === "transfer"
              ? `Preservados: ${preview.preserved?.join("; ")}.`
              : "Os vínculos acima são candidatos à revisão. O alcance sobre responsável, operador da campanha, fidelizações e agendas ainda será definido. O histórico de atendimentos será preservado."}
          </Typography>
          <Button
            variant="contained"
            disabled={disabled || !preview.executionAvailable || mode !== "transfer"}
            onClick={() => setConfirm(true)}
          >
            {mode === "transfer"
              ? "Confirmar transferência"
              : mode === "release"
                ? "Desfidelizar (indisponível)"
                : "Executar decisão (indisponível)"}
          </Button>
        </Stack>
      )}
      {mode === "transfer" && (
        <AdministrationHistory
          api={api}
          operatorId={source?.id}
          customerId={customerId}
          disabled={disabled}
        />
      )}
      <CrmDialog
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <DialogTitle>Transferir {selected.length} clientes?</DialogTitle>
        <DialogContent>
          <Typography>
            De {source?.name} para {destination?.name}. Confira todos os vínculos na prévia. A
            operação preserva históricos e mantém o operador de origem ativo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setConfirm(false)}>
            Voltar à prévia
          </Button>
          <Button variant="contained" disabled={busy} onClick={() => void apply()}>
            Transferir clientes
          </Button>
        </DialogActions>
      </CrmDialog>
    </Stack>
  );
}
export default function AdministrationPage() {
  const { user, instance, token, status } = useAuthContext();
  const api = useMemo(
    () =>
      token && instance
        ? new Client(process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002", {
            instance,
            token,
          })
        : null,
    [instance, token],
  );
  if (status === "loading") return <LinearProgress />;
  if (user?.NIVEL !== "ADMIN" || !api)
    return <Alert severity="warning">Acesso restrito a administradores.</Alert>;
  return (
    <CrmPage
      title="Administração de clientes"
      breadcrumbs={[{ label: "Clientes" }, { label: "Administração" }]}
    >
      <AdministrationWorkspace
        key={`${instance}:${user.CODIGO}:${token}`}
        api={api}
        storageKey={`crm-administration:${instance}:${user.CODIGO}`}
      />
    </CrmPage>
  );
}
