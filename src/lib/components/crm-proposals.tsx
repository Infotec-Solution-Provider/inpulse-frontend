"use client";
import { useAuthContext } from "@/app/auth-context";
import CrmProposalsClient, {
  type Proposal,
  type ProposalEvent,
  type ProposalFilters,
  type ProposalList,
} from "@/lib/sdk-local/crm-proposals.client";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
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
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";

function proposalErrorMessage(error: unknown) {
  const detail = getCustomerSegmentsError(error);
  if (detail.status === 409)
    return "A proposta mudou ou possui vínculos. Recarregue e confira o histórico.";
  if (detail.status === 400) return "Confira o período, os códigos, o valor e a justificativa.";
  if (detail.status === 403) return "Acesso restrito a administradores.";
  return "Não foi possível concluir. Recarregue antes de repetir.";
}
export default function CrmProposalsPage() {
  const { instance, token, user } = useAuthContext();
  const api = useMemo(
    () =>
      token
        ? new CrmProposalsClient(process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002", {
            instance,
            token,
          })
        : null,
    [instance, token],
  );
  if (user?.NIVEL !== "ADMIN")
    return <Alert severity="warning">Acesso restrito à supervisão administrativa.</Alert>;
  return api ? (
    <ProposalPanel key={`${instance}:${user.CODIGO}:${token}`} api={api} />
  ) : (
    <Alert severity="info">Aguarde a sessão.</Alert>
  );
}
export function ProposalPanel({ api }: { api: CrmProposalsClient }) {
  const today = new Date().toLocaleDateString("en-CA");
  const [draft, setDraft] = useState<ProposalFilters>({
    from: today.slice(0, 7) + "-01",
    to: today,
    status: "all",
    page: 1,
  });
  const [filters, setFilters] = useState(draft),
    [data, setData] = useState<ProposalList | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<Proposal | null>(null),
    [action, setAction] = useState<"UPDATE" | "CANCEL" | "DELETE">("UPDATE"),
    [value, setValue] = useState(""),
    [reason, setReason] = useState(""),
    [blocked, setBlocked] = useState(false);
  const [historyId, setHistoryId] = useState(""),
    [events, setEvents] = useState<ProposalEvent[] | null>(null),
    [report, setReport] = useState<string | null>(null);
  const active = useRef(true),
    sequence = useRef(0),
    submitting = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      sequence.current++;
    };
  }, []);
  async function refresh(f = filters) {
    const seq = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const result = await api.list(f);
      if (active.current && seq === sequence.current) {
        setData(result);
        setBlocked(false);
      }
    } catch (e) {
      if (active.current && seq === sequence.current) {
        setData(null);
        setError(proposalErrorMessage(e));
      }
    } finally {
      if (active.current && seq === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    void refresh(filters);
  }, [filters]); // panel remounts when its immutable session changes
  async function mutate() {
    if (!selected || submitting.current || blocked) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await api.change(selected.id, {
        operationId: crypto.randomUUID(),
        version: selected.version,
        action,
        ...(action === "UPDATE" ? { value: value.replace(",", ".") } : {}),
        reason,
      });
      if (!active.current) return;
      setSelected(null);
      await refresh();
    } catch (e) {
      if (!active.current) return;
      setBlocked(true);
      setError(proposalErrorMessage(e));
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function showHistory(id: number) {
    setBusy(true);
    try {
      const result = await api.history(id);
      if (active.current) setEvents(result);
    } catch (e) {
      if (active.current) setError(proposalErrorMessage(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function showReport() {
    setBusy(true);
    try {
      const html = await api.report(
        process.env.NEXT_PUBLIC_REPORTS_URL || "http://localhost:8006",
        filters,
      );
      if (active.current) setReport(html);
    } catch {
      if (active.current) setError("Relatório indisponível. Revise filtros e valores legados.");
    } finally {
      if (active.current) setBusy(false);
    }
  }
  const open = (row: Proposal, next: typeof action) => {
    setSelected(row);
    setAction(next);
    setValue(row.value);
    setReason("");
  };
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" component="h1">
        Gestão de propostas
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Valores em reais · Período da ligação · Propostas fechadas por compra são protegidas.
      </Typography>
      {error && !selected && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      {data && !data.capability.writable && (
        <Alert severity="warning">{data.capability.reason}</Alert>
      )}
      {blocked && (
        <Alert severity="warning">
          Recarregue os dados e confira o histórico antes de realizar outra alteração.
        </Alert>
      )}
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          setSelected(null);
          setFilters({ ...draft, page: 1 });
        }}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" },
          gap: 2,
          my: 2,
        }}
      >
        {(
          [
            ["from", "Data inicial", "date"],
            ["to", "Data final", "date"],
            ["customerId", "Código do cliente", "number"],
            ["erp", "Código ERP", "text"],
            ["operatorId", "Código do operador", "number"],
            ["campaignId", "Código da campanha", "number"],
          ] as const
        ).map(([key, label, type]) => (
          <TextField
            key={key}
            label={label}
            type={type}
            required={key === "from" || key === "to"}
            value={draft[key] || ""}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        ))}
        <TextField
          select
          label="Situação"
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        >
          {[
            ["all", "Todas"],
            ["open", "Abertas"],
            ["closed", "Fechadas"],
            ["cancelled", "Canceladas"],
          ].map(([v, label]) => (
            <MenuItem key={v} value={v}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" type="submit" disabled={busy}>
          Consultar
        </Button>
        <Button disabled={busy || !data} onClick={showReport}>
          Relatório para impressão
        </Button>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ my: 2 }}>
        <Button
          disabled={busy}
          onClick={() => {
            setSelected(null);
            void refresh();
          }}
        >
          Recarregar
        </Button>
        <TextField
          label="Proposta para histórico"
          size="small"
          type="number"
          value={historyId}
          onChange={(e) => setHistoryId(e.target.value)}
        />
        <Button
          disabled={busy || !Number.isInteger(Number(historyId)) || Number(historyId) < 1}
          onClick={() => showHistory(Number(historyId))}
        >
          Histórico
        </Button>
      </Stack>
      <TableContainer>
        <Table aria-label="Propostas" size="small" sx={{ minWidth: 960 }}>
          <TableHead>
            <TableRow>
              {[
                "Código",
                "Cliente / ERP",
                "Ligação",
                "Campanha",
                "Operador",
                "Situação",
                "Valor (R$)",
                "Ações",
              ].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>
                  {row.customerName} / {row.erp}
                </TableCell>
                <TableCell>{row.calledAt}</TableCell>
                <TableCell>{row.campaignName}</TableCell>
                <TableCell>{row.operatorName}</TableCell>
                <TableCell>
                  {row.status === "CANCELADA"
                    ? "Cancelada"
                    : Number(row.closed)
                      ? "Fechada"
                      : "Aberta"}
                </TableCell>
                <TableCell>{row.value}</TableCell>
                <TableCell>
                  <Stack direction="row">
                    <Button onClick={() => showHistory(row.id)} disabled={busy}>
                      Histórico
                    </Button>
                    {(
                      [
                        ["UPDATE", "Alterar"],
                        ["CANCEL", "Cancelar"],
                        ["DELETE", "Excluir"],
                      ] as const
                    ).map(([a, label]) => (
                      <Button
                        key={a}
                        disabled={
                          busy ||
                          blocked ||
                          !data.capability.writable ||
                          row.status !== "ATIVA" ||
                          !!Number(row.closed)
                        }
                        onClick={() => open(row, a)}
                      >
                        {label}
                      </Button>
                    ))}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {data?.data.length === 0 && <Alert severity="info">Nenhuma proposta encontrada.</Alert>}
      <Stack direction="row" justifyContent="flex-end" gap={2} sx={{ my: 2 }}>
        <Button
          disabled={busy || (filters.page || 1) <= 1}
          onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
        >
          Anterior
        </Button>
        <Typography>Página {filters.page || 1}</Typography>
        <Button
          disabled={busy || !data?.hasMore}
          onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
        >
          Próxima
        </Button>
      </Stack>
      <Dialog
        open={!!selected}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        fullWidth
      >
        <DialogTitle>
          {action === "UPDATE" ? "Alterar" : action === "CANCEL" ? "Cancelar" : "Excluir"} proposta{" "}
          {selected?.id}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error} Feche esta janela e confira o histórico antes de repetir.
            </Alert>
          )}
          <Typography sx={{ mb: 2 }}>
            Cliente: {selected?.customerName} · Valor atual: R$ {selected?.value}.{" "}
            {action === "DELETE"
              ? "O registro será excluído; a auditoria preservará os dados anteriores."
              : action === "CANCEL"
                ? "A proposta passará para Cancelada."
                : "Somente o valor será alterado."}
          </Typography>
          {action === "UPDATE" && (
            <TextField
              fullWidth
              label="Novo valor (R$)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={busy || blocked}
              sx={{ my: 1 }}
            />
          )}
          <TextField
            fullWidth
            label="Justificativa"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy || blocked}
            slotProps={{ htmlInput: { maxLength: 250 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setSelected(null)}>
            Voltar
          </Button>
          <Button
            disabled={
              busy ||
              blocked ||
              !reason.trim() ||
              (action === "UPDATE" && !/^(?:0|[1-9]\d{0,9})(?:[.,]\d{1,2})?$/.test(value))
            }
            onClick={mutate}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={events !== null} onClose={() => setEvents(null)} fullWidth>
        <DialogTitle>Histórico de propostas</DialogTitle>
        <DialogContent>
          {events?.length === 0 ? (
            <Typography>
              Nenhum evento web registrado. Alterações anteriores à auditoria não são reconstruídas.
            </Typography>
          ) : (
            events?.map((e) => (
              <Box key={e.operation_id} sx={{ borderBottom: "1px solid #ccc", py: 1 }}>
                <Typography>
                  {e.created_at} · {e.action} · Operador {e.actor_id}
                </Typography>
                <Typography>
                  R$ {e.old_value || "—"} → R$ {e.new_value || "—"} · {e.old_status || "—"} →{" "}
                  {e.new_status || "—"}
                </Typography>
                <Typography>{e.reason}</Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvents(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={report !== null} onClose={() => setReport(null)} fullWidth maxWidth="xl">
        <DialogTitle>Relatório de propostas</DialogTitle>
        <DialogContent>
          <iframe
            title="Relatório de propostas"
            sandbox="allow-modals allow-same-origin"
            srcDoc={report || ""}
            style={{ width: "100%", height: "65vh", border: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReport(null)}>Fechar</Button>
          <Button
            onClick={() => {
              const frame = document.querySelector<HTMLIFrameElement>(
                'iframe[title="Relatório de propostas"]',
              );
              frame?.contentWindow?.print();
            }}
          >
            Imprimir / salvar em PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
