import axios from 'axios';
import { Dashboard, Metric, TableMeta, ReportJob } from '@/types/reports';

const BASE_URL = process.env.NEXT_PUBLIC_REPORTS_API_URL ?? 'http://localhost:8006';

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = axios.defaults.headers['authorization'] as string | undefined;

  const res = await fetch(`${BASE_URL}/api/reports${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? err.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export const getTables = () => fetchApi<TableMeta[]>('/metric-tables');

export const getMetrics = () => fetchApi<Metric[]>('/metrics');

export const createMetric = (
  data: Omit<Metric, 'id' | 'instance' | 'createdBy' | 'isActive' | 'createdAt'>
) => fetchApi<Metric>('/metrics', { method: 'POST', body: JSON.stringify(data) });

export const deleteMetric = (id: string) =>
  fetchApi<void>(`/metrics/${id}`, { method: 'DELETE' });

export const getDashboards = () => fetchApi<Dashboard[]>('/dashboards');

export const getDashboard = (id: string) => fetchApi<Dashboard>(`/dashboards/${id}`);

export const createDashboard = (data: { name: string; description?: string }) =>
  fetchApi<Dashboard>('/dashboards', { method: 'POST', body: JSON.stringify(data) });

export const addDashboardItem = (dashboardId: string, metricId: string, position?: number) =>
  fetchApi<void>(`/dashboards/${dashboardId}/items`, {
    method: 'POST',
    body: JSON.stringify({ metricId, position }),
  });

export const removeDashboardItem = (dashboardId: string, itemId: string) =>
  fetchApi<void>(`/dashboards/${dashboardId}/items/${itemId}`, { method: 'DELETE' });

export const executeDashboard = (
  dashboardId: string,
  filters: Record<string, Record<string, unknown>>
) =>
  fetchApi<{ data: ReportJob[] }>(`/dashboards/${dashboardId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ filters }),
  });
