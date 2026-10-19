"use client";
import { CrmPage } from "@/lib/ui-system";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { useAuthContext } from "@/app/auth-context";
import CrmMarketingClient from "@/lib/sdk-local/crm-marketing.client";
import { crmError } from "@/lib/crm-marketing-form";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CrmMarketingField } from "@/lib/sdk-local/types/crm-marketing.types";
const SessionContext = createContext<{
  client: CrmMarketingClient;
  instance: string;
  token: string;
}>(null!);
export const useCrmSession = () => useContext(SessionContext);
export function CrmMarketingFrame({
  title,
  section,
  children,
}: {
  title: string;
  section?: string;
  children: ReactNode;
}) {
  const { user, instance, token, status } = useAuthContext();
  const client = useMemo(
    () =>
      new CrmMarketingClient(
        process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:8007",
        token ?? undefined,
        instance,
      ),
    [token, instance],
  );
  if (status === "loading")
    return (
      <Box p={3}>
        <CircularProgress aria-label="Carregando sessão" />
      </Box>
    );
  if (user?.NIVEL !== "ADMIN" || !token)
    return (
      <Box p={3}>
        <Alert severity="warning">Acesso restrito a administradores.</Alert>
      </Box>
    );
  return (
    <SessionContext.Provider key={`${instance}:${user.CODIGO}`} value={{ client, instance, token }}>
      <CrmPage
        title={title}
        breadcrumbs={[
          { label: "Campanhas" },
          { label: title },
          ...(section ? [{ label: section }] : []),
        ]}
      >
        {children}
      </CrmPage>
    </SessionContext.Provider>
  );
}
export function useCrmMutation() {
  const { client } = useCrmSession(),
    current = useRef(client),
    mounted = useRef(true),
    writing = useRef(false);
  const [busy, setBusy] = useState(false),
    [gate, setGate] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  current.current = client;
  useCrmLeaveGuard(false, busy, gate);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (writing.current) {
      setGate(true);
      setError(
        "Sua sessão mudou durante a gravação. Recarregue os dados para conferir o resultado.",
      );
    }
  }, [client]);
  async function write<T>(work: () => Promise<T>): Promise<{ value: T } | null> {
    if (writing.current || gate) return null;
    writing.current = true;
    const started = client;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const value = await work();
      if (!mounted.current) return null;
      if (current.current !== started) {
        setGate(true);
        setError("Sua sessão mudou durante a gravação. Confira os dados antes de continuar.");
        return null;
      }
      return { value };
    } catch (failure) {
      if (mounted.current) {
        const details = crmError(failure);
        setError(details.message);
        if (details.reconcile || current.current !== started) setGate(true);
      }
      return null;
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    busy,
    gate,
    error,
    success,
    write,
    setError,
    setSuccess,
    reconcile: () => {
      setGate(false);
      setError("");
    },
  };
}
export type LookupKind =
  | "units"
  | "groups"
  | "segments"
  | "origins"
  | "operators"
  | "cities"
  | "states";
export function CrmLookup({
  kind,
  label,
  value,
  onChange,
  multiple = false,
  disabled = false,
}: {
  kind: LookupKind;
  label: string;
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const { client } = useCrmSession(),
    [options, setOptions] = useState<{ id: string; label: string | null }[]>([]),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [hasNext, setNext] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void client
        .options(kind, search, page)
        .then((response) => {
          if (active) {
            setOptions((previous) =>
              page === 1
                ? response.data
                : [
                    ...previous,
                    ...response.data.filter((item) => !previous.some((old) => old.id === item.id)),
                  ],
            );
            setNext(response.page.hasNext);
            if (!response.supported) setError("Catálogo indisponível nesta instância.");
          }
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar as opções.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [client, kind, search, page]);
  const ids = Array.isArray(value) ? value : value === null ? [] : [value],
    chosen = ids.map(
      (id) =>
        options.find((option) => option.id === id) ?? {
          id,
          label: ["cities", "states"].includes(kind) ? id : `Código ${id}`,
        },
    ),
    all = [
      ...chosen.filter((option) => !options.some((item) => item.id === option.id)),
      ...options,
    ];
  return (
    <Box sx={{ minWidth: 0 }}>
      <Autocomplete
        multiple={multiple}
        options={all}
        value={multiple ? chosen : (chosen[0] ?? null)}
        disabled={disabled}
        loading={loading}
        filterOptions={(options) => options}
        getOptionLabel={(option) =>
          `${option.label ?? "Sem nome"}${["cities", "states"].includes(kind) ? "" : ` (${option.id})`}`
        }
        isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
        onInputChange={(_event, term, reason) => {
          if (reason === "input" || reason === "clear") {
            setSearch(term);
            setPage(1);
          }
        }}
        onChange={(_event, option) =>
          onChange(Array.isArray(option) ? option.map((item) => item.id) : (option?.id ?? null))
        }
        renderInput={(params) => (
          <TextField {...params} label={label} error={!!error} helperText={error || undefined} />
        )}
      />
      {hasNext && (
        <Button size="small" disabled={loading || disabled} onClick={() => setPage(page + 1)}>
          Carregar mais opções
        </Button>
      )}
    </Box>
  );
}
export function NullableCrmField({
  field,
  value,
  onChange,
  disabled,
  label,
  error,
  required = false,
}: {
  field: CrmMarketingField;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
  label: string;
  error?: string;
  required?: boolean;
}) {
  const choices = field.values ?? [],
    historical = value !== null && field.type === "enum" && !choices.includes(value);
  const lookup = field.key === "UNIDADE" ? "units" : field.key === "OPERADOR" ? "operators" : null;
  return (
    <Box>
      {lookup ? (
        <CrmLookup
          kind={lookup}
          label={label}
          value={value}
          disabled={disabled}
          onChange={(next) => onChange(Array.isArray(next) ? (next[0] ?? null) : next)}
        />
      ) : (
        <TextField
          required={required}
          error={Boolean(error)}
          label={label}
          fullWidth
          disabled={disabled || value === null}
          value={value ?? ""}
          select={field.type === "enum"}
          type={field.type === "number" ? "number" : "text"}
          multiline={field.type === "text" && (field.maxLength ?? 0) > 255}
          minRows={field.type === "text" && (field.maxLength ?? 0) > 255 ? 3 : undefined}
          onChange={(event) => onChange(event.target.value)}
          inputProps={{ maxLength: field.maxLength, min: field.min, max: field.max }}
          helperText={error || (field.type === "datetime" ? "AAAA-MM-DD HH:mm:ss" : undefined)}
        >
          {field.type === "enum"
            ? [
                ...(historical
                  ? [
                      <MenuItem key="historical" value={value!} disabled>
                        Valor histórico: {value || "vazio"}
                      </MenuItem>,
                    ]
                  : []),
                ...choices.map((choice) => (
                  <MenuItem key={choice} value={choice}>
                    {choice === "SIM" || choice === "S"
                      ? "Sim"
                      : choice === "NAO" || choice === "N"
                        ? "Não"
                        : choice}
                  </MenuItem>
                )),
              ]
            : undefined}
        </TextField>
      )}
      {field.nullable && (
        <FormControlLabel
          disabled={disabled}
          control={
            <Checkbox
              size="small"
              checked={value === null}
              onChange={(event) =>
                onChange(
                  event.target.checked ? null : field.type === "enum" ? (choices[0] ?? "") : "",
                )
              }
            />
          }
          label={<Typography variant="caption">Sem valor</Typography>}
        />
      )}
    </Box>
  );
}
export function CrmActionField({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}) {
  const { client } = useCrmSession(),
    [rows, setRows] = useState<{ CODIGO: number; NOME: string }[]>([]),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void client
      .actions()
      .then((response) => {
        if (active) {
          setRows(response.data);
          setFailed(!response.supported);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [client]);
  const historical = value !== null && !rows.some((row) => String(row.CODIGO) === value);
  return (
    <TextField
      fullWidth
      select
      label="Ação do CRM"
      value={value ?? "__null"}
      disabled={disabled}
      helperText={
        failed
          ? "Não foi possível carregar as ações. O valor atual foi preservado."
          : "Define o tratamento aplicado à finalização."
      }
      onChange={(event) => onChange(event.target.value === "__null" ? null : event.target.value)}
    >
      <MenuItem value="__null">Sem ação</MenuItem>
      {historical && (
        <MenuItem value={value!} disabled>
          Código {value} (atual)
        </MenuItem>
      )}
      {rows.map((row) => (
        <MenuItem key={row.CODIGO} value={String(row.CODIGO)}>
          {row.NOME} ({row.CODIGO})
        </MenuItem>
      ))}
    </TextField>
  );
}
