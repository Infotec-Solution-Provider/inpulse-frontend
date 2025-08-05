import { User, WppSector } from "@in.pulse-crm/sdk";
import { DetailedInternalChat } from "../../internal-context";
import { DetailedChat, DetailedSchedule } from "../../whatsapp-context";
import getScheduleProps from "./get-schedule-props";
import getInternalChatProps from "./get-internal-chat-props";
import getWppChatProps from "./get-wpp-chat-props";

interface Props {
  chat: DetailedChat | DetailedInternalChat | DetailedSchedule;
  users: User[];
  sectors: { id: number; name: string }[];
}

export default function getMonitorItemProps({ chat, users, sectors }: Props) {
  console.log(chat, users, sectors);

  if (!("startedAt" in chat)) {
    return getScheduleProps({ chat, users, sectors });
  }
  if (chat.chatType === "internal") {
    return getInternalChatProps({ chat, users, sectors });
  }

  return getWppChatProps({ chat, users, sectors });
}
