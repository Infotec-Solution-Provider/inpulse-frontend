import { useSyncExternalStore } from "react";
import type { CatalogRecord } from "../../src/lib/crm-catalogs-form";
import type {
  CrmUserCatalogName,
  CrmUserRegistrationField,
  CrmUserRegistrationDetail,
  CrmUserGroupMember,
} from "../../src/lib/sdk-local/types/crm-users.types";
import type { CrmRequestContext } from "../../src/lib/sdk-local/crm-request-context";
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
const fields: CrmUserRegistrationField[] = [
  {
    name: "NOME",
    label: "Nome",
    type: "text",
    group: "Identificação",
    nullable: false,
    maxLength: 50,
    requiredOnCreate: true,
  },
  { name: "AVATAR_ID", label: "Avatar", type: "number", group: "Identificação", nullable: true },
  {
    name: "LOGIN",
    label: "Login",
    type: "text",
    group: "Acesso",
    nullable: false,
    maxLength: 35,
    requiredOnCreate: true,
  },
  {
    name: "SENHA",
    label: "Senha",
    type: "password",
    group: "Acesso",
    nullable: false,
    maxLength: 50,
    requiredOnCreate: true,
  },
  {
    name: "NIVEL",
    label: "Perfil de acesso",
    type: "select",
    group: "Acesso",
    nullable: false,
    options: ["ADMIN", "ATIVO", "EXTERNO"],
    requiredOnCreate: true,
  },
  {
    name: "ATIVO",
    label: "Ativo",
    type: "select",
    group: "Acesso",
    nullable: true,
    options: ["SIM", "NAO"],
  },
  { name: "SETOR", label: "Código do setor", type: "number", group: "Organização", nullable: true },
  {
    name: "EMAIL",
    label: "E-mail",
    type: "text",
    group: "Comunicação",
    nullable: true,
    maxLength: 100,
  },
];
const shift = {
  CODIGO: 1,
  DESCRICAO: "Noturno",
  HORARIO_1: "SIM",
  ENTRADA_1: "23:30:00",
  SAIDA_1: "04:15:00",
  HORARIO_2: null,
  ENTRADA_2: "-838:59:59",
  SAIDA_2: null,
  HORARIO_3: "NAO",
  ENTRADA_3: null,
  SAIDA_3: null,
};
const rows: Record<CrmUserCatalogName, CatalogRecord[]> = {
  "user-groups": [{ CODIGO: 1, DESCRICAO: "Equipe inicial" }],
  shifts: [shift, { ...shift, CODIGO: 2, DESCRICAO: "Diurno" }],
  "pause-reasons": [
    { CODIGO: 1, DESCRICAO: "Pausa inicial", TEMPO_MAX_SEG: 0, PRODUTIVIDADE: "SIM" },
  ],
  "sales-types": [
    {
      ID: "0001",
      NOME: "Venda inicial",
      PAGAMENTO: "1.50",
      ID_COUNT: params.has("duplicate") ? 2 : 1,
    },
  ],
};
interface State {
  rows: typeof rows;
  detail: CrmUserRegistrationDetail;
  members: CrmUserGroupMember[];
  writes: {
    operation: string;
    catalog?: string;
    id?: string | number;
    data: unknown;
    context: CrmRequestContext;
  }[];
  reads: string[];
  failure: string;
  delay: number;
  readDelay: number;
  shift: number | null;
  saved: number;
  uploads: number;
}
declare global {
  interface Window {
    userTest: State;
  }
}
window.userTest = {
  rows,
  detail: {
    record: {
      CODIGO: 42,
      NOME: "Maria",
      LOGIN: "maria",
      NIVEL: "ADMIN",
      ATIVO: "SIM",
      SETOR: 0,
      EMAIL: null,
      AVATAR_ID: null,
    },
    version: "opaque-v1",
    fields,
  },
  members: [],
  writes: [],
  reads: [],
  failure: "",
  delay: 0,
  readDelay: 0,
  shift: 0,
  saved: 0,
  uploads: 0,
};
const state = window.userTest;
const copy = <T>(data: T): T => structuredClone(data);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function fail() {
  if (!state.failure) return;
  if (state.failure === "network") throw new Error("timeout");
  throw new Error("Recarregue os dados atuais.", {
    cause: {
      response: {
        status: state.failure === "unknown" ? 503 : 409,
        data: {
          code: state.failure === "in-use" ? "CRM_CATALOG_IN_USE" : "CRM_CATALOG_CHANGED",
          message: "O registro foi alterado ou possui vínculos. Recarregue os dados.",
          ...(state.failure === "unknown" ? { outcome: "UNKNOWN" } : {}),
        },
      },
    },
  });
}
async function write(
  operation: string,
  data: unknown,
  context: CrmRequestContext,
  catalog?: string,
  id?: string | number,
) {
  state.writes.push(copy({ operation, data, context, catalog, id }));
  await wait(state.delay);
  fail();
}
export const customersService = {};
export const filesService = {
  getFileDownloadUrl: (id: number) => `/files/${id}`,
  uploadBrowserFile: async () => {
    state.uploads += 1;
    return { id: 77 };
  },
};
export const crmUsersService = {
  setAuth() {},
  async list(catalog: CrmUserCatalogName, filters: Record<string, unknown>) {
    state.reads.push(catalog);
    let data = copy(rows[catalog]);
    if (filters.DESCRICAO || filters.NOME)
      data = data.filter((row) =>
        String(row.DESCRICAO ?? row.NOME)
          .toLowerCase()
          .includes(String(filters.DESCRICAO ?? filters.NOME).toLowerCase()),
      );
    if (filters.CODIGO !== undefined || filters.ID !== undefined)
      data = data.filter(
        (row) => String(row.CODIGO ?? row.ID) === String(filters.CODIGO ?? filters.ID),
      );
    await wait(state.readDelay);
    return { data, page: { totalRows: data.length, current: 1 } };
  },
  async get(catalog: CrmUserCatalogName, id: string | number) {
    return { data: copy(rows[catalog].find((row) => (row.CODIGO ?? row.ID) === id)!) };
  },
  async create(catalog: CrmUserCatalogName, data: CatalogRecord, context: CrmRequestContext) {
    await write("create", data, context, catalog);
    const record = { ...rows[catalog][0], ...data };
    rows[catalog].push(record);
    return { data: record };
  },
  async update(
    catalog: CrmUserCatalogName,
    id: string | number,
    changes: CatalogRecord,
    expected: CatalogRecord,
    context: CrmRequestContext,
  ) {
    await write("update", { changes, expected }, context, catalog, id);
    const row = rows[catalog].find((row) => (row.CODIGO ?? row.ID) === id)!;
    Object.assign(row, changes);
    return { data: row };
  },
  async remove(
    catalog: CrmUserCatalogName,
    id: string | number,
    expected: CatalogRecord,
    context: CrmRequestContext,
  ) {
    await write("delete", { expected }, context, catalog, id);
    rows[catalog].splice(
      rows[catalog].findIndex((row) => (row.CODIGO ?? row.ID) === id),
      1,
    );
  },
  async listMembers() {
    state.reads.push("members");
    return { data: copy(state.members) };
  },
  async lookupUsers() {
    return {
      data: [
        { CODIGO: 42, NOME: "Maria", ATIVO: "SIM" },
        { CODIGO: 43, NOME: "João", ATIVO: "SIM" },
      ],
      page: { totalRows: 2 },
    };
  },
  async addMember(
    groupId: number,
    data: { CODIGO: number; OPERADOR: number },
    context: CrmRequestContext,
  ) {
    await write("add-member", data, context, "user-groups", groupId);
    const row = { ...data, GRUPO: groupId, OPERADOR_NOME: "João", OPERADOR_ATIVO: "SIM" };
    state.members.push(row);
    return { data: row };
  },
  async removeMember(
    groupId: number,
    id: number,
    expected: { OPERADOR: number | null },
    context: CrmRequestContext,
  ) {
    await write("remove-member", { expected }, context, "user-groups", id);
    state.members.splice(
      state.members.findIndex((member) => member.CODIGO === id),
      1,
    );
  },
  async getUserShift(userId: number) {
    return { data: { CODIGO: userId, HORARIO: state.shift } };
  },
  async setShift(
    userId: number,
    target: number | null,
    expected: { HORARIO: number | null },
    context: CrmRequestContext,
  ) {
    await write("set-shift", { HORARIO: target, expected }, context, undefined, userId);
    state.shift = target;
    return { data: { CODIGO: userId, HORARIO: target } };
  },
  async registrationSchema() {
    state.reads.push("registration-schema");
    return { data: { fields: copy(fields) } };
  },
  async getRegistration(userId: number) {
    state.reads.push("registration");
    const detail = copy(state.detail);
    await wait(state.readDelay);
    return { data: { ...detail, record: { ...detail.record, CODIGO: userId } } };
  },
  async createRegistration(data: CatalogRecord, context: CrmRequestContext) {
    await write("create-registration", data, context);
    const { SENHA: _password, ...record } = data;
    state.detail = { record: { ...record, CODIGO: 70 }, version: "opaque-v2", fields };
    return { data: copy(state.detail) };
  },
  async updateRegistration(
    userId: number,
    changes: CatalogRecord,
    version: string,
    context: CrmRequestContext,
  ) {
    await write("update-registration", { changes, version }, context, undefined, userId);
    const { SENHA: _password, ...record } = changes;
    state.detail = {
      ...state.detail,
      record: { ...state.detail.record, ...record },
      version: "opaque-v2",
    };
    return { data: copy(state.detail) };
  },
};
