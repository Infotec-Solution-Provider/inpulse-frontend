// Browser subset of admin-service/protocol/admin-protocol.ts (no server crypto).
export type Environment = "production" | "homolog";
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Actor {
  instance: "infotec";
  userId: number;
  role: "ADMIN";
  name: string;
}
export interface Session {
  actor: Actor;
  csrfToken: string;
  expiresAt: string;
  environments: Environment[];
}
export interface Target {
  scope?: "INSTANCE" | "SECTOR" | "USER";
  sectorId?: number;
  userId?: number;
  resourceId?: string | number;
}
export interface Change {
  key: string;
  action: "set" | "reset" | "remove";
  value?: Json;
}
export interface Setting {
  key: string;
  label: string;
  description: string;
  category: string;
  type: "boolean" | "number" | "string" | "enum" | "json" | "secret";
  defaultValue?: Json;
  options?: { label: string; value: Json }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  multiplier?: number;
  supportedScopes?: string[];
  readOnly?: boolean;
  unavailableReason?: string;
  applyMode?: "dynamic" | "reload" | "restart" | "build";
  canReset?: boolean;
}
export interface Snapshot {
  source: string;
  tenant: string;
  target?: Target;
  revision: string;
  catalog: Setting[];
  values: Record<string, Json>;
  secrets?: Record<string, { configured: boolean }>;
  inherited?: Record<string, { value: Json; source: string }>;
  application?: {
    state: "applied" | "pending" | "build_required" | "unknown";
    revision?: string;
    message?: string;
  };
  resources?: { id: string | number; label: string }[];
  unavailableReason?: string;
}
export interface Source {
  id: string;
  label: string;
  category: string;
  available: boolean;
  message?: string;
}
export interface Tenant {
  id: string;
  name: string;
}
export interface TargetOption {
  id: string | number;
  label: string;
  active?: boolean;
  sectorId?: number;
}
export interface Operation {
  operationId: string;
  state: "ACCEPTED" | "RUNNING" | "COMMITTED" | "NOT_COMMITTED" | "UNKNOWN";
  result?: { snapshot?: Snapshot; message?: string };
  message?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Service {
  id: string;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  health: { status: string; message?: string };
  configuration: { savedRevision?: string; activeRevision?: string; state: string };
}
export interface LogEntry {
  id: string;
  timestamp?: string;
  level?: string;
  service?: string;
  tenant?: string;
  message: string;
}
export interface AuditEntry {
  id: string;
  operationId: string;
  timestamp: string;
  actor: Actor;
  environment: Environment;
  tenant?: string;
  source: string;
  resource?: string;
  action: string;
  state: string;
  changes?: {
    key: string;
    before?: Json;
    after?: Json;
    secretAction?: "defined" | "replaced" | "removed";
  }[];
  message?: string;
}
