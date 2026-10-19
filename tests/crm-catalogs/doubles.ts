import { useSyncExternalStore } from "react";
import type { CatalogRecord } from "../../src/lib/crm-catalogs-form";
import type { CrmCatalogName } from "../../src/lib/sdk-local/types/crm-catalogs.types";
const params = new URLSearchParams(location.search);
let auth = {
  instance: "tenant-a",
  token: "token-a",
  user: { CODIGO: 7, NIVEL: params.has("operator") ? "OPERADOR" : "ADMIN" },
};
let snapshot = JSON.stringify(auth);
const listeners = new Set<() => void>();
export function switchAuth(instance: string, token: string) {
  auth = { ...auth, instance, token };
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
const rows: Record<CrmCatalogName, CatalogRecord[]> = {
  "customer-groups": [{ CODIGO: 1, DESCRICAO: "Grupo inicial" }],
  positions: [{ CODIGO: 1, DESCRICAO: "Cargo inicial" }],
  origins: [{ CODIGO: 1, DESCRICAO: "Origem inicial" }],
  brands: [{ CODIGO: 1, DESCRICAO: "Marca inicial", COD_ERPMARCA: null, UNIDADE: 2 }],
  medias: [{ CODIGO: 1, NOME: "Mídia inicial", PRIORIDADE: 0, COD_UNIDADE: null }],
  cities: [
    { CODIGO: 1, NOME: "Cidade inicial", UF: "SP", ORDEM: 0, ORDEMESTADO: null, ORDEMCIDADE: 0 },
  ],
  states: [{ UF: "SP", NOME: "São Paulo", ORDEM: null, FUSOHORARIO: -3 }],
};
interface State {
  rows: typeof rows;
  reads: { catalog: string; token: string; filters: Record<string, unknown> }[];
  creates: CatalogRecord[];
  updates: { changes: CatalogRecord; expected: CatalogRecord }[];
  deletes: CatalogRecord[];
  failure: string;
  delay: number;
  listDelay: number;
  failRead: boolean;
}
declare global {
  interface Window {
    catalogTest: State;
  }
}
window.catalogTest = {
  rows,
  reads: [],
  creates: [],
  updates: [],
  deletes: [],
  failure: "",
  delay: 0,
  listDelay: 0,
  failRead: false,
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function fail() {
  const mode = window.catalogTest.failure;
  if (mode === "network") throw new Error("timeout");
  if (mode)
    throw new Error("request failed", {
      cause: {
        response: {
          status: mode === "unknown" ? 503 : 409,
          data: {
            code:
              mode === "conflict"
                ? "CATALOG_CHANGED"
                : mode === "in-use"
                  ? "CATALOG_IN_USE"
                  : "CATALOG_DUPLICATE",
            message:
              mode === "in-use"
                ? "O registro possui vínculos e não pode ser excluído."
                : "O registro foi alterado por outra pessoa. Recarregue os dados.",
            ...(mode === "unknown" || mode === "duplicate-unknown" ? { outcome: "UNKNOWN" } : {}),
          },
        },
      },
    });
}
let activeToken = "";
export const customersService = {
  setAuth(token: string) {
    activeToken = token;
  },
  async listCrmCatalog(catalog: CrmCatalogName, filters: Record<string, unknown>) {
    const token = activeToken;
    window.catalogTest.reads.push({ catalog, token, filters });
    let selected = rows[catalog].map((row) => ({ ...row }));
    if (token === "token-b")
      selected = selected.map((row) => ({
        ...row,
        ...(catalog === "customer-groups" ? { DESCRICAO: "Grupo tenant B" } : {}),
      }));
    if (filters.search)
      selected = selected.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(String(filters.search).toLowerCase()),
        ),
      );
    if (filters.id !== undefined)
      selected = selected.filter(
        (row) => String(row[catalog === "states" ? "UF" : "CODIGO"]) === String(filters.id),
      );
    await wait(window.catalogTest.listDelay);
    if (window.catalogTest.failRead) throw new Error("failed read");
    return {
      message: "OK",
      data: selected.slice(
        (Number(filters.page) - 1) * Number(filters.perPage),
        Number(filters.page) * Number(filters.perPage),
      ),
      page: { current: Number(filters.page), totalRows: selected.length },
    };
  },
  async getCrmCatalog(catalog: CrmCatalogName, id: number | string) {
    if (window.catalogTest.failRead) throw new Error("failed read");
    return {
      data: { ...rows[catalog].find((row) => row[catalog === "states" ? "UF" : "CODIGO"] === id)! },
    };
  },
  async getCrmCatalogUnits() {
    return { data: [{ CODIGO: 2, DESCRICAO: "Unidade real" }] };
  },
  async getCrmCatalogStates() {
    return {
      data: [
        { UF: "SP", NOME: "São Paulo" },
        { UF: "RS", NOME: "Rio Grande do Sul" },
      ],
    };
  },
  async createCrmCatalog(catalog: CrmCatalogName, data: CatalogRecord) {
    window.catalogTest.creates.push(data);
    await wait(window.catalogTest.delay);
    fail();
    const row = { ...rows[catalog][0], ...data, ...(catalog === "brands" ? { CODIGO: 22 } : {}) };
    rows[catalog].push(row);
    return { data: row };
  },
  async updateCrmCatalog(
    catalog: CrmCatalogName,
    id: string | number,
    data: { changes: CatalogRecord; expected: CatalogRecord },
  ) {
    window.catalogTest.updates.push(data);
    await wait(window.catalogTest.delay);
    fail();
    const row = rows[catalog].find((row) => row[catalog === "states" ? "UF" : "CODIGO"] === id)!;
    Object.assign(row, data.changes);
    return { data: row };
  },
  async deleteCrmCatalog(catalog: CrmCatalogName, id: string | number, expected: CatalogRecord) {
    window.catalogTest.deletes.push(expected);
    await wait(window.catalogTest.delay);
    fail();
    rows[catalog].splice(
      rows[catalog].findIndex((row) => row[catalog === "states" ? "UF" : "CODIGO"] === id),
      1,
    );
    return { message: "OK" };
  },
};
