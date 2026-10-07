import type { User } from "@/lib/sdk-local";
import filesService from "@/lib/services/files.service";
import toDateString from "@/lib/utils/date-string";
import { Formatter } from "@in.pulse-crm/utils";
import type { DetailedInternalChat } from "../../internal-context";
import type { MonitorItem } from "../types";

export function getMonitorParticipants(chat: DetailedInternalChat, users: User[]): User[] {
  if (chat.users?.length) return chat.users;
  const ids = new Set((chat.participants ?? []).map((participant) => participant.userId));
  return users.filter((user) => ids.has(user.CODIGO));
}

export default function getMonitorCardProps(
  chat: MonitorItem,
  users: User[],
  sectors: { id: number; name: string }[],
) {
  const isSchedule = !("chatType" in chat);
  const internal = !isSchedule && chat.chatType === "internal" ? chat : null;
  const external = isSchedule || chat.chatType === "wpp" ? chat : null;
  const participants = internal ? getMonitorParticipants(internal, users) : [];
  const ownerId = isSchedule
    ? chat.scheduledFor
    : chat.chatType === "internal"
      ? chat.creatorId
      : chat.userId;
  const owner = users.find((user) => user.CODIGO === ownerId);
  const sectorId = chat.sectorId ?? owner?.SETOR;
  const title = internal
    ? internal.isGroup
      ? internal.groupName || "Grupo interno"
      : participants.map((user) => user.NOME).join(" e ") || "Conversa interna"
    : external?.contact?.name || "Contato excluído";
  const type = isSchedule
    ? "schedule"
    : internal
      ? internal.isGroup
        ? "internal-group"
        : "internal-chat"
      : chat.isFinished
        ? "finished-chat"
        : "external-chat";
  const schedule = isSchedule ? chat : chat.chatType === "wpp" ? chat.schedule : null;
  let contactNumber = external?.contact?.phone || null;
  if (contactNumber) {
    try {
      contactNumber = Formatter.phone(contactNumber);
    } catch {
      /* Preserve unformatted value. */
    }
  }
  const avatarId = internal?.isGroup ? internal.groupImageFileId : participants[0]?.AVATAR_ID;
  return {
    type,
    chatTitle: title,
    userName: owner?.NOME || "Supervisão",
    sectorName: sectors.find((sector) => sector.id === sectorId)?.name || "",
    startDate: isSchedule ? "Não iniciado" : toDateString(chat.startedAt),
    endDate: isSchedule ? null : chat.finishedAt ? toDateString(chat.finishedAt) : null,
    imageUrl:
      !isSchedule && chat.chatType === "wpp"
        ? chat.avatarUrl
        : avatarId
          ? filesService.getFileDownloadUrl(avatarId)
          : "",
    customerName: external ? external.customer?.RAZAO || "Sem cliente associado" : null,
    customerDocument: external?.customer
      ? external.customer.CPF_CNPJ || "Documento não informado"
      : null,
    contactNumber,
    participants: participants.map((user) => user.NOME),
    groupName: internal?.groupName,
    groupDescription: internal?.groupDescription,
    isScheduled: Boolean(schedule),
    scheduledAt: schedule ? toDateString(schedule.scheduledAt) : null,
    scheduledFor: schedule ? toDateString(schedule.scheduleDate) : null,
    operational: chat.operational,
  } as const;
}
