// Configuração centralizada das colunas da tabela de usuários
export const USERS_TABLE_COLUMNS = {
  CODIGO: {
    label: "Código",
    width: "100px",
    placeholder: "Ex: 123",
  },
  NOME: {
    label: "Nome",
    width: "300px",
    placeholder: "Nome do usuário...",
  },
  LOGIN: {
    label: "Login",
    width: "180px",
    placeholder: "Nome de login...",
  },
  EMAIL: {
    label: "Email",
    width: "280px",
    placeholder: "email@exemplo.com",
  },
  NIVEL: {
    label: "Nível",
    width: "120px",
    options: [
      { value: "", label: "Todos" },
      { value: "0", label: "Admin" },
      { value: "1", label: "Gerente" },
      { value: "2", label: "Usuário" },
    ],
  },
  SETOR: {
    label: "Setor",
    width: "150px",
    placeholder: "Setor...",
  },
  ACTIONS: {
    label: "Ações",
    width: "120px",
  },
} as const;

export type ColumnKey = keyof typeof USERS_TABLE_COLUMNS;
