"use client";
import { useAuthContext } from "@/app/auth-context";
import CustomerSearchClient from "@/lib/sdk-local/customer-search.client";
import type { CustomerSearchOption, CustomerSearchOptionKind } from "@/lib/sdk-local/types/customer-search.types";
import { Alert, Autocomplete, Button, CircularProgress, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const baseUrl = process.env["NEXT_PUBLIC_CUSTOMERS_URL"] || "https://inpulse.infotecrs.inf.br";
interface Props { label: string; kind: CustomerSearchOptionKind; value: Array<string | number>; onChange: (ids: string[]) => void }
export default function CustomerSearchLookup({ label, kind, value, onChange }: Props) {
  const { token, instance, user } = useAuthContext();
  const scope = `${instance}:${user?.CODIGO}:${token}`;
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<CustomerSearchOption[]>([]);
  const [loadedScope, setLoadedScope] = useState(scope);
  const [page, setPage] = useState(1), [hasNext, setHasNext] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(false);
  const current = useRef(scope); current.current = scope;
  const labels = useRef(new Map<string, string | null>());
  useEffect(() => { labels.current.clear(); setSearch(""); setPage(1); setOptions([]); }, [scope, kind]);
  useEffect(() => { setPage(1); setOptions([]); }, [search]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const timer = setTimeout(async () => {
      const client = new CustomerSearchClient(baseUrl); client.setAuth(token);
      setLoading(true); setError(false);
      try {
        const result = await client.getSearchOptions(kind, search, page);
        if (!active || current.current !== scope) return;
        result.data.forEach(item => labels.current.set(item.id, item.label));
        setLoadedScope(scope);
        setOptions(previous => page === 1 ? result.data : [...previous, ...result.data.filter(item => !previous.some(existing => existing.id === item.id))]);
        setHasNext(result.page.hasNext);
      } catch { if (active && current.current === scope) { setError(true); setHasNext(false); } }
      finally { if (active && current.current === scope) setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [token, scope, kind, search, page]);
  const selected = value.map(id => ({ id: String(id), label: loadedScope === scope ? labels.current.get(String(id)) ?? null : null }));
  return <div>
    <Autocomplete multiple disableCloseOnSelect filterOptions={items => items} options={loadedScope === scope ? options : []} value={selected} loading={loading}
      isOptionEqualToValue={(option, item) => option.id === item.id}
      getOptionLabel={option => option.label?.trim() ? `${option.label} (#${option.id})` : `#${option.id}`}
      onChange={(_, values) => onChange(values.map(item => item.id))}
      onInputChange={(_, input, reason) => { if (reason === "input" || reason === "clear") setSearch(input); }}
      renderInput={params => <TextField {...params} size="small" label={label} placeholder="Buscar nome ou código" InputProps={{ ...params.InputProps, endAdornment: <>{loading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }} />} />
    {hasNext && <Button size="small" onClick={() => setPage(value => value + 1)} disabled={loading}>Carregar mais opções</Button>}
    {error && <Alert severity="warning" sx={{ mt: 1 }}>Não foi possível buscar {label.toLowerCase()}. Digite novamente para conferir.</Alert>}
  </div>;
}
