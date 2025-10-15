// Configuração centralizada das colunas da tabela de grupos internos
export const INTERNAL_GROUPS_TABLE_COLUMNS = {
  ID: {
    label: "ID",
    width: "6rem",
    placeholder: "Ex: 123",
  },
  GROUP_NAME: {
    label: "Nome do Grupo",
    width: "16rem",
    placeholder: "Nome do grupo...",
  },
  STARTED_AT: {
    label: "Iniciado em",
    width: "12rem",
  },
  CREATOR: {
    label: "Criado por",
    width: "14rem",
  },
  PARTICIPANTS_COUNT: {
    label: "Participantes",
    width: "10rem",
  },
  ACTIONS: {
    label: "Ações",
    width: "8rem",
  },
} as const;

export type ColumnKey = keyof typeof INTERNAL_GROUPS_TABLE_COLUMNS;
