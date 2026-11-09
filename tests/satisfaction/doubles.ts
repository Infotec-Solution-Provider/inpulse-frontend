import { useSyncExternalStore } from "react";
export const context = { instance: "fixture", token: "fixture-token" };
const initial = [
  { id: 1, description: "Como foi o atendimento?", used: true },
  { id: 2, description: "A solução atendeu sua necessidade?", used: false },
];
let rows = structuredClone(initial);
export const calls: any[] = [];
Object.assign(window, {
  fixture: {
    calls,
    failWrite: false,
    required: true,
    failSurvey: false,
    delaySurvey: 0,
    closed: false,
  },
});
const listeners = new Set<() => void>();
Object.assign((window as any).fixture, {
  rotateToken: () => {
    context.token += "-renewed";
    listeners.forEach((l) => l());
  },
});
export const useAuthContext = () => {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => context.token,
  );
  return { ...context, user: { CODIGO: 7, NIVEL: "ADMIN" } };
};
export class FakeProposalsClient {
  async results() {
    calls.push({ kind: "proposal-results" });
    return [
      { id: 9, name: "Com pesquisa", COD_ACAO: 1, PROPOSTA: "NAO", CANCELAPROPOSTA: "NAO" },
      { id: 10, name: "Sem pesquisa", COD_ACAO: 1, PROPOSTA: "NAO", CANCELAPROPOSTA: "NAO" },
      {
        id: 11,
        name: "Proposta, cancelamento e pesquisa",
        COD_ACAO: 1,
        PROPOSTA: "SIM",
        CANCELAPROPOSTA: "SIM",
      },
    ];
  }
  async forSchedule() {
    calls.push({ kind: "proposal-list" });
    return [{ id: 70, version: "a".repeat(64), value: "50.00", campaignName: "Ativos" }];
  }
}
export const useAppContext = () => ({
  closeModal: () => {
    (window as any).fixture.closed = true;
  },
});
const off = new URLSearchParams(location.search).has("flags-off");
const whatsapp = {
  parameters: { feature_crm_sales_enabled: off ? "false" : "true", feature_crm_satisfaction_enabled: off ? "false" : "true" },
  wppApi: {
    current: {
      setAuth() {},
      async getResults() {
        calls.push({ kind: "basic-results" });
        return [
          { id: 9, name: "Com pesquisa", COD_ACAO: 1 },
          { id: 10, name: "Sem pesquisa", COD_ACAO: 1 },
        ];
      },
    },
  },
};
export const useWhatsappContext = () => whatsapp;
export const customersService = {
  async listSatisfactionQuestions() {
    return structuredClone(rows);
  },
  async writeSatisfactionQuestion(method: string, id: number, data: any, context: any) {
    calls.push({ method, id, data, context });
    if ((window as any).fixture.failWrite) throw new Error("unknown");
    if (method === "create")
      rows.push({ id: rows.length + 1, description: data.description, used: false });
    if (method === "update")
      rows = rows.map((r) => (r.id === id ? { ...r, description: data.description } : r));
    if (method === "delete") rows = rows.filter((r) => r.id !== id);
  },
  async getCallSatisfaction(scheduleId: number, resultId: number, context: any) {
    calls.push({ scheduleId, resultId, context });
    const delay = (window as any).fixture.delaySurvey;
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if ((window as any).fixture.failSurvey) throw new Error("offline");
    return {
      required: [9, 11].includes(resultId),
      questions: [9, 11].includes(resultId)
        ? initial.map(({ id, description }) => ({ id, description }))
        : [],
    };
  },
};
