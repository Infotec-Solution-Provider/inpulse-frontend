"use client";

import { executeDashboard } from "@/lib/reports/api";
import {
  defaultReportPeriod,
  validateReportPeriod,
  type ReportPeriod,
} from "@/lib/reports/filters";
import { useReportForm } from "@/lib/reports/use-report-form";

export function useDashboardExecution(scope: string, id: string, metricIds: string[]) {
  return useReportForm({
    scope,
    defaults: defaultReportPeriod,
    validate: validateReportPeriod,
    execute: async (period: ReportPeriod, signal) => {
      const dateRange = {
        start: period.startDate + " 00:00:00",
        end: period.endDate + " 23:59:59",
      };
      const filters = Object.fromEntries(metricIds.map((metricId) => [metricId, { dateRange }]));
      const results = await executeDashboard(id, filters, signal);
      return Object.fromEntries(results.map((result) => [result.metricId, result]));
    },
  });
}
