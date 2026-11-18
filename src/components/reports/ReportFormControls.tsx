"use client";

import type { ReactNode } from "react";
import { ReportExecutionStatus, ReportFilterPanel } from "./ReportWorkflow";
import type { ReportPeriod } from "@/lib/reports/filters";

interface ReportFormControlsState {
  submit: () => Promise<void>;
  clear: () => void;
  restore?: () => void;
  dirty: boolean;
  loading: boolean;
}

export function ReportFormControls({
  form,
  period,
  setPeriod,
  children,
  submitLabel,
  disabled,
  pendingLabel,
}: {
  form: ReportFormControlsState;
  period?: ReportPeriod;
  setPeriod?: (period: ReportPeriod) => void;
  children?: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <ReportFilterPanel
      period={period}
      onPeriodChange={setPeriod}
      onGenerate={() => void form.submit()}
      onClear={form.clear}
      onRestore={form.restore}
      dirty={form.dirty}
      loading={form.loading}
      submitLabel={submitLabel}
      pendingLabel={pendingLabel}
      disabled={disabled}
    >
      {children}
    </ReportFilterPanel>
  );
}

export function ReportQueryStatus({
  query,
  labels,
}: {
  query: { result: unknown; loading: boolean; error: string | null; generatedAt: string | null };
  labels: string[];
}) {
  return (
    <ReportExecutionStatus
      hasResult={query.result !== null}
      loading={query.loading}
      error={query.error}
      generatedAt={query.generatedAt}
      labels={labels}
    />
  );
}
