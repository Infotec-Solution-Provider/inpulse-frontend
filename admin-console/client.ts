import type {
  Environment,
  Session,
  Source,
  Tenant,
  Snapshot,
  Target,
  Change,
  Operation,
  Service,
  LogEntry,
  AuditEntry,
  TargetOption,
} from "./types";

export class AdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const prefix = "/infotec/admin/api";
const segment = (value: string) => encodeURIComponent(value);
function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
}

/** No CRM interceptors, JWT storage or automatic replay of mutations. */
export class AdminClient {
  private csrf = "";
  onUnauthorized?: () => void;
  async request<T>(
    path: string,
    options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
  ): Promise<T> {
    const timeout = AbortSignal.timeout(30_000);
    const response = await fetch(prefix + path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.method && options.method !== "GET" ? { "X-CSRF-Token": this.csrf } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) this.onUnauthorized?.();
      throw new AdminError(
        body?.message || `Não foi possível concluir a operação (${response.status}).`,
        response.status,
      );
    }
    return body as T;
  }
  async session(): Promise<Session> {
    const session = await this.request<Session>("/session");
    this.csrf = session.csrfToken;
    return session;
  }
  async renew(): Promise<Session> {
    const session = await this.request<Session>("/session/renew", { method: "POST", body: {} });
    this.csrf = session.csrfToken;
    return session;
  }
  logout() {
    return this.request<void>("/session", { method: "DELETE" });
  }
  tenants(env: Environment, signal?: AbortSignal) {
    return this.request<{ tenants: Tenant[] }>(`/environments/${env}/tenants`, { signal });
  }
  sources(env: Environment, signal?: AbortSignal) {
    return this.request<{ sources: Source[] }>(`/environments/${env}/sources`, { signal });
  }
  private path(env: Environment, tenant: string, source: string) {
    return `/environments/${env}/tenants/${segment(tenant)}/settings/${segment(source)}`;
  }
  settings(env: Environment, tenant: string, source: string, target: Target, signal?: AbortSignal) {
    return this.request<Snapshot>(this.path(env, tenant, source) + query({ ...target }), {
      signal,
    });
  }
  targets(
    env: Environment,
    tenant: string,
    source: string,
    scope: string,
    search: string,
    signal?: AbortSignal,
  ) {
    return this.request<{ targets: TargetOption[] }>(
      `/environments/${env}/tenants/${segment(tenant)}/targets/${segment(source)}` +
        query({ scope, search }),
      { signal },
    );
  }
  save(
    env: Environment,
    tenant: string,
    source: string,
    data: { operationId: string; revision: string; target: Target; changes: Change[] },
  ) {
    return this.request<Operation>(this.path(env, tenant, source), { method: "PATCH", body: data });
  }
  apply(
    env: Environment,
    tenant: string,
    source: string,
    data: { operationId: string; revision: string; target: Target },
  ) {
    return this.request<Operation>(this.path(env, tenant, source) + "/apply", {
      method: "POST",
      body: data,
    });
  }
  operation(id: string) {
    return this.request<Operation>(`/operations/${segment(id)}`);
  }
  services(env: Environment, signal?: AbortSignal) {
    return this.request<{ services: Service[] }>(`/environments/${env}/services`, { signal });
  }
  serviceConfig(env: Environment, service: string, signal?: AbortSignal) {
    return this.request<Snapshot>(`/environments/${env}/services/${segment(service)}/config`, {
      signal,
    });
  }
  saveService(
    env: Environment,
    service: string,
    data: { operationId: string; revision: string; changes: Change[] },
  ) {
    return this.request<Operation>(`/environments/${env}/services/${segment(service)}/config`, {
      method: "PATCH",
      body: data,
    });
  }
  serviceAction(
    env: Environment,
    service: string,
    data: {
      operationId: string;
      action: "start" | "stop" | "restart" | "apply";
      revision?: string;
    },
  ) {
    return this.request<Operation>(`/environments/${env}/services/${segment(service)}/actions`, {
      method: "POST",
      body: data,
    });
  }
  logs(
    env: Environment,
    filters: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ) {
    return this.request<{ entries: LogEntry[]; nextCursor?: string; truncated?: boolean }>(
      `/environments/${env}/logs` + query(filters),
      { signal },
    );
  }
  audit(filters: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return this.request<{ entries: AuditEntry[]; nextCursor?: string }>("/audit" + query(filters), {
      signal,
    });
  }
}

export const api = new AdminClient();
