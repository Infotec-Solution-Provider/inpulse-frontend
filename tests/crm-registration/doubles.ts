import { useSyncExternalStore } from "react";
import type {
  CustomerCrmField,
  CustomerCrmRecord,
  CustomerCrmSnapshot,
  CustomerCrmBrandLink,
} from "../../src/lib/sdk-local/types/customer-crm.types";
const query = new URLSearchParams(location.search);
let auth = {
    instance: "tenant-a",
    token: "token-a",
    user: { CODIGO: 1, NIVEL: query.has("operator") ? "ATIVO" : "ADMIN" },
  },
  authSnapshot = JSON.stringify(auth);
const listeners = new Set<() => void>();
export function switchAuth(tenant: string, token: string) {
  auth = { ...auth, instance: tenant, token };
  authSnapshot = JSON.stringify(auth);
  listeners.forEach((listener) => listener());
}
export function useAuthContext() {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => authSnapshot,
  );
  return auth;
}
export const router = {
  push(path: string) {
    window.registrationTest.navigation.push(path);
  },
  replace(path: string) {
    window.registrationTest.navigation.push(path);
  },
};
export const useRouter = () => router;
const fields: CustomerCrmField[] = [
  {
    name: "RAZAO",
    label: "Razão social ou nome",
    group: "identification",
    type: "text",
    nullable: false,
    required: true,
    maxLength: 100,
  },
  {
    name: "FANTASIA",
    label: "Nome fantasia",
    group: "identification",
    type: "text",
    nullable: true,
    maxLength: 60,
  },
  {
    name: "ATIVO",
    label: "Ativo",
    group: "identification",
    type: "enum",
    nullable: true,
    options: ["SIM", "NAO"],
  },
  {
    name: "END_RUA",
    label: "Rua e número",
    group: "address",
    type: "text",
    nullable: true,
    maxLength: 100,
  },
  { name: "EMAIL", label: "E-mail", group: "phones", type: "text", nullable: true, maxLength: 150 },
  {
    name: "GRUPO",
    label: "Grupo de clientes",
    group: "origin",
    type: "integer",
    nullable: true,
    lookup: "customer-groups",
  },
  {
    name: "OBS_ADMIN",
    label: "Observações administrativas",
    group: "administration",
    type: "text",
    nullable: true,
    maxLength: 65535,
  },
];
const contactFields: CustomerCrmField[] = [
  {
    name: "NOME",
    label: "Nome",
    group: "identification",
    type: "text",
    nullable: false,
    required: true,
    maxLength: 80,
  },
  {
    name: "CARGO",
    label: "Cargo",
    group: "identification",
    type: "integer",
    nullable: true,
    lookup: "positions",
  },
  {
    name: "ANIVERSARIO",
    label: "Aniversário",
    group: "identification",
    type: "date",
    nullable: true,
  },
  { name: "EMAIL", label: "E-mail", group: "phones", type: "text", nullable: true, maxLength: 150 },
  {
    name: "CELULAR",
    label: "Celular",
    group: "phones",
    type: "text",
    nullable: true,
    maxLength: 11,
  },
];
const snapshot = (record: CustomerCrmRecord, contact = false): CustomerCrmSnapshot => ({
  record,
  version: String(record.RAZAO ?? record.NOME ?? "")
    .padEnd(64, "0")
    .slice(0, 64),
  fields: contact ? contactFields : fields,
  writable: true,
  manualCode: contact,
});
interface State {
  record: Record<string, CustomerCrmSnapshot>;
  contacts: CustomerCrmSnapshot[];
  brands: CustomerCrmBrandLink[];
  writes: { kind: string; tenant: string; token: string; data: unknown }[];
  navigation: string[];
  failure: string;
  delay: number;
  failRead: boolean;
  reads: string[];
}
declare global {
  interface Window {
    registrationTest: State;
  }
}
window.registrationTest = {
  record: {
    "tenant-a": snapshot({
      CODIGO: 41,
      RAZAO: "Cliente A",
      FANTASIA: "Nome anterior",
      ATIVO: "SIM",
      END_RUA: "Rua anterior",
      EMAIL: "a@teste.com",
      GRUPO: 0,
      OBS_ADMIN: null,
    }),
    "tenant-b": snapshot({
      CODIGO: 41,
      RAZAO: "Cliente B",
      FANTASIA: "Outro tenant",
      ATIVO: "SIM",
      END_RUA: null,
      EMAIL: null,
      GRUPO: 1,
      OBS_ADMIN: null,
    }),
  },
  contacts: [],
  brands: [
    {
      record: { CODIGO: 1, CLIENTE: 41, MARCA: 1, DATA_ULTIMA_COMPRA: "2026-10-01", OPERADOR: 1 },
      brandName: "Marca histórica",
      version: "history",
      removable: false,
    },
  ],
  writes: [],
  navigation: [],
  failure: "",
  delay: 0,
  failRead: false,
  reads: [],
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function failure(mode: string) {
  if (!mode) return;
  if (mode === "network") throw new Error("timeout");
  throw new Error("wrapped", {
    cause: {
      response: {
        status: mode === "unknown" ? 503 : 409,
        data: {
          code: mode === "conflict" ? "CRM_REGISTRATION_CHANGED" : "CRM_REGISTRATION_WRITE_UNKNOWN",
          message:
            mode === "conflict"
              ? "O cadastro foi alterado por outra pessoa."
              : "Não foi possível confirmar a gravação.",
          ...(mode === "unknown" ? { outcome: "UNKNOWN" } : {}),
        },
      },
    },
  });
}
export class FakeCrmClient {
  tenant = "tenant-a";
  token = "token-a";
  setRegistrationContext(tenant: string, token: string) {
    this.tenant = tenant;
    this.token = token;
  }
  async getRegistrationOptions() {
    if (window.registrationTest.failRead) throw new Error("read");
    return {
      customer: { fields, manualCode: false },
      contact: { fields: contactFields, manualCode: true },
    };
  }
  async getRegistration() {
    const tenant = this.tenant;
    window.registrationTest.reads.push(tenant);
    await wait(10);
    if (window.registrationTest.failRead) throw new Error("read");
    return copy(window.registrationTest.record[tenant]);
  }
  async listRegistrationContacts() {
    if (window.registrationTest.failRead) throw new Error("read");
    return copy(window.registrationTest.contacts);
  }
  async listRegistrationBrands() {
    if (window.registrationTest.failRead) throw new Error("read");
    return copy(window.registrationTest.brands);
  }
  async write(kind: string, data: unknown) {
    const tenant = this.tenant,
      token = this.token,
      mode = window.registrationTest.failure;
    window.registrationTest.writes.push({ kind, tenant, token, data: copy(data) });
    await wait(window.registrationTest.delay);
    failure(mode);
    return tenant;
  }
  async createRegistration(data: CustomerCrmRecord) {
    await this.write("create", data);
    return snapshot({ ...data, CODIGO: 52 });
  }
  async updateRegistration(_id: number, data: { changes: CustomerCrmRecord; version: string }) {
    const tenant = await this.write("update", data);
    const next = snapshot({ ...window.registrationTest.record[tenant].record, ...data.changes });
    window.registrationTest.record[tenant] = next;
    return copy(next);
  }
  async createRegistrationContact(id: number, data: CustomerCrmRecord) {
    await this.write("contact.create", data);
    const next = snapshot({ ...data, CLIENTE: id }, true);
    window.registrationTest.contacts.push(next);
    return copy(next);
  }
  async updateRegistrationContact(
    _id: number,
    contactId: number,
    data: { changes: CustomerCrmRecord; version: string },
  ) {
    await this.write("contact.update", data);
    const index = window.registrationTest.contacts.findIndex(
      (row) => row.record.CODIGO === contactId,
    );
    const next = snapshot(
      { ...window.registrationTest.contacts[index].record, ...data.changes },
      true,
    );
    window.registrationTest.contacts[index] = next;
    return copy(next);
  }
  async deleteRegistrationContact(_id: number, contactId: number, version: string) {
    await this.write("contact.delete", { contactId, version });
    window.registrationTest.contacts = window.registrationTest.contacts.filter(
      (item) => item.record.CODIGO !== contactId,
    );
  }
  async createRegistrationBrand(id: number, brandId: number) {
    await this.write("brand.create", { MARCA: brandId });
    const next = {
      record: { CODIGO: 2, CLIENTE: id, MARCA: brandId, DATA_ULTIMA_COMPRA: null, OPERADOR: 1 },
      brandName: "Marca real",
      version: "brand",
      removable: true,
    };
    window.registrationTest.brands.push(next);
    return copy(next);
  }
  async deleteRegistrationBrand(_id: number, linkId: number, version: string) {
    await this.write("brand.delete", { linkId, version });
    window.registrationTest.brands = window.registrationTest.brands.filter(
      (item) => item.record.CODIGO !== linkId,
    );
  }
  async registrationLookup(kind: string) {
    return {
      data: [
        {
          id: "1",
          label:
            kind === "brands" ? "Marca real" : kind === "positions" ? "Cargo real" : "Grupo real",
        },
      ],
      page: { current: 1, hasNext: false },
    };
  }
  async getSegments() {
    return [];
  }
  async getOperators() {
    return [];
  }
  async getCampaigns() {
    return [];
  }
}
