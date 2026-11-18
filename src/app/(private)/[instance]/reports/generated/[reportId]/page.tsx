"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { Download, Save, Copy } from "lucide-react";
import { toast } from "react-toastify";
import { GeneratedReportRenderer } from "@/components/reports/GeneratedReportRenderer";
import { ReportFormControls, ReportQueryStatus } from "@/components/reports/ReportFormControls";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import {
  copyGeneratedReport,
  executeGeneratedReport,
  exportGeneratedReport,
  getGeneratedReport,
  saveGeneratedReport,
  updateGeneratedReportLayout,
} from "@/lib/reports/api";
import { reportPeriodLabel, validateReportPeriod } from "@/lib/reports/filters";
import { useReportForm } from "@/lib/reports/use-report-form";
import type { GeneratedReportArtifact, GeneratedReportFilter } from "@/types/generated-reports";

type Values = Record<string, unknown>;
type Option = NonNullable<GeneratedReportFilter["options"]>[number];

function dateRange(value: unknown) {
  const range =
    value && typeof value === "object" ? (value as { start?: string; end?: string }) : {};
  return { startDate: range.start ?? "", endDate: range.end ?? "" };
}

function validateFilters(fields: GeneratedReportFilter[], filters: Values) {
  for (const field of fields) {
    const value = filters[field.id];
    if (field.type === "date_range") {
      const period = dateRange(value);
      const error =
        field.required || period.startDate || period.endDate ? validateReportPeriod(period) : null;
      if (error) return field.label + " — " + error;
    } else if (
      field.required &&
      (value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0))
    ) {
      return "Preencha o filtro " + field.label + ".";
    }
  }
  return null;
}

function filterLabels(fields: GeneratedReportFilter[], values: Values | null) {
  if (!values) return [];
  return fields.flatMap((field) => {
    const value = values[field.id];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    )
      return [];
    if (field.type === "date_range") {
      const period = dateRange(value);
      return validateReportPeriod(period) ? [] : [field.label + ": " + reportPeriodLabel(period)];
    }
    const selected = Array.isArray(value) ? value : [value];
    return [
      field.label +
        ": " +
        selected
          .map(
            (item) =>
              field.options?.find((option) => option.value === item)?.label ??
              (typeof item === "boolean" ? (item ? "Sim" : "Não") : String(item)),
          )
          .join(", "),
    ];
  });
}

function FilterField({
  filter,
  value,
  onChange,
}: {
  filter: GeneratedReportFilter;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (filter.type === "date_range") {
    const period = dateRange(value);
    return (
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <TextField
          size="small"
          label={filter.label + " · início"}
          type="date"
          value={period.startDate}
          onChange={(event) => onChange({ start: event.target.value, end: period.endDate })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label={filter.label + " · fim"}
          type="date"
          value={period.endDate}
          onChange={(event) => onChange({ start: period.startDate, end: event.target.value })}
          InputLabelProps={{ shrink: true }}
        />
      </div>
    );
  }
  if (filter.type === "boolean")
    return (
      <FormControlLabel
        control={
          <Checkbox checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        }
        label={filter.label}
      />
    );
  if (filter.options?.length) {
    const fields = {
      size: "small" as const,
      options: filter.options,
      getOptionLabel: (option: Option) => option.label,
    };
    const multiple = ["multiselect", "operator", "sector"].includes(filter.type);
    return multiple ? (
      <Autocomplete
        {...fields}
        multiple
        filterSelectedOptions
        value={filter.options.filter(
          (option) => Array.isArray(value) && value.includes(option.value),
        )}
        onChange={(_, selected) => onChange(selected.map((option) => option.value))}
        renderInput={(params) => <TextField {...params} label={filter.label} />}
      />
    ) : (
      <Autocomplete
        {...fields}
        value={filter.options.find((option) => option.value === value) ?? null}
        onChange={(_, selected) => onChange(selected?.value ?? null)}
        renderInput={(params) => <TextField {...params} label={filter.label} />}
      />
    );
  }
  const numeric = ["number", "operator", "sector", "customer", "chat"].includes(filter.type);
  return (
    <TextField
      size="small"
      label={filter.label}
      type={numeric ? "number" : "text"}
      value={value ?? ""}
      onChange={(event) =>
        onChange(numeric && event.target.value ? Number(event.target.value) : event.target.value)
      }
    />
  );
}

export default function GeneratedReportPage() {
  const { instance, reportId } = useParams<{ instance: string; reportId: string }>();
  return <GeneratedReportLoader key={reportId} instance={instance} reportId={reportId} />;
}

function GeneratedReportLoader({ instance, reportId }: { instance: string; reportId: string }) {
  const [artifact, setArtifact] = useState<GeneratedReportArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void getGeneratedReport(reportId, controller.signal)
      .then((report) => {
        if (!controller.signal.aborted) setArtifact(report);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Falha ao carregar relatório.");
      });
    return () => controller.abort();
  }, [reportId]);

  return artifact ? (
    <GeneratedReportContent instance={instance} initialArtifact={artifact} />
  ) : (
    <ReportPageShell instance={instance} category="Personalizados" title="Relatório personalizado">
      <Alert severity={error ? "error" : "info"}>{error ?? "Carregando relatório…"}</Alert>
    </ReportPageShell>
  );
}

function GeneratedReportContent({
  instance,
  initialArtifact,
}: {
  instance: string;
  initialArtifact: GeneratedReportArtifact;
}) {
  const router = useRouter();
  const [artifact, setArtifact] = useState(initialArtifact);
  const [blocks, setBlocks] = useState(artifact.blocks);
  const [working, setWorking] = useState(false);
  const layoutChanged = JSON.stringify(blocks) !== JSON.stringify(artifact.blocks);
  const { id } = artifact;
  const form = useReportForm({
    scope: instance + ":" + id,
    defaults: (): Values =>
      Object.fromEntries(
        artifact.filters
          .filter((filter) => filter.defaultValue !== undefined)
          .map((filter) => [filter.id, filter.defaultValue]),
      ),
    validate: (values) => validateFilters(artifact.filters, values),
    execute: (values, signal) => executeGeneratedReport(id, values, signal),
  });

  async function save() {
    setWorking(true);
    try {
      let report = artifact;
      if (report.status === "DRAFT") {
        report = await saveGeneratedReport(id);
        setArtifact(report);
      }
      if (layoutChanged) report = await updateGeneratedReportLayout(id, blocks);
      setArtifact(report);
      setBlocks(report.blocks);
      toast.success("Relatório salvo.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Falha ao salvar relatório.");
    } finally {
      setWorking(false);
    }
  }

  async function copy() {
    setWorking(true);
    try {
      const result = await copyGeneratedReport(id);
      router.push("/" + instance + "/reports/generated/" + result.id);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Falha ao copiar relatório.");
    } finally {
      setWorking(false);
    }
  }

  async function download(format: "pdf" | "csv" | "png", datasetId?: string, blockId?: string) {
    if (!form.applied || form.locked) return;
    try {
      await exportGeneratedReport(id, { format, filters: form.applied, datasetId, blockId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar relatório.");
    }
  }

  return (
    <ReportPageShell
      instance={instance}
      category="Personalizados"
      title={artifact.title}
      description={artifact.description}
      actions={
        <>
          <Chip
            size="small"
            color={artifact.status === "SAVED" ? "success" : "default"}
            label={artifact.status === "SAVED" ? "Salvo" : "Rascunho privado"}
          />
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            disabled={form.locked}
            onClick={() => void download("pdf")}
          >
            Exportar PDF
          </Button>
          <Button startIcon={<Copy size={16} />} disabled={working} onClick={() => void copy()}>
            Salvar cópia
          </Button>
          <Button
            startIcon={<Save size={16} />}
            disabled={working || (artifact.status === "SAVED" && !layoutChanged)}
            onClick={() => void save()}
          >
            {artifact.status === "DRAFT" ? "Salvar relatório" : "Salvar alterações"}
          </Button>
        </>
      }
    >
      <ReportFormControls form={form}>
        {artifact.filters.length > 0
          ? artifact.filters.map((filter) => (
              <FilterField
                key={filter.id}
                filter={filter}
                value={form.draft[filter.id]}
                onChange={(value) =>
                  form.setDraft((current) => {
                    if (value !== null && value !== "") return { ...current, [filter.id]: value };
                    const next = { ...current };
                    delete next[filter.id];
                    return next;
                  })
                }
              />
            ))
          : null}
      </ReportFormControls>
      <ReportQueryStatus query={form} labels={filterLabels(artifact.filters, form.applied)} />
      {form.result && (
        <>
          {artifact.summary && (
            <Card variant="outlined">
              <CardContent>
                <h2 className="mb-2 font-semibold">Resumo executivo</h2>
                <p>{artifact.summary}</p>
              </CardContent>
            </Card>
          )}
          <GeneratedReportRenderer
            execution={form.result}
            blocks={blocks}
            editable
            onBlocksChange={setBlocks}
            exportDisabled={form.locked}
            onExportPng={(block) => download("png", undefined, block.id)}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {(["Achados", "Limitações", "Fontes"] as const).map((label, index) => {
              const list = [artifact.findings, artifact.limitations, artifact.sources][index];
              return list.length ? (
                <Card key={label} variant="outlined">
                  <CardContent>
                    <h2 className="font-semibold">{label}</h2>
                    <ul className="list-disc pl-5">
                      {list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null;
            })}
          </div>
          {artifact.datasets.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <h2 className="mb-3 font-semibold">Exportar dados</h2>
                <div className="flex flex-wrap gap-2">
                  {artifact.datasets.map((dataset) => (
                    <Button
                      key={dataset.id}
                      size="small"
                      variant="outlined"
                      disabled={form.locked}
                      onClick={() => void download("csv", dataset.id)}
                    >
                      {dataset.label} · CSV
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </ReportPageShell>
  );
}
