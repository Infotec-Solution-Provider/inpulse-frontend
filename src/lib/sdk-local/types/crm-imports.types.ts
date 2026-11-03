export interface ImportField {
  name: string;
  label: string;
  type: string;
  updateOnly?: boolean;
}
export interface ImportCapabilities {
  limits: {
    bytes: number;
    rows: number;
    columns: number;
    cell: number;
    batch: number;
    ttlMs: number;
  };
  fields: ImportField[];
  createEnabled: boolean;
  phoneWritesEnabled: boolean;
  createReason: string | null;
  retention: string;
}
export type ImportState =
  | "ready"
  | "invalid"
  | "duplicate"
  | "blocked"
  | "succeeded"
  | "failed"
  | "unknown";
export interface ImportRow {
  row: number;
  state: ImportState;
  errors: string[];
  values: string[];
  changes: Record<string, string | number | null>;
  before: Record<string, string | number | null> | null;
  customerId: number | null;
}
export interface ImportJob {
  id: string;
  mode: "create" | "update";
  expiresAt: number;
  running: boolean;
  headers: string[];
  rows: ImportRow[];
  counts: Record<ImportState, number>;
}
export interface ImportPreviewInput {
  text: string;
  delimiter: string;
  mapping: string[];
  mode: "create" | "update";
  identity: string;
  originId?: number;
}
