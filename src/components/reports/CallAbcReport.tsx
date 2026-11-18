"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import { ReportExecutionStatus, ReportFilterPanel, ReportPageShell } from "./ReportWorkflow";
import { ReportResultChart, ReportResultTable } from "./ReportResults";
import { SearchableEntityFilter } from "./SearchableEntityFilter";
import { REPORT_CATALOG } from "@/lib/reports/catalog";
import {
  callAbcApi,
  callAbcCampaignTypes,
  callAbcGroups,
  callAbcMetrics,
  defaultCallAbcFilters,
  validateCallAbcFilters,
  type CallAbcFilters,
  type CallAbcResult,
} from "@/lib/reports/call-abc";
import { downloadReportCsv } from "@/lib/reports/filters";
import { reportOperatorOptions } from "@/lib/reports/operator-options";
import { useReportExecution } from "@/lib/reports/use-report-execution";

const entry = REPORT_CATALOG.find((report) => report.id === "call-abc")!;
const metrics = Object.keys(callAbcMetrics) as CallAbcFilters["metric"][];
const formatDate = (value: string) => value.split("-").reverse().join("/");

function filterKey(filters: CallAbcFilters) {
  return JSON.stringify({
    ...filters,
    operator: filters.operator?.id,
    campaign: filters.campaign?.id,
    limit: Number(filters.limit),
    brands: filters.brands.map(({ id }) => id).sort((a, b) => a - b),
  });
}

function appliedLabels(filters: CallAbcFilters) {
  return [
    `${formatDate(filters.period.startDate)} a ${formatDate(filters.period.endDate)}`,
    filters.operator
      ? `Operador · ${filters.operator.label} #${filters.operator.id}`
      : "Todos os operadores",
    filters.campaign
      ? `Campanha · ${filters.campaign.label} #${filters.campaign.id}`
      : callAbcCampaignTypes[filters.campaignType] || "Todas as campanhas",
    callAbcGroups[filters.group],
    `Ordem: ${callAbcMetrics[filters.metric]}`,
    `Até ${Number(filters.limit).toLocaleString("pt-BR")} registros`,
    ...filters.brands.map((brand) => `Marca · ${brand.label} #${brand.id}`),
  ];
}

function CallAbcResults({
  filters,
  result,
  exportDisabled,
}: {
  filters: CallAbcFilters;
  result: CallAbcResult;
  exportDisabled: boolean;
}) {
  if (!result.rows.length)
    return <Alert severity="info">Nenhum registro encontrado para os filtros aplicados.</Alert>;

  const byCustomer = filters.group === "customer";
  const byCampaign = filters.group !== "campaignType";
  const columns = [
    { label: "Posição", numeric: true },
    ...(byCustomer ? [{ label: "Cliente" }, { label: "Código ERP" }, { label: "Segmento" }] : []),
    ...(byCampaign ? [{ label: "Campanha" }] : []),
    { label: "Tipo de campanha" },
    ...metrics.map((key) => ({ label: callAbcMetrics[key], numeric: true })),
  ];
  const ranked = result.rows.map((row, index) => {
    const type = callAbcCampaignTypes[row.campaignType ?? ""] ?? row.campaignType;
    const customer = row.customer || (row.customerId ? `#${row.customerId}` : null);
    const campaign = row.campaign || (row.campaignId ? `#${row.campaignId}` : null);
    const cells = [
      index + 1,
      ...(byCustomer ? [customer, row.erp, row.segment] : []),
      ...(byCampaign ? [campaign] : []),
      type,
      ...metrics.map((key) => row[key]),
    ];
    return {
      key: index + 1,
      label: [`#${index + 1}`, customer, campaign || type].filter(Boolean).join(" · "),
      selectedCount: row[filters.metric],
      cells,
      search: [...cells, row.customerId, row.campaignId].join(" "),
    };
  });
  return (
    <>
      <section
        aria-label="Totais dos registros exibidos"
        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5"
      >
        <h2 className="font-semibold">Totais dos registros exibidos</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((key) => (
            <div key={key}>
              <dt className="text-sm text-slate-600 dark:text-slate-400">{callAbcMetrics[key]}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {result.totals[key].toLocaleString("pt-BR")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Uma ligação recebida pode contar em mais de um grupo quando o cliente participa de várias
          campanhas.
        </p>
      </section>
      <ReportResultChart
        title="Ranking de ligações"
        metric={callAbcMetrics[filters.metric]}
        points={ranked.slice(0, 20).map((row) => ({ label: row.label, total: row.selectedCount }))}
        note="O gráfico mostra até 20 posições. A tabela inclui todos os registros retornados."
        hideXAxis
      />
      <ReportResultTable
        columns={columns}
        rows={ranked}
        searchHint="Cliente, campanha ou código"
        exportDisabled={exportDisabled}
        onExport={() =>
          downloadReportCsv(
            `curva-abc-ligacoes_${filters.period.startDate}_${filters.period.endDate}.csv`,
            columns.map((column) => column.label),
            ranked.map((row) => row.cells),
          )
        }
      />
    </>
  );
}

export function CallAbcReport({
  instance,
  token,
  scope,
}: {
  instance: string;
  token: string;
  scope: string;
}) {
  const [draft, setDraft] = useState(defaultCallAbcFilters);
  const [brandsEnabled, setBrandsEnabled] = useState(false);
  const [brandLookupError, setBrandLookupError] = useState(false);
  const [brandLookupRetry, setBrandLookupRetry] = useState(0);
  const api = useMemo(() => callAbcApi(instance, token), [instance, token]);
  const operators = useMemo(() => reportOperatorOptions(token), [token]);
  const campaigns = useMemo(() => api.options("campaign"), [api]);
  const brands = useMemo(() => api.options("brand"), [api]);

  useEffect(() => {
    const controller = new AbortController();
    setBrandLookupError(false);
    void api
      .brandsEnabled(controller.signal)
      .then((enabled) => {
        if (!controller.signal.aborted) setBrandsEnabled(enabled);
      })
      .catch(() => {
        if (!controller.signal.aborted) setBrandLookupError(true);
      });
    return () => controller.abort();
  }, [api, brandLookupRetry]);

  const { applied, result, loading, error, generatedAt, generate } = useReportExecution({
    scope,
    execute: api.execute,
    validate: validateCallAbcFilters,
  });
  const dirty = Boolean(applied && filterKey(applied) !== filterKey(draft));

  return (
    <ReportPageShell
      instance={instance}
      category="Atendimento e WhatsApp"
      title={entry.title}
      description={entry.description}
    >
      <ReportFilterPanel
        period={draft.period}
        onPeriodChange={(period) => setDraft((current) => ({ ...current, period }))}
        onGenerate={() => void generate(draft)}
        onClear={() => setDraft(defaultCallAbcFilters())}
        onRestore={applied ? () => setDraft(applied) : undefined}
        dirty={dirty}
        loading={loading}
      >
        <SearchableEntityFilter
          label="Operador"
          scope={scope}
          loadOptions={operators}
          value={draft.operator}
          onChange={(operator) => setDraft((current) => ({ ...current, operator }))}
        />
        <SearchableEntityFilter
          label="Campanha"
          scope={scope}
          loadOptions={campaigns}
          value={draft.campaign}
          moreLabel="Carregar mais campanhas"
          emptyLabel="Nenhuma campanha encontrada"
          onChange={(campaign) =>
            setDraft((current) => ({
              ...current,
              campaign,
              campaignType: campaign ? "" : current.campaignType,
            }))
          }
        />
        <TextField
          select
          size="small"
          label="Tipo de campanha"
          value={draft.campaignType}
          onChange={(event) => {
            const campaignType = event.target.value;
            setDraft((current) => ({
              ...current,
              campaignType,
              campaign: campaignType ? null : current.campaign,
            }));
          }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(callAbcCampaignTypes).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Agrupar por"
          value={draft.group}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              group: event.target.value as CallAbcFilters["group"],
            }))
          }
        >
          {Object.entries(callAbcGroups).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Ordenar por"
          value={draft.metric}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              metric: event.target.value as CallAbcFilters["metric"],
            }))
          }
        >
          {metrics.map((key) => (
            <MenuItem key={key} value={key}>
              {callAbcMetrics[key]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="number"
          label="Limite de registros"
          value={draft.limit}
          inputProps={{ min: 1, max: 1000, step: 1 }}
          required
          onChange={(event) => setDraft((current) => ({ ...current, limit: event.target.value }))}
        />
        {brandsEnabled && (
          <SearchableEntityFilter
            multiple
            label="Marcas"
            scope={scope}
            loadOptions={brands}
            value={draft.brands}
            moreLabel="Carregar mais marcas"
            emptyLabel="Nenhuma marca encontrada"
            onChange={(brands) => setDraft((current) => ({ ...current, brands }))}
          />
        )}
        {brandLookupError && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setBrandLookupRetry((retry) => retry + 1)}
              >
                Tentar novamente
              </Button>
            }
          >
            Não foi possível verificar o filtro de marcas.
          </Alert>
        )}
      </ReportFilterPanel>
      <ReportExecutionStatus
        loading={loading}
        error={error}
        generatedAt={generatedAt}
        hasResult={result !== null}
        labels={applied ? appliedLabels(applied) : []}
      />
      {result && applied && (
        <CallAbcResults
          filters={applied}
          result={result}
          exportDisabled={dirty || loading || Boolean(error)}
        />
      )}
    </ReportPageShell>
  );
}
