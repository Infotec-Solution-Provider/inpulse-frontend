export type GeneratedReportStatus = 'DRAFT' | 'SAVED';
export type GeneratedReportFilterType = 'date_range' | 'operator' | 'sector' | 'customer' | 'chat' | 'select' | 'multiselect' | 'text' | 'number' | 'boolean';
export type GeneratedReportBlockType = 'kpi' | 'table' | 'bar' | 'line' | 'pie';

export interface GeneratedReportFilter {
  id: string;
  label: string;
  type: GeneratedReportFilterType;
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number | boolean }>;
}

export interface GeneratedReportBlock {
  id: string;
  type: GeneratedReportBlockType;
  title: string;
  datasetId: string;
  xKey?: string;
  yKeys?: string[];
  valueKey?: string;
  nameKey?: string;
  columns?: string[];
  format?: 'number' | 'currency' | 'percent' | 'duration' | 'date';
  position: number;
}

export interface GeneratedReportArtifact {
  id: string;
  status: GeneratedReportStatus;
  title: string;
  description?: string;
  schemaVersion: number;
  createdByUserId: number;
  createdByUserName: string;
  summary?: string;
  findings: string[];
  limitations: string[];
  sources: string[];
  filters: GeneratedReportFilter[];
  datasets: Array<{ id: string; label: string; columns?: string[] }>;
  blocks: GeneratedReportBlock[];
  createdAt: string;
  updatedAt: string;
  savedAt?: string;
}

export interface GeneratedReportDatasetResult {
  id: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
  truncated: boolean;
  error?: string;
}

export interface GeneratedReportExecution {
  artifact: GeneratedReportArtifact;
  filterValues: Record<string, unknown>;
  datasets: GeneratedReportDatasetResult[];
  executedAt: string;
  durationMs: number;
}
