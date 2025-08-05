import toDateString from "@/lib/utils/date-string";
import { User, WppSector } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { DetailedSchedule } from "../../whatsapp-context";

interface Props {
  chat: DetailedSchedule;
  users: User[];
  sectors: { id: number; name: string }[];
}

export default function getScheduleProps({ chat, users, sectors }: Props) {
  const type = "schedule";
  const title = chat.contact.name;
  const startedAt = "Não Iniciado";
  const scheduledAt = toDateString(chat.scheduledAt);
  const scheduledTo = toDateString(chat.scheduleDate);
  const user = users.find((u) => u.CODIGO === chat.scheduledFor);
  const userName = user ? user.NOME : "Usuário Excluído";
  const sector = sectors.find((s) => s.id === chat.sectorId);
  const sectorName = sector ? sector.name : "N/D";
  const scheduledFor = user ? user.NOME : "Usuário Excluído";
  let customerName: string | null = null;
  let customerDocument: string | null = null;
  const contactNumber = Formatter.phone(chat.contact.phone);

  if (chat.customer) {
    customerName = chat.customer.RAZAO || "RAZAO não informada";
    customerDocument = chat.customer.CPF_CNPJ || "CPF/CNPJ não informado";
  }

  return {
    type: type as "schedule",
    title,
    startedAt,
    scheduledAt,
    scheduledTo,
    scheduledFor,
    userName,
    sectorName,
    contactNumber,
    customerName,
    customerDocument,
    isScheduled: true,
  };
}
