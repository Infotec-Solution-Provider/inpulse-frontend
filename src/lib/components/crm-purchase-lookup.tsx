"use client";
import type CrmPurchasesClient from "@/lib/sdk-local/crm-purchases.client";
import { Autocomplete, Box, Button, CircularProgress, Paper, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";
interface Option {
  CODIGO: number;
  label: string;
  active?: string | null;
  historical?: boolean;
}
export default function CrmPurchaseLookup({
  api,
  kind,
  label,
  value,
  currentLabel,
  onChange,
  disabled,
  error,
}: {
  api: CrmPurchasesClient;
  kind: "customers" | "operators";
  label: string;
  value: string;
  currentLabel?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [options, setOptions] = useState<Option[]>([]),
    [loading, setLoading] = useState(false),
    [failed, setFailed] = useState(false),
    [hasMore, setHasMore] = useState(false),
    [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    if (!open || disabled) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await api.lookup(kind, { search, page, perPage: 20 });
        if (request !== sequence.current) return;
        const rows = response.data
          .filter((row) => row.CODIGO > 0)
          .map((row) => ({ ...row, label: row.label ?? `Código ${row.CODIGO}` }));
        setOptions((old) =>
          page === 1
            ? rows
            : [...old, ...rows.filter((row) => !old.some((item) => item.CODIGO === row.CODIGO))],
        );
        setHasMore(page * 20 < response.page.totalRows);
      } catch {
        if (request === sequence.current) setFailed(true);
      } finally {
        if (request === sequence.current) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      sequence.current += 1;
    };
  }, [api, kind, open, disabled, search, page, retry]);
  const selected =
    value === ""
      ? null
      : (options.find((option) => String(option.CODIGO) === value) ?? {
          CODIGO: Number(value),
          label: currentLabel ?? `Código ${value} (atual)`,
          historical: true,
        });
  return (
    <Box sx={{ minWidth: 0 }}>
      <Autocomplete<Option>
        slots={{
          paper: (props) => (
            <Paper {...props}>
              {props.children}
              {hasMore && !failed && (
                <Button
                  fullWidth
                  size="small"
                  disabled={loading}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Carregar mais {kind === "customers" ? "clientes" : "usuários"}
                </Button>
              )}
              {failed && (
                <Button
                  fullWidth
                  size="small"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Tentar busca novamente
                </Button>
              )}
            </Paper>
          ),
        }}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        value={selected}
        options={selected?.historical ? [selected, ...options] : options}
        disabled={disabled}
        clearText={`Limpar ${label.toLocaleLowerCase("pt-BR")}`}
        openText="Abrir opções"
        closeText="Fechar opções"
        loading={loading}
        filterOptions={(rows) => rows}
        getOptionDisabled={(row) => Boolean(row.historical)}
        getOptionLabel={(row) => `${row.label} (#${row.CODIGO})`}
        isOptionEqualToValue={(a, b) => a.CODIGO === b.CODIGO}
        onInputChange={(_, text, reason) => {
          if (reason === "input") {
            setSearch(text);
            setPage(1);
          }
        }}
        onChange={(_, row) => onChange(row ? String(row.CODIGO) : "")}
        noOptionsText={failed ? "Falha ao consultar opções." : "Nenhuma opção encontrada."}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={Boolean(error || failed)}
            helperText={
              error ??
              (failed ? "Não foi possível carregar as opções." : "Busque pelo nome ou código.")
            }
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress size={16} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
    </Box>
  );
}
