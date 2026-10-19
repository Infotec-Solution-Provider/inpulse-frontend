import { useSyncExternalStore } from "react";
import type {
  CrmPurchaseField,
  CrmPurchaseInput,
  CrmPurchaseLookupFilters,
  CrmPurchasePatch,
  CrmPurchaseSnapshot,
  CrmPurchasesFilters,
} from "../../src/lib/sdk-local/types/crm-purchases.types";
const params = new URLSearchParams(location.search);
let auth = {
  instance: "tenant-a",
  token: "token-a",
  user: { CODIGO: 7, NIVEL: params.has("operator") ? "ATIVO" : "ADMIN" },
};
let snapshot = JSON.stringify(auth);
const listeners = new Set<() => void>();
export function switchAuth(instance: string, token: string, actor: number) {
  auth = { instance, token, user: { ...auth.user, CODIGO: actor } };
  snapshot = JSON.stringify(auth);
  for (const listener of listeners) listener();
}
export function useAuthContext() {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => snapshot,
  );
  return auth;
}
const fields: CrmPurchaseField[] = [
  {
    name: "CLIENTE",
    label: "Cliente",
    type: "integer",
    nullable: true,
    requiredOnCreate: true,
    immutable: true,
  },
  { name: "OPERADOR", label: "Usuário", type: "integer", nullable: true },
  { name: "DATA", label: "Data", type: "date", nullable: true, requiredOnCreate: true },
  { name: "VALOR", label: "Valor", type: "decimal", nullable: true, requiredOnCreate: true },
  {
    name: "DESCRICAO",
    label: "Descrição",
    type: "text",
    nullable: true,
    maxLength: 60,
    requiredOnCreate: true,
  },
  {
    name: "FORMA_PGTO",
    label: "Forma de pagamento",
    type: "text",
    nullable: true,
    maxLength: 255,
    requiredOnCreate: true,
  },
];
const initial: CrmPurchaseSnapshot = {
  record: {
    CODIGO: 1,
    CLIENTE: 2,
    OPERADOR: 0,
    DATA: "2026-10-19",
    VALOR: "1234.56789012345",
    DESCRICAO: "Compra inicial",
    FORMA_PGTO: "PIX",
    FATURADO: "S",
    TIPO: null,
    SITUACAO: "F",
    CLIENTEATIVO: 0,
  },
  customerName: "Cliente 2",
  operatorName: null,
  writable: true,
  version: "a".repeat(64),
};
interface State {
  rows: CrmPurchaseSnapshot[];
  writes: {
    operation: string;
    id?: number;
    body: unknown;
    context: { instance: string; token: string };
  }[];
  reads: CrmPurchasesFilters[];
  lookups: { kind: string; filters: CrmPurchaseLookupFilters }[];
  failure: string;
  delay: number;
  readDelay: number;
  completedReads: number;
}
declare global {
  interface Window {
    purchaseTest: State;
  }
}
window.purchaseTest = {
  rows: [initial],
  writes: [],
  reads: [],
  lookups: [],
  failure: "",
  delay: 0,
  readDelay: 0,
  completedReads: 0,
};
const state = window.purchaseTest,
  copy = <T>(value: T): T => structuredClone(value);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export class CrmPurchasesClient {
  constructor(
    _base: string,
    readonly context: { instance: string; token: string },
  ) {}
  async schema() {
    return {
      fields: copy(fields),
      manualCode: false,
      amountStorage: "DOUBLE",
      amountScale: 2,
      amountMax: "999999999999.99",
    };
  }
  async list(filters: CrmPurchasesFilters) {
    state.reads.push(copy(filters));
    const rows = state.rows.filter(
      (item) =>
        (!filters.search || item.record.DESCRICAO?.includes(filters.search)) &&
        (!filters.customerId || item.record.CLIENTE === filters.customerId),
    );
    const page = filters.page ?? 1,
      perPage = filters.perPage ?? 10;
    await sleep(state.readDelay);
    state.completedReads += 1;
    return {
      data: copy(rows.slice((page - 1) * perPage, page * perPage)),
      page: { current: page, totalRows: rows.length },
    };
  }
  async get(id: number) {
    const row = state.rows.find((item) => item.record.CODIGO === id);
    if (!row) throw { response: { status: 404 } };
    return copy(row);
  }
  async write(operation: string, body: unknown, id?: number) {
    state.writes.push({ operation, body: copy(body), id, context: { ...this.context } });
    await sleep(state.delay);
    if (state.failure)
      throw {
        response: {
          status: state.failure === "unknown" ? 503 : 409,
          data: {
            code: state.failure === "in-use" ? "CRM_PURCHASE_IN_USE" : "CRM_PURCHASE_CHANGED",
            ...(state.failure === "unknown" ? { outcome: "UNKNOWN" } : {}),
          },
        },
      };
  }
  async create(body: CrmPurchaseInput) {
    await this.write("create", body);
    const row = {
      ...copy(initial),
      record: {
        ...copy(initial.record),
        ...body,
        CODIGO: Math.max(...state.rows.map((row) => row.record.CODIGO)) + 1,
      },
      version: "b".repeat(64),
      customerName: `Cliente ${body.CLIENTE}`,
      operatorName: body.OPERADOR ? `Usuário ${body.OPERADOR}` : "Usuário conectado",
    };
    state.rows.push(row);
    return copy(row);
  }
  async update(id: number, body: CrmPurchasePatch) {
    await this.write("update", body, id);
    const row = state.rows.find((row) => row.record.CODIGO === id)!;
    if (row.version !== body.version) throw { response: { status: 409 } };
    Object.assign(row.record, body.changes);
    row.version = "c".repeat(64);
    return copy(row);
  }
  async remove(id: number, body: { version: string }) {
    await this.write("delete", body, id);
    state.rows = state.rows.filter((row) => row.record.CODIGO !== id);
  }
  async lookup(kind: "customers" | "operators", filters: CrmPurchaseLookupFilters) {
    state.lookups.push({ kind, filters: copy(filters) });
    const rows = Array.from({ length: 25 }, (_, index) => ({
      CODIGO: index + 1,
      label: `${kind === "customers" ? "Cliente" : "Usuário"} ${index + 1}`,
      active: "SIM",
    }));
    const matches = rows.filter(
      (row) =>
        !filters.search ||
        row.label.includes(filters.search) ||
        String(row.CODIGO) === filters.search,
    );
    const page = filters.page ?? 1,
      perPage = filters.perPage ?? 20;
    return {
      data: matches.slice((page - 1) * perPage, page * perPage),
      page: { current: page, totalRows: matches.length },
    };
  }
}
