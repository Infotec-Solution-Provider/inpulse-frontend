"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
} from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import {
  audienceContactSelected,
  audienceSelectionCounts,
  buildAudienceDefinition,
  contactIsEligible,
  emptyAudienceFilters,
  emptyAudienceSelection,
  normalizeAudienceFilters,
  reconcileAudienceIds,
  reconcileAudiencePage,
  selectAudiencePage,
  toggleAudienceContact,
  type AudienceFilters,
  type MassAudienceValue,
} from "@/lib/mass-audience";
import MassAudienceClient, {
  type AudienceSearchResponse,
} from "@/lib/services/mass-audience.client";
import { CUSTOMER_FILTER_LABELS } from "./customer-basic-filters";
import MassAudienceFilters from "./mass-audience-filters";

const CONTACT_LABELS: Record<string, string> = {
  id: "Código do contato",
  ids: "Contatos",
  name: "Nome do contato",
  phone: "Telefone do contato",
  hasCustomer: "Vínculo com cliente",
  sectorIds: "Setores",
};
const VALUE_LABELS: Record<string, string> = {
  with_purchases: "Com compras",
  without_purchases: "Sem compras",
  SIM: "Ativos",
  NAO: "Inativos",
  FIS: "Física",
  JUR: "Jurídica",
};
const EMPTY_SUMMARY = { total: 0, eligible: 0, blocked: 0, skipped: 0 };

export default function MassAudienceSelector({
  sectors,
  onChange,
  disabled = false,
}: {
  sectors: Array<{ id: number; name: string }>;
  onChange: (value: MassAudienceValue) => void;
  disabled?: boolean;
}) {
  const { token } = useAuthContext();
  const client = useRef(new MassAudienceClient());
  const [filters, setFilters] = useState(emptyAudienceFilters);
  const [selection, setSelection] = useState(emptyAudienceSelection);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const [page, setPage] = useState(0),
    [perPage, setPerPage] = useState(8);
  const [name, setName] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectionReset, setSelectionReset] = useState(false);
  const [result, setResult] = useState<AudienceSearchResponse | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [refresh, setRefresh] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    if (!token) {
      setResult(null);
      setError(true);
      setLoading(false);
      return;
    }
    client.current
      .search(token, filters, page + 1, perPage, controller.signal)
      .then(async (response) => {
        if (request !== sequence.current) return;
        const lastPage = Math.max(0, response.pagination.totalPages - 1);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        const pending = selectionRef.current;
        const selectedIds = Object.keys(
          pending.mode === "ALL_FILTERED" ? pending.excluded : pending.included,
        ).map(Number);
        const checks: Array<{ ids: number[]; contacts: AudienceSearchResponse["data"] }> = [];
        for (let index = 0; index < selectedIds.length; index += 100) {
          const ids = selectedIds.slice(index, index + 100);
          const checked = await client.current.search(
            token,
            pending.mode === "ALL_FILTERED"
              ? { ...filters, contactFilters: { ...filters.contactFilters, ids } }
              : { contactFilters: { ids }, customerFilters: {} },
            1,
            100,
            controller.signal,
          );
          if (request !== sequence.current) return;
          checks.push({ ids, contacts: checked.data });
        }
        if (request !== sequence.current) return;
        setResult(response);
        setSelection((current) =>
          checks.reduce(
            (next, check) => reconcileAudienceIds(next, check.ids, check.contacts),
            reconcileAudiencePage(current, response.data),
          ),
        );
      })
      .catch(() => {
        if (request === sequence.current && !controller.signal.aborted) {
          setError(true);
          setResult(null);
        }
      })
      .finally(() => {
        if (request === sequence.current && !controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      sequence.current++;
    };
  }, [token, filters, page, perPage, refresh]);

  const summary = result?.summary ?? EMPTY_SUMMARY;
  const counts = useMemo(() => audienceSelectionCounts(selection, summary), [selection, summary]);
  useEffect(
    () =>
      onChange({
        definition: buildAudienceDefinition(filters, selection),
        ...counts,
        canCreate: Boolean(result) && !loading && !error && !disabled && counts.eligible > 0,
      }),
    [filters, selection, counts, loading, error, result, disabled, onChange],
  );

  const apply = (raw: AudienceFilters) => {
    const next = normalizeAudienceFilters(raw);
    setFiltersOpen(false);
    setName(next.contactFilters.name ?? "");
    if (JSON.stringify(next) === JSON.stringify(filters)) return;
    setResult(null);
    setLoading(true);
    setError(false);
    setPage(0);
    if (selection.mode === "ALL_FILTERED") {
      setSelection(emptyAudienceSelection());
      setSelectionReset(true);
    }
    setFilters(next);
  };
  const contacts = result?.data ?? [];
  const pageEligible = contacts.filter(contactIsEligible);
  const selectedOnPage = pageEligible.filter((contact) =>
    audienceContactSelected(selection, contact.id),
  ).length;
  const locked = disabled || loading || error;
  const chips = (["contactFilters", "customerFilters"] as const).flatMap((group) =>
    Object.entries(filters[group]).map(([key, value]) => {
      const label =
        group === "contactFilters"
          ? (CONTACT_LABELS[key] ?? key)
          : (CUSTOMER_FILTER_LABELS[key] ?? key);
      const text =
        key === "hasCustomer"
          ? value
            ? "Com cliente"
            : "Sem cliente"
          : key === "sectorIds" && Array.isArray(value)
            ? value
                .map((id) => sectors.find((sector) => sector.id === id)?.name ?? `#${id}`)
                .join(", ")
            : (VALUE_LABELS[String(value)] ?? String(value));
      return { group, key, label: `${label}: ${text}` };
    }),
  );
  return (
    <section
      aria-label="Público do disparo"
      className="min-w-0 rounded-2xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-3"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--ip-text)]">Público do disparo</h2>
        <div role="status" aria-live="polite" className="flex flex-wrap gap-2">
          <Chip
            size="small"
            label={
              loading
                ? "Validando público…"
                : error
                  ? "Público indisponível"
                  : `${counts.selected} selecionados`
            }
            color={counts.selected ? "primary" : "default"}
          />
          {!loading && !error && (
            <Chip
              size="small"
              label={`${counts.eligible} elegíveis selecionados`}
              variant="outlined"
            />
          )}
        </div>
      </div>
      <form
        className="mb-3 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          apply({
            ...filters,
            contactFilters: { ...filters.contactFilters, name: name.trim() || undefined },
          });
        }}
      >
        <TextField
          size="small"
          label="Buscar contato por nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={disabled}
          sx={{ flex: "1 1 190px", minWidth: 0 }}
        />
        <Button type="submit" disabled={disabled}>
          Buscar
        </Button>
        <Button variant="outlined" disabled={disabled} onClick={() => setFiltersOpen(true)}>
          Filtros do público{chips.length ? ` (${chips.length})` : ""}
        </Button>
        <Button disabled={disabled || loading} onClick={() => setRefresh((value) => value + 1)}>
          Atualizar público
        </Button>
      </form>
      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Filtros do público aplicados">
          {chips.map((chip) => (
            <Chip
              key={`${chip.group}:${chip.key}`}
              size="small"
              label={chip.label}
              disabled={disabled}
              onDelete={() => {
                const next = structuredClone(filters);
                delete (next[chip.group] as Record<string, unknown>)[chip.key];
                apply(next);
              }}
            />
          ))}
          <Button size="small" disabled={disabled} onClick={() => apply(emptyAudienceFilters())}>
            Limpar filtros do público
          </Button>
        </div>
      )}
      {filtersOpen && (
        <MassAudienceFilters
          filters={filters}
          sectors={sectors}
          onApply={apply}
          onClose={() => setFiltersOpen(false)}
        />
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Não foi possível consultar o público. Atualize o público antes de criar o disparo.
        </Alert>
      )}
      {selectionReset && (
        <Alert severity="info" onClose={() => setSelectionReset(false)} sx={{ mb: 2 }}>
          Os filtros mudaram. A seleção de todos os resultados foi desativada; selecione o público
          novamente.
        </Alert>
      )}
      {!loading && !error && result && (
        <p className="mb-3 text-xs text-[var(--ip-muted)]" data-testid="audience-summary">
          {summary.total} resultados · {summary.eligible} elegíveis · {summary.blocked} bloqueados ·{" "}
          {summary.skipped} sem telefone ou indisponíveis
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          size="small"
          disabled={locked || summary.eligible === 0}
          onClick={() => setSelection({ ...emptyAudienceSelection(), mode: "ALL_FILTERED" })}
        >
          Selecionar todos os {summary.total} resultados
        </Button>
        <Button
          size="small"
          disabled={disabled || counts.selected === 0}
          onClick={() => setSelection(emptyAudienceSelection())}
        >
          Limpar seleção
        </Button>
        {selection.mode === "ALL_FILTERED" && (
          <Chip
            size="small"
            label={`Todos os resultados · ${Object.keys(selection.excluded).length} exclusões`}
          />
        )}
      </div>
      <TableContainer
        className="ip-crud-table scrollbar-whatsapp overflow-auto"
        sx={{ maxHeight: { xs: "none", lg: 420 } }}
      >
        <Table stickyHeader size="small" aria-label="Contatos do público">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  inputProps={{ "aria-label": "Selecionar página de contatos elegíveis" }}
                  disabled={locked || !pageEligible.length}
                  checked={pageEligible.length > 0 && selectedOnPage === pageEligible.length}
                  indeterminate={selectedOnPage > 0 && selectedOnPage < pageEligible.length}
                  onChange={(_, checked) =>
                    setSelection((current) => selectAudiencePage(current, contacts, checked))
                  }
                />
              </TableCell>
              <TableCell>Contato</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Cliente / campanha</TableCell>
              <TableCell>Setores</TableCell>
              <TableCell>Situação</TableCell>
              <TableCell>Janela</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} aria-label="Carregando público" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7}>Consulta indisponível</TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => {
                const eligible = contactIsEligible(contact),
                  checked = audienceContactSelected(selection, contact.id);
                return (
                  <TableRow key={contact.id} hover>
                    <TableCell data-label="Selecionar" padding="checkbox">
                      <Checkbox
                        inputProps={{ "aria-label": `Selecionar ${contact.name}` }}
                        checked={checked}
                        disabled={
                          disabled || (selection.mode === "MANUAL" && !eligible && !checked)
                        }
                        onChange={() =>
                          setSelection((current) =>
                            toggleAudienceContact(current, contact.id, eligible),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell data-label="Contato">
                      <div className="min-w-0">
                        <span className="block">{contact.name}</span>
                        <span className="block text-xs text-[var(--ip-muted)]">#{contact.id}</span>
                      </div>
                    </TableCell>
                    <TableCell data-label="Telefone">{contact.phone || "Sem telefone"}</TableCell>
                    <TableCell data-label="Cliente / campanha">
                      <div className="min-w-0">
                        <span className="block">{contact.customer?.RAZAO || "Sem cliente"}</span>
                        <span className="block text-xs text-[var(--ip-muted)]">
                          {(contact.customer as unknown as { CAMPANHA_NOME?: string } | null)
                            ?.CAMPANHA_NOME ||
                            (contact.customer?.COD_CAMPANHA
                              ? `Campanha #${contact.customer.COD_CAMPANHA}`
                              : "Sem campanha")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell data-label="Setores">
                      {(contact.sectorIds ?? [])
                        .map((id) => sectors.find((sector) => sector.id === id)?.name ?? `#${id}`)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell data-label="Situação">
                      <Chip
                        size="small"
                        label={
                          contact.isBlocked ? "Bloqueado" : eligible ? "Elegível" : "Sem telefone"
                        }
                        color={contact.isBlocked ? "warning" : eligible ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell data-label="Janela">
                      {contact.conversationExpiration
                        ? `Até ${dayjs(contact.conversationExpiration).format("DD/MM HH:mm")}`
                        : "Sem janela ativa"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={summary.total}
        page={page}
        rowsPerPage={perPage}
        rowsPerPageOptions={[8, 16, 32]}
        labelRowsPerPage="Por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        onPageChange={(_, next) => {
          setLoading(true);
          setPage(next);
        }}
        onRowsPerPageChange={(event) => {
          setLoading(true);
          setPage(0);
          setPerPage(Number(event.target.value));
        }}
        slotProps={{
          actions: {
            nextButton: { disabled: locked || !result?.pagination.hasNext },
            previousButton: { disabled: locked || page === 0 },
          },
          select: { disabled: disabled || loading },
        }}
        sx={{
          overflowX: "auto",
          ".MuiTablePagination-toolbar": { flexWrap: "wrap", px: 0 },
          ".MuiTablePagination-spacer": { display: "none" },
        }}
      />
      {!loading && !error && summary.total > 0 && summary.eligible === 0 && (
        <Alert severity="info">Nenhum contato elegível para este público. Ajuste os filtros.</Alert>
      )}
      <p className="mt-2 text-xs text-[var(--ip-muted)]">
        A seleção manual é preservada entre páginas e buscas. Novos filtros desativam a seleção de
        todos os resultados. O público é fixado ao criar o disparo.
      </p>
    </section>
  );
}
