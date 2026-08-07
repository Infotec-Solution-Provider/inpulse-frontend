import { InternalMessage, InternalMessageDeleteEventData } from "@/lib/sdk-local";
import { Dispatch, SetStateAction } from "react";

function revokeMessage(message: InternalMessage): InternalMessage {
  return message.status === "REVOKED" ? message : {
    ...message,
    body: "Mensagem apagada",
    status: "REVOKED",
    fileId: null,
    fileName: null,
    fileType: null,
    fileSize: null,
  };
}

export default function InternalMessageDeleteHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
) {
  return ({ internalMessageId, chatId }: InternalMessageDeleteEventData) => {
    setMessages((previous) => ({
      ...previous,
      [chatId]: (previous[chatId] || []).map(
        (message) => message.id === internalMessageId ? revokeMessage(message) : message,
      ),
    }));
    setCurrentChatMessages((previous) => previous.map(
      (message) => message.id === internalMessageId ? revokeMessage(message) : message,
    ));
  };
}