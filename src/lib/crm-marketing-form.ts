import type {
  CrmMarketingField,
  CrmMarketingRecord,
  CrmMarketingValue,
  CrmSelectionCriteria,
} from "./sdk-local/types/crm-marketing.types";
export const crmLabels: Record<string, string> = {
  CODIGO: "Código",
  NOME: "Nome",
  TIPO: "Tipo",
  DATA_INI: "Data de início",
  MAX_RESPOSTA: "Limite de respostas",
  DESCRICAO: "Descrição",
  PRIORIDADE: "Prioridade",
  SQL_CAMPANHA: "Seleção da campanha",
  GERADO_LISTA: "Lista gerada",
  PAUSADA: "Campanha pausada",
  PAUSAR_AG_PUBLICA: "Pausar agenda pública",
  UNIDADE: "Unidade",
  OPERADOR: "Usuário",
  ESUCESSO: "Sucesso",
  EVENDA: "Venda",
  NOME_ACAO: "Nome da ação",
  ECONTATO: "Contato efetivo",
  COD_ACAO: "Ação do CRM",
  PROPOSTA: "Proposta",
  FIDELIZARCOTACAO: "Fidelizar cotação",
  PESQUISA_SATISFACAO: "Pesquisa de satisfação",
  EPEDIDO: "Pedido",
  QTDE_FIDELIZARCOTACAO: "Quantidade para fidelização",
  ALTERA_DURACAO: "Alterar duração",
  CANCELAPROPOSTA: "Cancelar proposta",
  UTILIZAR_AGENDA: "Usar na agenda",
  NAOECOMPRA: "Não é compra",
  ECOMPRA: "Compra",
  ENEGOCIACAO: "Negociação",
  WHATS_ACAO: "Ação no WhatsApp",
  WHATS_URGENCIA_AGENDAMENTO: "Urgência do agendamento",
  WHATS_ALTERAR_AGENDAMENTO: "Alterar agendamento pelo WhatsApp",
  FUNIL_STAGE: "Etapa do funil",
};
export type CrmDraft = Record<string, string | null>;
export function crmDraft(fields: CrmMarketingField[], row?: CrmMarketingRecord): CrmDraft {
  const draft: CrmDraft = { CODIGO: row ? String(row.CODIGO) : "" };
  for (const field of fields) {
    const value = row
      ? row[field.key]
      : field.key === "NOME"
        ? ""
        : field.type === "datetime" && field.nullable
          ? null
          : field.defaultValue;
    draft[field.key] = value == null ? null : String(value);
  }
  return draft;
}
export function crmExpected(
  fields: CrmMarketingField[],
  row: CrmMarketingRecord,
): Record<string, CrmMarketingValue> {
  return Object.fromEntries(fields.map((field) => [field.key, row[field.key]]));
}
export function crmPayload(
  fields: CrmMarketingField[],
  draft: CrmDraft,
  original?: CrmMarketingRecord,
) {
  const data: Record<string, CrmMarketingValue> = {};
  if (!original) {
    if (!/^[1-9]\d*$/.test(draft["CODIGO"] ?? "") || Number(draft["CODIGO"]) > 2147483647)
      throw new Error("Informe um código inteiro positivo.");
    data["CODIGO"] = Number(draft["CODIGO"]);
  }
  for (const field of fields.filter((value) => !value.readOnly)) {
    const raw = draft[field.key];
    if (
      original &&
      (raw === null ? original[field.key] === null : raw === String(original[field.key]))
    )
      continue;
    let value: CrmMarketingValue;
    if (raw === null) {
      if (!field.nullable)
        throw new Error(`${crmLabels[field.key] ?? field.key}: informe um valor.`);
      value = null;
    } else if (typeof raw !== "string") throw new Error("Preencha os campos do cadastro.");
    else if (field.type === "number") {
      if (
        !/^-?(?:0|[1-9]\d*)$/.test(raw) ||
        !Number.isSafeInteger(Number(raw)) ||
        Number(raw) < (field.min ?? -2147483648) ||
        Number(raw) > (field.max ?? 2147483647)
      )
        throw new Error(`${crmLabels[field.key] ?? field.key}: número inválido.`);
      value = Number(raw);
    } else if (field.type === "enum") {
      if (!field.values?.includes(raw))
        throw new Error(`${crmLabels[field.key] ?? field.key}: selecione uma opção válida.`);
      value = raw;
    } else if (field.type === "datetime") {
      const date = raw.replace("T", " "),
        parsed = new Date(`${date.replace(" ", "T")}Z`);
      if (
        !/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(date) ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 19) !== date.replace(" ", "T") ||
        Number(date.slice(0, 4)) < 1000
      )
        throw new Error("Data inválida. Use YYYY-MM-DD HH:mm:ss.");
      value = date;
    } else {
      value = raw.trim();
      if (
        [...value].length > (field.maxLength ?? 65535) ||
        /[^\u0020-\u007e\u00a0-\u00ff\r\n\t]/.test(value)
      )
        throw new Error(`${crmLabels[field.key] ?? field.key}: texto inválido ou muito longo.`);
      if (field.key === "NOME" && !value) throw new Error("Informe o nome.");
    }
    data[field.key] = value;
  }
  return data;
}
export function crmError(error: unknown) {
  let value = error;
  const seen = new Set<object>();
  while (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    const current = value as {
      response?: { status?: number; data?: { message?: unknown; outcome?: string } };
      cause?: unknown;
    };
    if (current.response) {
      const status = current.response.status;
      return {
        message:
          typeof current.response.data?.message === "string"
            ? current.response.data.message
            : "Não foi possível concluir a operação.",
        reconcile:
          status === 409 ||
          !status ||
          status >= 500 ||
          current.response.data?.outcome === "UNKNOWN",
        status,
      };
    }
    value = current.cause;
  }
  return {
    message: "Não foi possível confirmar a operação. Confira os dados antes de tentar novamente.",
    reconcile: true,
    status: undefined,
  };
}
export const initialSelection: CrmSelectionCriteria = {
  active: "SIM",
  unitId: null,
  segmentIds: [],
  groupIds: [],
  originIds: [],
  operatorIds: [],
  city: null,
  state: null,
};
