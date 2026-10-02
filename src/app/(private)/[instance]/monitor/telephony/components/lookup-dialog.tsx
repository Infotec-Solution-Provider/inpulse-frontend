"use client";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Radio,
  TextField,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { readRequestLimitMessage } from "@/lib/utils/read-request-limit";
import { MonitorRequestGate } from "../../request-gate";
import type { TelephonyLookupOption, TelephonyLookupResult } from "../types";
import { dialogPaperSx } from "../../surface";

export interface LookupPageRequest {
  search: string;
  page: number;
  pageSize: number;
  signal: AbortSignal;
}

interface LookupDialogProps {
  title: string;
  multiple?: boolean;
  initialSelection: TelephonyLookupOption[];
  description?: string;
  loadPage: (request: LookupPageRequest) => Promise<TelephonyLookupResult>;
  onConfirm: (options: TelephonyLookupOption[]) => void;
  onClose: () => void;
}

export default function TelephonyLookupDialog({
  title,
  multiple = true,
  initialSelection,
  description,
  loadPage,
  onConfirm,
  onClose,
}: LookupDialogProps) {
  const [selection, setSelection] = useState(
    () => new Map(initialSelection.map((option) => [option.id, option])),
  );
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TelephonyLookupOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterUntil, setRetryAfterUntil] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [retry, setRetry] = useState(0);
  const gate = useRef(new MonitorRequestGate());
  const pageSize = 20;
  const retrySeconds = Math.max(0, Math.ceil((retryAfterUntil - now) / 1_000));
  const selectionLimit = 100;
  const atSelectionLimit = multiple && selection.size >= selectionLimit;

  useEffect(() => {
    if (!retryAfterUntil) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [retryAfterUntil]);

  useEffect(() => {
    gate.current.invalidate();
    setLoading(true);
    setItems([]);
    setError(null);
    const run = async () => {
      const ticket = gate.current.begin();
      if (!ticket) return;
      try {
        const result = await loadPage({ search, page, pageSize, signal: ticket.controller.signal });
        if (!gate.current.isCurrent(ticket)) return;
        const lastPage = Math.max(1, Math.ceil(result.totalCount / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setItems(result.items);
        setTotalCount(result.totalCount);
        setSelection((current) => {
          const next = new Map(current);
          for (const item of result.items) if (next.has(item.id)) next.set(item.id, item);
          return next;
        });
      } catch (failure) {
        if (!gate.current.isCurrent(ticket)) return;
        const retryUntil = gate.current.recordFailure(failure);
        setRetryAfterUntil(retryUntil);
        setError(
          readRequestLimitMessage(failure) ||
            (retryUntil > Date.now()
              ? "Limite de consultas atingido. Aguarde o tempo indicado para tentar novamente."
              : "Não foi possível carregar as opções. Tente novamente."),
        );
      } finally {
        if (gate.current.isCurrent(ticket)) {
          gate.current.complete(ticket);
          setLoading(false);
        }
      }
    };
    const timer = window.setTimeout(
      () => void run(),
      Math.max(0, gate.current.retryAfterUntil - Date.now()),
    );
    return () => {
      window.clearTimeout(timer);
      gate.current.invalidate();
    };
  }, [loadPage, page, search, retry]);

  const toggle = (option: TelephonyLookupOption) =>
    setSelection((current) => {
      if (!multiple) return new Map([[option.id, option]]);
      const next = new Map(current);
      if (next.has(option.id)) next.delete(option.id);
      else if (next.size < selectionLimit) next.set(option.id, option);
      return next;
    });

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="telephony-lookup-title"
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogTitle id="telephony-lookup-title" className="flex items-center justify-between gap-2">
        {title}
        <IconButton
          aria-label={`Fechar seleção de ${title.toLowerCase()}`}
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {description && (
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        )}
        <form
          className="mb-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchText.trim());
            if (search === searchText.trim() && page === 1) setRetry((value) => value + 1);
          }}
        >
          <TextField
            autoFocus
            size="small"
            fullWidth
            label={`Pesquisar ${title.toLowerCase()}`}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<SearchIcon />}
            disabled={retrySeconds > 0}
          >
            Buscar
          </Button>
        </form>
        {error && (
          <Alert
            severity="error"
            className="mb-3"
            action={
              <Button
                size="small"
                color="inherit"
                disabled={retrySeconds > 0 || loading}
                onClick={() => setRetry((value) => value + 1)}
              >
                {retrySeconds > 0 ? `Aguarde ${retrySeconds}s` : "Tentar novamente"}
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {atSelectionLimit && (
          <Alert severity="info" className="mb-3">
            Limite de 100 seleções. Remova uma opção para escolher outra.
          </Alert>
        )}
        <div aria-busy={loading} className="min-h-48">
          {loading ? (
            <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm">
              <CircularProgress size={22} />
              {retrySeconds > 0 ? `Aguarde ${retrySeconds}s para carregar` : "Carregando opções…"}
            </div>
          ) : !error && items.length === 0 ? (
            <p
              role="status"
              className="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
            >
              Nenhuma opção encontrada para esta pesquisa.
            </p>
          ) : (
            <div
              role={multiple ? "group" : "radiogroup"}
              aria-label={`Opções de ${title.toLowerCase()}`}
              className="max-h-[35dvh] overflow-y-auto"
            >
              {items.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border-b border-slate-100 px-1 py-1.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  {multiple ? (
                    <Checkbox
                      size="small"
                      checked={selection.has(option.id)}
                      disabled={atSelectionLimit && !selection.has(option.id)}
                      onChange={() => toggle(option)}
                      inputProps={{ "aria-label": option.label }}
                    />
                  ) : (
                    <Radio
                      size="small"
                      name="telephony-lookup-option"
                      checked={selection.has(option.id)}
                      onChange={() => toggle(option)}
                      inputProps={{ "aria-label": option.label }}
                    />
                  )}
                  <span className="min-w-0 py-1.5">
                    <span className="block break-words text-sm text-slate-800 dark:text-slate-100">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="mt-0.5 block break-words text-xs text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        {!loading && !error && totalCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {totalCount.toLocaleString("pt-BR")} opções
            </span>
            <Pagination
              count={Math.max(1, Math.ceil(totalCount / pageSize))}
              page={page}
              onChange={(_event, next) => setPage(next)}
              size="small"
            />
          </div>
        )}
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {selection.size}
              {multiple ? " de 100" : ""} {selection.size === 1 ? "selecionado" : "selecionados"}
            </p>
            <Button size="small" disabled={!selection.size} onClick={() => setSelection(new Map())}>
              Limpar seleção
            </Button>
          </div>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {Array.from(selection.values()).map((option) => (
              <Chip
                key={option.id}
                size="small"
                label={option.label}
                onDelete={() =>
                  setSelection((current) => {
                    const next = new Map(current);
                    next.delete(option.id);
                    return next;
                  })
                }
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            A seleção é mantida ao pesquisar ou trocar de página. Confirme para atualizar o filtro.
          </p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onConfirm(Array.from(selection.values()))}>
          Confirmar seleção
        </Button>
      </DialogActions>
    </Dialog>
  );
}
