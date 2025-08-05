import filesService from "@/lib/services/files.service";
import toDateString from "@/lib/utils/date-string";
import { User, WppSector } from "@in.pulse-crm/sdk";
import { DetailedInternalChat } from "../../internal-context";

interface Props {
  chat: DetailedInternalChat;
  users: User[];
  sectors: { id: number; name: string }[];
}

export default function getInternalChatProps({ chat, users, sectors }: Props) {
  const type = chat.isGroup ? "internal-group" : ("internal-chat" as const);
  let title: string = "Sem Título";
  const startedAt = chat.startedAt ? toDateString(chat.startedAt) : "N/D";
  let finishedAt: string = "N/D";
  let userName: string = "N/D";
  let imageUrl: string | null = null;
  let participants: string[] = [];
  let description: string | null = null;

  if (!chat.startedAt) {
    finishedAt = "Não iniciado";
  } else if (!chat.finishedAt) {
    finishedAt = "Em andamento";
  } else {
    const dateStr = toDateString(chat.finishedAt);
    finishedAt = dateStr ? dateStr : "N/D";
  }

  const creator = users.find((u) => u.CODIGO === chat.creatorId);
  userName = creator ? creator.NOME : "Usuário Excluído";
  const sector = sectors.find((s) => s.id === creator?.SETOR);
  const sectorName = sector ? sector.name : "N/D";

  if (chat.isGroup) {
    title = chat.groupName || "Grupo sem nome";
    chat.groupImageFileId && (imageUrl = filesService.getFileDownloadUrl(chat.groupImageFileId));

    description = chat.groupDescription || null;
    participants = chat.users.map((u) => u.NOME);
  }
  if (!chat.isGroup) {
    const otherParticipant = chat.participants.find((p) => p.userId !== chat.creatorId);
    const otherUser = otherParticipant && users.find((u) => u.CODIGO === otherParticipant.userId);
    otherUser?.AVATAR_ID && (imageUrl = filesService.getFileDownloadUrl(otherUser.AVATAR_ID));

    title = `${creator?.NOME || "Usuário Excluído"} e ${otherUser?.NOME || "Usuário Excluído"}`;
  }

  return {
    type: type as "internal-group" | "internal-chat",
    title,
    startedAt,
    finishedAt,
    userName,
    sectorName,
    imageUrl,
    participants,
    description,
    isScheduled: false,
  };
}
