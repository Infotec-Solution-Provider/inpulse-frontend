'use client';

import { useCallback, useState } from 'react';
import { executeDashboard } from '@/lib/reports/api';
import { QueryResult } from '@/types/reports';

export interface MetricResult {
  metricId: string;
  status: 'pending' | 'done' | 'failed';
  data?: QueryResult;
  error?: string;
}

export function useDashboardExecution(dashboardId: string) {
  const [results, setResults] = useState<Record<string, MetricResult>>({});
  const [running, setRunning] = useState(false);

  const execute = useCallback(
    async (filters: Record<string, Record<string, unknown>> = {}) => {
      setRunning(true);
      setResults({});

      try {
        const response = await executeDashboard(dashboardId, filters);
        const items = response.data ?? [];

        const next: Record<string, MetricResult> = {};
        for (const item of items) {
          next[item.metricId] = {
            metricId: item.metricId,
            status: item.status === 'completed' ? 'done' : 'failed',
            data: item.status === 'completed' ? (item as any).data : undefined,
            error: item.status === 'failed' ? (item as any).error : undefined,
          };
        }
        setResults(next);
      } catch (err) {
        console.error(err);
      } finally {
        setRunning(false);
      }
    },
    [dashboardId]
  );

  return { results, running, execute };
}

