"use client";
import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Client, {
  type AdminOption,
  type TransferHistory,
} from "@/lib/sdk-local/crm-administration.client";
export default function AdministrationHistory({
  api,
  operatorId,
  customerId,
  disabled,
}: {
  api: Client;
  operatorId?: number;
  customerId: string;
  disabled: boolean;
}) {
  const [rows, setRows] = useState<TransferHistory[]>([]),
    [next, setNext] = useState<number | null>(null),
    [items, setItems] = useState<(AdminOption & { campaignId: number | null })[]>([]),
    [itemNext, setItemNext] = useState<number | null>(null),
    [detail, setDetail] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    revision = useRef(0),
    locked = useRef(false);
  useEffect(() => {
    revision.current++;
    setRows([]);
    setItems([]);
    setNext(null);
    setDetail(null);
    setItemNext(null);
    setLoaded(false);
    return () => {
      revision.current++;
    };
  }, [api, operatorId, customerId]);
  async function run(action: (version: number) => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    const version = revision.current;
    setBusy(true);
    setError("");
    try {
      await action(version);
    } catch {
      if (version === revision.current) setError("Não foi possível consultar as transferências.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function list(after?: number) {
    void run(async (version) => {
      const page = await api.history({
        ...(operatorId ? { operatorId } : {}),
        ...(customerId ? { customerId } : {}),
        ...(after ? { after } : {}),
      });
      if (version !== revision.current) return;
      setRows((current) => (after ? [...current, ...page.items] : page.items));
      setNext(page.nextAfter);
      setLoaded(true);
      setDetail(null);
    });
  }
  function inspect(id: number, after?: number) {
    void run(async (version) => {
      const page = await api.historyItems(id, after);
      if (version !== revision.current) return;
      setItems((current) => (after ? [...current, ...page.items] : page.items));
      setItemNext(page.nextAfter);
      setDetail(id);
    });
  }
  return (
    <Accordion>
      <AccordionSummary>Consultar transferências registradas</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Typography>
            Consulta documentos legados e novos. Usa o operador de origem e o código de cliente
            informados acima como filtros. O operador é pesquisado na origem e no destino.
          </Typography>
          <Button disabled={disabled || busy} onClick={() => list()}>
            Consultar histórico
          </Button>
          {busy && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {loaded && (
            <>
              <TableContainer>
                <Table size="small" aria-label="Histórico de transferências">
                  <TableHead>
                    <TableRow>
                      {[
                        "Documento",
                        "Data",
                        "Origem",
                        "Destino",
                        "Responsável pela operação",
                        "Itens",
                      ].map((label) => (
                        <TableCell key={label}>{label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>#{row.id}</TableCell>
                        <TableCell>{row.occurredAt}</TableCell>
                        <TableCell>
                          {row.sourceName ?? "Operador removido"} (#{row.sourceId})
                        </TableCell>
                        <TableCell>
                          {row.destinationName ?? "Operador removido"} (#{row.destinationId})
                        </TableCell>
                        <TableCell>#{row.actorId}</TableCell>
                        <TableCell>
                          <Button disabled={disabled || busy} onClick={() => inspect(row.id)}>
                            Itens da transferência #{row.id}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {!rows.length && <Typography>Nenhuma transferência encontrada.</Typography>}
              {next && (
                <Button disabled={disabled || busy} onClick={() => list(next)}>
                  Mais transferências
                </Button>
              )}
            </>
          )}
          {detail && (
            <>
              <Typography>
                Clientes da transferência #{detail}. Nomes e campanhas refletem o cadastro atual.
              </Typography>
              <TableContainer>
                <Table size="small" aria-label="Itens da transferência">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Campanha atual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {row.name ?? "Cliente removido"} (#{row.id})
                        </TableCell>
                        <TableCell>{row.campaignId ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {itemNext && (
                <Button disabled={disabled || busy} onClick={() => inspect(detail, itemNext)}>
                  Mais clientes da transferência
                </Button>
              )}
            </>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
