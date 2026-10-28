import { useSyncExternalStore } from "react";
const listeners = new Set<() => void>();
let auth = {
  instance: "tenant-a",
  token: "token-a",
  status: "authenticated",
  user: { CODIGO: 7, NIVEL: "ADMIN" },
};
export function useAuthContext() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => auth,
  );
}
export function switchAuth(instance: string, token: string) {
  auth = { ...auth, instance, token };
  for (const listener of listeners) listener();
}
const field = (
  key: string,
  type = "text",
  defaultValue: any = null,
  nullable = true,
  extra: any = {},
) => ({ key, type, defaultValue, nullable, readOnly: false, ...extra });
const schemas: Record<string, any[]> = {
  campaigns: [
    field("NOME", "text", null, true, { maxLength: 150 }),
    field("TIPO", "enum", null, true, { values: ["ATIVOS", "INAT_R", "INAT_A", "PROSPE"] }),
    field("DATA_INI", "datetime", "0000-00-00 00:00:00"),
    field("MAX_RESPOSTA", "number", 0),
    field("PRIORIDADE", "number", 0, true, { readOnly: true }),
    field("PAUSADA", "enum", null, true, { values: ["SIM", "NAO"] }),
    field("SQL_CAMPANHA", "text", null, true, { readOnly: true }),
    field("GERADO_LISTA", "enum", null, true, { readOnly: true, values: ["SIM", "NAO"] }),
  ],
  results: [
    field("NOME", "text", null, true, { maxLength: 50 }),
    field("TIPO", "enum", null, true, { values: ["ATIVO", "RECEP", "AMBOS"] }),
    field("ECONTATO", "enum", "NAO", false, { values: ["SIM", "NAO"] }),
    field("EVENDA", "enum", null, true, { values: ["SIM", "NAO"] }),
    field("COD_ACAO", "number", null),
    field("NOME_ACAO", "text", null, true, { maxLength: 100 }),
  ],
};
const criteria = {
  active: "SIM",
  unitId: null,
  segmentIds: [],
  groupIds: [],
  originIds: [],
  operatorIds: [],
  city: null,
  state: null,
};
const makeCampaign = (name: string) => ({
  CODIGO: 10,
  NOME: name,
  TIPO: "ATIVOS",
  DATA_INI: "0000-00-00 00:00:00",
  MAX_RESPOSTA: 0,
  PRIORIDADE: 1,
  PAUSADA: "NAO",
  SQL_CAMPANHA: "managed-selection",
  GERADO_LISTA: "NAO",
});
const data: Record<string, any> = Object.fromEntries(
  ["tenant-a", "tenant-b"].map((tenant, index) => [
    tenant,
    {
      campaigns: [makeCampaign(index ? "Campanha B" : "Campanha A")],
      campaignMembers: [
        {
          CODIGO: 30,
          CAMPANHA: 10,
          OPERADOR: 8,
          OPERADOR_NOME: index ? "Bruno B" : "Bruno A",
          OPERADOR_ATIVO: "SIM",
          writable: true,
          occurrences: 1,
        },
        {
          CODIGO: 31,
          CAMPANHA: 10,
          OPERADOR: null,
          OPERADOR_NOME: null,
          OPERADOR_ATIVO: null,
          writable: false,
          occurrences: 1,
        },
        {
          CODIGO: 32,
          CAMPANHA: 10,
          OPERADOR: 9,
          OPERADOR_NOME: "Carla inativa",
          OPERADOR_ATIVO: "NAO",
          writable: true,
          occurrences: 1,
        },
      ],
      results: [
        {
          CODIGO: 1,
          NOME: "Contato",
          TIPO: "AMBOS",
          ECONTATO: "SIM",
          EVENDA: null,
          COD_ACAO: null,
          NOME_ACAO: null,
        },
      ],
      exceptions: {
        cities: [{ CIDADE: "São João", occurrences: 1 }],
        states: [],
        customers: [{ COD_ERP: "0001", occurrences: 1 }],
        segments: [],
      },
      configuration: {
        CODIGO: 10,
        SQL_CAMPANHA: "managed-selection",
        GERADO_LISTA: "NAO",
        criteria,
        managed: true,
      },
      ordering: {
        data: {
          CODIGO: 5,
          ORDERBY: "legacy-order",
          SEQUENCIADEORDENACAO: "POTENCIAL,CADASTRO",
          ORDENACAO_APENAS_CIDADE: "N",
        },
        criteria: ["POTENCIAL", "CADASTRO"],
        supportedCriteria: [
          "TIPODEAGENDAMENTO",
          "PRIORIDADECAMPANHA",
          "DATAAGENDAMENTO",
          "CIDADES",
          "ESTADOS",
          "SEGMENTOS",
          "POTENCIAL",
          "CADASTRO",
        ],
        managed: true,
      },
    },
  ]),
);
const calls: any[] = [];
const memberLookups: any[] = [];
let fault = "",
  release: (() => void) | null = null;
function copy<T>(value: T): T {
  return structuredClone(value);
}
function error(status: number, message: string, outcome?: string) {
  return { response: { status, data: { message, outcome } } };
}
async function mutate<T>(
  name: string,
  instance: string,
  token: string,
  payload: any,
  work: () => T,
) {
  calls.push({ name, instance, token, payload: copy(payload) });
  const mode = fault;
  fault = "";
  if (mode === "conflict") throw error(409, "O registro foi alterado. Recarregue os dados.");
  if (mode === "delay")
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  const result = work();
  if (mode === "unknown")
    throw error(503, "Não foi possível confirmar a gravação. Confira os dados.", "UNKNOWN");
  return copy(result);
}
const listQueries: any[] = [];
const orderingLists: Record<string, any> = {};
function orderedList(instance: string, kind: string, scope: string) {
  const key = `${instance}:${kind}:${scope}`;
  if (!orderingLists[key]) {
    let items: {
      id: string | number;
      name: string;
      uf?: string;
      validUf?: boolean;
      paused?: boolean;
    }[] =
      kind === "states"
        ? [
            { id: "SP", name: "São Paulo" },
            { id: "RJ", name: "Rio de Janeiro" },
          ]
        : Array.from({ length: kind === "campaigns" ? 12 : 1200 }, (_, i) => ({
            id: i + 1,
            name: `${kind === "segments" ? "Segmento" : kind === "cities" ? "Cidade" : "Campanha"} ${String(i + 1).padStart(4, "0")}`,
            ...(kind === "cities" ? { uf: i % 2 ? "SP" : "RJ", validUf: true } : {}),
            ...(kind === "campaigns" ? { paused: i === 1 } : {}),
          }));
    if (kind === "cities" && scope !== "national")
      items = items.filter((item: any) => item.uf === scope);
    orderingLists[key] = {
      kind,
      scope,
      revision: "revision-1",
      cityMode: data[instance].ordering.data.ORDENACAO_APENAS_CIDADE,
      items: items.map((item: any, i: number) => ({
        ...item,
        position: i + 1,
        storedOrder: i + 1,
      })),
      states: [
        { id: "SP", name: "São Paulo" },
        { id: "RJ", name: "Rio de Janeiro" },
      ],
      invalidUfCount: 0,
    };
  }
  return orderingLists[key];
}
export class MarketingClient {
  constructor(
    _url: string,
    private token: string,
    private instance: string,
  ) {}
  async schema(catalog: string) {
    return { fields: copy(schemas[catalog]) };
  }
  async list(catalog: string, params: any) {
    listQueries.push({ catalog, instance: this.instance, ...copy(params) });
    const rows = data[this.instance][catalog].filter(
      (row: any) => !params.NOME || row.NOME.includes(params.NOME),
    );
    return {
      data: copy(rows.slice((params.page - 1) * params.perPage, params.page * params.perPage)),
      page: { current: params.page, totalRows: rows.length },
    };
  }
  async detail(catalog: string, id: number) {
    const row = data[this.instance][catalog].find((row: any) => row.CODIGO === id);
    if (!row) throw error(404, "Não encontrado");
    return copy(row);
  }
  async create(catalog: string, payload: any) {
    return mutate("create", this.instance, this.token, payload, () => {
      const row = {
        ...Object.fromEntries(schemas[catalog].map((field) => [field.key, field.defaultValue])),
        ...payload,
      };
      data[this.instance][catalog].push(row);
      return row;
    });
  }
  async patch(catalog: string, id: number, payload: any) {
    return mutate("patch", this.instance, this.token, { id, ...payload }, () => {
      const row = data[this.instance][catalog].find((row: any) => row.CODIGO === id);
      Object.assign(row, payload.changes);
      return row;
    });
  }
  async remove(catalog: string, id: number, expected: any) {
    return mutate("remove", this.instance, this.token, { id, expected }, () => {
      data[this.instance][catalog] = data[this.instance][catalog].filter(
        (row: any) => row.CODIGO !== id,
      );
      return null;
    });
  }
  async actions() {
    return {
      supported: true,
      data: [
        { CODIGO: 1, NOME: "Concluir" },
        { CODIGO: 10, NOME: "Reagendar" },
      ],
    };
  }
  async options(kind: string, search: string) {
    const options: Record<string, any[]> = {
      units: [{ id: "1", label: "Matriz" }],
      groups: [{ id: "1", label: "Grupo um" }],
      segments: [{ id: "1", label: "Varejo" }],
      origins: [{ id: "1", label: "Indicação" }],
      operators: [{ id: "7", label: "Ana" }],
      cities: [{ id: "São João", label: "São João" }],
      states: [{ id: "RS", label: "Rio Grande do Sul" }],
    };
    return {
      supported: true,
      data: options[kind].filter(
        (item) => !search || item.label.toLowerCase().includes(search.toLowerCase()),
      ),
      page: { current: 1, hasNext: false },
    };
  }
  async exceptions(kind: string, params: any) {
    const rows = data[this.instance].exceptions[kind].filter(
      (row: any) => !params.search || String(Object.values(row)[0]).includes(params.search),
    );
    return { data: copy(rows), page: { current: 1, totalRows: rows.length } };
  }
  async createException(kind: string, payload: any) {
    return mutate("createException", this.instance, this.token, payload, () => {
      const row = {
        ...payload,
        ...(kind === "segments" ? { CODIGO: 5, SEGMENTO_NOME: "Varejo" } : {}),
        occurrences: 1,
      };
      data[this.instance].exceptions[kind].push(row);
      return row;
    });
  }
  async patchException(kind: string, changes: any, expected: any) {
    return mutate("patchException", this.instance, this.token, { changes, expected }, () => {
      const key = Object.keys(changes)[0],
        row = data[this.instance].exceptions[kind].find((row: any) => row[key] === expected[key]);
      Object.assign(row, changes);
      return row;
    });
  }
  async removeException(kind: string, expected: any) {
    return mutate("removeException", this.instance, this.token, expected, () => {
      const key = kind === "segments" ? "SEGMENTO" : Object.keys(expected)[0];
      data[this.instance].exceptions[kind] = data[this.instance].exceptions[kind].filter(
        (row: any) => row[key] !== expected[key],
      );
      return null;
    });
  }
  async inspectException(kind: string, target: any) {
    const key = Object.keys(target)[0];
    return copy(
      data[this.instance].exceptions[kind]
        .filter((row: any) => row[key] === target[key])
        .map((row: any) => ({
          [key]: row[key],
          ...(kind === "segments" ? { CODIGO: row.CODIGO } : {}),
        })),
    );
  }
  async configuration(_id: number) {
    return copy(data[this.instance].configuration);
  }
  async campaignMembers(_id: number) {
    if (fault === "member-read") {
      fault = "";
      throw new Error("Simulated read failure");
    }
    return { data: copy(data[this.instance].campaignMembers) };
  }
  async campaignMemberOptions(id: number, search = "", page = 1) {
    memberLookups.push({ id, search, page, instance: this.instance, token: this.token });
    const options = Array.from({ length: 25 }, (_, index) => ({
      CODIGO: index + 1,
      NOME: `Usuário ${index + 1}`,
      ATIVO: "SIM",
    }));
    const rows = options.filter(
      (row) => !search || row.NOME.toLowerCase().includes(search.toLowerCase()),
    );
    return {
      data: rows.slice((page - 1) * 20, page * 20),
      page: { current: page, hasNext: page * 20 < rows.length },
    };
  }
  async addCampaignMember(id: number, payload: any) {
    return mutate("addCampaignMember", this.instance, this.token, { id, ...payload }, () => {
      const row = {
        ...payload,
        CAMPANHA: id,
        OPERADOR_NOME: `Usuário ${payload.OPERADOR}`,
        OPERADOR_ATIVO: "SIM",
        writable: true,
        occurrences: 1,
      };
      data[this.instance].campaignMembers.push(row);
      return { data: row };
    });
  }
  async removeCampaignMember(id: number, linkId: number, expected: any) {
    return mutate(
      "removeCampaignMember",
      this.instance,
      this.token,
      { id, linkId, expected },
      () => {
        data[this.instance].campaignMembers = data[this.instance].campaignMembers.filter(
          (row: any) => row.CODIGO !== linkId,
        );
        return null;
      },
    );
  }
  async preview(criteria: any) {
    calls.push({
      name: "preview",
      instance: this.instance,
      token: this.token,
      payload: copy(criteria),
    });
    return {
      criteria: copy(criteria),
      totalRows: 3,
      generatedSql: "server-generated",
      excludes: ["cities", "states", "customers", "segments"],
    };
  }
  async configure(id: number, criteria: any, expected: any) {
    return mutate("configure", this.instance, this.token, { id, criteria, expected }, () => {
      data[this.instance].configuration = {
        ...data[this.instance].configuration,
        criteria,
        SQL_CAMPANHA: "new-managed",
        GERADO_LISTA: "NAO",
      };
      return data[this.instance].configuration;
    });
  }
  async ordering() {
    return copy(data[this.instance].ordering);
  }
  async saveOrdering(criteria: any, expected: any, cityMode?: string) {
    return mutate(
      "saveOrdering",
      this.instance,
      this.token,
      { criteria, expected, ...(cityMode ? { cityMode } : {}) },
      () => {
        data[this.instance].ordering = {
          ...data[this.instance].ordering,
          criteria,
          data: {
            ...expected,
            ORDERBY: "new-order",
            SEQUENCIADEORDENACAO: criteria.join(","),
            ORDENACAO_APENAS_CIDADE: cityMode ?? expected.ORDENACAO_APENAS_CIDADE,
          },
        };
        return data[this.instance].ordering;
      },
    );
  }
  async catalogOrdering(kind: string, scope: string) {
    return copy(orderedList(this.instance, kind, scope));
  }
  async saveCatalogOrdering(kind: string, payload: any) {
    return mutate("saveCatalogOrdering", this.instance, this.token, { kind, ...payload }, () => {
      const list = orderedList(this.instance, kind, payload.scope);
      if (payload.revision !== list.revision)
        throw error(409, "A lista foi alterada. Recarregue os dados.");
      list.items = payload.ids.map((id: any, i: number) => ({
        ...list.items.find((item: any) => item.id === id),
        position: i + 1,
        storedOrder: i + 1,
      }));
      list.revision = `revision-${Number(list.revision.split("-")[1]) + 1}`;
      return list;
    });
  }
}
export class GenerationClient {
  constructor(
    _url: string,
    private token: string,
    private instance: string,
  ) {}
  async preview(id: number, payload: any) {
    calls.push({
      name: "generationPreview",
      instance: this.instance,
      token: this.token,
      payload: { id, ...copy(payload) },
    });
    return {
      ...payload,
      eligibleCount: data[this.instance].generationRemaining ?? 3,
      batchCount: Math.min(data[this.instance].generationRemaining ?? 3, 2000),
      alreadyLinkedCount: data[this.instance].generationLinked ?? 2,
      limit: 2000,
      expected: {
        SQL_CAMPANHA: data[this.instance].configuration.SQL_CAMPANHA,
        GERADO_LISTA: data[this.instance].configuration.GERADO_LISTA,
        alreadyLinkedCount: data[this.instance].generationLinked ?? 2,
        eligibleCount: data[this.instance].generationRemaining ?? 3,
      },
    };
  }
  async generate(id: number, payload: any) {
    return mutate("generate", this.instance, this.token, { id, ...payload }, () => {
      const remaining = (data[this.instance].generationRemaining ?? 3) - payload.expectedCount;
      data[this.instance].generationRemaining = remaining;
      data[this.instance].generationLinked =
        (data[this.instance].generationLinked ?? 2) + payload.expectedCount;
      data[this.instance].configuration.GERADO_LISTA = remaining > 0 ? "NAO" : "SIM";
      return {
        insertedCount: payload.expectedCount,
        GERADO_LISTA: data[this.instance].configuration.GERADO_LISTA,
        hasMore: remaining > 0,
      };
    });
  }
}
(window as any).crmHarness = {
  queries: () => copy(listQueries),
  switchAuth,
  fault: (mode: string) => {
    fault = mode;
  },
  calls: () => copy(calls),
  memberLookups: () => copy(memberLookups),
  setGenerationRemaining: (value: number) => {
    data["tenant-a"].generationRemaining = value;
  },
  release: () => {
    release?.();
    release = null;
  },
  mutate: (name: string, key: string, value: any) => {
    data["tenant-a"][name][key] = value;
  },
  setRole: (role: string) => {
    auth = { ...auth, user: { ...auth.user, NIVEL: role } };
    for (const listener of listeners) listener();
  },
};
