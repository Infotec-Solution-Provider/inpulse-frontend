import toDateString from "@/lib/utils/date-string";
import { User, WppSector } from "@in.pulse-crm/sdk";
import { DetailedChat } from "../../whatsapp-context";

interface Props {
  chat: DetailedChat;
  users: User[];
  sectors: { id: number; name: string }[];
}

export default function getWppChatProps({ chat, users, sectors }: Props) {
  const isScheduled = chat.schedule ? true : false;
  const type = isScheduled ? "scheduled-chat" : "external-chat";
  const title: string = chat.contact?.name || "Contato excluído";
  const user = users.find((u) => u.CODIGO === chat.userId);
  let userName = user ? user.NOME : "Usuário Excluído";
  const sector = user && sectors.find((s) => s.id === chat.sectorId);
  const sectorName = sector ? sector.name : "N/D";
  const startedAt = chat.startedAt ? toDateString(chat.startedAt) : "N/D";
  let finishedAt: string = "N/D";
  const imageUrl: string | null = chat.avatarUrl || null;
  let customerName: string | null = null;
  let customerDocument: string | null = null;
  let contactNumber: string | null = null;
  let scheduledAt: string | null = null;
  let scheduledTo: string | null = null;

  if (chat.userId === -1) {
    userName = "Supervisão";
  }

  if (!chat.startedAt) {
    finishedAt = "Não iniciado";
  } else if (!chat.finishedAt) {
    finishedAt = "Em andamento";
  } else {
    const dateStr = toDateString(chat.finishedAt);
    finishedAt = dateStr ? dateStr : "N/D";
  }

  if (chat.customer) {
    customerName = chat.customer.RAZAO || "RAZAO não informada";
    customerDocument = chat.customer.CPF_CNPJ || "CPF/CNPJ não informado";
    contactNumber = chat.contact?.phone || "N/D";
  }

  if (chat.schedule) {
    scheduledAt = chat.schedule.scheduledAt ? toDateString(chat.schedule.scheduledAt) : null;
    scheduledTo = chat.schedule.scheduleDate ? toDateString(chat.schedule.scheduleDate) : null;
  }

  return {
    type: type as "external-chat" | "scheduled-chat",
    title,
    startedAt,
    finishedAt,
    userName,
    sectorName,
    imageUrl,
    customerName,
    customerDocument,
    contactNumber,
    scheduledAt,
    scheduledTo,
    isScheduled,
  };
}
