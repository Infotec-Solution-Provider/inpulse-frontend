// Configuração centralizada das colunas da tabela de contatos
export const CONTACTS_TABLE_COLUMNS = {
  ID: {
    label: "ID",
    width: "8rem",
    placeholder: "ID...",
  },
  NAME: {
    label: "Nome",
    width: "16rem",
    placeholder: "Nome do contato...",
  },
  PHONE: {
    label: "Telefone",
    width: "12rem",
    placeholder: "Telefone...",
  },
  ACTIONS: {
    label: "Ações",
    width: "8rem",
  },
} as const;

export type ColumnKey = keyof typeof CONTACTS_TABLE_COLUMNS;

