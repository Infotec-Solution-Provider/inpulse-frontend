import type { CatalogDefinition, CatalogField } from "./crm-catalogs-form";
import type { CrmUserCatalogName } from "./sdk-local/types/crm-users.types";
const yesNo = [
  { value: "SIM", label: "Sim" },
  { value: "NAO", label: "Não" },
];
const description = (maxLength: number): CatalogField => ({
  key: "DESCRICAO",
  label: "Descrição",
  maxLength,
  required: true,
});
export const CRM_USER_CATALOGS: Record<CrmUserCatalogName, CatalogDefinition> = {
  "user-groups": {
    title: "Grupos de usuários",
    singular: "grupo de usuários",
    description: "Organize os grupos e seus membros no CRM.",
    identity: "CODIGO",
    fields: [description(35)],
  },
  shifts: {
    title: "Expedientes",
    singular: "expediente",
    description: "Mantenha os três intervalos de entrada e saída utilizados pelo CRM.",
    identity: "CODIGO",
    fields: [
      description(50),
      ...[1, 2, 3].flatMap((index) => [
        {
          key: `HORARIO_${index}`,
          group: `Intervalo ${index}`,
          label: `Usar intervalo ${index}`,
          kind: "enum",
          options: yesNo,
        } as CatalogField,
        {
          key: `ENTRADA_${index}`,
          group: `Intervalo ${index}`,
          label: `Entrada ${index}`,
          kind: "time",
          help: "Horário HH:mm:ss. Valores históricos são preservados.",
        } as CatalogField,
        {
          key: `SAIDA_${index}`,
          group: `Intervalo ${index}`,
          label: `Saída ${index}`,
          kind: "time",
          help: "Horário HH:mm:ss. Intervalos noturnos são permitidos.",
        } as CatalogField,
      ]),
    ],
  },
  "pause-reasons": {
    title: "Motivos de pausa",
    singular: "motivo de pausa",
    description: "Configure os motivos de pausa e os parâmetros utilizados pelo CRM.",
    identity: "CODIGO",
    fields: [
      description(50),
      {
        key: "TEMPO_MAX_SEG",
        group: "Regras da pausa",
        label: "Tempo máximo (segundos)",
        kind: "integer",
        minimum: 0,
        help: "Informe zero ou um número positivo de segundos.",
      },
      {
        group: "Regras da pausa",
        key: "PRODUTIVIDADE",
        label: "Conta como produtiva",
        kind: "enum",
        options: yesNo,
      },
    ],
  },
  "sales-types": {
    title: "Vendas · Cadastro legado",
    singular: "cadastro de venda",
    description: "Mantenha os códigos e valores do cadastro de vendas do CRM local.",
    identity: "ID",
    identityKind: "text",
    identityMaxLength: 4,
    expectedIncludesIdentity: true,
    sortable: false,
    fields: [
      { key: "NOME", label: "Nome", maxLength: 30, required: true },
      {
        key: "PAGAMENTO",
        label: "Pagamento",
        kind: "decimal",
        required: true,
        help: "Valor decimal conforme o cadastro do CRM local, entre -99,99 e 99,99.",
      },
      { key: "ID_COUNT", label: "Ocorrências do código", readOnly: true },
    ],
  },
};
export function isCrmUserCatalog(value: string): value is CrmUserCatalogName {
  return Object.hasOwn(CRM_USER_CATALOGS, value);
}
