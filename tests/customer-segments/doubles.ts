import type {
  CreateSegmentRequest,
  Customer,
  Segment,
  SegmentListParams,
  SetCustomerSegmentRequest,
  UpdateSegmentRequest,
} from "../../src/lib/sdk-local";
import type { CustomerFullDetail } from "../../src/app/(private)/[instance]/(main)/(chats-menu)/(start-chat-modal)/customer-crm-detail-modal.types";

function customerDetail(code: number): CustomerFullDetail {
  const segmentCode = code === 40 ? 1 : 3;
  return {
    customer: {
      CODIGO: code,
      RAZAO: `Cliente ${code}`,
      FANTASIA: `Fantasia ${code}`,
      SEGMENTO: segmentCode,
      COD_CAMPANHA: null,
      PESSOA: "JUR",
      ATIVO: "SIM",
      COD_ERP: `ERP${code}`,
      CPF_CNPJ: "",
      IE_RG: "",
      END_RUA: "Rua local",
      CIDADE: "",
      BAIRRO: "",
      ESTADO: "",
      CEP: "",
      COMPLEMENTO: "",
      OBS_ADMIN: "",
      OBS_OPERADOR: "",
      EMAIL: "",
      EMAIL2: "",
      CONTATO_MAIL: "",
      WEBSITE: "",
      NR_FUNCIONARIOS: 0,
      OBS_CLIENTES: "",
      AREA1: "",
      FONE1: "",
      DESC_FONE1: "",
      AREA2: "",
      FONE2: "",
      DESC_FONE2: "",
      AREA3: "",
      FONE3: "",
      DESC_FONE3: "",
      AREAFAX: "",
      FAX: "",
      DESCFAX: "",
    } as unknown as Customer,
    campaign: { code: null, name: null, firstName: null },
    campaigns: [],
    group: { code: null, description: null },
    origin: { code: null, description: null },
    media: { code: null, name: null },
    segment: { code: segmentCode, name: segmentCode === 1 ? "Atacado" : "Varejo" },
    operator: { code: null, name: null },
    contacts: [],
    callHistory: [],
    purchases: [],
    schedules: [],
    metadata: { purchaseItems: { mapped: false, tableName: null }, customNameFieldMapped: false },
  };
}

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
  authToken: string;
  details: Record<number, CustomerFullDetail>;
  detailReads: { id: number; token: string }[];
  detailReadsCompleted: { id: number; token: string }[];
  detailDelays: Record<number, number>;
  detailFailure: boolean;
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
  authToken: "local-test-only",
  details: { 40: customerDetail(40), 41: customerDetail(41) },
  detailReads: [],
  detailReadsCompleted: [],
  detailDelays: params.has("late-40") ? { 40: 1000 } : {},
  detailFailure: false,
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
  token: state.authToken,
  user: { CODIGO: 5, NIVEL: params.has("operator") ? "OPERADOR" : "ADMIN" },
});
export const hybridCache = {
  invalidateResource: async () => {
    state.invalidations += 1;
  },
};
export const customersService = {
  currentToken: "",
  setAuth(token: string) {
    this.currentToken = token;
  },
  ax: {
    async get(path: string) {
      const id = Number(path.match(/\/customers\/(\d+)\/full$/)?.[1]);
      if (!Number.isInteger(id)) throw new Error(`Unexpected local fixture path: ${path}`);
      const read = { id, token: customersService.currentToken };
      state.detailReads.push(copy(read));
      const snapshot = copy(state.details[id]);
      const delay = state.detailDelays[id] ?? 0;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      state.detailReadsCompleted.push(copy(read));
      if (state.detailFailure) throw new Error("Fixture detail unavailable");
      return { data: { message: "OK", data: snapshot } };
    },
  },
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
