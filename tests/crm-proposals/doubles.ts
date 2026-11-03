import { useSyncExternalStore } from "react";
const params = new URLSearchParams(location.search);
let instance = "tenant-a";
const listeners = new Set<() => void>();
export function switchTenant() {
  instance = instance === "tenant-a" ? "tenant-b" : "tenant-a";
  listeners.forEach((l) => l());
}
export function useAuthContext() {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => instance,
  );
  return {
    instance,
    token: instance + "-token",
    user: { CODIGO: 7, NIVEL: params.has("operator") ? "ATIVO" : "ADMIN" },
  };
}
export const useAppContext = () => ({
  closeModal: () => {
    document.body.dataset.closed = "yes";
  },
});
const test: {changes: unknown[]; finishes: unknown[]; requests: unknown[]; release: ((value: unknown)=>void)|null} = ((window as any).proposalTest = {
  changes: [],
  finishes: [],
  requests: [],
  release: null,
});
const rows = [
  {
    id: 11,
    scheduleId: 41,
    value: "100.25",
    status: "ATIVA",
    closed: 0,
    version: "a".repeat(64),
    customerId: 1,
    customerName: "Cliente exemplo",
    erp: "ERP-1",
    campaignName: "Ativos",
    operatorName: "Ana",
    calledAt: "2026-11-03 10:00:00",
    resultName: "Proposta",
  },
  {
    id: 12,
    scheduleId: 42,
    value: "50.00",
    status: "ATIVA",
    closed: 1,
    version: "b".repeat(64),
    customerId: 1,
    customerName: "Cliente fechado",
    erp: "ERP-2",
    campaignName: "Ativos",
    operatorName: "Ana",
    calledAt: "2026-11-03 11:00:00",
    resultName: "Proposta",
  },
];
export class FakeProposalsClient {
  context: { instance: string; token: string };
  constructor(_url: string, context: { instance: string; token: string }) {
    this.context = context;
  }
  async list(filters: unknown) {
    test.requests.push({ ...this.context, filters });
    if (params.has("slow") && this.context.instance === "tenant-a")
      await new Promise((resolve) => {
        test.release = resolve;
      });
    return {
      data: rows.map((r) => ({
        ...r,
        customerName: this.context.instance === "tenant-a" ? r.customerName : "Empresa B",
      })),
      hasMore: false,
      page: 1,
      capability: { writable: !params.has("readonly"), reason: "Auditoria indisponível" },
    };
  }
  async change(id: number, body: unknown) {
    test.changes.push({ id, body, ...this.context });
    if (params.has("unknown")) throw { response: { status: 503, data: { outcome: "UNKNOWN" } } };
  }
  async history() {
    return [
      {
        operation_id: "x",
        actor_id: 7,
        action: "UPDATE",
        old_value: "100.25",
        new_value: "120.75",
        old_status: "ATIVA",
        new_status: "ATIVA",
        reason: "Revisão",
        created_at: "2026-11-03 10:00:00",
      },
    ];
  }
  async report() {
    return "<!doctype html><html><body><h1>Relatório de propostas</h1><p>Total 100.25</p></body></html>";
  }
  async forSchedule() {
    return [rows[0]];
  }
  async results() {
    return [
      { id: 1, name: "Proposta", COD_ACAO: 1, PROPOSTA: "SIM", CANCELAPROPOSTA: "NAO" },
      { id: 2, name: "Cancelar proposta", COD_ACAO: 1, PROPOSTA: "NAO", CANCELAPROPOSTA: "SIM" },
      { id: 3, name: "Sem proposta", COD_ACAO: 1, PROPOSTA: "NAO", CANCELAPROPOSTA: "NAO" },
    ];
  }
}
