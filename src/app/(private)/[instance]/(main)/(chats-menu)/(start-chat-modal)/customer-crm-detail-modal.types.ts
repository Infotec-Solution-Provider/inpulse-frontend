import { Customer } from "@in.pulse-crm/sdk";

export interface CustomerContactDetail {
  CODIGO: string;
  NOME: string;
  CARGO: number | null;
  EMAIL: string | null;
  AREA_DIRETO: string | null;
  AREA_CEL: string | null;
  AREA_RESI: string | null;
  FONE_DIRETO: string | null;
  CELULAR: string | null;
  FONE_RESIDENCIAL: string | null;
  ANIVERSARIO: string | null;
  TIME_FUTEBOL: string | null;
  SEXO: "M" | "F" | null;
  FILHOS: number;
  CLIENTE: number | null;
  TRATAMENTO: string | null;
}

export interface CustomerCallHistoryDetail {
  CODIGO: number;
  OPERADOR: number | string;
  CLIENTE: number;
  RESULTADO: number;
  RESULTADO_NOME?: string | null;
  EXCEDEU: "SIM" | "NAO" | null;
  TEMPO_EXCEDIDO: string;
  FONE_RECEPTIVO: string;
  LIGACAO_RECEBIDA: string;
  LIGACAO_FINALIZADA: string;
  TIPO_ACAO: string;
  OBS: string | null;
  CANAL_ATENDIMENTO?: "Ligacao" | "WhatsApp";
  WHATSAPP_CHAT_ID?: number | null;
  WHATSAPP_CHAT_TIPO?: string | null;
  WHATSAPP_CHAT_INICIADO_EM?: string | null;
  WHATSAPP_CHAT_FINALIZADO_EM?: string | null;
  WHATSAPP_CHAT_FINALIZADO?: boolean | null;
  WHATSAPP_CONTATO_NOME?: string | null;
  WHATSAPP_CONTATO_FONE?: string | null;
}

export interface CustomerPurchaseDetail {
  CODIGO: number;
  CLIENTE: number;
  DATA: string;
  VALOR: number;
  DESCRICAO: string | null;
  FORMA_PGTO: string | null;
  OPERADOR: number | null;
  FATURADO: "S" | "N" | null;
  TIPO: string | null;
  SITUACAO: "F" | "C" | null;
  CLIENTEATIVO: number | null;
  items: Array<{
    purchaseCode: number;
    productCode: string | null;
    description: string | null;
    quantity: number | null;
    unit: string | null;
    unitValue: number | null;
    discount: number | null;
  }>;
}

export interface CustomerScheduleDetail {
  CODIGO: number;
  CLIENTE: number;
  CAMPANHA: number;
  CAMPANHA_NOME?: string | null;
  DT_RESULTADO: string;
  DT_AGENDAMENTO: string;
  RESULTADO: number;
  CONCLUIDO: "SIM" | "NAO" | null;
  FONE1: string;
  FONE2: string;
  FONE3: string;
  ORDEM: number;
  OPERADOR: number;
  OPERADOR_NOME?: string | null;
  OPERADOR_LIGACAO: number;
  OPERADOR_LIGACAO_NOME?: string | null;
  DATA_HORA_LIG: string;
  DATA_HORA_FIM: string;
  TELEFONE_LIGADO: string;
  AGENDA: number;
  DESC_FONE1: string | null;
  DESC_FONE2: string | null;
  DESC_FONE3: string | null;
  FIDELIZA: "S" | "N" | null;
  MANUAL: "S" | "N" | null;
}

export interface CustomerFullDetail {
  customer: Customer;
  campaign: { code: number | null; name: string | null; firstName: string | null };
  campaigns: Array<{ code: number; name: string | null }>;
  group: { code: number | null; description: string | null };
  origin: { code: number | null; description: string | null };
  media: { code: number | null; name: string | null };
  segment: { code: number | null; name: string | null };
  operator: { code: number | null; name: string | null };
  contacts: CustomerContactDetail[];
  callHistory: CustomerCallHistoryDetail[];
  purchases: CustomerPurchaseDetail[];
  schedules: CustomerScheduleDetail[];
  metadata: {
    purchaseItems: {
      mapped: boolean;
      tableName: string | null;
    };
    customNameFieldMapped: boolean;
  };
}
