"use client";

import { useContext, useEffect, useState } from "react";
import { Alert, Button, FormControlLabel, Radio, RadioGroup, TextField } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import monitorService, {
  type MonitorChannelOption,
  type MonitorChannelPage,
} from "@/lib/services/monitor.service";
import { OperationalIconButton, UiIcon } from "@/lib/ui-system";
import { MonitorRequestGate } from "../request-gate";
import { readRequestLimitMessage } from "@/lib/utils/read-request-limit";

export default function MonitorChannelPicker({
  value,
  label,
  onConfirm,
  requestGate,
}: {
  value: number | "all";
  label: string;
  onConfirm: (id: number | "all", label: string) => void;
  requestGate: MonitorRequestGate;
}) {
  const { token, instance, user } = useContext(AuthContext);
  const [selection, setSelection] = useState({ id: value, label });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ page: 1, search: "", revision: 0 });
  const [data, setData] = useState<MonitorChannelPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const current = requestGate;
    current.invalidate();
    setData(null);
    setError(null);
    setLoading(true);
    if (!token) {
      setLoading(false);
      return;
    }
    // Cancellation plus generation check also rejects transports that finish after abort.
    const timer = setTimeout(
      async () => {
        const ticket = current.begin();
        if (!ticket) return;
        try {
          const result = await monitorService.channels(
            { page: query.page, search: query.search },
            ticket.controller.signal,
          );
          if (current.isCurrent(ticket)) setData(result);
        } catch (cause) {
          if (current.isCurrent(ticket)) {
            current.recordFailure(cause);
            setError(
              readRequestLimitMessage(cause) ||
                (cause instanceof Error ? cause.message : "Não foi possível consultar os canais."),
            );
          }
        } finally {
          if (current.isCurrent(ticket)) {
            current.complete(ticket);
            setLoading(false);
          }
        }
      },
      Math.max(0, current.retryAfterUntil - Date.now()),
    );
    return () => {
      clearTimeout(timer);
      current.invalidate();
    };
  }, [token, instance, user?.CODIGO, query, requestGate]);
  const optionLabel = (item: MonitorChannelOption) =>
    [item.name, item.phone].filter(Boolean).join(" · ");
  const options = data?.items ?? [];
  const selectedOutsidePage =
    selection.id !== "all" && !options.some((item) => item.id === selection.id);
  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setQuery((current) => ({ ...current, page: 1, search: search.trim() }));
        }}
        className="flex items-center gap-2"
      >
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Buscar canal por nome ou número"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <OperationalIconButton type="submit" label="Buscar canais">
          <UiIcon name="search" scale="toolbar" />
        </OperationalIconButton>
      </form>
      <form
        id="monitor-channel-picker"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(selection.id, selection.label);
        }}
      >
        <RadioGroup
          aria-label="Canal da última mensagem"
          value={String(selection.id)}
          onChange={(_event, id) => {
            const item = options.find((option) => String(option.id) === id);
            setSelection(
              id === "all"
                ? { id: "all", label: "Todos os canais" }
                : { id: Number(id), label: item ? optionLabel(item) : selection.label },
            );
          }}
        >
          <FormControlLabel value="all" control={<Radio />} label="Todos os canais" />
          {selectedOutsidePage && (
            <FormControlLabel
              value={String(selection.id)}
              control={<Radio />}
              label={`${selection.label} · seleção mantida`}
            />
          )}
          {options.map((item) => (
            <FormControlLabel
              key={item.id}
              value={String(item.id)}
              control={<Radio />}
              sx={{
                alignItems: "flex-start",
                minWidth: 0,
                ".MuiFormControlLabel-label": {
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  paddingBlock: "9px",
                },
              }}
              label={
                <>
                  <span>{item.name}</span>
                  <span className="ip-muted block text-[13px]">
                    {[item.phone, !item.isActive && "Inativo"].filter(Boolean).join(" · ") ||
                      "Número não informado"}
                  </span>
                </>
              }
            />
          ))}
        </RadioGroup>
      </form>
      {loading && (
        <p role="status" className="ip-muted text-sm">
          Carregando canais…
        </p>
      )}
      {error && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() =>
                setQuery((current) => ({ ...current, revision: current.revision + 1 }))
              }
            >
              Tentar novamente
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      {!loading && !error && data?.totalCount === 0 && (
        <p role="status" className="ip-muted text-sm">
          Nenhum canal encontrado.
        </p>
      )}
      {data && (
        <nav aria-label="Paginação dos canais" className="flex items-center justify-between gap-2">
          <OperationalIconButton
            label="Página anterior de canais"
            disabled={query.page <= 1 || loading}
            onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
          >
            <UiIcon name="back" scale="toolbar" />
          </OperationalIconButton>
          <p className="ip-muted text-[13px]">
            Página {data.page} de {Math.max(1, Math.ceil(data.totalCount / data.pageSize))} ·{" "}
            {data.totalCount} canais
          </p>
          <OperationalIconButton
            label="Próxima página de canais"
            disabled={query.page >= Math.ceil(data.totalCount / data.pageSize) || loading}
            onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
          >
            <UiIcon name="back" scale="toolbar" style={{ transform: "rotate(180deg)" }} />
          </OperationalIconButton>
        </nav>
      )}
    </div>
  );
}
