"use client";

import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";

export interface EntityOption {
  id: number;
  label: string;
}
export type EntityOptionsLoader = (
  search: string,
  page: number,
  signal: AbortSignal,
) => Promise<{ options: EntityOption[]; hasMore: boolean }>;

type EntityFilterProps = {
  label: string;
  scope: string;
  loadOptions: EntityOptionsLoader;
  moreLabel?: string;
  emptyLabel?: string;
} & (
  | { multiple: true; value: EntityOption[]; onChange: (value: EntityOption[]) => void }
  | { multiple?: false; value: EntityOption | null; onChange: (value: EntityOption | null) => void }
);

export function SearchableEntityFilter(props: EntityFilterProps) {
  const {
    label,
    scope,
    value,
    loadOptions,
    multiple = false,
    moreLabel = "Carregar mais operadores",
    emptyLabel = "Nenhum operador encontrado",
  } = props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    scope: string;
    search: string;
    options: EntityOption[];
    hasMore: boolean;
    loading: boolean;
    error: string | null;
  }>({ scope, search: "", options: [], hasMore: false, loading: false, error: null });
  const sequence = useRef(0);
  useEffect(() => {
    setSearch("");
    setPage(1);
    setOpen(false);
  }, [scope]);
  useEffect(() => {
    const request = ++sequence.current;
    if (!open) return;
    const controller = new AbortController();
    setState((previous) => ({
      scope,
      search,
      options: previous.scope === scope && previous.search === search ? previous.options : [],
      hasMore: false,
      loading: true,
      error: null,
    }));
    const timeout = setTimeout(() => {
      void loadOptions(search, page, controller.signal)
        .then((result) => {
          if (sequence.current !== request || controller.signal.aborted) return;
          setState((previous) => ({
            scope,
            search,
            options: Array.from(
              new Map(
                [
                  ...(page > 1 && previous.scope === scope && previous.search === search
                    ? previous.options
                    : []),
                  ...result.options,
                ].map((option) => [option.id, option]),
              ).values(),
            ),
            hasMore: result.hasMore,
            loading: false,
            error: null,
          }));
        })
        .catch(() => {
          if (sequence.current !== request || controller.signal.aborted) return;
          setState((previous) => ({
            ...previous,
            loading: false,
            error: "Falha ao carregar opções. Tente novamente.",
          }));
        });
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [scope, search, page, open, retry, loadOptions]);
  const options = state.scope === scope && state.search === search ? state.options : [];
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const optionIds = new Set(options.map((option) => option.id));
  const combined = [...selected.filter((option) => !optionIds.has(option.id)), ...options];
  const choices = state.error
    ? [...combined, { id: -2, label: "Tentar carregar opções" }]
    : open && state.hasMore && !state.loading
      ? [...combined, { id: -1, label: moreLabel }]
      : combined;
  return (
    <div className="grid min-w-0 content-start gap-1">
      <Autocomplete
        size="small"
        options={choices}
        disableCloseOnSelect
        value={value}
        multiple={multiple}
        limitTags={2}
        inputValue={multiple ? search : undefined}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => {
          setOpen(false);
          if (multiple) {
            setSearch("");
            setPage(1);
          }
        }}
        filterOptions={(items) => items}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        getOptionLabel={(option) =>
          option.id < 0 ? option.label : `${option.label} · #${option.id}`
        }
        loading={state.loading}
        loadingText="Carregando opções…"
        noOptionsText={state.error ?? emptyLabel}
        onChange={(_, option) => {
          const next = Array.isArray(option) ? option : option ? [option] : [];
          if (next.some((item) => item.id === -2)) {
            setRetry((count) => count + 1);
            return;
          }
          if (next.some((item) => item.id === -1)) {
            setPage((current) => current + 1);
            return;
          }
          if (props.multiple) {
            props.onChange(next);
            return;
          }
          props.onChange(next[0] ?? null);
          setSearch("");
          setPage(1);
          setOpen(false);
        }}
        onInputChange={(_, text, reason) => {
          if (reason === "input" || reason === "clear") {
            setSearch(text);
            setPage(1);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={selected.length ? (open ? "Pesquisar…" : undefined) : "Todos os permitidos"}
            helperText={state.error ?? "Pesquise por nome ou código. Vazio: todos os permitidos."}
            error={Boolean(state.error)}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {state.loading && <CircularProgress size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </div>
  );
}
