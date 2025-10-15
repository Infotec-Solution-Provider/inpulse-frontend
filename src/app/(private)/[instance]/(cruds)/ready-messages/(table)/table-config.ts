// Configuração centralizada das colunas da tabela de mensagens prontas
export const READY_MESSAGES_TABLE_COLUMNS = {
  CODIGO: {
    label: "Código",
    width: "6rem",
    placeholder: "Ex: 123",
  },
  TITULO: {
    label: "Título",
    width: "14rem",
    placeholder: "Título da mensagem...",
  },
  ARQUIVO: {
    label: "Arquivo",
    width: "12rem",
  },
  TEXTO_MENSAGEM: {
    label: "Mensagem",
    width: "20rem",
  },
  SETOR: {
    label: "Setor",
    width: "12rem",
    placeholder: "Setor...",
  },
  LAST_UPDATE: {
    label: "Última Modificação",
    width: "12rem",
  },
  ACTIONS: {
    label: "Ações",
    width: "8rem",
  },
} as const;

export type ColumnKey = keyof typeof READY_MESSAGES_TABLE_COLUMNS;
