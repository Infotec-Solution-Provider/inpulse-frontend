"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";
import axios from "axios";
import {
  GoalAssignmentsClient,
  type GoalAllocation,
  type GoalHistory,
  type GoalParticipant,
  type GoalPreview,
} from "../services/goal-assignments.service";

const labels = {
  targetRevenue: "Faturamento (R$)",
  targetSalesCount: "Quantidade de vendas",
  targetAvgTicket: "Ticket médio por participante (R$)",
};
const format = (value: number, indicator: GoalAllocation["indicator"]) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: indicator === "targetSalesCount" ? 0 : 2,
    maximumFractionDigits: 2,
  });
function errorMessage(error: unknown) {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string")
    return error.response.data.message as string;
  return "Não foi possível confirmar a operação. Recarregue os dados antes de tentar novamente.";
}

export default function GoalAssignments({
  token,
  instance,
  onSaved,
}: {
  token: string;
  instance: string;
  onSaved: () => void;
}) {
  const client = useMemo(() => new GoalAssignmentsClient(token, instance), [token, instance]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [mode, setMode] = useState<GoalAllocation["mode"]>("INDIVIDUAL");
  const [indicator, setIndicator] = useState<GoalAllocation["indicator"]>("targetRevenue");
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<GoalParticipant[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [people, setPeople] = useState<GoalParticipant[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [preview, setPreview] = useState<GoalPreview | null>(null);
  const [history, setHistory] = useState<GoalHistory[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const epoch = useRef(0);
  const operation = useRef<string | null>(null);
  const historyEpoch = useRef(0);
  const allocation: GoalAllocation = {
    year,
    month,
    mode,
    indicator,
    amount,
    participants: selected.map((person) => person.operadorId),
  };
  const invalidate = () => {
    epoch.current++;
    setPreview(null);
    operation.current = null;
    setMessage("");
    setSuccess(false);
  };
  useEffect(
    () => () => {
      epoch.current++;
      historyEpoch.current++;
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;
    setPeopleLoading(true);
    setPeople([]);
    setHasNext(false);
    client
      .participants(search, page)
      .then((result) => {
        if (!cancelled) {
          setPeople(result.data);
          setHasNext(result.hasNext);
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPeopleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, search, page]);
  useEffect(() => {
    const current = ++historyEpoch.current;
    setHistory([]);
    client
      .history(year, month)
      .then((rows) => {
        if (current === historyEpoch.current) setHistory(rows);
      })
      .catch((error) => {
        if (current === historyEpoch.current) setMessage(errorMessage(error));
      });
  }, [client, year, month]);

  async function generatePreview() {
    if (busy) return;
    const current = ++epoch.current;
    setBusy(true);
    setPreview(null);
    setMessage("");
    setSuccess(false);
    try {
      const result = await client.preview(allocation);
      if (current !== epoch.current) return;
      setPreview(result);
      operation.current = crypto.randomUUID();
    } catch (error) {
      if (current === epoch.current) setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!preview || !operation.current || busy) return;
    const current = epoch.current;
    setBusy(true);
    setMessage("");
    try {
      await client.commit(allocation, preview.previewHash, operation.current);
      if (current !== epoch.current) return;
      invalidate();
      setSuccess(true);
      onSaved();
      try {
        setHistory(await client.history(year, month));
      } catch {
        setMessage(
          "Metas salvas. O histórico está indisponível; reabra o cadastro para consultá-lo.",
        );
      }
    } catch (error) {
      if (current !== epoch.current) return;
      setMessage(errorMessage(error));
      // Unknown outcomes retain the same idempotency key. Conflicts require a new preview.
      if (axios.isAxiosError(error) && [400, 409].includes(error.response?.status ?? 0)) {
        setPreview(null);
        operation.current = null;
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="flex flex-col gap-4"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Alert severity="info">
        Escolha participantes ativos do CRM, inclusive quem ainda não tem vendas. A meta geral do
        dashboard é independente deste cadastro.
      </Alert>
      {message && <Alert severity="error">{message}</Alert>}
      {success && <Alert severity="success">Metas atribuídas e histórico registrado.</Alert>}
      <fieldset
        disabled={busy}
        style={{
          border: 0,
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 16,
        }}
      >
        <TextField
          disabled={busy}
          label="Ano da atribuição"
          type="number"
          value={year}
          onChange={(event) => {
            invalidate();
            setYear(Number(event.target.value));
          }}
          inputProps={{ min: 2000, max: 2100 }}
        />
        <TextField
          disabled={busy}
          select
          label="Mês da atribuição"
          value={month}
          onChange={(event) => {
            invalidate();
            setMonth(Number(event.target.value));
          }}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <MenuItem key={index + 1} value={index + 1}>
              {index + 1}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          disabled={busy}
          select
          label="Modo de atribuição"
          value={mode}
          onChange={(event) => {
            invalidate();
            setMode(event.target.value as GoalAllocation["mode"]);
          }}
        >
          <MenuItem value="INDIVIDUAL">Mesmo valor individual para todos</MenuItem>
          <MenuItem value="TOTAL" disabled={indicator === "targetAvgTicket"}>
            Dividir meta total igualmente
          </MenuItem>
        </TextField>
        <TextField
          disabled={busy}
          select
          label="Indicador"
          value={indicator}
          onChange={(event) => {
            invalidate();
            const value = event.target.value as GoalAllocation["indicator"];
            setIndicator(value);
            if (value === "targetAvgTicket") setMode("INDIVIDUAL");
          }}
        >
          {Object.entries(labels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          disabled={busy}
          label={mode === "TOTAL" ? "Meta total a dividir" : "Meta individual de cada participante"}
          value={amount}
          onChange={(event) => {
            invalidate();
            setAmount(event.target.value);
          }}
          inputProps={{ inputMode: indicator === "targetSalesCount" ? "numeric" : "decimal" }}
          helperText={
            indicator === "targetSalesCount"
              ? "Quantidade inteira, incluindo zero."
              : "Use ponto decimal e até duas casas. Ex.: 100.00"
          }
        />
      </fieldset>
      <TextField
        disabled={busy}
        label="Buscar participantes por nome ou código"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <div
        role="group"
        aria-label="Participantes elegíveis"
        style={{ maxHeight: 240, overflowY: "auto" }}
      >
        {peopleLoading ? (
          <p>Carregando participantes…</p>
        ) : people.length === 0 ? (
          <p>Nenhum participante encontrado.</p>
        ) : (
          people.map((person) => (
            <FormControlLabel
              key={person.operadorId}
              style={{ display: "flex" }}
              control={
                <Checkbox
                  disabled={
                    busy ||
                    (!selected.some((row) => row.operadorId === person.operadorId) &&
                      selected.length >= 100)
                  }
                  checked={selected.some((row) => row.operadorId === person.operadorId)}
                  onChange={(_, checked) => {
                    invalidate();
                    setSelected((rows) =>
                      checked
                        ? [...rows, person]
                        : rows.filter((row) => row.operadorId !== person.operadorId),
                    );
                  }}
                />
              }
              label={`${person.name} (#${person.operadorId})`}
            />
          ))
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Button disabled={busy || page === 1} onClick={() => setPage(page - 1)}>
          Página anterior
        </Button>
        <span>Página {page}</span>
        <Button disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>
          Próxima página
        </Button>
      </div>
      <p>
        {selected.length} participante(s) selecionado(s), limite de 100.{" "}
        {selected.map((person) => `${person.name} (#${person.operadorId})`).join(", ")}
      </p>
      <Button
        disabled={
          busy ||
          !selected.length ||
          !amount ||
          !Number.isInteger(year) ||
          year < 2000 ||
          year > 2100
        }
        variant="outlined"
        onClick={generatePreview}
      >
        Gerar prévia
      </Button>
      {preview && (
        <section aria-label="Prévia da atribuição">
          <h3>
            {mode === "TOTAL" ? "Meta total dividida" : "Metas individuais iguais"} —{" "}
            {labels[indicator]}
          </h3>
          {mode === "TOTAL" && (
            <p>
              Resíduos de centavos ou unidades são atribuídos aos menores códigos de participante.
            </p>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "left" }}>
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Meta anterior</th>
                  <th>Nova meta individual</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.operadorId}>
                    <td>
                      {row.name} (#{row.operadorId})
                    </td>
                    <td>{row.previous === null ? "Sem meta" : format(row.previous, indicator)}</td>
                    <td>{format(row.value, indicator)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>
              {indicator === "targetAvgTicket"
                ? "Soma dos valores individuais (não representa ticket médio da equipe)"
                : "Soma das metas dos participantes"}
              : {format(preview.total, indicator)}
            </strong>
          </p>
          <p>
            Apenas o indicador selecionado será atualizado. Os demais indicadores e períodos serão
            preservados.
          </p>
          <Button disabled={busy} variant="contained" onClick={save}>
            Confirmar atribuição
          </Button>
        </section>
      )}
      <section aria-label="Histórico de atribuições">
        <h3>
          Histórico — {month}/{year}
        </h3>
        <p>
          As metas anteriores a este cadastro permanecem preservadas. O histórico abaixo contém as
          novas atribuições.
        </p>
        {history.length === 0 && <p>Nenhuma atribuição registrada neste período.</p>}
        {history.map((item) => (
          <details key={item.id}>
            <summary>
              #{item.id} · {new Date(item.createdAt).toLocaleString("pt-BR")} · responsável #
              {item.createdBy} · {labels[item.snapshot.allocation.indicator]}
            </summary>
            <p>
              {item.snapshot.allocation.mode === "TOTAL" ? "Total dividido" : "Valor individual"}:{" "}
              {item.snapshot.allocation.amount}
            </p>
            {item.snapshot.rows.map((row) => (
              <p key={row.operadorId}>
                {row.name} (#{row.operadorId}):{" "}
                {row.previous === null
                  ? "Sem meta"
                  : format(row.previous, item.snapshot.allocation.indicator)}{" "}
                → {format(row.value, item.snapshot.allocation.indicator)}
              </p>
            ))}
          </details>
        ))}
        {history.length >= 50 && (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const rows = await client.history(year, month, history.at(-1)!.id);
                setHistory((current) => [...current, ...rows]);
              } catch (error) {
                setMessage(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            Carregar histórico anterior
          </Button>
        )}
      </section>
    </div>
  );
}
