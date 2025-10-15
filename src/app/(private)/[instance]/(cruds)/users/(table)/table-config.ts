// Configuração centralizada das colunas da tabela de usuários
export const USERS_TABLE_COLUMNS = {
  CODIGO: {
    label: "Código",
    width: "6rem",
    placeholder: "Ex: 123",
  },
  NOME: {
    label: "Nome",
    width: "16rem",
    placeholder: "Nome do usuário...",
  },
  LOGIN: {
    label: "Login",
    width: "12rem",
    placeholder: "Nome de login...",
  },
  EMAIL: {
    label: "Email",
    width: "12rem",
    placeholder: "email@exemplo.com",
  },
  NIVEL: {
    label: "Nível",
    width: "12rem",
    options: [
      { value: "{{all}}", label: "Todos" },
      { value: "ADMIN", label: "Supervisor" },
      { value: "ATIVO", label: "Ativo" },
      { value: "RECEPTIVO", label: "Receptivo" },
      { value: "AMBOS", label: "Ambos" },
    ],
  },
  SETOR: {
    label: "Setor",
    width: "12rem",
    placeholder: "Setor...",
  },
  ACTIONS: {
    label: "Ações",
    width: "8rem",
  },
} as const;

export type ColumnKey = keyof typeof USERS_TABLE_COLUMNS;
