import type {
  CreateSegmentRequest,
  Segment,
  SegmentListParams,
  SetCustomerSegmentRequest,
  UpdateSegmentRequest,
} from "../../src/lib/sdk-local";

// Deterministic fixtures used only by the isolated browser harness. No remote API is contacted.
const params = new URLSearchParams(location.search);
interface SegmentTestState {
  rows: Segment[];
  reads: SegmentListParams[];
  creates: CreateSegmentRequest[];
  updates: { id: number; data: UpdateSegmentRequest }[];
  failLoad: boolean;
  saveError: string | null;
  listDelay: number;
  invalidations: number;
  published: number;
  assignments: { id: number; data: SetCustomerSegmentRequest }[];
  assignmentError: string | null;
  assignmentDelay: number;
  lookupReads: number;
  reloads: number;
  failReload: boolean;
  savedCallbacks: number;
  customer: { CODIGO: number; SEGMENTO: number | null; NOME: string | null };
}
declare global {
  interface Window {
    segmentTest: SegmentTestState;
  }
}
window.segmentTest = {
  rows: params.has("empty")
    ? []
    : [
        { CODIGO: 1, NOME: "Atacado", ordem: 7, COD_UNIDADE: 12 },
        { CODIGO: 0, NOME: null, ordem: null, COD_UNIDADE: 0 },
        { CODIGO: 3, NOME: "Varejo", ordem: 99999999, COD_UNIDADE: null },
        ...Array.from({ length: 23 }, (_, index) => ({
          CODIGO: index + 4,
          NOME: `Segmento ${String(index + 4).padStart(2, "0")}`,
          ordem: index + 1,
          COD_UNIDADE: null,
        })),
      ],
  reads: [],
  creates: [],
  updates: [],
  failLoad: params.has("load-error"),
  saveError: null,
  listDelay: 0,
  invalidations: 0,
  published: 0,
  assignments: [],
  assignmentError: null,
  assignmentDelay: 0,
  lookupReads: 0,
  reloads: 0,
  failReload: false,
  savedCallbacks: 0,
  customer: {
    CODIGO: 40,
    SEGMENTO: params.has("dangling") ? 99 : 1,
    NOME: params.has("dangling") ? "Histórico" : "Atacado",
  },
};
window.addEventListener("inpulse:customer-segments-changed", () => {
  window.segmentTest.published += 1;
});
const state = window.segmentTest;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const fail = (code: string, status: number) => {
  throw { response: { status, data: { code } } };
};
export const useAuthContext = () => ({
  instance: "local-fixture",
  token: "local-test-only",
  user: { CODIGO: 5, NIVEL: params.has("operator") ? "OPERADOR" : "ADMIN" },
});
export const hybridCache = {
  invalidateResource: async () => {
    state.invalidations += 1;
  },
};
export const customersService = {
  setAuth() {},
  async getSegments() {
    state.lookupReads += 1;
    return copy(state.rows.map(({ CODIGO, NOME }) => ({ CODIGO, NOME })));
  },
  async setCustomerSegment(id: number, data: SetCustomerSegmentRequest) {
    state.assignments.push({ id, data: copy(data) });
    const row = copy(state.rows.find((row) => row.CODIGO === data.SEGMENTO)!);
    if (state.assignmentDelay)
      await new Promise((resolve) => setTimeout(resolve, state.assignmentDelay));
    if (state.assignmentError) {
      throw new Error("Não foi possível atualizar o segmento. Confira os dados atuais.", {
        cause: {
          response: {
            status: state.assignmentError.endsWith("UNKNOWN") ? 503 : 409,
            data: {
              code: state.assignmentError,
              ...(state.assignmentError.endsWith("UNKNOWN") ? { outcome: "UNKNOWN" } : {}),
            },
          },
        },
      });
    }
    return {
      message: "OK",
      data: {
        CODIGO: id,
        SEGMENTO: data.SEGMENTO,
        segment: { CODIGO: row.CODIGO, NOME: row.NOME },
      },
    };
  },
  async listSegments(query: SegmentListParams) {
    state.reads.push(copy(query));
    const snapshot = copy(state.rows);
    if (state.listDelay) await new Promise((resolve) => setTimeout(resolve, state.listDelay));
    if (state.failLoad) fail("LOAD_FAILED", 500);
    const rows = snapshot.filter(
      (row) =>
        (query.CODIGO === undefined || query.CODIGO === row.CODIGO) &&
        (!query.NOME ||
          (row.NOME ?? "").toLocaleLowerCase().includes(query.NOME.toLocaleLowerCase())),
    );
    const key = query.sortBy ?? "NOME";
    rows.sort((a, b) => {
      if (a[key] === null && b[key] !== null) return 1;
      if (b[key] === null && a[key] !== null) return -1;
      const compared =
        typeof a[key] === "string"
          ? String(a[key]).localeCompare(String(b[key]), "pt-BR")
          : Number(a[key]) - Number(b[key]);
      return (query.sortDirection === "desc" ? -compared : compared) || a.CODIGO - b.CODIGO;
    });
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    return {
      message: "OK",
      data: rows.slice((page - 1) * perPage, page * perPage),
      page: { current: page, totalRows: rows.length },
    };
  },
  async getSegment(id: number) {
    const row = state.rows.find((segment) => segment.CODIGO === id);
    if (!row) fail("SEGMENT_NOT_FOUND", 404);
    return { message: "OK", data: copy(row!) };
  },
  async createSegment(data: CreateSegmentRequest) {
    state.creates.push(copy(data));
    if (state.saveError === "NETWORK_ERROR") throw new Error("Network error");
    if (state.saveError)
      fail(state.saveError, state.saveError === "SEGMENT_WRITE_UNKNOWN" ? 503 : 409);
    const row = {
      CODIGO: Math.max(...state.rows.map((segment) => segment.CODIGO), 0) + 1,
      NOME: data.NOME,
      ordem: data.ordem ?? 99999999,
      COD_UNIDADE: null,
    };
    state.rows.push(row);
    return { message: "OK", data: copy(row) };
  },
  async updateSegment(id: number, data: UpdateSegmentRequest) {
    state.updates.push({ id, data: copy(data) });
    if (state.saveError)
      fail(state.saveError, state.saveError === "SEGMENT_WRITE_UNKNOWN" ? 503 : 409);
    const row = state.rows.find((segment) => segment.CODIGO === id);
    if (!row) fail("SEGMENT_NOT_FOUND", 404);
    Object.assign(row!, data.changes);
    return { message: "OK", data: copy(row!) };
  },
};
