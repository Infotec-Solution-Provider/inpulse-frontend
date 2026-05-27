export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct';
export type VisualizationType = 'table' | 'bar' | 'line' | 'pie' | 'card';

export interface ColumnMeta {
  name: string;
  numeric: boolean;
}

export interface TableMeta {
  name: string;
  label: string;
  dateColumn: string;
  requiresDateFilter: boolean;
  columns: ColumnMeta[];
  allowedFilters: string[];
}

export interface Metric {
  id: string;
  instance: string;
  name: string;
  description?: string;
  tableName: string;
  column: string;
  aggregation: AggregationType;
  groupBy?: string;
  filters?: Record<string, { op: string; value: unknown }>;
  visualizationType: VisualizationType;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface DashboardItem {
  id: string;
  dashboardId: string;
  metricId: string;
  position: number;
  metric: Metric;
}

export interface Dashboard {
  id: string;
  instance: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  items: DashboardItem[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ReportJob {
  metricId: string;
  status: 'completed' | 'failed';
  data?: QueryResult;
  error?: string;
}

