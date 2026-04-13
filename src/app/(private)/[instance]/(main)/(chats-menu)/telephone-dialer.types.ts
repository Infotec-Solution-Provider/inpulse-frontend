import { CustomerTelephonySchedule } from "@in.pulse-crm/sdk";

export interface TelephoneQueuePhoneOption {
  key: "FONE1" | "FONE2" | "FONE3";
  phone: string;
  description: string | null;
}

export interface TelephoneQueueItem {
  id: number;
  campaignClientId: number;
  customerId: number | null;
  contactName: string;
  phone: string;
  phoneOptions: TelephoneQueuePhoneOption[];
  hasWhatsapp: boolean;
  scheduledAt: string;
  campaignName: string;
  customerName: string | null;
  customerFantasyName: string | null;
  notes: string | null;
  operatorName: string | null;
  linkedOperatorName: string | null;
  status: "pending" | "dialing" | "done";
  raw: CustomerTelephonySchedule;
}

export interface TelephoneFinishResult {
  id: number;
  name: string;
  COD_ACAO?: number | null;
}

function cleanPhone(phone?: string | null) {
  return phone?.trim() || "";
}

export function mapTelephonyScheduleToQueueItem(
  schedule: CustomerTelephonySchedule,
): TelephoneQueueItem {
  const phoneOptions = [
    {
      key: "FONE1",
      phone: cleanPhone(schedule.FONE1),
      description: schedule.DESC_FONE1,
    },
    {
      key: "FONE2",
      phone: cleanPhone(schedule.FONE2),
      description: schedule.DESC_FONE2,
    },
    {
      key: "FONE3",
      phone: cleanPhone(schedule.FONE3),
      description: schedule.DESC_FONE3,
    },
  ] as TelephoneQueuePhoneOption[];

  const availablePhoneOptions = phoneOptions.filter((item) => Boolean(item.phone));

  const mainPhone = availablePhoneOptions[0]?.phone || "";
  const customerName = schedule.CLIENTE_RAZAO || schedule.CLIENTE_FANTASIA || null;
  const contactName = schedule.CLIENTE_FANTASIA || schedule.CLIENTE_RAZAO || "Cliente sem identificacao";
  const notes = availablePhoneOptions.find((item) => item.phone === mainPhone)?.description || null;

  return {
    id: schedule.CODIGO,
    campaignClientId: schedule.CODIGO,
    customerId: schedule.CLIENTE ?? null,
    contactName,
    phone: mainPhone,
    phoneOptions: availablePhoneOptions,
    hasWhatsapp: Boolean(mainPhone),
    scheduledAt: String(schedule.DT_AGENDAMENTO),
    campaignName: schedule.CAMPANHA_NOME || "Campanha sem nome",
    customerName,
    customerFantasyName: schedule.CLIENTE_FANTASIA || null,
    notes,
    operatorName: schedule.OPERADOR_NOME || null,
    linkedOperatorName: schedule.OPERADOR_LIGACAO_NOME || null,
    status: schedule.CONCLUIDO === "SIM" ? "done" : "pending",
    raw: schedule,
  };
}