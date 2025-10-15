// Configuração centralizada das colunas da tabela de clientes
export const CUSTOMERS_TABLE_COLUMNS = {
  CODIGO: {
    label: "Código",
    width: "8rem",
    placeholder: "Ex: 123",
  },
  ATIVO: {
    label: "Ativo",
    width: "8rem",
    options: [
      { value: "{{all}}", label: "Ambos" },
      { value: "SIM", label: "Sim" },
      { value: "NAO", label: "Não" },
    ],
  },
  PESSOA: {
    label: "Tipo",
    width: "10rem",
    options: [
      { value: "{{all}}", label: "Ambos" },
      { value: "JUR", label: "Jurídica" },
      { value: "FIS", label: "Física" },
    ],
  },
  RAZAO: {
    label: "Razão Social",
    width: "16rem",
    placeholder: "Nome da empresa...",
  },
  CPF_CNPJ: {
    label: "CPF/CNPJ",
    width: "8rem",
    placeholder: "000.000.000-00",
  },
  CIDADE: {
    label: "Cidade",
    width: "8rem",
    placeholder: "Ex: São Paulo",
  },
  COD_ERP: {
    label: "Cód. ERP",
    width: "8rem",
    placeholder: "Código...",
  },
  ACTIONS: {
    label: "Ações",
    width: "8rem",
  },
} as const;

export type ColumnKey = keyof typeof CUSTOMERS_TABLE_COLUMNS;
