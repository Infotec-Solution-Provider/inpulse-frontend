"use client";

import { useAuthContext } from "@/app/auth-context";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CrmDialog } from "@/lib/ui-system/crm-dialog";
import {
  FilterChipBar,
  MonitorEmptyState,
  type AppliedFilterChip,
} from "@/lib/ui-system/components";
import { useCrmQueryState } from "@/lib/ui-system/query-state";
import { useWhatsappContext } from "../../../whatsapp-context";
import { ScheduleFilterFields, type CampaignOption } from "./schedule-filters";
import { ScheduleItem } from "./schedule-item";
import {
  emptyScheduleFilters,
  initialScheduleQuery,
  periodOptions,
  scheduleQueryKey,
  customerBasicFields,
  validateScheduleFilters,
  type ScheduleFilters,
} from "./schedule-query";
import { useSchedulesQuery } from "./use-schedules-query";
import { CUSTOMER_FILTER_LABELS } from "@/lib/components/customer-basic-filters";
import { createEmptyCustomerBusinessFilters } from "@/lib/types/customer-business-filters";

export default function SchedulesModal({ onClose }: { onClose: () => void }) {
  const { instance, user } = useAuthContext();
  const environment = process.env.NEXT_PUBLIC_WHATSAPP_URL || "same-origin";
  const scope = `${environment}:${instance}:${user?.CODIGO ?? "anonymous"}`;
  return <SchedulesDialog key={scope} scope={scope} onClose={onClose} />;
}

function SchedulesDialog({ scope, onClose }: { scope: string; onClose: () => void }) {
  const { wppApi } = useWhatsappContext();
  const { token } = useAuthContext();
  const [query, setQuery] = useCrmQueryState(scheduleQueryKey(scope), initialScheduleQuery);
  const [draft, setDraft] = useState(query.filters);
  const [validation, setValidation] = useState<string | null>(null);
  const validationElement = useRef<HTMLDivElement>(null);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [capabilities, setCapabilities] = useState({
    channels: ["WHATSAPP", "TELEFONIA"],
    commercial: false,
  });
  const result = useSchedulesQuery({ client: wppApi, token, scope, query });
  const data = result.data;
  useEffect(() => {
    if (!data) return;
    if (data.capabilities) setCapabilities(data.capabilities);
    setCampaigns((known) => {
      const merged = new Map(known.map((option) => [option.id, option]));
      for (const option of data.filters.customerCampaigns) merged.set(option.id, option);
      return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    });
  }, [data]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const error = validateScheduleFilters(draft);
    setValidation(error);
    if (error) {
      requestAnimationFrame(() => validationElement.current?.scrollIntoView({ block: "nearest" }));
      return;
    }
    const next = { ...draft, search: draft.search.trim() };
    setDraft(next);
    const nextQuery = { ...query, filters: next, page: 1 };
    if (JSON.stringify(nextQuery) === JSON.stringify(query)) result.refetch();
    else setQuery(nextQuery);
  };
  const clearAll = () => {
    const next = emptyScheduleFilters();
    setDraft(next);
    setValidation(null);
    const nextQuery = { ...query, filters: next, page: 1 };
    if (JSON.stringify(nextQuery) === JSON.stringify(query)) result.refetch();
    else setQuery(nextQuery);
  };
  const removeChip = (clear: (filters: ScheduleFilters) => ScheduleFilters) => {
    setQuery((current) => ({ ...current, filters: clear(current.filters), page: 1 }));
    setDraft((current) => clear(current));
    setValidation(null);
  };
  const chips: AppliedFilterChip[] = [];
  const f = query.filters;
  const chip = (key: string, label: string, clear: (filters: ScheduleFilters) => ScheduleFilters) =>
    chips.push({ key, label, onDelete: () => removeChip(clear) });
  if (f.search) chip("search", `Busca: ${f.search}`, (next) => ({ ...next, search: "" }));
  if (f.period !== "all")
    chip(
      "period",
      f.period === "custom"
        ? `Período: ${f.dateFrom.split("-").reverse().join("/")} a ${f.dateTo.split("-").reverse().join("/")}`
        : periodOptions.find((option) => option.value === f.period)!.label,
      (next) => ({ ...next, period: "all", dateFrom: "", dateTo: "" }),
    );
  if (f.channels)
    chip("channels", f.channels === "WHATSAPP" ? "WhatsApp" : "Telefonia", (next) => ({
      ...next,
      channels: "",
    }));
  if (f.sortOrder !== "asc")
    chip("sortOrder", "Data decrescente", (next) => ({ ...next, sortOrder: "asc" }));
  for (const id of f.customerCampaignIds)
    chip(
      `campaign-${id}`,
      campaigns.find((option) => option.id === id)?.label || `Campanha #${id}`,
      (next) => ({
        ...next,
        customerCampaignIds: next.customerCampaignIds.filter((value) => value !== id),
      }),
    );
  for (const field of customerBasicFields) {
    if (f.customer[field])
      chip(
        `customer-${field}`,
        `${CUSTOMER_FILTER_LABELS[field]}: ${f.customer[field]}`,
        (next) => ({ ...next, customer: { ...next.customer, [field]: "" } }),
      );
  }
  for (const field of Object.keys(createEmptyCustomerBusinessFilters()) as Array<
    keyof ScheduleFilters["business"]
  >) {
    if (
      field === "campaignIds" ||
      (f.business.purchaseStatus === "without_purchases" &&
        ["purchaseFrom", "purchaseTo"].includes(field))
    )
      continue;
    const value = f.business[field];
    if (!value.length) continue;
    const label =
      field === "purchaseStatus"
        ? value === "with_purchases"
          ? "Com compras"
          : "Sem compras"
        : Array.isArray(value)
          ? value.map((item) => (field === "states" ? item : `#${item}`)).join(", ")
          : /(?:From|To)$/.test(field)
            ? value.split("-").reverse().join("/")
            : value;
    chip(
      `business-${field}`,
      `${field === "phone" ? "Telefone do cliente" : CUSTOMER_FILTER_LABELS[field]}: ${label}`,
      (next) => ({
        ...next,
        business: { ...next.business, [field]: Array.isArray(value) ? [] : "" },
      }),
    );
  }

  const hasFilters = chips.length > 0;
  const page = data?.pagination.current ?? query.page;
  const pages = data?.pagination.totalPages ?? Math.max(1, query.page);
  return (
    <CrmDialog
      open
      onClose={(_, reason) => {
        if (reason !== "backdropClick") onClose();
      }}
      fullWidth
      maxWidth="md"
      aria-labelledby="operator-schedules-title"
      aria-describedby="operator-schedules-description"
      slotProps={{
        paper: {
          sx: {
            m: 1.5,
            width: "calc(100% - 24px)",
            maxHeight: "calc(100dvh - 24px)",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <DialogTitle
        id="operator-schedules-header"
        sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id="operator-schedules-title" component="span" fontWeight={600}>
            Meus Agendamentos
          </Typography>
          <Typography
            id="operator-schedules-description"
            variant="caption"
            component="p"
            color="text.secondary"
            sx={{ m: 0 }}
          >
            Seus retornos pendentes · horário de Brasília
          </Typography>
        </Box>
        <IconButton
          aria-label="Atualizar agendamentos"
          onClick={result.refetch}
          disabled={result.loading}
        >
          <RefreshIcon />
        </IconButton>
        <IconButton aria-label="Fechar agendamentos" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 0, px: { xs: 1.5, sm: 3 }, py: 2 }}>
        <Box
          component="form"
          id="operator-schedules-filters"
          onSubmit={apply}
          aria-label="Filtros de agendamentos"
          sx={{ mb: 2 }}
        >
          <ScheduleFilterFields
            draft={draft}
            setDraft={setDraft}
            campaigns={campaigns}
            channels={capabilities.channels}
            commercial={capabilities.commercial}
          />
          {validation && (
            <Alert ref={validationElement} severity="error" sx={{ mt: 1 }}>
              {validation}
            </Alert>
          )}
        </Box>
        <FilterChipBar items={chips} maxVisible={chips.length} onShowAll={() => {}} />
        {result.error && (
          <Alert
            severity="error"
            sx={{ my: 1.5 }}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={result.refetch}
                disabled={result.loading}
              >
                Tentar novamente
              </Button>
            }
          >
            {data
              ? "Não foi possível atualizar. A lista abaixo é o último resultado desta mesma consulta. "
              : "Não foi possível carregar os agendamentos. "}
            {result.error}
          </Alert>
        )}
        {data?.warnings?.map((warning) => (
          <Alert key={warning.code} severity="warning" sx={{ my: 1 }}>
            {warning.message}
          </Alert>
        ))}
        <Box aria-busy={result.loading} aria-label="Resultados dos agendamentos" sx={{ mt: 1.5 }}>
          {result.loading && !data ? (
            <Box role="status" sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Carregando agendamentos…
              </Typography>
            </Box>
          ) : data?.data.length ? (
            <>
              <Typography variant="body2" color="text.secondary" role="status" sx={{ mb: 1 }}>
                {data.pagination.totalRows} agendamento(s) encontrado(s)
                {result.loading ? " · Atualizando…" : ""}
              </Typography>
              <Box component="ul" sx={{ display: "grid", gap: 1.25, p: 0, m: 0 }}>
                {data.data.map((schedule) => (
                  <ScheduleItem
                    key={schedule.id}
                    schedule={schedule}
                    referenceAt={data.referenceAt}
                  />
                ))}
              </Box>
            </>
          ) : !result.error && data ? (
            <MonitorEmptyState
              title={
                hasFilters ? "Nenhum resultado para estes filtros" : "Sem agendamentos pendentes"
              }
              description={
                hasFilters
                  ? "A busca considera toda a sua agenda. Ajuste os filtros ou limpe a consulta."
                  : "Os retornos atribuídos a você aparecerão aqui."
              }
              onReset={hasFilters ? clearAll : undefined}
              onRefresh={result.refetch}
              busy={result.loading}
            />
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          flexWrap: "wrap",
          gap: 1,
          justifyContent: "space-between",
          px: { xs: 1.5, sm: 3 },
          py: 1.5,
          "& > :not(style) ~ :not(style)": { ml: 0 },
        }}
      >
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button type="submit" form="operator-schedules-filters" variant="contained" size="small">
            Aplicar filtros
          </Button>
          <Button type="button" onClick={clearAll} size="small" color="inherit">
            Limpar tudo
          </Button>
        </Box>
        <TextField
          label="Itens por página"
          select
          size="small"
          value={query.perPage}
          onChange={(event) =>
            setQuery((current) => ({ ...current, perPage: Number(event.target.value), page: 1 }))
          }
          sx={{ minWidth: 130 }}
        >
          {[10, 25, 50].map((size) => (
            <MenuItem key={size} value={size}>
              {size}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {data ? `${data.pagination.totalRows} no total · ` : ""}Página {page} de {pages}
          </Typography>
          <Pagination
            page={page}
            count={pages}
            siblingCount={0}
            size="small"
            disabled={result.loading || !data}
            onChange={(_, nextPage) => setQuery((current) => ({ ...current, page: nextPage }))}
          />
        </Box>
      </DialogActions>
    </CrmDialog>
  );
}
