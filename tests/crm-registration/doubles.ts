import { performCrmOperation, pendingCrmOperations, acknowledgeCrmOperations, confirmCrmOperation } from "../../src/lib/crm-operation-journal";
import { useSyncExternalStore } from "react";
import type {
  CustomerCrmField,
  CustomerCrmRecord,
  CustomerCrmSnapshot,
  CustomerCrmBrandLink,
} from "../../src/lib/sdk-local/types/customer-crm.types";
const query = new URLSearchParams(location.search);
let auth = {
    instance: query.has("pilot") ? "odim" : "tenant-a",
    token: "token-a",
    user: { CODIGO: query.has("pilot") ? 534 : 1, NIVEL: query.has("operator") || query.has("pilot") ? "ATIVO" : "ADMIN" },
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
if (query.has("phones")) {
  for (const index of [1, 2, 3, 4]) {
    const names = index === 4 ? ["AREAFAX", "FAX", "DESCFAX"] : [`AREA${index}`, `FONE${index}`, `DESC_FONE${index}`, `OBS_FONE${index}`];
    for (const [part, name] of names.entries()) fields.push({ name, label: part === 0 ? `DDD do telefone ${index}` : part === 1 ? `Telefone ${index}` : part === 2 ? `Descrição do telefone ${index}` : `Observações do telefone ${index}`, group: "phones", type: part === 0 ? "integer" : "text", nullable: true, maxLength: 100 });
  }
}
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
      ...(query.has("phones") ? { AREA1: 11, FONE1: "33333333", DESC_FONE1: "Primeiro", OBS_FONE1: "Observação um", AREA2: 21, FONE2: "44444444", DESC_FONE2: "Segundo", OBS_FONE2: "Observação dois", AREA3: null, FONE3: null, DESC_FONE3: null, OBS_FONE3: null, AREAFAX: 31, FAX: "55555555", DESCFAX: "Quarto" } : {}),
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
  operatorId = 0;
  context() { return {instance:this.tenant,operatorId:this.operatorId,token:this.token,baseUrl:"http://fixture.invalid"}; }
  async pendingRegistrationOperations() { return query.has("transport") ? pendingCrmOperations(this.context()) : []; }
  async acknowledgeRegistrationOperations(customerId?:number) { if(query.has("transport"))await acknowledgeCrmOperations(this.context(),customerId); }
  async confirmRegistrationOperation(operationId:string) { return confirmCrmOperation(this.context(),operationId); }
  tenant = "tenant-a";
  token = "token-a";
  setRegistrationContext(tenant: string, token: string, operatorId=0) {
    this.operatorId=operatorId;
    this.tenant = tenant;
    this.token = token;
  }
  async getRegistrationOptions() {
    if (window.registrationTest.failRead || (query.has("transport") && sessionStorage.getItem("registration-readback-fails"))) throw new Error("read");
    return {
      customer: { fields, manualCode: false },
      contact: { fields: contactFields, manualCode: true },
    };
  }
  async getRegistration() {
    const tenant = this.tenant;
    window.registrationTest.reads.push(tenant);
    await wait(10);
    if (window.registrationTest.failRead || (query.has("transport") && sessionStorage.getItem("registration-readback-fails"))) throw new Error("read");
    return copy(window.registrationTest.record[tenant]);
  }
  async listRegistrationContacts() {
    if (window.registrationTest.failRead || (query.has("transport") && sessionStorage.getItem("registration-readback-fails"))) throw new Error("read");
    return copy(window.registrationTest.contacts);
  }
  async listRegistrationBrands() {
    if (window.registrationTest.failRead || (query.has("transport") && sessionStorage.getItem("registration-readback-fails"))) throw new Error("read");
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
    if(query.has("transport"))return performCrmOperation<CustomerCrmSnapshot>(this.context(),"POST","/api/customers/crm-customers",data);
    await this.write("create", data);
    return snapshot({ ...data, CODIGO: 52 });
  }
  async updateRegistration(_id: number, data: { changes: CustomerCrmRecord; version: string }) {
    if(query.has("transport"))return performCrmOperation<CustomerCrmSnapshot>(this.context(),"PATCH",`/api/customers/crm-customers/${_id}`,data);
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

if(query.has("pilot")) window.registrationTest.record.odim=copy(window.registrationTest.record["tenant-a"]);
if(query.has("transport")){
 const saved=JSON.parse(sessionStorage.getItem("registration-transport-fixture")||"null");
 if(saved){window.registrationTest.record=saved.record;window.registrationTest.writes=saved.writes;}
 const receipts:Record<string,any>=saved?.receipts??{};
 const original=window.fetch.bind(window);
 const json=(data:unknown)=>new Response(JSON.stringify({data}),{headers:{"Content-Type":"application/json"}});
 window.fetch=async(raw,init)=>{
  const path=new URL(String(raw),location.href).pathname;
  if(path==="/api/customers/operator-features")return json({managed:true,instance:"odim",operatorId:534,revision:"a".repeat(64),features:{operator:true,telephony:true,crm:true,whatsapp:true}});
  if(!path.startsWith("/api/customers/crm-customers"))return original(raw,init);
  if(path.includes("/operations/")){const id=path.split("/").at(-1)!;return json({operationId:id,outcome:window.registrationTest.failure==="verify"&&receipts[id]?"COMMITTED":"UNKNOWN",status:"unconfirmed",retryAllowed:false,result:receipts[id]});}
  const headers=init?.headers as Record<string,string>,id=headers["x-crm-operation-id"],data=JSON.parse(String(init?.body));
  if(!id)throw Error("Missing operation UUID");
  window.registrationTest.writes.push({kind:init?.method==="POST"?"create":"update",tenant:auth.instance,token:auth.token,data});
  const customerId=init?.method==="POST"?52:41;
  window.registrationTest.record[auth.instance]=snapshot({...window.registrationTest.record[auth.instance].record,...(data.changes??data),CODIGO:customerId});
  receipts[id]={entity:"customer",customerId,id:customerId};
  sessionStorage.setItem("registration-transport-fixture",JSON.stringify({record:window.registrationTest.record,writes:window.registrationTest.writes,receipts}));
  throw new TypeError("Fixture committed write, response lost");
 };
}
